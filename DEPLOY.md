# MuveEats — 公開デプロイ手順

Vercel + Supabase 構成で他の人に試してもらえる URL を出す手順です。

## 前提

- GitHub アカウント
- Vercel アカウント（GitHub と連携）
- 既に動いている Supabase プロジェクト
- Google AI Studio で取得した `GEMINI_API_KEY`

---

## 1. Supabase 側の準備

### 1-1. 最新スキーマを実行

[supabase/schema.sql](supabase/schema.sql) を Supabase の SQL Editor で実行。
冪等なので既存テーブルがあっても上書きされず、不足カラムだけ追加されます。

新規追加されるもの:
- `meals.chain_id` / `chain_name` / `item_id` / `size` / `ai_confidence` / `ai_note` / `tags[]`
- `profiles` テーブル + 自動作成トリガ
- 必要な GRANT と RLS ポリシー

### 1-2. メール認証の設定（推奨）

開発中は便利のため Confirm Email を OFF にしているケースがありますが、
公開時は **ON に戻してください**:

- Dashboard → Authentication → Sign In / Providers → Email
- 「Confirm email」を ON

### 1-3. リダイレクト URL の許可

公開後の Vercel URL（例: `https://muveeats.vercel.app`）を以下に追加:

- Dashboard → Authentication → URL Configuration
  - **Site URL**: `https://muveeats.vercel.app`
  - **Redirect URLs**: `https://muveeats.vercel.app/**` を追加

---

## 2. GitHub にプッシュ

```bash
# まだなら GitHub にリモートを作る
gh repo create muveeats --public --source=. --remote=origin --push
```

または既にリモートがあれば:
```bash
git push -u origin main
```

---

## 3. Vercel にインポート

1. [vercel.com/new](https://vercel.com/new) で GitHub リポジトリを Import
2. **Framework Preset**: Next.js（自動検出）
3. **Environment Variables** に以下を追加:

| Name | 値 |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio で取得した API キー |
| `GEMINI_MODEL` | `gemini-3.5-flash`（推奨 / 2026-05-20 リリース）または `gemini-2.5-flash` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 |

> ℹ️ `gemini-3.5-flash` は 2026-05-20 リリースの最新 Flash モデル。
> 利用できないリージョン / プロジェクトでは `gemini-2.5-flash` にフォールバックしてください。

4. **Deploy** をクリック

---

## 4. 動作確認

デプロイ完了 URL（例: `muveeats.vercel.app`）にアクセスし、以下をチェック:

- [ ] `/login` に到達できる
- [ ] サインアップ → メール認証 → サインインの一連が動く
- [ ] `/meals/new` でチェーン検索が動く（「ビッグマック」「ラテ」「牛丼」など）
- [ ] 「写真」モードで Gemini 解析が成功する
- [ ] 保存後、`/` のダッシュボードと `/history` に反映される
- [ ] `/history` で詳細シートが開く、削除できる

---

## 5. 他の人への共有

- 共有 URL: `https://muveeats.vercel.app`（あなたの実 URL）
- 試用者は自分でメール + パスワードで登録 → 各自の記録は分離されます（RLS）
- 写真解析は Gemini API のクォータを消費します。試用人数が増えそうなら別途
  Gemini プロジェクトのコストを確認してください。

---

## トラブルシューティング

**`permission denied for table meals`**
- Supabase で schema.sql の GRANT 文が未実行。再実行してください。

**写真解析が 404 / 502 で失敗**
- `GEMINI_MODEL` が実在しない名前の可能性。`gemini-2.5-flash` に変更。

**サインアップ後にメールが来ない**
- Supabase 標準の SMTP は遅い・到達しにくい。テスト中は Confirm Email を
  OFF にして即時サインインさせるか、Custom SMTP（SendGrid 等）を設定。

**「もっと見る」が反応しない・履歴が増えない**
- localStorage / Cookie の状態をクリアして再サインインで解消することが多い。
