import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult } from "@/lib/types";
import { TAG_CATEGORIES } from "@/lib/tags";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const TAG_LABELS = TAG_CATEGORIES.filter((c) => c.id !== "genre")
  .flatMap((c) => c.tags.map((t) => t.label));

const SYSTEM_PROMPT = `あなたは管理栄養士です。ユーザーが説明する食事 / 飲み会内容から、
合計の栄養素を概算してください。

ルール:
- name: 食事全体を表す短いラベル (例: "居酒屋コース 3時間 / ビール3杯+唐揚げ+刺身+ラーメン")
- calories / protein_g / fat_g / carbs_g: 合計値の概算 (整数 or 小数1桁)
- confidence: 0.0〜0.7 (画像なし時は 0.5 を上限)
- notes: 内訳の根拠を 1〜2 文。曖昧さも明示する
- tags: 以下のリストから該当するものだけ:
${TAG_LABELS.join(" / ")}
- 飲み会・コース料理は多めに見積もる傾向で、迷ったら控えめに保守的に
- ユーザーが量を明示しないアルコールは中ジョッキ換算

JSON で返答してください。`;

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
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
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
  const description = String(form.get("description") ?? "").trim();
  const genre = String(form.get("genre") ?? "").trim();
  const image = form.get("image");

  if (!description && !(image instanceof File)) {
    return NextResponse.json(
      { error: "説明文かメニュー画像のいずれかを入力してください" },
      { status: 400 },
    );
  }

  const userParts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: SYSTEM_PROMPT }];

  const userText: string[] = [];
  if (genre) userText.push(`ジャンル: ${genre}`);
  if (description) userText.push(`内容: ${description}`);
  userText.push("\n上記から合計栄養素を概算してください。");
  userParts.push({ text: userText.join("\n") });

  if (image instanceof File) {
    const bytes = Buffer.from(await image.arrayBuffer()).toString("base64");
    userParts.push({
      inlineData: { mimeType: image.type || "image/jpeg", data: bytes },
    });
    userParts.push({
      text: "添付画像はメニュー表 / 会計伝票 / 料理写真のいずれかです。読み取れる情報を優先的に使ってください。",
    });
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: userParts }],
      config: { responseMimeType: "application/json", responseSchema },
    });
    const text = response.text ?? "";
    const parsed = JSON.parse(text) as AnalysisResult;
    const allowed = new Set(TAG_LABELS);
    if (Array.isArray(parsed.tags)) {
      parsed.tags = parsed.tags.filter((t) => allowed.has(t));
    }
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `AI 概算に失敗しました: ${message}` },
      { status: 502 },
    );
  }
}
