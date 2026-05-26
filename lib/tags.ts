import tagsJson from "@/data/tags.json";

export type TagDef = { id: string; label: string };
export type TagCategoryId =
  | "genre"
  | "macro"
  | "ingredient"
  | "scene"
  | "timing"
  | "cuisine"
  | "drink";

export type TagCategory = {
  id: TagCategoryId;
  label: string;
  tags: TagDef[];
};

const RAW = tagsJson as unknown as {
  categories: { id: string; label: string; tags: TagDef[] }[];
};

/**
 * "ジャンル" は自動付与専用で tags.json には入れていないので、UI 上で先頭に
 * 追加する。data/chain-genres.json と整合する固定リスト。
 */
const GENRE_CATEGORY: TagCategory = {
  id: "genre",
  label: "ジャンル",
  tags: [
    { id: "burger", label: "バーガー" },
    { id: "gyudon", label: "牛丼・和食" },
    { id: "cafe", label: "カフェ" },
    { id: "sushi", label: "寿司" },
    { id: "chinese", label: "中華・ラーメン" },
    { id: "pizza", label: "ピザ" },
    { id: "family_resto", label: "ファミレス" },
    { id: "konbini", label: "コンビニ" },
    { id: "fast_food", label: "ファストフード" },
  ],
};

export const TAG_CATEGORIES: TagCategory[] = [
  GENRE_CATEGORY,
  ...RAW.categories.map((c) => ({
    id: c.id as TagCategoryId,
    label: c.label,
    tags: c.tags.map(({ id, label }) => ({ id, label })),
  })),
];

/** ラベル文字列で受け取ったタグを内部 id に解決する。マッチしないものは label そのまま返す。 */
export function resolveTagIds(labels: string[]): string[] {
  const ids: string[] = [];
  const labelToId = new Map<string, string>();
  for (const cat of TAG_CATEGORIES) {
    for (const t of cat.tags) labelToId.set(t.label, t.id);
  }
  for (const l of labels) {
    ids.push(labelToId.get(l) ?? l);
  }
  return ids;
}

export function labelForTagId(id: string): string {
  for (const cat of TAG_CATEGORIES) {
    for (const t of cat.tags) {
      if (t.id === id) return t.label;
    }
  }
  return id;
}
