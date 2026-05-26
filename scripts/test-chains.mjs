import {
  searchChainItems,
  extractSize,
  getCatalogStats,
  listChains,
} from "../lib/chains.ts";

console.log("stats:", getCatalogStats());

console.log("--- latte ---");
searchChainItems("ラテ", 5).forEach((i) =>
  console.log(
    `  ${i.chain_name} | ${i.display_name} | sizes:[${i.size.join(",")}] | ${i.calories}kcal`,
  ),
);

console.log("--- gyudon ---");
searchChainItems("牛丼", 5).forEach((i) =>
  console.log(
    `  ${i.chain_name} | ${i.display_name} | sizes:[${i.size.join(",")}] | ${i.calories}kcal`,
  ),
);

console.log("--- size extract ---");
[
  "牛丼 並盛",
  "スターバックス ラテ（ホット）Tall",
  "マックフライポテト L",
  "ハンバーガー",
  "牛丼 大盛",
  "牛めし 並盛",
].forEach((n) => console.log("  ", n, "=>", JSON.stringify(extractSize(n))));

console.log("--- chains top 5 ---");
listChains()
  .slice(0, 5)
  .forEach((c) => console.log(`  ${c.name} (${c.id}) ${c.count} items, genre=${c.genre.join("/")}`));
