"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/app/icons";
import {
  EXERCISES,
  BODY_PARTS,
  EQUIPMENT_LABELS,
  findExercise,
} from "@/lib/exercises";
import { estimateStrengthKcal } from "@/lib/met";
import type { Exercise } from "@/lib/types";

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
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EntryBlock[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [bodyWeight, setBodyWeight] = useState<number | null>(null);
  const startRef = useRef<number>(Date.now());
  const [, force] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 経過時間を 1 秒ごとに更新
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 直近の体重を取得 (MET 推定用)
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("body_records")
        .select("weight_kg")
        .not("weight_kg", "is", null)
        .order("recorded_at", { ascending: false })
        .limit(1);
      if (data && data[0]?.weight_kg) setBodyWeight(Number(data[0].weight_kg));
    })();
  }, []);

  function addExercise(ex: Exercise) {
    setBlocks((prev) => [
      ...prev,
      { exercise: ex, sets: [emptySet()] },
    ]);
    setShowPicker(false);
    // 前回値を非同期で取得
    void loadPrev(ex.id).then((prev) => {
      setBlocks((cur) =>
        cur.map((b) => (b.exercise.id === ex.id && !b.prev ? { ...b, prev } : b)),
      );
    });
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

      const startedAt = new Date(startRef.current);
      const endedAt = new Date();
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
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <input
          className="input"
          placeholder="セッション名（例: 胸の日）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 1, marginRight: 12, border: 0, padding: "6px 0", fontSize: 18, fontWeight: 700 }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--move)",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <Icon name="clock" size="sm" />
          <span className="num">
            {String(elapsedMin).padStart(2, "0")}:
            {String(elapsedSec).padStart(2, "0")}
          </span>
        </div>
      </div>

      {blocks.map((b, i) => (
        <ExerciseBlock
          key={`${b.exercise.id}-${i}`}
          block={b}
          onUpdateSet={(j, patch) => updateSet(i, j, patch)}
          onAddSet={() => addSet(i)}
          onRemove={() => removeBlock(i)}
        />
      ))}

      <button
        type="button"
        className="btn btn-block"
        onClick={() => setShowPicker(true)}
        style={{ borderStyle: "dashed", padding: 14, marginTop: blocks.length ? 0 : 8 }}
      >
        <Icon name="plus" size="sm" />
        種目を追加
      </button>

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
        >
          中断
        </button>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={saving}
          onClick={finish}
        >
          {saving ? "保存中…" : "セッション完了"}
        </button>
      </div>

      {showPicker && (
        <ExercisePicker
          onPick={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
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
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
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
          <div style={{ fontWeight: 600, fontSize: 14 }}>{block.exercise.name}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {block.prev?.weight_kg
              ? `前回 ${block.prev.weight_kg}kg × ${block.prev.reps ?? "?"}`
              : "前回データなし"}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="header-action"
          aria-label="種目を削除"
        >
          <Icon name="trash" size="sm" />
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
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
                  onClick={() => onUpdateSet(j, { done: !s.done })}
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
function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [part, setPart] = useState<"all" | (typeof BODY_PARTS)[number]["id"]>(
    "all",
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    return EXERCISES.filter((ex) => {
      if (part !== "all" && ex.body_part !== part) return false;
      if (q && !ex.name.includes(q)) return false;
      return true;
    });
  }, [query, part]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ padding: "8px 18px 20px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            種目を選ぶ
          </div>

          <div className="search-input" style={{ marginBottom: 12 }}>
            <Icon name="search" className="ic-search" />
            <input
              className="input"
              placeholder="種目名で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
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

          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              overflow: "hidden",
              maxHeight: "50vh",
              overflowY: "auto",
            }}
          >
            {filtered.length === 0 && (
              <div
                style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}
              >
                該当する種目がありません
              </div>
            )}
            {filtered.map((ex) => (
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
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {EQUIPMENT_LABELS[ex.equipment]}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
