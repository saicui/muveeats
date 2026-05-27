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
    const [r1, r2, r3] = await Promise.all([
      supabase
        .from("meals")
        .select("*")
        .order("eaten_at", { ascending: false })
        .limit(200),
      supabase
        .from("workouts")
        .select("*")
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
    workouts = (r2.data ?? []) as Workout[];
    bodyRecords = (r3.data ?? []) as BodyRecord[];

    const ids = workouts.filter((w) => w.kind === "strength").map((w) => w.id);
    if (ids.length > 0) {
      const { data: setsRaw } = await supabase
        .from("exercise_sets")
        .select("*")
        .in("workout_id", ids)
        .order("set_index");
      for (const s of (setsRaw ?? []) as ExerciseSet[]) {
        const list = setsByWorkout[s.workout_id] ?? [];
        list.push(s);
        setsByWorkout[s.workout_id] = list;
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
