import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-light";

const SYSTEM_PROMPT = `あなたはパーソナルトレーナー兼栄養士です。
ユーザーの体組成・活動量・目標を踏まえて、1日の推奨カロリーとマクロ栄養素を提案してください。
- 短く実用的に（200 文字以内の本文）
- 数値の根拠を 1 文だけ説明
- 推奨値は kcal / P (g) / F (g) / C (g) の 4 値
- 単純な目安として返すこと。医療助言はしない
`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING, description: "ユーザーへの短い返答" },
    suggestion: {
      type: Type.OBJECT,
      properties: {
        kcal: { type: Type.NUMBER },
        protein_g: { type: Type.NUMBER },
        fat_g: { type: Type.NUMBER },
        carbs_g: { type: Type.NUMBER },
      },
      required: ["kcal", "protein_g", "fat_g", "carbs_g"],
    },
  },
  required: ["reply", "suggestion"],
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY 未設定" }, { status: 500 });
  }
  const body = await req.json();
  const profile = body.profile ?? {};
  const message = (body.message ?? "").toString().slice(0, 800);

  const ctx = `# ユーザー情報
- 性別: ${profile.sex ?? "未設定"}
- 年齢: ${profile.age ?? "未設定"}
- 身長: ${profile.height_cm ?? "未設定"} cm
- 体重: ${profile.weight_kg ?? "未設定"} kg
- 活動レベル: ${profile.activity_level ?? "未設定"}
- 目標: ${profile.goal ?? "未設定"}

# ユーザーからの相談
${message || "（自由相談）"}`;

  const ai = new GoogleGenAI({ apiKey });
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT }, { text: ctx }],
        },
      ],
      config: { responseMimeType: "application/json", responseSchema },
    });
    const text = res.text ?? "";
    return NextResponse.json(JSON.parse(text));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Gemini エラー: ${message}` },
      { status: 502 },
    );
  }
}
