# MuveEats Design Handoff

このディレクトリは Claude Design 〜 Claude Code 間のデザインハンドオフ用ドキュメントです。

## ディレクトリ構成

```
/                          プロジェクトルート
├── mock-v4.html           v4 (オリジナル / 保存用)
├── mock-v5.html           v5 (10画面 / 保存用)
├── mock-v6.html           v6 (保存用)
├── mock-v7.html           v7 (Claude Design 最新)
├── landing-page.html      プロダクトの紹介 LP
└── doc/
    ├── README.md          (このファイル)
    ├── design-brief.md    プロダクトの方向性 / トーン / Do's & Don'ts
    ├── design-system.md   トークン / コンポーネント / スタイル規約
    ├── screens.md         全画面の仕様（実装済 / 未着手）
    └── CHANGELOG.md       デザイン側の修正履歴
```

## 読む順

| 順 | File | 役割 |
|---|---|---|
| 1 | [design-brief.md](./design-brief.md) | プロダクトの方向性 / トーン |
| 2 | [design-system.md](./design-system.md) | トークン / コンポーネント |
| 3 | [screens.md](./screens.md) | 全画面の仕様 |
| 4 | `../mock-v7.html` | 最新リファレンス実装 |
| 5 | [CHANGELOG.md](./CHANGELOG.md) | v4 → v7 の差分 |

## 関連データファイル（ルート直下）

- `../data/tags.json` — 食事タグの事前定義タクソノミー
- `../data/chains/` — チェーン店メニュー栄養データ（収集中）

## ハンドオフ範囲（v7 時点）

### 完了
- 既存6画面のトーン微調整（Dark テーマ修正）
- 設計トークンの整理（`--accent` 撤廃 / `--ai` 追加 / モーション・z-index・余白の補強）
- Pastel テーマ撤廃（Light/Dark の 2軸構成に）
- Settings + Goals + AI 相談（Screen 7）
- Exercise Picker（Screen 8）
- Meal Detail Sheet（Screen 9） — **編集可**
- Body Composition Entry Sheet（Screen 10） — **手動入力のみ、外部連携なし**
- Screen 4 (有酸素) の種目セル整列 + フィールド入力欄の見切れ修正 (v7)
- プロダクト紹介 LP（`landing-page.html`）

### 次フェーズで作る予定
- Login / Signup
- Strength History / Cardio History
- 各画面の空状態 / ローディング / エラー状態のバリエーション

## 絶対の制約

- 絵文字を使わない（SVG アイコンで代替）
- 3アクセント色構造（eat / move / body）を守る
- Light / Dark の 2 テーマすべてに対応
- max-width 440px のモバイルファースト
- 体組成計や Apple Health / Google Fit との外部連携は前提にしない（すべて手動記録）

詳細は [design-brief.md](./design-brief.md) を参照してください。
