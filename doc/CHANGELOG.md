# MuveEats — Design Changelog

> Claude Design による修正履歴。Claude Code 側がトークン名・コンポーネント名の
> 変更を追える粒度で記述します。各エントリは `mock-vN.html` / `doc/*.md` の差分を
> 1セットで表します。

書式: 日付 / バージョン / `[ADDED]` `[CHANGED]` `[REMOVED]` `[FIXED]` で分類。

---

## 2026-05-26 — v7

担当: Claude Design
対象ファイル: `mock-v7.html` (新規) / `doc/screens.md` / `doc/README.md`

QA 指摘の修正。

### `mock-v7.html`

#### [FIXED]
- **Screen 4 (有酸素記録) の種目セルがずれる問題**: 4 種目すべて同じ `#i-run` アイコンを使い、ラベルが「ラン / ウォーク / バイク / その他」と文字幅バラバラだった。
  - 専用アイコンを追加（`#i-walk`, `#i-bike`, `#i-activity`）。
  - ラベルを英語表記に統一（`RUN / WALK / BIKE / OTHER`）。letter-spacing と font-weight が同じ短い語に揃うことで、4 セルが視覚的に等価に。
  - `.quick-actions .qa` に `display: flex; flex-direction: column; align-items: center; justify-content: center` を追加。アイコン + ラベルの縦位置が常に中央揃えになり、ラベル行数の違いでもズレない。
- **Screen 4 強度セレクト / Screen 7 単位 + 活動レベル + 目標セレクトが見切れる問題**:
  - `.field-group .field input/select` の固定幅 `width: 130px` を廃止し、`min-width: 100px; max-width: 200px; width: auto` に。`<select>` は `max-width: 220px` + `text-align-last: right` で右寄せ表示を維持しつつ option 全文を表示。
  - あわせて option 文言も簡潔化:
    - 強度: 「中 (やや息が上がる)」→「中」
    - 単位: 「メートル法 (kg / km)」→「メートル法」
    - 活動レベル: 「低い (座位中心)」→「低い」など括弧書き説明を削減
    - 目標も同様に簡潔化

### `doc/screens.md` / `doc/README.md`
- リファレンス実装の参照を `mock-v6.html` → `mock-v7.html` に更新。

---

## 2026-05-26 — v6

担当: Claude Design  
対象ファイル: `mock-v6.html` (新規) / `doc/design-system.md` / `doc/design-brief.md` / `doc/screens.md` / `doc/README.md` / `landing-page.html` (新規)

ユーザーフィードバックを反映した小〜中改修。

### `mock-v6.html`

#### [REMOVED]
- **Pastel テーマ全廃**。
  - `[data-theme="pastel"]` ブロックを CSS から削除。
  - `.theme-bar` の Pastel ボタンを削除。
  - Screen 7 (Settings) の `.theme-picker` を 3 swatch → 2 swatch に。
  - 関連 CSS (`.theme-picker .swatch.pastel`) を削除。
- **体組成計 / Apple Health 連携の概念を撤廃**。
  - Settings (Screen 7) から「Apple Health 連携」フィールドを削除。
  - Body Composition Entry Sheet (Screen 10) から「体組成計の写真から読み取る」OCR ボタンを削除。
  - Screen 10 のサブタイトルを「体組成計の数値をそのまま入力」→「計測した数値を手動で入力」に変更。
  - Screen 5 (Body Composition) のリストアイテムの `source` を `体組成計` → `手動記録` に変更。
  - Screen 6 (History) の体組成エントリも `source` を `体組成計` → `手動記録` に。
  - Screen 7 プロフィールの体重欄サブテキスト「体組成計録から自動更新」→「体組成記録から自動更新」（直近の手動記録値を反映）に変更。

#### [CHANGED]
- **Screen 9 (Meal Detail Sheet) を編集可能に**。
  - 静的な `.nutri-cells`（PFC 表示セル）を、`.field-group` 内の編集可能 input に置換。
  - 料理名 / 食べた時刻 / kcal / P / F / C をすべて編集可。
  - タグ選択も静的表示から複数チップによる選択 UI へ。
  - シート footer を `[閉じる][削除]` → `[削除][キャンセル][保存]` の 3ボタン構成に変更。

### `doc/design-system.md`
- §1.1: テーマ列挙を `light | dark` の2軸に。
- §1.2: トークン表から Pastel 列を削除。
- §7.2: 既存アイコン定義の参照を `mock-v6.html` に更新。

### `doc/design-brief.md`
- §2 Don't: 「Pastel テーマはオプションとして用意」の付記を削除。
- §4 テーマ: 「3つのテーマ」→「2つのテーマ」、Pastel 行を削除。
- §8: 守るべき項目から Pastel を削除。

### `doc/screens.md`
- リファレンス実装を `mock-v6.html` に更新。
- Screen 5 (Body Composition) の入力要素から「計測源」を削除。
- Screen 9 (Meal Detail Modal) の仕様を編集可能版に書き換え。
- Screen 10 (Body Composition Entry Modal) から OCR 拡張案を削除し、手動入力のみと明記。

### `doc/README.md`
- mock-v6.html / landing-page.html をディレクトリ構成に追加。
- v6 時点のハンドオフ範囲を更新。
- 「絶対の制約」を Light/Dark の 2 テーマ + 外部連携なしに更新。

### `landing-page.html` (新規)
- v6 のデザイントークン (Light テーマ) でプロダクト紹介 LP を作成。
- ヒーロー / 3ドメイン (eat × move × body) の説明 / 主要画面のミニフレーム / FAQ / CTA / フッタ。
- 同じ Inter フォント・無機質トーン・1px 線で統一。
- ハンドオフ後の Claude Code 側で `landing-page` を別ルーティングに切り出せるよう、独立 HTML として配置。

---

## 2026-05-25 — v5 (Claude Design 初回ハンドオフレスポンス)

担当: Claude Design  
対象ファイル: `mock-v5.html` (新規) / `doc/design-system.md` / `doc/design-brief.md` / `doc/screens.md`

### `doc/design-system.md` — トークン

#### [REMOVED]
- `--accent` / `--accent-ink` を撤廃。`mock-v4` 内で実際には使用されていない死にトークンだったため。CTA は従来通り `var(--ink)` / `var(--bg)` を直接参照。

#### [ADDED]
- `--ai` — AI 提案系（破線タグ、自信度ラベル）専用色。
  - Light: `#57534e` / Dark: `#a8a29e` / Pastel: `#998088`
- `--shadow-modal` / `--shadow-toast` — `--shadow` を用途別に分割。
  - カード等での誤用を防ぐため、汎用 `--shadow` は撤廃。
- 余白 `--sp-7: 32px` / `--sp-8: 40px` — 空状態・ページ間セクション用。
- モーション
  - `--ease: cubic-bezier(0.2, 0, 0, 1)`
  - `--dur-fast: 120ms`
  - `--dur-base: 180ms`
  - `--dur-slow: 280ms`（モーダル系のみ）
- z-index 階層
  - `--z-nav: 10`
  - `--z-sheet: 20`
  - `--z-modal: 25`
  - `--z-toast: 30`
- `.skeleton` ユーティリティ（背景: `--surface-2`、`shimmer` キーフレーム）。`prefers-reduced-motion` で自動停止。

#### [CHANGED]
- **Dark テーマの線色**
  - `--line`: `#292524` → `#3a3633`（surface 1c1917 とのコントラストを上げ、1px 線が視認できるように）
  - `--line-soft`: `#1c1917` → `#292524`（surface と同色だった問題を解消）
- **Pastel テーマの主役色を再調整**
  - `--accent` 撤廃に伴い、CTA はピンクをやめて ink (`#44313a`) を直接使用。Pastel でも「無機質さを保つ」ブリーフ要件に合致。
  - ドメイン色を彩度・明度差つけて 3色の識別性を回復:
    - `--eat`: `#5b9d8c` → `#4e8d7c`
    - `--move`: `#8b7eb8` → `#7d6ba5`
    - `--body`: `#c49a85` → `#a87b65`
  - `--line`: `#f0e0e6` → `#ead2dc`（線が見えるように）

#### [ADDED]
- `:focus-visible` グローバルルールを追加。
  - `outline: 2px solid var(--ink); outline-offset: 2px;`
  - リスト行のような border 非依存のフォーカスでも視認できる。
- `.bottom-nav` の仕様確定:
  - 高さ 56px + `padding-bottom: env(safe-area-inset-bottom)`
  - アクティブ表現は色変更のみ（バッジ・線は使わない）
- ボトムシート `.sheet` の仕様確定（ハンドル 36×4px / `--shadow-modal` / `--r-4` 上端のみ）。

### `doc/design-brief.md` — 規約

#### [ADDED]
- §5 情報設計原則に「数値ゼロ / 未入力の表記」を追加: `—`（em dash）で統一。
- §5 に「単位の表記」: 数値の **0.7em** で muted 色、`<span class="unit">` で囲む。
- §5 に「AI 信頼度の表示位置」: meta 行の左端、`source` フィールドの後に「自信度 NN%」。
- §5 に「タッチターゲット最小 44×44px」（ボトムナビ、quick action、チップ群）。

### `mock-v5.html` — 既存6画面の調整

#### [FIXED]
- Pastel テーマで CTA がピンク（`--accent: #c47b96`）になっていた問題。
- Dark テーマで `.list-row-top` / カードの 1px 線が surface と同色で見えなかった問題。
- `.summary-card.body` 内の「−0.6 / 7d」が `--eat` 色になっていた（コピーミス）。`--body` 系の delta は `delta down/up` クラスに統一して `--ink-2` で表示。
- Quick action の `:hover` が `border-color: var(--ink)` で「黒枠」が強すぎたので `--ink-2` に変更。
- 体組成 sparkline の line color が `--move`（紫）になっていた箇所を `--body` に修正（ドメイン整合）。
- **`.header-action` セレクタを非スコープ化**: `.app-header .header-action` を `.header-action` に変更。ボトムシート内ヘッダーで close ボタンがブラウザデフォルト（outset border / 灰背景）になる問題を解消。

#### [CHANGED]
- セット表の完了チェック色を `--eat`（緑）→ `--ink` に変更。ドメイン色をチェックマークに使わないルール（design-system §1.3）に揃える。
- フィルタチップ・タグの選択状態に `aria-pressed` 属性を追加（Claude Code 側で `role="button"` 適用しやすくするため）。

### `mock-v5.html` — 新規画面（screens.md 優先度 1〜4）

#### [ADDED]
- **Screen 7**: Settings/Index + Goals + AI Consultation（1ページに統合）
- **Screen 8**: Exercise Picker（筋トレ種目選択モーダル）
- **Screen 9**: Meal Detail（ボトムシート / 履歴からの詳細表示）
- **Screen 10**: Body Composition Entry（ボトムシート / 体組成入力）

### `doc/screens.md`

- 上記4画面の `☐` を `☑` に更新。各画面の構成案を実装に合わせて補足。

---

## (template for future entries)

```
## YYYY-MM-DD — vN (担当)

対象ファイル: ...

### [ADDED|CHANGED|REMOVED|FIXED]
- ...
```
