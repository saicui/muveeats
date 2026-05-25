# MuveEats 🥗🏃

「動く」＋「食べる」をもじったヘルスケアアプリ。トレーニング記録と食事管理（写真からのカロリー推定含む）を一体化することを目指します。

## 現在の MVP

- 📷 **写真解析**: Gemini に食事写真を送り、料理名・kcal・PFC を推定
- ✍️ **手動記録**: 料理名・栄養素・日時・メモを保存
- 📊 **ダッシュボード**: 今日 / 7日 のカロリー・PFC・記録件数を集計

トレーニング記録機能は次フェーズで追加予定です。

## スタック

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth + RLS)
- Google Gemini API (`@google/genai`)

## セットアップ

1. `.env.example` を `.env.local` にコピーし、各キーを記入。
   ```
   GEMINI_API_KEY=...
   GEMINI_MODEL=gemini-3.5-flash   # 動作しない場合は gemini-2.5-flash を試してください
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
2. Supabase の SQL Editor で `supabase/schema.sql` を実行。
3. 開発サーバー起動:
   ```bash
   npm run dev
   ```

> ⚠️ `gemini-3.5-flash` は現時点で公開モデル名として確認できません。401/404 が返る場合は `GEMINI_MODEL=gemini-2.5-flash` に切り替えてください。

## ディレクトリ

```
app/
  page.tsx              ダッシュボード
  log/page.tsx          手動記録フォーム
  analyze/page.tsx      写真アップロード+解析画面
  api/analyze-meal/     Gemini 呼び出しの API ルート
lib/
  supabase/             browser/server クライアント
  types.ts
supabase/
  schema.sql            meals テーブル + RLS
```

## 次にやること候補

- 認証画面 (Supabase Auth: メール/Google OAuth)
- トレーニング記録 (種目・セット・重量・rep)
- 写真の Supabase Storage への保存と履歴サムネ表示
- 週次・月次グラフ
