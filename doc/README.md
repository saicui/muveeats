# MuveEats Design Handoff

このディレクトリは Claude Design へのデザインハンドオフ用ドキュメントです。

## ファイル一覧

| File | 役割 | 読む順 |
|---|---|---|
| [design-brief.md](./design-brief.md) | プロダクトの方向性 / トーン / Do's & Don'ts | 1 |
| [design-system.md](./design-system.md) | トークン / コンポーネント / スタイル規約 | 2 |
| [screens.md](./screens.md) | 全画面の仕様（実装済 / 未着手） | 3 |
| [mock-v4.html](./mock-v4.html) | 現状のリファレンス実装（HTML / 単一ファイル） | 4（実物） |
| [overview.html](./overview.html) | プロジェクト全体の Overview | 補足 |
| [mock-v3.html](./mock-v3.html), [mock-v2.html](./mock-v2.html), [mock-history.html](./mock-history.html) | 過去のバージョン（参考） | 補足 |

## 関連データファイル（ルート直下）

- [../data/tags.json](../data/tags.json) — 食事タグの事前定義タクソノミー
- [../data/chains/](../data/chains/) — チェーン店メニュー栄養データ（収集中）

## ハンドオフ範囲

**期待する成果物**:
1. `screens.md` で ☐ になっている未モック画面の作成
2. `mock-v4.html` の既存画面のブラッシュアップ提案
3. インタラクション / 状態バリエーション（ホバー、空状態、ローディング、エラー）の補足
4. 必要に応じて `design-system.md` のトークン追加（既存命名規則に従う）

**絶対の制約**:
- 絵文字を使わない（SVG アイコンで代替）
- 3アクセント色構造（eat / move / body）を守る
- Light / Dark / Pastel の3テーマすべてに対応
- max-width 440px のモバイルファースト

詳細は [design-brief.md](./design-brief.md) を参照してください。
