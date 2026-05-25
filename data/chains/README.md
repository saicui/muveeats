# チェーン店メニュー栄養データ

各チェーンの公式栄養情報を JSON 形式で集約します。

## ファイル命名

`{slug}.json` （例: `mcdonalds.json`, `sukiya.json`）

## スキーマ

```json
{
  "chain_id": "mcdonalds",
  "chain_name": "マクドナルド",
  "source_url": "https://www.mcdonalds.co.jp/quality/allergy_Nutrition/nutrient/",
  "fetched_at": "2026-05-25",
  "items": [
    {
      "id": "big_mac",
      "name": "ビッグマック",
      "aliases": ["BigMac", "ビッグマック"],
      "category": "burger",
      "calories": 525,
      "protein_g": 26.0,
      "fat_g": 28.3,
      "carbs_g": 41.8,
      "salt_g": 2.5
    }
  ]
}
```

## 集める手順（推奨）

1. ChatGPT / Claude の DeepResearch で「{チェーン名}のメニュー栄養成分」を調査
2. 公式サイトの一覧ページを優先、PDF/CSV があれば取り込み
3. 上記スキーマに整形して `data/chains/{slug}.json` を保存
4. `data/chains/index.json` に登録（後で自動生成スクリプト追加予定）

## 優先度高めのチェーン

- マクドナルド / モスバーガー / ケンタッキー
- すき家 / 吉野家 / 松屋 / なか卯
- サイゼリヤ / ガスト / ココス
- スターバックス / ドトール / タリーズ
- セブン-イレブン / ファミマ / ローソン（弁当・おにぎり）
- 大戸屋 / 大阪王将 / リンガーハット
