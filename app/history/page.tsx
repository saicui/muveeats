import { createClient } from "@/lib/supabase/server";
import type { Meal } from "@/lib/types";
import { HistoryClient } from "./client";

export default async function HistoryPage() {
  let meals: Meal[] = [];
  let connError: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .order("eaten_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    meals = (data ?? []) as Meal[];
  } catch (e) {
    if (e instanceof Error) connError = e.message;
    else connError = JSON.stringify(e);
  }

  return <HistoryClient meals={meals} error={connError} />;
}
