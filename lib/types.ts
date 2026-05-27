export type MealSource = "manual" | "photo" | "chain";

export type Meal = {
  id: string;
  user_id: string;
  eaten_at: string;
  name: string;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  chain_id: string | null;
  chain_name: string | null;
  item_id: string | null;
  size: string | null;
  source: MealSource;
  ai_confidence: number | null;
  ai_note: string | null;
  tags: string[];
  created_at: string;
};

export type ChainGenre =
  | "バーガー"
  | "牛丼・和食"
  | "カフェ"
  | "寿司"
  | "中華・ラーメン"
  | "ピザ"
  | "ファミレス"
  | "コンビニ"
  | "ファストフード"
  | "その他";

/**
 * data/chains/*.json の一品目に対応する型。
 * size は元の name から抽出した値（並盛 / Tall / Hot 等）。
 * display_name は size を除いた基本名。
 */
export type ChainItem = {
  chain_id: string;
  chain_name: string;
  chain_genre: ChainGenre[];
  source_url: string;
  fetched_at: string;
  id: string;
  name: string;            // オリジナルのアイテム名
  display_name: string;    // サイズ語を除いた本体名
  size: string[];          // 抽出されたサイズ語の配列（"Hot" "Tall" "並盛" など）
  aliases: string[];
  category: string | null;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  salt_g: number | null;
};

export type AnalysisResult = {
  name: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  confidence: number;
  notes?: string;
  tags?: string[];
};

export type WorkoutKind = "strength" | "cardio";
export type CardioType = "run" | "walk" | "bike" | "other";
export type Intensity = "low" | "mid" | "high";

export type Workout = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_min: number | null;
  kind: WorkoutKind;
  title: string | null;
  cardio_type: CardioType | null;
  distance_km: number | null;
  avg_hr: number | null;
  intensity: Intensity | null;
  est_kcal: number | null;
  note: string | null;
  created_at: string;
};

export type ExerciseSet = {
  id: string;
  workout_id: string;
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  recorded_at: string;
};

export type BodyRecord = {
  id: string;
  user_id: string;
  recorded_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_kg: number | null;
  visceral_fat: number | null;
  bmr_kcal: number | null;
  note: string | null;
  created_at: string;
};

export type Profile = {
  user_id: string;
  display_name: string | null;
  sex: "male" | "female" | "other" | null;
  age: number | null;
  height_cm: number | null;
  activity_level: "low" | "mid" | "high" | null;
  goal: "cut" | "maintain" | "bulk" | null;
  target_kcal: number | null;
  target_protein_g: number | null;
  target_fat_g: number | null;
  target_carbs_g: number | null;
  theme: string | null;
  updated_at: string;
};

export type MealTemplate = {
  id: string;
  user_id: string;
  label: string;
  default_time: string | null;
  name: string;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  chain_id: string | null;
  chain_name: string | null;
  item_id: string | null;
  size: string | null;
  tags: string[];
  enabled: boolean;
  sort_order: number;
  created_at: string;
};

export type MealTemplateSkip = {
  user_id: string;
  template_id: string;
  skip_date: string; // YYYY-MM-DD
  created_at: string;
};

export type Exercise = {
  id: string;
  name: string;
  aliases?: string[];
  body_part:
    | "chest"
    | "back"
    | "legs"
    | "shoulders"
    | "arms"
    | "core"
    | "other";
  equipment: "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "other";
  met: number; // 単発種目の代表 MET
  custom?: boolean; // ユーザーが作ったカスタム種目
};

/** strength テンプレの payload。種目ごとに任意数のセットを並べる。 */
export type StrengthTemplatePayload = {
  exercises: {
    exercise_id: string;
    exercise_name: string;
    sets: { weight_kg: number | null; reps: number | null }[];
  }[];
};

/** cardio テンプレの payload。 */
export type CardioTemplatePayload = {
  cardio_type: CardioType;
  title: string | null;
  duration_min: number | null;
  distance_km: number | null;
  avg_hr: number | null;
  intensity: Intensity | null;
};

export type WorkoutTemplate = {
  id: string;
  user_id: string;
  label: string;
  kind: WorkoutKind;
  payload: StrengthTemplatePayload | CardioTemplatePayload;
  enabled: boolean;
  sort_order: number;
  created_at: string;
};
