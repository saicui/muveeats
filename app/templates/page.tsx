import { createClient } from "@/lib/supabase/server";
import type { MealTemplate, MealTemplateSkip } from "@/lib/types";
import { TemplatesClient } from "./client";

export default async function TemplatesPage() {
  let templates: MealTemplate[] = [];
  let todaySkips: MealTemplateSkip[] = [];
  let connError: string | null = null;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const supabase = await createClient();
    const [t, s] = await Promise.all([
      supabase.from("meal_templates").select("*").order("sort_order"),
      supabase
        .from("meal_template_skips")
        .select("*")
        .eq("skip_date", today),
    ]);
    if (t.error) throw t.error;
    templates = (t.data ?? []) as MealTemplate[];
    todaySkips = (s.data ?? []) as MealTemplateSkip[];
  } catch (e) {
    connError = e instanceof Error ? e.message : JSON.stringify(e);
  }

  return (
    <TemplatesClient
      templates={templates}
      todaySkips={todaySkips}
      todayISO={today}
      error={connError}
    />
  );
}
