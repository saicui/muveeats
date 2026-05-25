import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_PROMPT = `あなたは管理栄養士です。提供された食事写真を解析し、
1. 写っている料理名（最も代表的なものを1つ、日本語で）
2. 1食分の推定カロリー（kcal、整数）
3. 推定マクロ栄養素（タンパク質/脂質/炭水化物、それぞれg、小数1桁）
4. 推定の自信度（0.0〜1.0）
5. 補足メモ（量の根拠など、簡潔に）
をJSONで返してください。複数品目が写っていれば合算してください。`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    calories: { type: Type.NUMBER },
    protein_g: { type: Type.NUMBER },
    fat_g: { type: Type.NUMBER },
    carbs_g: { type: Type.NUMBER },
    confidence: { type: Type.NUMBER },
    notes: { type: Type.STRING },
  },
  required: ["name", "calories", "protein_g", "fat_g", "carbs_g", "confidence"],
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY が設定されていません" },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "画像が見つかりません" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  const mimeType = file.type || "image/jpeg";

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            { inlineData: { mimeType, data: bytes } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const text = response.text ?? "";
    const parsed = JSON.parse(text) as AnalysisResult;
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Gemini 解析に失敗しました: ${message}` },
      { status: 502 },
    );
  }
}
