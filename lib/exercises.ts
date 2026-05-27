import data from "@/data/exercises.json";
import type { Exercise } from "./types";

const RAW = data as unknown as { items: Exercise[] };

export const EXERCISES: Exercise[] = RAW.items;

export const BODY_PARTS = [
  { id: "chest", label: "胸" },
  { id: "back", label: "背中" },
  { id: "legs", label: "脚" },
  { id: "shoulders", label: "肩" },
  { id: "arms", label: "腕" },
  { id: "core", label: "腹" },
  { id: "other", label: "その他" },
] as const;

export const EQUIPMENT_LABELS: Record<Exercise["equipment"], string> = {
  barbell: "バーベル",
  dumbbell: "ダンベル",
  machine: "マシン",
  cable: "ケーブル",
  bodyweight: "自重",
  other: "その他",
};

// 起動時に1回だけ正規化。検索のたびに toLowerCase を全レコード分計算しない。
const NORMALIZED = EXERCISES.map((e) => ({
  ex: e,
  needle: [e.name, ...(e.aliases ?? [])].map((s) => s.toLowerCase()),
}));
const ID_INDEX = new Map(EXERCISES.map((e) => [e.id, e]));

export function findExercise(id: string): Exercise | null {
  return ID_INDEX.get(id) ?? null;
}

/**
 * 検索クエリで種目をフィルタ (名前 + エイリアスに対する includes マッチ)。
 */
export function searchExercises(query: string): Exercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISES;
  const result: Exercise[] = [];
  for (const { ex, needle } of NORMALIZED) {
    if (needle.some((n) => n.includes(q))) result.push(ex);
  }
  return result;
}

/**
 * ユーザーが入力した名前から最も近い既存種目を探す (完全一致 + エイリアス)。
 * 見つからなければ null を返し、カスタム種目として扱う想定。
 */
export function matchExerciseByName(name: string): Exercise | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  for (const { ex, needle } of NORMALIZED) {
    if (needle.includes(q)) return ex;
  }
  return null;
}

/**
 * 自由入力からカスタム種目を生成。id は "custom:<slug>"。
 */
export function buildCustomExercise(name: string): Exercise {
  const trimmed = name.trim().slice(0, 60);
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9ぁ-んァ-ヶ一-龯ー]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return {
    id: `custom:${slug || Date.now().toString(36)}`,
    name: trimmed,
    aliases: [],
    body_part: "other",
    equipment: "other",
    met: 4.0,
    custom: true,
  };
}
