"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/app/icons";
import {
  EXERCISES,
  BODY_PARTS,
  EQUIPMENT_LABELS,
  searchExercises,
  matchExerciseByName,
  buildCustomExercise,
  findExercise,
} from "@/lib/exercises";
import { estimateStrengthKcal } from "@/lib/met";
import { LoadingBar, Spinner } from "@/app/components/loading";
import type {
  Exercise,
  StrengthTemplatePayload,
  WorkoutTemplate,
} from "@/lib/types";

type SetInput = {
  weight: string;
  reps: string;
  done: boolean;
};

type EntryBlock = {
  exercise: Exercise;
  sets: SetInput[];
  prev?: { weight_kg: number | null; reps: number | null };
};

export default function NewWorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EntryBlock[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [bodyWeight, setBodyWeight] = useState<number | null>(null);
  const [frequent, setFrequent] = useState<{ id: string; count: number }[]>([]);
  const startRef = useRef<number>(Date.now());
  // 後日記録モード: 指定があれば finish() でこの日時を使う
  const [recordOverride, setRecordOverride] = useState<string | null>(null);
  const [, force] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const templateLoadedRef = useRef(false);

  // テンプレ一覧の取得 (ボタンから選択するため & テンプレ指定時にも使う)
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("workout_templates")
        .select("*")
        .eq("kind", "strength")
        .order("sort_order");
      setTemplates((data ?? []) as WorkoutTemplate[]);
    })();
  }, []);

  // テンプレを現在のセッションに展開。?template= 指定時とシート選択時の両方から呼ぶ。
  function applyTemplate(t: WorkoutTemplate) {
    if (t.kind !== "strength") return;
    setTitle(t.label);
    const payload = t.payload as StrengthTemplatePayload;
    const newBlocks: EntryBlock[] = payload.exercises.map((ex) => ({
      exercise:
        findExercise(ex.exercise_id) ?? buildCustomExercise(ex.exercise_name),
      sets: ex.sets.map((s) => ({
        weight: s.weight_kg != null ? String(s.weight_kg) : "",
        reps: s.reps != null ? String(s.reps) : "",
        done: false,
      })),
    }));
    setBlocks(newBlocks);
    for (const ex of payload.exercises) {
      void loadPrev(ex.exercise_id).then((prev) => {
        setBlocks((cur) =>
          cur.map((b) =>
            b.exercise.id === ex.exercise_id && !b.prev ? { ...b, prev } : b,
          ),
        );
      });
    }
    setShowTemplatePicker(false);
  }

  // ?template=<id> 指定時の自動展開 (起動 1 度だけ、テンプレ一覧と独立に取得)
  useEffect(() => {
    if (!templateId || templateLoadedRef.current) return;
    templateLoadedRef.current = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("workout_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      if (data) applyTemplate(data as WorkoutTemplate);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // 経過時間
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 体重 + よく使う種目
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [bodyRes, freqRes] = await Promise.all([
        supabase
          .from("body_records")
          .select("weight_kg")
          .not("weight_kg", "is", null)
          .order("recorded_at", { ascending: false })
          .limit(1),
        fetch("/api/exercises/frequent").then((r) => r.json()).catch(() => ({ frequent: [] })),
      ]);
      if (bodyRes.data && bodyRes.data[0]?.weight_kg) {
        setBodyWeight(Number(bodyRes.data[0].weight_kg));
      }
      if (freqRes?.frequent) setFrequent(freqRes.frequent);
    })();
  }, []);

  function addExercise(ex: Exercise) {
    setBlocks((prev) => [...prev, { exercise: ex, sets: [emptySet()] }]);
    setShowPicker(false);
    if (!ex.custom) {
      void loadPrev(ex.id).then((prev) => {
        setBlocks((cur) =>
          cur.map((b) => (b.exercise.id === ex.id && !b.prev ? { ...b, prev } : b)),
        );
      });
    }
  }

  function updateSet(i: number, j: number, patch: Partial<SetInput>) {
    setBlocks((prev) =>
      prev.map((b, ix) =>
        ix === i
          ? { ...b, sets: b.sets.map((s, jx) => (jx === j ? { ...s, ...patch } : s)) }
          : b,
      ),
    );
  }
  function addSet(i: number) {
    setBlocks((prev) =>
      prev.map((b, ix) => (ix === i ? { ...b, sets: [...b.sets, emptySet()] } : b)),
    );
  }
  function removeBlock(i: number) {
    setBlocks((prev) => prev.filter((_, ix) => ix !== i));
  }

  async function finish() {
    if (blocks.length === 0) {
      setError("種目を1つ以上追加してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");

      // 後日記録: recordOverride が指定されていればそれを開始時刻に、
      // 所要時間は (現在 - 元の startRef) で記録。記録時刻 = 指定日時。
      const startedAt = recordOverride
        ? new Date(recordOverride)
        : new Date(startRef.current);
      const endedAt = recordOverride
        ? new Date(startedAt.getTime() + (Date.now() - startRef.current))
        : new Date();
      const durationMin = Math.max(
        1,
        Math.round((endedAt.getTime() - startedAt.getTime()) / 60000),
      );

      const estKcal = estimateStrengthKcal({
        exercises: blocks.map((b) => b.exercise),
        durationMin,
        bodyWeightKg: bodyWeight,
      });

      const { data: workoutRow, error: wErr } = await supabase
        .from("workouts")
        .insert({
          user_id: auth.user.id,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          duration_min: durationMin,
          kind: "strength",
          title: title || null,
          est_kcal: estKcal,
        })
        .select("id")
        .single();
      if (wErr) throw wErr;

      const rows: {
        workout_id: string;
        user_id: string;
        exercise_id: string;
        exercise_name: string;
        set_index: number;
        weight_kg: number | null;
        reps: number | null;
        recorded_at?: string;
      }[] = [];

      let setIndex = 0;
      for (const b of blocks) {
        for (const s of b.sets) {
          if (!s.done && !s.weight && !s.reps) continue;
          setIndex += 1;
          rows.push({
            workout_id: workoutRow.id,
            user_id: auth.user.id,
            exercise_id: b.exercise.id,
            exercise_name: b.exercise.name,
            // 後日記録の場合は recorded_at をセッション時刻に揃える (default は now())
            ...(recordOverride ? { recorded_at: startedAt.toISOString() } : {}),
            set_index: setIndex,
            weight_kg: s.weight ? Number(s.weight) : null,
            reps: s.reps ? Number(s.reps) : null,
          });
        }
      }
      if (rows.length > 0) {
        const { error: sErr } = await supabase.from("exercise_sets").insert(rows);
        if (sErr) throw sErr;
      }

      router.push("/workouts");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const elapsedMin = Math.floor((Date.now() - startRef.current) / 60000);
  const elapsedSec = Math.floor(((Date.now() - startRef.current) / 1000) % 60);

  return (
    <div style={{ paddingBottom: 120 }}>
      <LoadingBar active={saving} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 12,
        }}
      >
        <input
          className="input"
          placeholder="セッション名（例: 胸の日）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            flex: 1,
            border: 0,
            padding: "6px 0",
            fontSize: 18,
            fontWeight: 700,
            background: "transparent",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--move)",
            fontWeight: 600,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          <Icon name="clock" size="sm" />
          <span className="num">
            {String(elapsedMin).padStart(2, "0")}:
            {String(elapsedSec).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <Link
          href="/cardio/new"
          className="btn"
          style={{ padding: "5px 10px", fontSize: 11 }}
        >
          <Icon name="run" size="sm" />
          有酸素
        </Link>
      </div>

      {/* 後日記録 (任意) */}
      <BackdateField value={recordOverride} onChange={setRecordOverride} />

      {blocks.map((b, i) => (
        <ExerciseBlock
          key={`${b.exercise.id}-${i}`}
          block={b}
          onUpdateSet={(j, patch) => updateSet(i, j, patch)}
          onAddSet={() => addSet(i)}
          onRemove={() => removeBlock(i)}
        />
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: blocks.length ? 0 : 8 }}>
        <button
          type="button"
          className="btn btn-block"
          onClick={() => setShowPicker(true)}
          style={{ borderStyle: "dashed", padding: 14 }}
        >
          <Icon name="plus" size="sm" />
          種目を追加
        </button>
        {templates.length > 0 && (
          <button
            type="button"
            className="btn btn-block"
            onClick={() => setShowTemplatePicker(true)}
            style={{ padding: 14, flexShrink: 0, flexBasis: 140 }}
          >
            <Icon name="grid" size="sm" />
            テンプレ
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button
          type="button"
          className="btn btn-block"
          onClick={() => router.back()}
          disabled={saving}
        >
          中断
        </button>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={saving}
          onClick={finish}
        >
          {saving ? (
            <>
              <Spinner /> 保存中…
            </>
          ) : (
            "セッション完了"
          )}
        </button>
      </div>

      {showPicker && (
        <ExercisePicker
          onPick={addExercise}
          onClose={() => setShowPicker(false)}
          frequentIds={frequent.map((f) => f.id)}
        />
      )}

      {showTemplatePicker && (
        <TemplatePickSheet
          templates={templates}
          onPick={applyTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// 後日記録の日時フィールド
// ============================================================
function BackdateField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(Boolean(value));
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: 0,
          color: "var(--muted)",
          fontSize: 11,
          padding: "4px 0",
          cursor: "pointer",
          fontFamily: "inherit",
          marginBottom: 8,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Icon name="clock" size="sm" />
        後日記録する場合は日時を指定
      </button>
    );
  }
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: "8px 10px",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Icon name="clock" size="sm" />
      <input
        type="datetime-local"
        className="input"
        value={value ?? localNow()}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, padding: "4px 6px", fontSize: 13 }}
      />
      <button
        type="button"
        onClick={() => {
          onChange(null);
          setOpen(false);
        }}
        className="header-action"
        aria-label="後日記録を解除"
      >
        <Icon name="close" size="sm" />
      </button>
    </div>
  );
}

function localNow(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// ============================================================
// テンプレ選択シート
// ============================================================
function TemplatePickSheet({
  templates,
  onPick,
  onClose,
}: {
  templates: WorkoutTemplate[];
  onPick: (t: WorkoutTemplate) => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "70dvh" }}
      >
        <div className="sheet-handle" />
        <div
          style={{
            padding: "8px 18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            テンプレから開始
          </div>
          {templates.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              まだテンプレがありません
            </div>
          ) : (
            templates.map((t) => {
              const p = t.payload as StrengthTemplatePayload;
              const summary = p.exercises
                .map((e) => e.exercise_name)
                .slice(0, 3)
                .join("・");
              const more =
                p.exercises.length > 3 ? ` 他${p.exercises.length - 3}` : "";
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onPick(t)}
                  style={{
                    padding: "12px 14px",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    background: "var(--surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    color: "var(--ink)",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {summary || "(種目なし)"}
                    {more}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
function emptySet(): SetInput {
  return { weight: "", reps: "", done: false };
}

async function loadPrev(
  exerciseId: string,
): Promise<{ weight_kg: number | null; reps: number | null } | undefined> {
  const supabase = createClient();
  const { data } = await supabase
    .from("exercise_sets")
    .select("weight_kg,reps")
    .eq("exercise_id", exerciseId)
    .order("recorded_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? undefined;
}

// ============================================================
const REST_PRESETS = [60, 120, 180] as const;

function ExerciseBlock({
  block,
  onUpdateSet,
  onAddSet,
  onRemove,
}: {
  block: EntryBlock;
  onUpdateSet: (j: number, patch: Partial<SetInput>) => void;
  onAddSet: () => void;
  onRemove: () => void;
}) {
  // 種目開始時刻 (ローカル)。「開始」ボタンで started を立て、セット入力を活性化する。
  const [started, setStarted] = useState(false);
  // レストタイマー: rest が null でなければカウントダウン中
  const [rest, setRest] = useState<{ endsAt: number; preset: number } | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => force((x) => x + 1), 500);
    return () => clearInterval(t);
  }, [rest]);

  const restRemaining = rest ? Math.max(0, Math.ceil((rest.endsAt - Date.now()) / 1000)) : 0;
  // レスト終了でブザー (ブラウザ振動)
  useEffect(() => {
    if (rest && restRemaining === 0) {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([180, 80, 180]);
      }
      setRest(null);
    }
  }, [rest, restRemaining]);

  // 「完了」を done=false → true にしたとき、デフォルト 90 秒のレストを起動
  function handleSetDoneToggle(j: number, currentDone: boolean) {
    onUpdateSet(j, { done: !currentDone });
    if (!currentDone) {
      // セット完了 → レスト開始 (デフォルト 1 分)
      setRest({ endsAt: Date.now() + 60_000, preset: 60 });
    }
  }

  function adjustRest(deltaSec: number) {
    setRest((r) =>
      r ? { ...r, endsAt: r.endsAt + deltaSec * 1000 } : null,
    );
  }

  function setRestPreset(sec: number) {
    setRest({ endsAt: Date.now() + sec * 1000, preset: sec });
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        opacity: started ? 1 : 0.85,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {block.exercise.name}
            {block.exercise.custom && (
              <span
                style={{
                  fontSize: 9,
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  color: "var(--ink-2)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginLeft: 6,
                }}
              >
                custom
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {block.prev?.weight_kg
              ? `前回 ${block.prev.weight_kg}kg × ${block.prev.reps ?? "?"}`
              : "前回データなし"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!started && (
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="btn btn-primary"
              style={{ padding: "5px 10px", fontSize: 11 }}
            >
              開始
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="header-action"
            aria-label="種目を削除"
          >
            <Icon name="trash" size="sm" />
          </button>
        </div>
      </div>

      {rest && (
        <RestPanel
          remaining={restRemaining}
          preset={rest.preset}
          onAdjust={adjustRest}
          onPreset={setRestPreset}
          onSkip={() => setRest(null)}
        />
      )}

      <table
        style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}
      >
        <thead>
          <tr>
            {["SET", "WEIGHT", "REP", "OK"].map((h, ix) => (
              <th
                key={h}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  textAlign: ix === 0 || ix === 3 ? "center" : "left",
                  padding: "4px 6px",
                  borderBottom: "1px solid var(--line)",
                  width: ix === 0 ? 32 : ix === 3 ? 40 : undefined,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.sets.map((s, j) => (
            <tr key={j}>
              <td
                style={{
                  padding: "6px",
                  textAlign: "center",
                  fontWeight: 600,
                  color: "var(--muted)",
                  fontSize: 12,
                }}
              >
                {j + 1}
              </td>
              <td style={{ padding: "4px 4px" }}>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="kg"
                  value={s.weight}
                  onChange={(e) => onUpdateSet(j, { weight: e.target.value })}
                  style={{ padding: "6px 8px", fontSize: 13 }}
                />
              </td>
              <td style={{ padding: "4px 4px" }}>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="rep"
                  value={s.reps}
                  onChange={(e) => onUpdateSet(j, { reps: e.target.value })}
                  style={{ padding: "6px 8px", fontSize: 13 }}
                />
              </td>
              <td style={{ padding: "4px", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => handleSetDoneToggle(j, s.done)}
                  aria-label="完了"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    background: s.done ? "var(--ink)" : "var(--surface)",
                    color: s.done ? "var(--bg)" : "var(--ink-2)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {s.done ? <Icon name="check" size="sm" /> : ""}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        className="btn btn-block"
        onClick={onAddSet}
        style={{ marginTop: 8, fontSize: 12 }}
      >
        <Icon name="plus" size="sm" />
        セットを追加
      </button>
    </div>
  );
}

// ============================================================
// レストタイマーパネル
// ============================================================
function RestPanel({
  remaining,
  preset,
  onAdjust,
  onPreset,
  onSkip,
}: {
  remaining: number;
  preset: number;
  onAdjust: (deltaSec: number) => void;
  onPreset: (sec: number) => void;
  onSkip: () => void;
}) {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--move)",
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          REST
        </div>
        <div
          className="num"
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--move)",
            letterSpacing: "-0.02em",
          }}
        >
          {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {REST_PRESETS.map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => onPreset(sec)}
            className={`tag ${preset === sec ? "selected" : ""}`}
            style={{ fontSize: 11 }}
          >
            {sec / 60}分
          </button>
        ))}
        <button
          type="button"
          onClick={() => onAdjust(15)}
          className="tag"
          style={{ fontSize: 11 }}
        >
          +15
        </button>
        <button
          type="button"
          onClick={() => onAdjust(-15)}
          className="tag"
          style={{ fontSize: 11 }}
        >
          −15
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="btn btn-primary"
          style={{
            padding: "3px 14px",
            fontSize: 11,
            marginLeft: "auto",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

// ============================================================
function ExercisePicker({
  onPick,
  onClose,
  frequentIds,
}: {
  onPick: (ex: Exercise) => void;
  onClose: () => void;
  frequentIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [part, setPart] = useState<"all" | (typeof BODY_PARTS)[number]["id"]>(
    "all",
  );

  // ソート: query が空のときは frequent 順 → 部位順
  const list = useMemo(() => {
    let arr = searchExercises(query);
    if (part !== "all") arr = arr.filter((e) => e.body_part === part);
    if (!query.trim() && frequentIds.length > 0) {
      const rank = new Map(frequentIds.map((id, idx) => [id, idx]));
      arr = [...arr].sort((a, b) => {
        const ra = rank.has(a.id) ? rank.get(a.id)! : 999;
        const rb = rank.has(b.id) ? rank.get(b.id)! : 999;
        return ra - rb;
      });
    }
    return arr;
  }, [query, part, frequentIds]);

  const exactMatch = useMemo(() => matchExerciseByName(query), [query]);
  const showCustomCta = query.trim().length > 0 && !exactMatch;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ height: "92dvh" }}
      >
        <div className="sheet-handle" />
        <div
          style={{
            padding: "8px 18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
            種目を選ぶ
          </div>

          <div className="search-input" style={{ flexShrink: 0 }}>
            <Icon name="search" className="ic-search" />
            <input
              className="input"
              placeholder="種目名 / エイリアスで検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flexShrink: 0 }}>
            <button
              className={`tag ${part === "all" ? "selected" : ""}`}
              onClick={() => setPart("all")}
            >
              すべて
            </button>
            {BODY_PARTS.map((p) => (
              <button
                key={p.id}
                className={`tag ${part === p.id ? "selected" : ""}`}
                onClick={() => setPart(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {showCustomCta && (
            <button
              type="button"
              onClick={() => onPick(buildCustomExercise(query))}
              style={{
                padding: "12px 14px",
                border: "2px dashed var(--ai)",
                borderRadius: 10,
                background: "var(--surface-2)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                color: "var(--ink)",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                「{query}」をカスタム種目として追加
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                MET は 4.0 で扱います（その他カテゴリ）
              </div>
            </button>
          )}

          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              overflow: "hidden",
              flex: 1,
              minHeight: 80,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {list.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                該当する種目がありません。{" "}
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => onPick(buildCustomExercise(query))}
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "var(--ink-2)",
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                    }}
                  >
                    カスタム種目を作る
                  </button>
                )}
              </div>
            ) : (
              list.map((ex, idx) => {
                const isFrequent =
                  !query.trim() && frequentIds.includes(ex.id) && idx < 5;
                return (
                  <button
                    key={ex.id}
                    onClick={() => onPick(ex)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: 0,
                      borderBottom: "1px solid var(--line-soft)",
                      background: "transparent",
                      color: "var(--ink)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        {EQUIPMENT_LABELS[ex.equipment]} ·{" "}
                        {BODY_PARTS.find((p) => p.id === ex.body_part)?.label}
                      </div>
                    </div>
                    {isFrequent && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          background: "var(--surface-2)",
                          border: "1px solid var(--line)",
                          borderRadius: 4,
                          color: "var(--ink-2)",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        よく使う
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
