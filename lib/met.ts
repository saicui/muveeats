/**
 * MET 法で消費カロリーを概算する。
 *   kcal ≈ MET × 体重(kg) × 時間(時間)
 *
 * MET 値は Compendium of Physical Activities をベースに代表値。
 * 実測値ではないので、ユーザーには「目安」と表示する。
 */

import type { CardioType, Intensity, Exercise } from "./types";

const DEFAULT_WEIGHT_KG = 65; // 体組成記録が無い場合のフォールバック

const CARDIO_MET: Record<CardioType, Record<Intensity, number>> = {
  run: { low: 6.0, mid: 8.3, high: 11.0 },
  walk: { low: 2.8, mid: 3.5, high: 4.3 },
  bike: { low: 4.0, mid: 6.8, high: 9.0 },
  other: { low: 3.5, mid: 5.0, high: 7.0 },
};

export function cardioMET(type: CardioType, intensity: Intensity): number {
  return CARDIO_MET[type]?.[intensity] ?? 5.0;
}

export function estimateCardioKcal(p: {
  type: CardioType;
  intensity: Intensity;
  durationMin: number;
  bodyWeightKg?: number | null;
}): number {
  const w = p.bodyWeightKg ?? DEFAULT_WEIGHT_KG;
  const hours = p.durationMin / 60;
  return Math.round(cardioMET(p.type, p.intensity) * w * hours);
}

/**
 * 筋トレセッションの消費 kcal を、種目別 MET の加重平均 × 時間で概算。
 * セット数ではなく実測時間ベースなので、休憩込みのセッション時間を渡す想定。
 */
export function estimateStrengthKcal(p: {
  exercises: Exercise[]; // セッション内で扱った種目（重複可）
  durationMin: number;
  bodyWeightKg?: number | null;
}): number {
  if (!p.exercises.length) return 0;
  const w = p.bodyWeightKg ?? DEFAULT_WEIGHT_KG;
  const avgMet =
    p.exercises.reduce((acc, e) => acc + e.met, 0) / p.exercises.length;
  return Math.round(avgMet * w * (p.durationMin / 60));
}

/**
 * Mifflin-St Jeor 式の基礎代謝。プロフィール画面で参考値として表示。
 */
export function estimateBMR(p: {
  sex: "male" | "female" | "other";
  age: number;
  heightCm: number;
  weightKg: number;
}): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  switch (p.sex) {
    case "male":
      return Math.round(base + 5);
    case "female":
      return Math.round(base - 161);
    default:
      return Math.round(base - 78); // 平均
  }
}

export function estimateTDEE(bmr: number, level: "low" | "mid" | "high"): number {
  const factor = level === "low" ? 1.375 : level === "mid" ? 1.55 : 1.725;
  return Math.round(bmr * factor);
}
