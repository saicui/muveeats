export type Meal = {
  id: string;
  user_id: string | null;
  eaten_at: string;
  name: string;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  photo_url: string | null;
  notes: string | null;
  source: "manual" | "photo";
  created_at: string;
};

export type AnalysisResult = {
  name: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  confidence: number;
  notes?: string;
};
