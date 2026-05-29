import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const SYSTEM_PROMPT = `あなたは画像認識のアシスタントです。
写真はスマートウォッチやヘルスケアアプリの画面 (ヘルスケア / フィットネスリング / 歩数計アプリなど) です。
以下の値が読み取れたら数値で返してください。読み取れない値は null にします。

- steps: 歩数 (歩、整数)
- active_kcal: 消費カロリー / アクティブカロリー / ムーブ (kcal)
- distance_km: 移動距離 (km。m 表示なら km に換算)

ルール:
- 画面に写っている数値以外を捏造しないこと。判別が難しい値は必ず null。
- 「アクティブ」「ムーブ」と表示されたカロリーを優先。無ければ「合計」消費カロリーを使う。
- 「1,234」のような桁区切りカンマは除去して整数にする。
- confidence は読み取り全体の自信度 (0..1)。
- note には読み取り上の注意点があれば簡潔に (なければ null)。`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    steps: { type: Type.NUMBER, nullable: true },
    active_kcal: { type: Type.NUMBER, nullable: true },
    distance_km: { type: Type.NUMBER, nullable: true },
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
