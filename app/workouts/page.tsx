import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Workout, ExerciseSet } from "@/lib/types";
import { Icon } from "@/app/icons";
import { fmtTime } from "@/lib/format";

export default async function WorkoutsPage() {
  let workouts: Workout[] = [];
  let setsByWorkout: Map<string, ExerciseSet[]> = new Map();
  let connError: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    workouts = (data ?? []) as Workout[];
    const ids = workouts.filter((w) => w.kind === "strength").map((w) => w.id);
    if (ids.length > 0) {
      const { data: sets } = await supabase
        .from("exercise_sets")
        .select("*")
        .in("workout_id", ids)
        .order("set_index");
      for (const s of (sets ?? []) as ExerciseSet[]) {
        const list = setsByWorkout.get(s.workout_id) ?? [];
        list.push(s);
        setsByWorkout.set(s.workout_id, list);
      }
    }
  } catch (e) {
    connError = e instanceof Error ? e.message : JSON.stringify(e);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
        }}
      >
        <h1 className="page-title">運動</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/workouts/new" className="btn btn-primary">
            <Icon name="dumbbell" size="sm" />
            筋トレ
          </Link>
          <Link href="/cardio/new" className="btn">
            <Icon name="run" size="sm" />
            有酸素
          </Link>
        </div>
      </div>
      <p className="page-subtitle">セッション履歴</p>
      <div style={{ marginTop: 6, marginBottom: 12 }}>
        <Link
          href="/workouts/templates"
          className="btn"
          style={{ fontSize: 12, padding: "6px 10px" }}
        >
          <Icon name="edit" size="sm" />
          テンプレを管理 / 開始
        </Link>
      </div>

      {connError && (
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
          {connError}
        </div>
      )}

      {workouts.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            border: "1px dashed var(--line)",
            borderRadius: 12,
            background: "var(--surface)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>記録がありません</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            筋トレ・有酸素のどちらかから記録を始めましょう
          </div>
        </div>
      ) : (
        workouts.map((w) => (
          <WorkoutCard key={w.id} workout={w} sets={setsByWorkout.get(w.id) ?? []} />
        ))
      )}
    </div>
  );
}

function WorkoutCard({
  workout,
  sets,
}: {
  workout: Workout;
  sets: ExerciseSet[];
}) {
  const date = new Date(workout.started_at);
  const isStrength = workout.kind === "strength";
  const accent = isStrength ? "var(--move)" : "var(--move)";

  // 種目ごとにグルーピング
  const groups = new Map<string, ExerciseSet[]>();
  for (const s of sets) {
    const list = groups.get(s.exercise_id) ?? [];
    list.push(s);
    groups.set(s.exercise_id, list);
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: sets.length > 0 ? "1px solid var(--line)" : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 3,
              height: 28,
              borderRadius: 2,
              background: accent,
            }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {workout.title ||
                (isStrength
                  ? "筋トレ"
                  : workout.cardio_type === "run"
                  ? "ラン"
                  : workout.cardio_type === "walk"
                  ? "ウォーク"
                  : workout.cardio_type === "bike"
                  ? "バイク"
                  : "有酸素")}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {date.toLocaleDateString("ja-JP", {
                month: "short",
                day: "numeric",
                weekday: "short",
              })}
              {" "}
              {fmtTime(date)}
              {workout.duration_min ? ` · ${workout.duration_min}分` : ""}
              {!isStrength && workout.distance_km
                ? ` · ${workout.distance_km}km`
                : ""}
            </div>
          </div>
        </div>
        <div className="num" style={{ fontSize: 13, color: "var(--move)", fontWeight: 600 }}>
          {workout.est_kcal ? `−${workout.est_kcal} kcal` : "—"}
        </div>
      </div>

      {sets.length > 0 && (
        <div style={{ padding: "8px 14px 12px" }}>
          {Array.from(groups.entries()).map(([exId, list]) => (
            <div key={exId} style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                {list[0].exercise_name}
              </div>
              <div className="num" style={{ fontSize: 11, color: "var(--muted)" }}>
                {list
                  .map((s) => `${s.weight_kg ?? "—"}kg×${s.reps ?? "—"}`)
                  .join("  ·  ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
