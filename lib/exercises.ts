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

export function findExercise(id: string): Exercise | null {
  return EXERCISES.find((e) => e.id === id) ?? null;
}

/**
 * 検索クエリで種目をフィルタする（名前 + エイリアス + 部位ラベルにマッチ）。
 */
export function searchExercises(query: string): Exercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISES;
  return EXERCISES.filter((e) => {
    if (e.name.toLowerCase().includes(q)) return true;
    if (e.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
    return false;
  });
}

/**
 * ユーザーが入力した名前から最も近い既存種目を探す（完全一致 + エイリアス）。
 * 見つからなければ null を返し、カスタム種目として扱う想定。
 */
export function matchExerciseByName(name: string): Exercise | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return (
    EXERCISES.find(
      (e) =>
        e.name.toLowerCase() === q ||
        e.aliases?.some((a) => a.toLowerCase() === q),
    ) ?? null
  );
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
