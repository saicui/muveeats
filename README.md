# MuveEats

「動く」+「食べる」をもじったセルフヘルスハブ。食事・運動・体組成を1つに集約することがゴール。

**現在 MVP 公開準備中 — 食事記録（チェーン検索 / 写真解析 / 手動入力）が動きます。**

## できること（v8 MVP）

- メール + パスワード認証（Supabase Auth + RLS）
- **チェーン店検索**: 32 チェーン / 約 770 品目の公式栄養データから検索
  - サイズ自動抽出（並盛 / 大盛 / Tall / Hot / Iced / M / L 等）
  - クロスチェーン横断（例: 「ラテ」でスタバ・ドトール・タリーズ等を一覧）
- **写真解析**: Gemini に食事写真を渡し、料理名 / kcal / PFC / タグを推定
- **手動入力**: 任意の料理を直接記録
- 事前定義タグタクソノミー（ジャンルは選択メニューから自動付与）
- 統合履歴（フィルタ + 削除）
- スマホ前提のレイアウト、Light / Dark テーマ対応

次フェーズ: 筋トレ / 有酸素 / 体組成 / 目標値 / AI 相談（[doc/screens.md](doc/screens.md) 参照）

## 技術スタック

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind v4 + CSS 変数（`doc/design-system.md`）
- Supabase (Postgres + Auth + RLS)
- Google Gemini API (`@google/genai`)

## ローカル起動

```bash
# 1. 依存
npm install

# 2. 環境変数
cp .env.example .env.local
# .env.local に GEMINI_API_KEY と Supabase の URL/anon を記入

# 3. Supabase の SQL Editor で supabase/schema.sql を実行

# 4. 開発サーバー
npm run dev
```

## ディレクトリ

```
app/
  page.tsx                  ダッシュボード
  meals/new/page.tsx        食事記録（検索 / 写真 / 手動）
  history/                  履歴 + 詳細シート
  settings/                 設定（プレースホルダ）
  login/                    認証
  api/
    analyze-meal/           Gemini 画像解析
    chains/                 チェーン検索 API
    auth/signout/           サインアウト
lib/
  chains.ts                 チェーン索引 + サイズ抽出
  tags.ts                   タグタクソノミー
  supabase/                 client/server/middleware
  types.ts
data/
  tags.json                 タグ事前定義
  chain-genres.json         slug → ジャンル
  chains/*.json             各チェーンの公式栄養データ
supabase/
  schema.sql                meals + profiles + RLS
doc/
  design-brief.md           デザインの方向性
  design-system.md          トークン / コンポーネント
  screens.md                全画面仕様
  mock-v8.html              最新リファレンスモック
```

## 公開デプロイ

[DEPLOY.md](DEPLOY.md) に Vercel での公開手順をまとめています。

## ライセンス

未定（パーソナル用途を想定）。
