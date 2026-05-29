import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Workout, ExerciseSet } from "@/lib/types";
import { Icon } from "@/app/icons";
import { fmtTime } from "@/lib/format";

export default async function WorkoutsPage() {
  let workouts: Workout[] = [];
  const setsByWorkout: Map<string, ExerciseSet[]> = new Map();
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
      <h1 className="page-title">運動</h1>
      <p className="page-subtitle">記録する種目を選びましょう</p>

      {/* 記録チューザー (中央上部・大きめ) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginTop: 12,
          marginBottom: 22,
        }}
      >
        <RecordChoice href="/workouts/new" icon="dumbbell" label="筋トレ" sub="セット記録" />
        <RecordChoice href="/cardio/new" icon="run" label="有酸素" sub="時間・距離" />
        <RecordChoice href="/activity/new" icon="footprints" label="歩数" sub="活動・消費" />
      </div>

      <div className="section-title">
        <span>セッション履歴</span>
        <Link
          href="/workouts/templates"
          className="aux"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ink-2)" }}
        >
          <Icon name="edit" size="sm" />
          テンプレ管理 / 開始
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

function RecordChoice({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: "dumbbell" | "run" | "footprints";
  label: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "18px 8px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        textDecoration: "none",
        color: "var(--ink)",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 46,
          height: 46,
          borderRadius: 999,
          background: "var(--surface-2)",
          color: "var(--move)",
        }}
      >
        <Icon name={icon} size="lg" />
      </span>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 10, color: "var(--muted)" }}>{sub}</div>
    </Link>
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
