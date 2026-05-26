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
