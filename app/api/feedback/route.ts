import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import type { Meal, Workout, BodyRecord, Profile } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const SYSTEM_PROMPT = `あなたは管理栄養士兼パーソナルトレーナーです。
ユーザーの直近 7 日間の食事・運動・体組成データと目標を踏まえて、
具体的かつ実践的なフィードバックを返してください。

ルール:
- 文章は丁寧語で 250 文字以内
- 抽象的な激励は禁止。実際の数値に言及する
- 良い点 1 つ → 改善点 1 つ → 明日の具体的なアクション 1 つの順で
- カロリーやマクロは 1 桁 kcal / g 単位で具体的に
- 体組成記録がない場合は触れない

JSON で返答してください。`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: "1行サマリ (20文字以内)" },
    good: { type: Type.STRING, description: "良かった点" },
    improve: { type: Type.STRING, description: "改善できる点" },
    action: { type: Type.STRING, description: "明日試すと良い具体的なアクション" },
  },
  required: ["headline", "good", "improve", "action"],
};

function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function POST(_req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY が設定されていません" },
      { status: 500 },
    );
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "サインインが必要です" }, { status: 401 });
  }
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [r1, r2, r3, r4] = await Promise.all([
    supabase
      .from("meals")
      .select("*")
      .gte("eaten_at", since.toISOString())
      .order("eaten_at", { ascending: false })
      .limit(100),
    supabase
      .from("workouts")
      .select("*")
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false })
      .limit(50),
    supabase
      .from("body_records")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(7),
    supabase.from("profiles").select("*").maybeSingle(),
  ]);
  const meals = (r1.data ?? []) as Meal[];
  const workouts = (r2.data ?? []) as Workout[];
  const body = (r3.data ?? []) as BodyRecord[];
  const profile = (r4.data ?? null) as Profile | null;

  if (meals.length === 0 && workouts.length === 0 && body.length === 0) {
    return NextResponse.json(
      { error: "まだ記録がありません。先に食事 / 運動 / 体組成のいずれかを記録してください。" },
      { status: 400 },
    );
  }

  // 日次に集約
  const byDay = new Map<string, { kcal: number; p: number; f: number; c: number; burn: number; workoutKinds: Set<string> }>();
  for (const m of meals) {
    const key = isoDateLocal(new Date(m.eaten_at));
    const e = byDay.get(key) ?? { kcal: 0, p: 0, f: 0, c: 0, burn: 0, workoutKinds: new Set() };
    e.kcal += Number(m.calories) || 0;
    e.p += Number(m.protein_g) || 0;
    e.f += Number(m.fat_g) || 0;
    e.c += Number(m.carbs_g) || 0;
    byDay.set(key, e);
  }
  for (const w of workouts) {
    const key = isoDateLocal(new Date(w.started_at));
    const e = byDay.get(key) ?? { kcal: 0, p: 0, f: 0, c: 0, burn: 0, workoutKinds: new Set() };
    e.burn += Number(w.est_kcal) || 0;
    e.workoutKinds.add(w.kind);
    byDay.set(key, e);
  }
  const dayLines = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => {
      const kinds =
        v.workoutKinds.size > 0 ? ` 運動: ${Array.from(v.workoutKinds).join("+")}` : "";
      return `${day} 摂取 ${Math.round(v.kcal)}kcal (P${Math.round(v.p)}/F${Math.round(v.f)}/C${Math.round(v.c)}) 消費 ${Math.round(v.burn)}kcal${kinds}`;
    });

  // 食事頻度トップ 5
  const nameCount = new Map<string, number>();
  for (const m of meals) nameCount.set(m.name, (nameCount.get(m.name) ?? 0) + 1);
  const topMeals = Array.from(nameCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n, c]) => `${n}×${c}`)
    .join(", ");

  const latestBody = body[0];
  const bodyLine = latestBody
    ? `最新体組成 (${isoDateLocal(new Date(latestBody.recorded_at))}): 体重${latestBody.weight_kg ?? "—"}kg / 体脂肪${latestBody.body_fat_pct ?? "—"}%`
    : "体組成記録なし";

  const targetLine = profile?.target_kcal
    ? `目標 ${profile.target_kcal}kcal / P${profile.target_protein_g ?? "—"} F${profile.target_fat_g ?? "—"} C${profile.target_carbs_g ?? "—"}, goal=${profile.goal ?? "未設定"}`
    : "目標未設定";

  const userText = [
    `期間: 直近 7 日`,
    targetLine,
    bodyLine,
    `日次サマリ:`,
    ...dayLines,
    `よく食べた: ${topMeals || "—"}`,
  ].join("\n");

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT }, { text: userText }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });
    const parsed = JSON.parse(response.text ?? "{}");
    return NextResponse.json({
      ...parsed,
      stats: {
        days: byDay.size,
        meals: meals.length,
        workouts: workouts.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `フィードバック生成に失敗しました: ${message}` },
      { status: 502 },
    );
  }
}
