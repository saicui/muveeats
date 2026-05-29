"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/app/icons";
import { createClient } from "@/lib/supabase/client";
import { fmtTime, fmtDateTime } from "@/lib/format";
import type {
  Meal,
  Workout,
  BodyRecord,
  ExerciseSet,
  ActivityRecord,
} from "@/lib/types";

type Filter = "all" | "eat" | "move" | "body";

type Entry =
  | { kind: "meal"; at: string; data: Meal }
  | { kind: "workout"; at: string; data: Workout; sets: ExerciseSet[] }
  | { kind: "activity"; at: string; data: ActivityRecord }
  | { kind: "body"; at: string; data: BodyRecord };

const PAGE_SIZE = 20;

export function HistoryClient({
  meals: initialMeals,
  workouts: initialWorkouts,
  bodyRecords: initialBody,
  activityRecords: initialActivity,
  setsByWorkout: initialSets,
  error,
}: {
  meals: Meal[];
  workouts: Workout[];
  bodyRecords: BodyRecord[];
  activityRecords: ActivityRecord[];
  setsByWorkout: Record<string, ExerciseSet[]>;
  error: string | null;
}) {
  const [meals, setMeals] = useState(initialMeals);
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [body, setBody] = useState(initialBody);
  const [activity, setActivity] = useState(initialActivity);
  const setsByWorkout = initialSets;
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Entry | null>(null);

  const entries: Entry[] = useMemo(() => {
    const all: Entry[] = [
      ...meals.map<Entry>((m) => ({ kind: "meal", at: m.eaten_at, data: m })),
      ...workouts.map<Entry>((w) => ({
        kind: "workout",
        at: w.started_at,
        data: w,
        sets: setsByWorkout[w.id] ?? [],
      })),
      ...activity.map<Entry>((a) => ({
        kind: "activity",
        at: a.recorded_at,
        data: a,
      })),
      ...body.map<Entry>((b) => ({
        kind: "body",
        at: b.recorded_at,
        data: b,
      })),
    ];
    all.sort((a, b) => +new Date(b.at) - +new Date(a.at));
    if (filter === "all") return all;
    if (filter === "eat") return all.filter((e) => e.kind === "meal");
    if (filter === "move")
      return all.filter((e) => e.kind === "workout" || e.kind === "activity");
    return all.filter((e) => e.kind === "body");
  }, [meals, workouts, body, activity, setsByWorkout, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries.slice(0, visible)) {
      const key = e.at.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries, visible]);

  async function removeEntry(e: Entry) {
    if (!confirm("この記録を削除しますか？")) return;
    const supabase = createClient();
    if (e.kind === "meal") {
      const { error } = await supabase.from("meals").delete().eq("id", e.data.id);
      if (error) return alert(error.message);
      setMeals((p) => p.filter((m) => m.id !== e.data.id));
    } else if (e.kind === "workout") {
      const { error } = await supabase.from("workouts").delete().eq("id", e.data.id);
      if (error) return alert(error.message);
      setWorkouts((p) => p.filter((w) => w.id !== e.data.id));
    } else if (e.kind === "activity") {
      const { error } = await supabase
        .from("activity_records")
        .delete()
        .eq("id", e.data.id);
      if (error) return alert(error.message);
      setActivity((p) => p.filter((a) => a.id !== e.data.id));
    } else {
      const { error } = await supabase
        .from("body_records")
        .delete()
        .eq("id", e.data.id);
      if (error) return alert(error.message);
      setBody((p) => p.filter((b) => b.id !== e.data.id));
    }
    setSelected(null);
  }

  // 履歴アイテムをテンプレ化する
  async function templatize(e: Entry): Promise<string | null> {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return "サインインが必要です";
    if (e.kind === "meal") {
      const m = e.data;
      const label = window.prompt(
        "テンプレ名を入力してください",
        m.name.slice(0, 30),
      );
      if (!label) return null;
      const { error } = await supabase.from("meal_templates").insert({
        user_id: auth.user.id,
        label,
        name: m.name,
        calories: m.calories,
        protein_g: m.protein_g,
        fat_g: m.fat_g,
        carbs_g: m.carbs_g,
        chain_id: m.chain_id,
        chain_name: m.chain_name,
        item_id: m.item_id,
        size: m.size,
        tags: m.tags ?? [],
      });
      if (error) return error.message;
      return null;
    }
    if (e.kind === "workout" && e.data.kind === "strength") {
      const w = e.data;
      const label = window.prompt(
        "テンプレ名を入力してください",
        w.title || "胸の日",
      );
      if (!label) return null;
      // 種目ごとに集約
      const grouped = new Map<
        string,
        { exercise_id: string; exercise_name: string; sets: { weight_kg: number | null; reps: number | null }[] }
      >();
      for (const s of e.sets) {
        const cur = grouped.get(s.exercise_id) ?? {
          exercise_id: s.exercise_id,
          exercise_name: s.exercise_name,
          sets: [],
        };
        cur.sets.push({ weight_kg: s.weight_kg, reps: s.reps });
        grouped.set(s.exercise_id, cur);
      }
      const payload = { exercises: Array.from(grouped.values()) };
      const { error } = await supabase.from("workout_templates").insert({
        user_id: auth.user.id,
        label,
        kind: "strength",
        payload,
      });
      if (error) return error.message;
      return null;
    }
    return "この記録はテンプレ化できません";
  }

  // 履歴アイテムを編集する (カロリー / 体組成値など)
  async function saveEntry(
    e: Entry,
    patch: Record<string, unknown>,
  ): Promise<string | null> {
    const supabase = createClient();
    const table =
      e.kind === "meal"
        ? "meals"
        : e.kind === "workout"
        ? "workouts"
        : e.kind === "activity"
        ? "activity_records"
        : "body_records";
    const { error } = await supabase.from(table).update(patch).eq("id", e.data.id);
    if (error) return error.message;

    if (e.kind === "meal") {
      const next = { ...e.data, ...patch } as Meal;
      setMeals((p) => p.map((m) => (m.id === e.data.id ? next : m)));
      setSelected({ kind: "meal", at: next.eaten_at, data: next });
    } else if (e.kind === "workout") {
      const next = { ...e.data, ...patch } as Workout;
      setWorkouts((p) => p.map((w) => (w.id === e.data.id ? next : w)));
      setSelected({ kind: "workout", at: next.started_at, data: next, sets: e.sets });
    } else if (e.kind === "activity") {
      const next = { ...e.data, ...patch } as ActivityRecord;
      setActivity((p) => p.map((a) => (a.id === e.data.id ? next : a)));
      setSelected({ kind: "activity", at: next.recorded_at, data: next });
    } else {
      const next = { ...e.data, ...patch } as BodyRecord;
      setBody((p) => p.map((b) => (b.id === e.data.id ? next : b)));
      setSelected({ kind: "body", at: next.recorded_at, data: next });
    }
    return null;
  }

  return (
    <div>
      <h1 className="page-title">履歴</h1>
      <p className="page-subtitle">食事 / 運動 / 体組成 すべて</p>

      {error && (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid var(--warn)",
            color: "var(--warn)",
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "すべて" },
          { id: "eat", label: "食事" },
          { id: "move", label: "運動" },
          { id: "body", label: "体組成" },
        ].map((f) => (
          <button
            key={f.id}
            className={`tag ${filter === f.id ? "selected" : ""}`}
            onClick={() => setFilter(f.id as Filter)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            background: "var(--surface)",
            border: "1px dashed var(--line)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontWeight: 600 }}>記録がありません</div>
        </div>
      ) : (
        grouped.map(([day, items]) => {
          const intake = items
            .filter((e) => e.kind === "meal")
            .reduce(
              (acc, e) =>
                acc + Number((e as Entry & { kind: "meal" }).data.calories || 0),
              0,
            );
          const burn = items
            .filter((e) => e.kind === "workout")
            .reduce(
              (acc, e) =>
                acc + Number((e as Entry & { kind: "workout" }).data.est_kcal || 0),
              0,
            );
          const date = new Date(day);
          return (
            <div key={day} style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 8,
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {date.toLocaleDateString("ja-JP", {
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>
                    {date.toLocaleDateString("ja-JP", { weekday: "short" })}
                  </span>
                </div>
                <div className="num" style={{ fontSize: 11, color: "var(--muted)" }}>
                  摂取{" "}
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                    {Math.round(intake)}
                  </span>
                  {burn > 0 && (
                    <>
                      {" · 消費 "}
                      <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                        {Math.round(burn)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {items.map((e) => (
                  <EntryRow
                    key={`${e.kind}-${e.data.id}`}
                    entry={e}
                    onClick={() => setSelected(e)}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {visible < entries.length && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button className="btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            もっと見る ({entries.length - visible} 件残り)
          </button>
        </div>
      )}

      {selected && (
        <DetailSheet
          entry={selected}
          onClose={() => setSelected(null)}
          onDelete={() => removeEntry(selected)}
          onSave={(patch) => saveEntry(selected, patch)}
          onTemplatize={async () => {
            const err = await templatize(selected);
            if (err) {
              alert(err);
            } else {
              alert("テンプレに追加しました");
              setSelected(null);
            }
          }}
        />
      )}
    </div>
  );
}

function EntryRow({
  entry,
  onClick,
}: {
  entry: Entry;
  onClick: () => void;
}) {
  const accent =
    entry.kind === "meal"
      ? "var(--eat)"
      : entry.kind === "workout" || entry.kind === "activity"
      ? "var(--move)"
      : "var(--body)";

  let name: string;
  let meta: string;
  let primary: string;
  let sub: string | undefined;

  if (entry.kind === "meal") {
    const m = entry.data;
    name = m.name + (m.size ? ` ${m.size}` : "");
    meta = `${fmtTime(m.eaten_at)} · ${m.chain_name ?? mealSource(m.source)}`;
    primary = m.calories != null ? `+${Math.round(Number(m.calories))} kcal` : "—";
    sub = m.protein_g != null ? `P${m.protein_g} / F${m.fat_g} / C${m.carbs_g}` : undefined;
  } else if (entry.kind === "workout") {
    const w = entry.data;
    name =
      w.title ||
      (w.kind === "strength"
        ? "筋トレ"
        : w.cardio_type === "run"
        ? "ラン"
        : w.cardio_type === "walk"
        ? "ウォーク"
        : w.cardio_type === "bike"
        ? "バイク"
        : "有酸素");
    const tags: string[] = [
      w.kind === "strength" ? "筋トレ" : "有酸素",
      ...(w.duration_min ? [`${w.duration_min}分`] : []),
      ...(w.distance_km ? [`${w.distance_km}km`] : []),
    ];
    meta = `${fmtTime(w.started_at)} · ${tags.join(" · ")}`;
    primary = w.est_kcal != null ? `−${Math.round(Number(w.est_kcal))} kcal` : "—";
  } else if (entry.kind === "activity") {
    const a = entry.data;
    name = "歩数・活動";
    const tags: string[] = [
      "アクティビティ",
      ...(a.distance_km ? [`${a.distance_km}km`] : []),
    ];
    meta = `${fmtTime(a.recorded_at)} · ${tags.join(" · ")}`;
    primary = a.steps != null ? `${Math.round(a.steps).toLocaleString()} 歩` : "—";
    sub = a.active_kcal != null ? `${Math.round(Number(a.active_kcal))} kcal` : undefined;
  } else {
    const b = entry.data;
    name = `体組成 ${b.weight_kg ?? "—"}kg`;
    meta = `${fmtTime(b.recorded_at)} · 手動記録`;
    primary = b.body_fat_pct != null ? `体脂肪 ${b.body_fat_pct}%` : "—";
  }

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px 14px",
        border: 0,
        borderBottom: "1px solid var(--line-soft)",
        background: "transparent",
        color: "var(--ink)",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        gap: 12,
        alignItems: "center",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          width: 3,
          height: 32,
          borderRadius: 2,
          background: accent,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
          {meta}
        </div>
      </div>
      <div className="num" style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{primary}</div>
        {sub && (
          <div style={{ fontSize: 10, color: "var(--muted)" }}>{sub}</div>
        )}
      </div>
    </button>
  );
}

function DetailSheet({
  entry,
  onClose,
  onDelete,
  onTemplatize,
  onSave,
}: {
  entry: Entry;
  onClose: () => void;
  onDelete: () => void;
  onTemplatize: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // テンプレ化できる: 食事すべて / 筋トレ (strength) のみ
  const canTemplatize =
    entry.kind === "meal" ||
    (entry.kind === "workout" && entry.data.kind === "strength");

  async function submit(patch: Record<string, unknown>) {
    setSaving(true);
    setErr(null);
    const e = await onSave(patch);
    setSaving(false);
    if (e) {
      setErr(e);
      return;
    }
    setEditing(false);
  }

  return (
    <div className="sheet-backdrop" onClick={editing ? undefined : onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ padding: "8px 18px 20px" }}>
          {editing ? (
            <>
              {entry.kind === "meal" && (
                <MealEdit
                  meal={entry.data}
                  saving={saving}
                  error={err}
                  onSubmit={submit}
                  onCancel={() => setEditing(false)}
                />
              )}
              {entry.kind === "workout" && (
                <WorkoutEdit
                  workout={entry.data}
                  saving={saving}
                  error={err}
                  onSubmit={submit}
                  onCancel={() => setEditing(false)}
                />
              )}
              {entry.kind === "activity" && (
                <ActivityEdit
                  rec={entry.data}
                  saving={saving}
                  error={err}
                  onSubmit={submit}
                  onCancel={() => setEditing(false)}
                />
              )}
              {entry.kind === "body" && (
                <BodyEdit
                  rec={entry.data}
                  saving={saving}
                  error={err}
                  onSubmit={submit}
                  onCancel={() => setEditing(false)}
                />
              )}
            </>
          ) : (
            <>
              {entry.kind === "meal" && <MealDetail meal={entry.data} />}
              {entry.kind === "workout" && (
                <WorkoutDetail workout={entry.data} sets={entry.sets} />
              )}
              {entry.kind === "activity" && <ActivityDetail rec={entry.data} />}
              {entry.kind === "body" && <BodyDetail rec={entry.data} />}

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button
                  className="btn"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    setErr(null);
                    setEditing(true);
                  }}
                >
                  <Icon name="edit" size="sm" />
                  編集
                </button>
                {canTemplatize && (
                  <button
                    className="btn"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={onTemplatize}
                  >
                    <Icon name="plus" size="sm" />
                    テンプレに追加
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={onDelete}
                >
                  <Icon name="trash" size="sm" />
                  削除
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={onClose}
                >
                  閉じる
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 編集フォーム
function numOrNull(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function str(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

function EditNum({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "9px 0",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{label}</span>
      <input
        className="input num"
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 130, textAlign: "right" }}
      />
    </label>
  );
}

function EditText({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "9px 0",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--ink-2)", flexShrink: 0 }}>{label}</span>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 180, textAlign: "right" }}
      />
    </label>
  );
}

function EditActions({
  saving,
  error,
  onCancel,
}: {
  saving: boolean;
  error: string | null;
  onCancel: () => void;
}) {
  return (
    <>
      {error && (
        <div
          style={{
            padding: "8px 10px",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            borderRadius: 8,
            fontSize: 12,
            marginTop: 12,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          type="button"
          className="btn"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={onCancel}
          disabled={saving}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: "center" }}
          disabled={saving}
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </>
  );
}

function EditTitle() {
  return (
    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>記録を編集</div>
  );
}

function MealEdit({
  meal,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  meal: Meal;
  saving: boolean;
  error: string | null;
  onSubmit: (patch: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(meal.name);
  const [calories, setCalories] = useState(str(meal.calories));
  const [protein, setProtein] = useState(str(meal.protein_g));
  const [fat, setFat] = useState(str(meal.fat_g));
  const [carbs, setCarbs] = useState(str(meal.carbs_g));

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        onSubmit({
          name: name.trim() || meal.name,
          calories: numOrNull(calories),
          protein_g: numOrNull(protein),
          fat_g: numOrNull(fat),
          carbs_g: numOrNull(carbs),
        });
      }}
    >
      <EditTitle />
      <EditText label="名前" value={name} onChange={setName} />
      <EditNum label="kcal" value={calories} onChange={setCalories} />
      <EditNum label="P (g)" value={protein} onChange={setProtein} />
      <EditNum label="F (g)" value={fat} onChange={setFat} />
      <EditNum label="C (g)" value={carbs} onChange={setCarbs} />
      <EditActions saving={saving} error={error} onCancel={onCancel} />
    </form>
  );
}

function WorkoutEdit({
  workout,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  workout: Workout;
  saving: boolean;
  error: string | null;
  onSubmit: (patch: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const isStrength = workout.kind === "strength";
  const [title, setTitle] = useState(workout.title ?? "");
  const [duration, setDuration] = useState(str(workout.duration_min));
  const [distance, setDistance] = useState(str(workout.distance_km));
  const [avgHr, setAvgHr] = useState(str(workout.avg_hr));
  const [kcal, setKcal] = useState(str(workout.est_kcal));
  const [note, setNote] = useState(workout.note ?? "");

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        const patch: Record<string, unknown> = {
          est_kcal: numOrNull(kcal),
          note: note.trim() || null,
        };
        if (isStrength) {
          patch.title = title.trim() || null;
        } else {
          patch.duration_min = numOrNull(duration);
          patch.distance_km = numOrNull(distance);
          patch.avg_hr = numOrNull(avgHr);
        }
        onSubmit(patch);
      }}
    >
      <EditTitle />
      {isStrength ? (
        <EditText label="タイトル" value={title} onChange={setTitle} />
      ) : (
        <>
          <EditNum label="時間 (分)" value={duration} onChange={setDuration} />
          <EditNum label="距離 (km)" value={distance} onChange={setDistance} />
          <EditNum label="平均心拍 (bpm)" value={avgHr} onChange={setAvgHr} />
        </>
      )}
      <EditNum label="消費 kcal" value={kcal} onChange={setKcal} />
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 4 }}>メモ</div>
        <textarea
          className="input"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ resize: "vertical", width: "100%" }}
        />
      </div>
      <EditActions saving={saving} error={error} onCancel={onCancel} />
    </form>
  );
}

function BodyEdit({
  rec,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  rec: BodyRecord;
  saving: boolean;
  error: string | null;
  onSubmit: (patch: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState(str(rec.weight_kg));
  const [fat, setFat] = useState(str(rec.body_fat_pct));
  const [muscle, setMuscle] = useState(str(rec.muscle_kg));
  const [visceral, setVisceral] = useState(str(rec.visceral_fat));
  const [bmr, setBmr] = useState(str(rec.bmr_kcal));

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        onSubmit({
          weight_kg: numOrNull(weight),
          body_fat_pct: numOrNull(fat),
          muscle_kg: numOrNull(muscle),
          visceral_fat: numOrNull(visceral),
          bmr_kcal: numOrNull(bmr),
        });
      }}
    >
      <EditTitle />
      <EditNum label="体重 (kg)" value={weight} onChange={setWeight} />
      <EditNum label="体脂肪率 (%)" value={fat} onChange={setFat} />
      <EditNum label="筋肉量 (kg)" value={muscle} onChange={setMuscle} />
      <EditNum label="内臓脂肪" value={visceral} onChange={setVisceral} />
      <EditNum label="基礎代謝 (kcal)" value={bmr} onChange={setBmr} />
      <EditActions saving={saving} error={error} onCancel={onCancel} />
    </form>
  );
}

function ActivityEdit({
  rec,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  rec: ActivityRecord;
  saving: boolean;
  error: string | null;
  onSubmit: (patch: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [steps, setSteps] = useState(str(rec.steps));
  const [kcal, setKcal] = useState(str(rec.active_kcal));
  const [distance, setDistance] = useState(str(rec.distance_km));
  const [note, setNote] = useState(rec.note ?? "");

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        const s = numOrNull(steps);
        onSubmit({
          steps: s != null ? Math.round(s) : null,
          active_kcal: numOrNull(kcal),
          distance_km: numOrNull(distance),
          note: note.trim() || null,
        });
      }}
    >
      <EditTitle />
      <EditNum label="歩数 (歩)" value={steps} onChange={setSteps} />
      <EditNum label="消費 kcal" value={kcal} onChange={setKcal} />
      <EditNum label="移動距離 (km)" value={distance} onChange={setDistance} />
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 4 }}>メモ</div>
        <textarea
          className="input"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ resize: "vertical", width: "100%" }}
        />
      </div>
      <EditActions saving={saving} error={error} onCancel={onCancel} />
    </form>
  );
}

function MealDetail({ meal }: { meal: Meal }) {
  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 700 }}>
        {meal.name}
        {meal.size && (
          <span className="size-tag" style={{ marginLeft: 6 }}>
            {meal.size}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--muted)",
          marginBottom: 14,
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginTop: 4,
        }}
      >
        <span>{fmtDateTime(meal.eaten_at)}</span>
        <span>·</span>
        {meal.chain_name ? (
          <>
            <span>{meal.chain_name}</span>
            <span className="official-tag">official</span>
          </>
        ) : (
          <span>{mealSource(meal.source)}</span>
        )}
        {meal.ai_confidence != null && (
          <span style={{ color: "var(--ai)" }}>
            自信度 {Math.round(meal.ai_confidence * 100)}%
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {(["calories", "protein_g", "fat_g", "carbs_g"] as const).map((k, i) => (
          <div
            key={k}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "10px 6px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              {["kcal", "P", "F", "C"][i]}
            </div>
            <div
              className="num"
              style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}
            >
              {meal[k] != null ? Math.round(Number(meal[k])) : "—"}
            </div>
          </div>
        ))}
      </div>

      {meal.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {meal.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}

      {meal.ai_note && (
        <div
          style={{
            background: "var(--surface-2)",
            borderLeft: "3px solid var(--ai)",
            padding: "8px 10px",
            fontSize: 12,
            color: "var(--ink-2)",
            borderRadius: "0 6px 6px 0",
          }}
        >
          {meal.ai_note}
        </div>
      )}
    </>
  );
}

function WorkoutDetail({
  workout,
  sets,
}: {
  workout: Workout;
  sets: ExerciseSet[];
}) {
  const groups = new Map<string, ExerciseSet[]>();
  for (const s of sets) {
    const list = groups.get(s.exercise_id) ?? [];
    list.push(s);
    groups.set(s.exercise_id, list);
  }
  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 700 }}>
        {workout.title ||
          (workout.kind === "strength"
            ? "筋トレ"
            : workout.cardio_type === "run"
            ? "ラン"
            : workout.cardio_type === "walk"
            ? "ウォーク"
            : workout.cardio_type === "bike"
            ? "バイク"
            : "有酸素")}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, marginBottom: 14 }}>
        {fmtDateTime(workout.started_at)}
        {workout.duration_min ? ` · ${workout.duration_min}分` : ""}
        {workout.distance_km ? ` · ${workout.distance_km}km` : ""}
        {workout.avg_hr ? ` · 平均${workout.avg_hr}bpm` : ""}
        {" · 消費 "}
        <span className="num" style={{ color: "var(--move)", fontWeight: 600 }}>
          {workout.est_kcal ?? "—"} kcal
        </span>
      </div>

      {Array.from(groups.entries()).map(([exId, list]) => (
        <div key={exId} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{list[0].exercise_name}</div>
          <div className="num" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {list.map((s) => `${s.weight_kg ?? "—"}kg × ${s.reps ?? "—"}`).join("  ·  ")}
          </div>
        </div>
      ))}

      {workout.note && (
        <div
          style={{
            background: "var(--surface-2)",
            borderLeft: "3px solid var(--ai)",
            padding: "8px 10px",
            fontSize: 12,
            color: "var(--ink-2)",
            borderRadius: "0 6px 6px 0",
            marginTop: 12,
          }}
        >
          {workout.note}
        </div>
      )}
    </>
  );
}

function BodyDetail({ rec }: { rec: BodyRecord }) {
  const cells: [string, number | null][] = [
    ["体重 (kg)", rec.weight_kg],
    ["体脂肪率 (%)", rec.body_fat_pct],
    ["筋肉量 (kg)", rec.muscle_kg],
    ["内臓脂肪", rec.visceral_fat],
    ["基礎代謝 (kcal)", rec.bmr_kcal],
  ];
  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 700 }}>体組成</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, marginBottom: 14 }}>
        {fmtDateTime(rec.recorded_at)} · 手動記録
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {cells
          .filter(([, v]) => v != null)
          .map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 10px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--muted)" }}>{k}</span>
              <span className="num" style={{ fontWeight: 700 }}>
                {v}
              </span>
            </div>
          ))}
      </div>
    </>
  );
}

function ActivityDetail({ rec }: { rec: ActivityRecord }) {
  const cells: [string, string][] = [
    ["歩数", rec.steps != null ? `${Math.round(rec.steps).toLocaleString()} 歩` : "—"],
    ["消費カロリー", rec.active_kcal != null ? `${Math.round(Number(rec.active_kcal))} kcal` : "—"],
    ["移動距離", rec.distance_km != null ? `${rec.distance_km} km` : "—"],
  ];
  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 700 }}>歩数・活動</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, marginBottom: 14 }}>
        {fmtDateTime(rec.recorded_at)} · {rec.source === "photo" ? "写真記録" : "手動記録"}
        {rec.ai_confidence != null && (
          <span style={{ color: "var(--ai)", marginLeft: 6 }}>
            自信度 {Math.round(rec.ai_confidence * 100)}%
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {cells.map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 10px",
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--muted)" }}>{k}</span>
            <span className="num" style={{ fontWeight: 700 }}>
              {v}
            </span>
          </div>
        ))}
      </div>
      {rec.note && (
        <div
          style={{
            background: "var(--surface-2)",
            borderLeft: "3px solid var(--move)",
            padding: "8px 10px",
            fontSize: 12,
            color: "var(--ink-2)",
            borderRadius: "0 6px 6px 0",
            marginTop: 12,
          }}
        >
          {rec.note}
        </div>
      )}
      {rec.ai_note && (
        <div
          style={{
            background: "var(--surface-2)",
            borderLeft: "3px solid var(--ai)",
            padding: "8px 10px",
            fontSize: 12,
            color: "var(--ink-2)",
            borderRadius: "0 6px 6px 0",
            marginTop: 8,
          }}
        >
          {rec.ai_note}
        </div>
      )}
    </>
  );
}

function mealSource(s: string) {
  switch (s) {
    case "photo":
      return "写真記録";
    case "chain":
      return "チェーン店";
    default:
      return "手動記録";
  }
}
