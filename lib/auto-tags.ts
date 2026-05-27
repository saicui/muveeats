/**
 * 食事タグの自動推論。
 * チェーン店記録 / 手動記録時に、PFC とメタデータからタグを推測する。
 * tags.json の事前定義ラベルから選ぶので、表記揺れしない。
 */

import type { ChainGenre } from "./types";

type NutritionInput = {
  name?: string;
  calories?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  carbs_g?: number | null;
};

/** PFC バランスから栄養バランスタグを推測。 */
export function inferMacroTags(n: NutritionInput): string[] {
  const tags: string[] = [];
  const kcal = n.calories ?? 0;
  const p = n.protein_g ?? 0;
  const f = n.fat_g ?? 0;
  const c = n.carbs_g ?? 0;

  // タンパク質: 絶対量 or カロリー比率
  if (p >= 30 || (kcal > 0 && (p * 4) / kcal >= 0.25)) tags.push("高タンパク");

  // 脂質
  if (f <= 10 && kcal >= 200) tags.push("低脂質");
  if (f >= 25) tags.push("脂質高め");

  // 糖質
  if (c <= 20 && kcal >= 200) tags.push("低糖質");
  if (c >= 80) tags.push("糖質高め");

  // バランス良: PFC のいずれもが標準範囲内 (タンパク 15-30%, 脂質 20-35%, 炭水化物 45-60%)
  if (kcal >= 300) {
    const pp = (p * 4) / kcal;
    const fp = (f * 9) / kcal;
    const cp = (c * 4) / kcal;
    const inRange =
      pp >= 0.13 &&
      pp <= 0.32 &&
      fp >= 0.18 &&
      fp <= 0.4 &&
      cp >= 0.4 &&
      cp <= 0.65;
    if (inRange && !tags.includes("脂質高め") && !tags.includes("糖質高め")) {
      tags.push("バランス良");
    }
  }

  return tags;
}

/** 食事メタ（チェーン情報・記録ソース）からシーン系タグを推測。 */
export function inferSceneTags(meta: {
  chainGenres?: ChainGenre[];
  source: "manual" | "photo" | "chain";
}): string[] {
  const tags: string[] = [];
  if (meta.source === "chain") {
    tags.push("外食", "チェーン店");
    if (meta.chainGenres?.includes("ファストフード")) {
      tags.push("ファストフード");
    }
    if (meta.chainGenres?.includes("コンビニ")) {
      tags.push("コンビニ");
    }
    if (meta.chainGenres?.includes("カフェ")) {
      tags.push("カフェ");
    }
  }
  return tags;
}

/** 食事の時刻から朝食 / 昼食 / 夕食 / 間食 / 夜食 のいずれか1つを推測。 */
export function inferTimingTag(at: Date = new Date()): string {
  const h = at.getHours();
  if (h < 4) return "夜食";
  if (h < 10) return "朝食";
  if (h < 14) return "昼食";
  if (h < 17) return "間食";
  if (h < 22) return "夕食";
  return "夜食";
}

/** 名前から飲料 / 揚げ物 / 甘味 など簡易な食材タグを推測 (キーワード探索)。 */
export function inferIngredientTags(name: string): string[] {
  if (!name) return [];
  const tags: string[] = [];
  const has = (...keywords: string[]) =>
    keywords.some((k) => name.includes(k));

  if (has("揚げ", "フライ", "天ぷら", "唐揚げ", "ポテト", "ナゲット"))
    tags.push("揚げ物");
  if (has("焼き", "ステーキ", "グリル", "焙煎")) tags.push("焼き物");
  if (has("生", "刺身", "寿司", "刺し身")) tags.push("生もの");
  if (has("ヨーグルト", "納豆", "キムチ", "味噌", "チーズ"))
    tags.push("発酵食品");
  if (has("ケーキ", "ドーナツ", "アイス", "チョコ", "シュガー", "クリーム"))
    tags.push("甘味");
  if (has("辛", "麻辣", "キムチ", "唐辛子", "ペッパー")) tags.push("辛い");

  if (has("コーヒー", "エスプレッソ", "カフェオレ", "カプチーノ", "ラテ"))
    tags.push("コーヒー");
  if (has("ジュース", "コーラ", "サイダー", "ソーダ")) tags.push("ジュース");
  if (has("ビール", "ワイン", "酒", "ハイボール", "焼酎", "サワー"))
    tags.push("アルコール");
  if (has("プロテイン", "シェイク")) tags.push("プロテイン");

  if (has("サラダ", "野菜")) tags.push("野菜多め");

  return tags;
}

/** 全部まとめて推測。重複は除去して順序保持で返す。 */
export function inferAllTags(args: {
  nutrition: NutritionInput;
  source: "manual" | "photo" | "chain";
  chainGenres?: ChainGenre[];
  at?: Date;
}): string[] {
  const tags: string[] = [];
  tags.push(...inferMacroTags(args.nutrition));
  tags.push(...inferSceneTags({ source: args.source, chainGenres: args.chainGenres }));
  if (args.nutrition.name) tags.push(...inferIngredientTags(args.nutrition.name));
  tags.push(inferTimingTag(args.at));

  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of tags) {
    if (!seen.has(t)) {
      seen.add(t);
      result.push(t);
    }
  }
  return result;
}
