import { createClient } from "@/lib/supabase/server";
import type { Meal } from "@/lib/types";
import Link from "next/link";

function sum(meals: Meal[], key: keyof Meal) {
  return meals.reduce((acc, m) => acc + (Number(m[key]) || 0), 0);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function DashboardPage() {
  let meals: Meal[] = [];
  let connError: string | null = null;

  try {
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .gte("eaten_at", since.toISOString())
      .order("eaten_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    meals = (data ?? []) as Meal[];
  } catch (e) {
    if (e instanceof Error) {
      connError = e.message;
    } else if (e && typeof e === "object") {
      connError = JSON.stringify(e);
    } else {
      connError = String(e);
    }
  }

  const today = startOfDay(new Date());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const todayMeals = meals.filter((m) => new Date(m.eaten_at) >= today);
  const weekMeals = meals.filter((m) => new Date(m.eaten_at) >= weekAgo);

  return (
    <div className="space-y-6">
      <section className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">今日のサマリー</h1>
          <p className="text-sm text-neutral-500">
            {new Date().toLocaleDateString("ja-JP", { dateStyle: "long" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/analyze"
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            📷 写真から記録
          </Link>
          <Link
            href="/log"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
          >
            ＋ 手動で記録
          </Link>
        </div>
      </section>

      {connError && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Supabase に接続できませんでした: {connError}
          <div className="mt-1 text-xs">
            <code>.env.local</code> を設定し、
            <code>supabase/schema.sql</code> を Supabase で実行してください。
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="今日のカロリー" value={`${Math.round(sum(todayMeals, "calories"))} kcal`} />
        <Card label="今日のたんぱく質" value={`${sum(todayMeals, "protein_g").toFixed(1)} g`} />
        <Card label="7日平均 kcal" value={`${Math.round(sum(weekMeals, "calories") / 7)} kcal`} />
        <Card label="記録件数 (7日)" value={`${weekMeals.length} 件`} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">最近の食事</h2>
        {meals.length === 0 ? (
          <p className="text-sm text-neutral-500">
            まだ記録がありません。写真から、または手動で1食追加してみましょう。
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
            {meals.slice(0, 10).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-neutral-500">
                    {new Date(m.eaten_at).toLocaleString("ja-JP")}
                    {m.source === "photo" && <span className="ml-2">📷</span>}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">
                    {m.calories ? `${Math.round(m.calories)} kcal` : "—"}
                  </div>
                  <div className="text-xs text-neutral-500">
                    P{m.protein_g ?? 0} / F{m.fat_g ?? 0} / C{m.carbs_g ?? 0}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
