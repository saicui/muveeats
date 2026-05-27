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
