import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * 直近 N 件のセットから種目別カウントを集計して、よく使う種目を上位に返す。
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ frequent: [] });
  }
  const { data, error } = await supabase
    .from("exercise_sets")
    .select("exercise_id,exercise_name")
    .order("recorded_at", { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json({ frequent: [], error: error.message });
  }
  const counts = new Map<
    string,
    { id: string; name: string; count: number }
  >();
  for (const row of data ?? []) {
    const cur = counts.get(row.exercise_id) ?? {
      id: row.exercise_id,
      name: row.exercise_name,
      count: 0,
    };
    cur.count += 1;
    counts.set(row.exercise_id, cur);
  }
  const frequent = Array.from(counts.values()).sort(
    (a, b) => b.count - a.count,
  );
  return NextResponse.json({ frequent: frequent.slice(0, 20) });
}
