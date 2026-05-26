/**
 * MuveEats — chain restaurant catalog index.
 *
 * data/chains/*.json をビルド時に require して全件メモリに展開。
 * サーバ側でのみ使う前提（Next.js Server Component / Route Handler）。
 * data の合計サイズは ~150KB 程度なので素直にロードできる。
 */
import fs from "node:fs";
import path from "node:path";
import type { ChainItem, ChainGenre } from "./types";

type RawItem = {
  id: string;
  name: string;
  aliases?: string[];
  category?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  carbs_g?: number | null;
  salt_g?: number | null;
};
type RawChain = {
  chain_id: string;
  chain_name: string;
  source_url?: string;
  fetched_at?: string;
  items: RawItem[];
};
type GenreMap = { description: string; genres: Record<string, ChainGenre[]> };

// === Size extraction =================================================
//
// 「牛丼 並盛」「マックフライポテト L」「スターバックス ラテ（ホット）Tall」など
// 名前に紛れているサイズ語を切り出し、本体名と分離する。

const SIZE_TOKENS = [
  // 日本語の盛り
  "ミニ",
  "小盛",
  "並盛",
  "中盛",
  "大盛",
  "特盛",
  // 単漢字（誤検出回避のため後置のみ）
  "小",
  "中",
  "大",
  // Starbucks / Tully's
  "Short",
  "Tall",
  "Grande",
  "Venti",
  // 飲料サイズ
  "S",
  "M",
  "L",
  "XL",
  // 温度
  "Hot",
  "Iced",
  "ホット",
  "アイス",
];

const SIZE_REGEX = new RegExp(
  // 区切り文字（空白 / 全角空白 / 括弧）の後ろにあるサイズ語のみ拾う
  // 例: " 並盛" / "（ホット）" / " Tall"
  `[ 　()（）](${SIZE_TOKENS.map((s) =>
    s.replace(/([.*+?^${}()|[\]\\])/g, "\\$1"),
  ).join("|")})(?=[ 　()（）]|$)`,
  "g",
);

// 末尾のサイズ語 (区切り無しでも拾う) を切り出すための正規表現。
// 例: "ラテTall" → "Tall"、"ポテトL" → "L"
const TAIL_SIZE_REGEX = new RegExp(
  `(${["Short", "Tall", "Grande", "Venti", "XL", "L", "M", "S", "Hot", "Iced"]
    .map((s) => s.replace(/([.*+?^${}()|[\]\\])/g, "\\$1"))
    .join("|")})$`,
);

export function extractSize(rawName: string): {
  displayName: string;
  sizes: string[];
} {
  const sizes: string[] = [];
  let cleaned = rawName;
  // 括弧書きの中身（ホット/アイス 等）を先に拾う
  cleaned = cleaned.replace(/[（(]([^）)]+)[）)]/g, (_, inner: string) => {
    const trimmed = inner.trim();
    if (SIZE_TOKENS.includes(trimmed)) {
      sizes.push(normalizeSize(trimmed));
      return "";
    }
    return `（${inner}）`;
  });
  // 区切り＋サイズ
  cleaned = cleaned.replace(SIZE_REGEX, (match, token: string) => {
    sizes.push(normalizeSize(token));
    return match.slice(0, 1); // 区切り文字だけ残す
  });
  // 末尾に区切り無しで残ったサイズ語（"ラテTall" など）を拾う
  let tailMatch: RegExpExecArray | null;
  const trimmed = cleaned.trim();
  if ((tailMatch = TAIL_SIZE_REGEX.exec(trimmed))) {
    sizes.push(normalizeSize(tailMatch[1]));
    cleaned = trimmed.slice(0, tailMatch.index);
  }
  const displayName = cleaned.replace(/\s+/g, " ").trim();
  // 重複除去（順序保持）
  const uniq: string[] = [];
  for (const s of sizes) if (!uniq.includes(s)) uniq.push(s);
  return { displayName, sizes: uniq };
}

function normalizeSize(token: string): string {
  switch (token) {
    case "ホット":
      return "Hot";
    case "アイス":
      return "Iced";
    case "小":
      return "S";
    case "中":
      return "M";
    case "大":
      return "L";
    default:
      return token;
  }
}

// === Index ===========================================================

let INDEX: ChainItem[] | null = null;
let CHAINS: { id: string; name: string; genre: ChainGenre[]; count: number }[] | null = null;

function buildIndex() {
  if (INDEX && CHAINS) return;
  const root = path.join(process.cwd(), "data", "chains");
  const genreFile = path.join(process.cwd(), "data", "chain-genres.json");
  const genreMap = (JSON.parse(fs.readFileSync(genreFile, "utf8")) as GenreMap)
    .genres;

  const items: ChainItem[] = [];
  const chains: typeof CHAINS = [];

  for (const fileName of fs.readdirSync(root)) {
    if (!fileName.endsWith(".json")) continue;
    if (fileName.startsWith("_")) continue;
    const slug = fileName.replace(/\.json$/, "");
    const raw = JSON.parse(
      fs.readFileSync(path.join(root, fileName), "utf8"),
    ) as RawChain;
    const genre = genreMap[slug] ?? (["その他"] as ChainGenre[]);
    chains.push({
      id: slug,
      name: raw.chain_name,
      genre,
      count: raw.items.length,
    });
    for (const item of raw.items) {
      const { displayName, sizes } = extractSize(item.name);
      items.push({
        chain_id: slug,
        chain_name: raw.chain_name,
        chain_genre: genre,
        source_url: raw.source_url ?? "",
        fetched_at: raw.fetched_at ?? "",
        id: item.id,
        name: item.name,
        display_name: displayName,
        size: sizes,
        aliases: item.aliases ?? [],
        category: item.category ?? null,
        calories: item.calories ?? null,
        protein_g: item.protein_g ?? null,
        fat_g: item.fat_g ?? null,
        carbs_g: item.carbs_g ?? null,
        salt_g: item.salt_g ?? null,
      });
    }
  }

  INDEX = items;
  CHAINS = chains.sort((a, b) => b.count - a.count);
}

export type ChainSummary = {
  id: string;
  name: string;
  genre: ChainGenre[];
  count: number;
};

export function listChains(): ChainSummary[] {
  buildIndex();
  return CHAINS!;
}

export function getCatalogStats() {
  buildIndex();
  return {
    chains: CHAINS!.length,
    items: INDEX!.length,
  };
}

/** Lower-case + remove whitespace for fuzzy match. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

export function searchChainItems(
  query: string,
  limit = 30,
): ChainItem[] {
  buildIndex();
  const q = normalize(query);
  if (!q) return [];
  const matches = INDEX!.filter((item) => {
    if (normalize(item.name).includes(q)) return true;
    if (normalize(item.display_name).includes(q)) return true;
    if (normalize(item.chain_name).includes(q)) return true;
    for (const a of item.aliases) {
      if (normalize(a).includes(q)) return true;
    }
    return false;
  });
  // チェーン名一致を優先 → 表示名一致 → kcal 昇順
  matches.sort((a, b) => {
    const aChain = normalize(a.chain_name).includes(q) ? 1 : 0;
    const bChain = normalize(b.chain_name).includes(q) ? 1 : 0;
    if (aChain !== bChain) return bChain - aChain;
    return (a.calories ?? 9999) - (b.calories ?? 9999);
  });
  return matches.slice(0, limit);
}

export function listChainItems(chainId: string, limit = 100): ChainItem[] {
  buildIndex();
  return INDEX!.filter((i) => i.chain_id === chainId).slice(0, limit);
}

export function getChain(chainId: string): ChainSummary | null {
  buildIndex();
  return CHAINS!.find((c) => c.id === chainId) ?? null;
}

export function findChainItem(
  chainId: string,
  itemId: string,
): ChainItem | null {
  buildIndex();
  return (
    INDEX!.find((i) => i.chain_id === chainId && i.id === itemId) ?? null
  );
}
