import { createClient } from "@/lib/supabase/server";
import type { WorkoutTemplate } from "@/lib/types";
import { WorkoutTemplatesClient } from "./client";

export default async function WorkoutTemplatesPage() {
  let templates: WorkoutTemplate[] = [];
  let error: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error: e } = await supabase
      .from("workout_templates")
      .select("*")
      .order("sort_order");
    if (e) throw e;
    templates = (data ?? []) as WorkoutTemplate[];
  } catch (e) {
    error = e instanceof Error ? e.message : JSON.stringify(e);
  }

  return <WorkoutTemplatesClient templates={templates} error={error} />;
}
