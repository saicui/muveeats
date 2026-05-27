import { createClient } from "@/lib/supabase/server";
import type { Meal, Workout, BodyRecord, ExerciseSet } from "@/lib/types";
import { HistoryClient } from "./client";

export default async function HistoryPage() {
  let meals: Meal[] = [];
  let workouts: Workout[] = [];
  let bodyRecords: BodyRecord[] = [];
  let setsByWorkout: Record<string, ExerciseSet[]> = {};
  let connError: string | null = null;
  try {
    const supabase = await createClient();
    // workouts と exercise_sets を foreign-key join で 1 往復に統合 (旧実装は2段)
    const [r1, r2, r3] = await Promise.all([
      supabase
        .from("meals")
        .select("*")
        .order("eaten_at", { ascending: false })
        .limit(200),
      supabase
        .from("workouts")
        .select("*, exercise_sets(*)")
        .order("started_at", { ascending: false })
        .limit(100),
      supabase
        .from("body_records")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(100),
    ]);
    if (r1.error) throw r1.error;
    if (r2.error) throw r2.error;
    if (r3.error) throw r3.error;
    meals = (r1.data ?? []) as Meal[];
    bodyRecords = (r3.data ?? []) as BodyRecord[];

    type WorkoutWithSets = Workout & { exercise_sets?: ExerciseSet[] };
    const rawWorkouts = (r2.data ?? []) as WorkoutWithSets[];
    workouts = rawWorkouts.map(({ exercise_sets: _drop, ...w }) => w as Workout);
    for (const w of rawWorkouts) {
      if (w.exercise_sets && w.exercise_sets.length > 0) {
        setsByWorkout[w.id] = [...w.exercise_sets].sort(
          (a, b) => a.set_index - b.set_index,
        );
      }
    }
  } catch (e) {
    connError = e instanceof Error ? e.message : JSON.stringify(e);
  }

  return (
    <HistoryClient
      meals={meals}
      workouts={workouts}
      bodyRecords={bodyRecords}
      setsByWorkout={setsByWorkout}
      error={connError}
    />
  );
}
