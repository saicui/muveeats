"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/app/icons";
import { createClient } from "@/lib/supabase/client";
import type { Meal, Workout, BodyRecord, ExerciseSet } from "@/lib/types";

type Filter = "all" | "eat" | "move" | "body";

type EntryKind = "meal" | "workout" | "body";
type Entry =
  | { kind: "meal"; at: string; data: Meal }
  | { kind: "workout"; at: string; data: Workout; sets: ExerciseSet[] }
  | { kind: "body"; at: string; data: BodyRecord };

const PAGE_SIZE = 20;

export function HistoryClient({
  meals: initialMeals,
  workouts: initialWorkouts,
  bodyRecords: initialBody,
  setsByWorkout: initialSets,
  error,
}: {
  meals: Meal[];
  workouts: Workout[];
  bodyRecords: BodyRecord[];
  setsByWorkout: Record<string, ExerciseSet[]>;
  error: string | null;
}) {
  const [meals, setMeals] = useState(initialMeals);
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [body, setBody] = useState(initialBody);
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
      ...body.map<Entry>((b) => ({
        kind: "body",
        at: b.recorded_at,
        data: b,
      })),
    ];
    all.sort((a, b) => +new Date(b.at) - +new Date(a.at));
    if (filter === "all") return all;
    if (filter === "eat") return all.filter((e) => e.kind === "meal");
    if (filter === "move") return all.filter((e) => e.kind === "workout");
    return all.filter((e) => e.kind === "body");
  }, [meals, workouts, body, setsByWorkout, filter]);

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
      : entry.kind === "workout"
      ? "var(--move)"
      : "var(--body)";

  let name: string;
  let meta: string;
  let primary: string;
  let sub: string | undefined;

  if (entry.kind === "meal") {
    const m = entry.data;
    name = m.name + (m.size ? ` ${m.size}` : "");
    meta = `${new Date(m.eaten_at).toLocaleTimeString("ja-JP", { timeStyle: "short" })} · ${m.chain_name ?? mealSource(m.source)}`;
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
    meta = `${new Date(w.started_at).toLocaleTimeString("ja-JP", { timeStyle: "short" })} · ${tags.join(" · ")}`;
    primary = w.est_kcal != null ? `−${Math.round(Number(w.est_kcal))} kcal` : "—";
  } else {
    const b = entry.data;
    name = `体組成 ${b.weight_kg ?? "—"}kg`;
    meta = `${new Date(b.recorded_at).toLocaleTimeString("ja-JP", { timeStyle: "short" })} · 手動記録`;
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
}: {
  entry: Entry;
  onClose: () => void;
  onDelete: () => void;
  onTemplatize: () => void;
}) {
  // テンプレ化できる: 食事すべて / 筋トレ (strength) のみ
  const canTemplatize =
    entry.kind === "meal" ||
    (entry.kind === "workout" && entry.data.kind === "strength");

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ padding: "8px 18px 20px" }}>
          {entry.kind === "meal" && <MealDetail meal={entry.data} />}
          {entry.kind === "workout" && (
            <WorkoutDetail workout={entry.data} sets={entry.sets} />
          )}
          {entry.kind === "body" && <BodyDetail rec={entry.data} />}

          {canTemplatize && (
            <button
              className="btn btn-block"
              style={{ marginTop: 16, justifyContent: "center" }}
              onClick={onTemplatize}
            >
              <Icon name="plus" size="sm" />
              テンプレに追加
            </button>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: canTemplatize ? 8 : 16 }}>
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
        </div>
      </div>
    </div>
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
        <span>
          {new Date(meal.eaten_at).toLocaleString("ja-JP", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </span>
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
        {new Date(workout.started_at).toLocaleString("ja-JP", {
          dateStyle: "long",
          timeStyle: "short",
        })}
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
        {new Date(rec.recorded_at).toLocaleString("ja-JP", {
          dateStyle: "long",
          timeStyle: "short",
        })}{" "}
        · 手動記録
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
