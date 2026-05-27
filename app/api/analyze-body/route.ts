import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_PROMPT = `あなたは画像認識のアシスタントです。
写真は体組成計（タニタ / オムロン / インボディなど）の表示画面です。
以下の値が読み取れたら数値で返してください。読み取れない値は null にします。

- weight_kg: 体重 (kg)
- body_fat_pct: 体脂肪率 (%)
- muscle_kg: 筋肉量 (kg)
- visceral_fat: 内臓脂肪レベル
- bmr_kcal: 基礎代謝 (kcal、整数)

画面に写っている数値以外を捏造しないこと。判別が難しい数値は必ず null。
confidence は読み取りの自信度 (0..1)。`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    weight_kg: { type: Type.NUMBER, nullable: true },
    body_fat_pct: { type: Type.NUMBER, nullable: true },
    muscle_kg: { type: Type.NUMBER, nullable: true },
    visceral_fat: { type: Type.NUMBER, nullable: true },
    bmr_kcal: { type: Type.NUMBER, nullable: true },
    confidence: { type: Type.NUMBER },
    note: { type: Type.STRING, nullable: true },
  },
  required: ["confidence"],
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY 未設定" }, { status: 500 });
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
      config: { responseMimeType: "application/json", responseSchema },
    });
    const text = response.text ?? "";
    return NextResponse.json(JSON.parse(text));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Gemini エラー: ${message}` },
      { status: 502 },
    );
  }
}
