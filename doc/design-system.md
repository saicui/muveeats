# MuveEats — Design System

> デザイントークンとコンポーネントの仕様。`mock-v4.html` の CSS 実装が一次ソース。
> 新しい画面を作る際はこの定義に従ってください。

---

## 1. カラートークン

### 1.1 基本構造

全色を CSS 変数で定義し、`data-theme` 属性で切替えます。

```
:root[data-theme="light" | "dark" | "pastel"] {
  --bg, --surface, --surface-2,
  --ink, --ink-2, --muted,
  --line, --line-soft,
  --accent, --accent-ink,
  --eat, --move, --body,
  --warn, --danger,
  --shadow
}
```

### 1.2 各テーマの値

| Token | Light | Dark | Pastel |
|---|---|---|---|
| `--bg` | `#fafaf9` | `#0c0a09` | `#faf5f7` |
| `--surface` | `#ffffff` | `#1c1917` | `#ffffff` |
| `--surface-2` | `#f5f5f4` | `#292524` | `#fdf2f5` |
| `--ink` | `#0c0a09` | `#fafaf9` | `#44313a` |
| `--ink-2` | `#44403c` | `#d6d3d1` | `#6b5560` |
| `--muted` | `#78716c` | `#a8a29e` | `#998088` |
| `--line` | `#e7e5e4` | `#292524` | `#f0e0e6` |
| `--line-soft` | `#f5f5f4` | `#1c1917` | `#f7ebf0` |
| `--accent` | `#0c0a09` | `#fafaf9` | `#c47b96` |
| `--accent-ink` | `#ffffff` | `#0c0a09` | `#ffffff` |
| `--eat` | `#0e7c66` | `#2dd4bf` | `#5b9d8c` |
| `--move` | `#5b4ce0` | `#a78bfa` | `#8b7eb8` |
| `--body` | `#b8826b` | `#d4a584` | `#c49a85` |
| `--warn` | `#a16207` | `#fbbf24` | `#c89455` |
| `--danger` | `#991b1b` | `#f87171` | `#b85959` |

### 1.3 役割色 (Domain colors)

役割色は**ドメインの識別**にのみ使用。アイコンの強調や CTA には使わない。

- `--eat` (食事): 摂取・カロリー入力系
- `--move` (運動): 筋トレ・有酸素・消費系
- `--body` (体組成): 体重・体脂肪・身体測定系

使い方の例:
- 細マーカー (3px の縦線)
- ドット (6-8px)
- グラフのラインカラー
- 「INTAKE」「BURN」などのラベル横の点

❌ ボタンの背景色、テキスト本体の色には使わない。
❌ 3色を1画面に混在させすぎない（多くて2色まで隣接配置）。

### 1.4 Accent vs Primary

- `--ink` / `--accent` がプライマリ CTA の色。テーマによっては同じ。
- カラフルな CTA は作らない。常に黒（または白）+ 細い枠線で十分。

---

## 2. タイポグラフィ

### 2.1 フォントスタック

```css
font-family: "Inter", -apple-system, BlinkMacSystemFont,
  "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif;
```

数値表示には必ず:
```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum";
```

### 2.2 タイプスケール

| Role | Size | Weight | Letter-spacing | 用途 |
|---|---|---|---|---|
| Page title | 26px | 700 | −0.02em | ページ最上部のタイトル |
| Stat large | 32px | 700 | −0.02em | ダッシュボードの主役数値 |
| Stat medium | 24px | 700 | −0.01em | サマリーカードの数値 |
| Stat small | 18-20px | 700 | 0 | リスト内の数値 |
| Section title | 10px | 600 | 0.12em UPPER | セクション見出し |
| Brand / Eyebrow | 13px | 700 | 0.08em UPPER | ヘッダーの製品名 |
| Body | 14px | 400 | 0 | 本文 |
| Body small | 12-13px | 400 | 0 | 補助テキスト |
| Caption | 10-11px | 500 | 0.04-0.06em | メタ情報 |
| Tabular | * | * | * | 数値は `tabular-nums` を必ず適用 |

### 2.3 ルール

- **Section title は UPPERCASE + tracking**: `letter-spacing: 0.1em-0.12em`。これが「Linear っぽさ」の核。
- **Page title はマイナス tracking**: 大きな見出しほど詰める。
- **数値表示は `.num` クラス**: `tabular-nums` を必ず付ける（CSS でユーティリティとして定義済み）。
- 行間 `line-height: 1.55` を基本に。

---

## 3. スペーシング

8px グリッドベース。

| Token | Value | 用途 |
|---|---|---|
| `--sp-1` | 4px | アイコンと文字の間 |
| `--sp-2` | 8px | フィールド間、チップ間 |
| `--sp-3` | 12px | カード内パディング |
| `--sp-4` | 16px | カード間、セクション内 |
| `--sp-5` | 20px | ページパディング |
| `--sp-6` | 24px | セクション間 |

実装では生の px を使っていますが、トークン化する場合は上記命名で。

---

## 4. ボーダーラディウス

| Token | Value | 用途 |
|---|---|---|
| `--r-1` | 4-6px | 小バッジ、ハンドル |
| `--r-2` | 8px | ボタン、入力欄、チップ |
| `--r-3` | 10-12px | カード、リスト |
| `--r-4` | 16-20px | モーダル、フレーム |
| `--r-pill` | 999px | チップ、ドット |

20px を超える角丸は避ける（カジュアル過ぎる印象になる）。

---

## 5. ボーダー / 区切り

- すべての境界は **1px** の細線。`2px` は使わない（強調ですら）。
- `--line` がデフォルト、`--line-soft` はリスト内の行間など弱い区切り用。
- 強調が必要なとき: 太くするのではなく**色を黒に**変える（`--ink` 直接指定）。

---

## 6. シャドウ

ほぼ使わない。

```css
--shadow: 0 1px 2px rgba(12, 10, 9, 0.04);
```

カードのフローティング感は **境界線**で表現。シャドウは「持ち上がる」感じが必要な要素（モーダル、トースト）にだけ控えめに使用。

---

## 7. アイコン

### 7.1 仕様

- 形式: **インライン SVG**（フォントアイコンや絵文字は使用禁止）
- ストローク: `1.5px` を基本、`stroke-linecap: round`, `stroke-linejoin: round`
- 塗り: `fill: none`（outline スタイル）
- サイズ: `14px (ic-sm)` / `18px (ic)` / `22px (ic-lg)`
- 色: `stroke: currentColor` で親要素の色を継承

### 7.2 既存アイコン（`mock-v4.html` に定義済み）

```
#i-menu, #i-close, #i-plus, #i-search
#i-home, #i-fork (食事), #i-dumbbell (筋トレ), #i-run (有酸素)
#i-scale (体組成), #i-book (履歴), #i-settings
#i-camera, #i-edit, #i-clock, #i-check, #i-chevron-down
#i-trash, #i-heart
```

新規アイコンを追加する際は Heroicons Outline / Lucide / Phosphor の outline 系から拾うか、同等のスタイルで描画。

---

## 8. コンポーネント

### 8.1 Button

```
.btn          標準（白背景 + 1px line）
.btn-primary  CTA（ink 背景）
.btn-ghost    枠線なし（テキストリンク代替）
.btn-block    width: 100%
```

サイズ: `padding: 9px 14px / font-size: 13px` が標準。
内部にアイコンを置く場合: アイコン → テキストの順、`gap: 6px`。

### 8.2 Summary Card

ダッシュボードで使う数値強調カード。

構造:
```
.summary-card.{eat|move|body}
  .head           [accent-dot] LABEL
  .value          大きい数値 + .unit
  .meta-row       P/F/C など補助数値
```

縦並び・横並び両方対応。

### 8.3 List Row

履歴・記録一覧の行。

```
.list
  .list-row
    .list-row-top
      .marker.{eat|move|body}    3px の縦バー
      .body-col                  .name + .meta
      .stat-col                  数値 + サブ情報
    .tags                        オプション。タグチップ群
```

### 8.4 Field Group

設定や入力フォームでのフィールド群（iOS のセル風）。

```
.field-group
  .field
    .lbl (.sub)    左：ラベル + 補助
    input          右：入力欄（右寄せ、tabular-nums）
```

### 8.5 Tag Chip

```
.tag             デフォルト
.tag.selected    選択中（黒背景）
.tag.ai          AI 提案（破線ボーダー）
```

選択 + AI 提案の両立は class を併用。

### 8.6 Section Title

```html
<div class="section-title">セクション名</div>
```

UPPERCASE 大文字 + tracking で表示される（CSS で自動）。

### 8.7 Balance Bar

エネルギー収支の双方向バー。`--eat` を左から、`--move` を右から。

### 8.8 Sparkline Chart

`<svg class="chart" viewBox="0 0 400 60">` 内に `<polyline>` 一本。終点に小さい円。グリッドや軸ラベルは置かない。

---

## 9. インタラクション原則

### 9.1 状態

- **Hover**: ボタンは `border-color: --ink-2` に変更。リスト行は `background: --surface-2`。
- **Focus**: `outline` ではなく `border-color: --ink` で表現。
- **Active/Pressed**: `opacity: 0.9` 程度で軽く沈める。

### 9.2 トランジション

```css
transition: all 0.15s;
```

をデフォルトに。これ以上長くしない。

### 9.3 ローディング

スピナーよりも**スケルトン**を優先。データ行のシェイプを薄いグレーで表示する。

### 9.4 空状態

絵文字や派手なイラストは使わず、薄い説明文 + 操作 CTA のみ。
```
記録がまだありません
[食事を記録する]
```

---

## 10. グリッド / レイアウト

- 1画面のメインコンテナ: `max-width: 440px`（モバイル前提）
- ページパディング: 左右 `20px`、上 `22px`、下 `20px`
- カード間: `12px`
- セクション間: `20-24px`

---

## 11. 命名規則

- CSS クラスは BEM 風ではなく、シンプルな機能名 (`.btn`, `.list-row`, `.section-title`)。
- 数値表示には `.num` クラスを必ず付ける。
- 役割色は `.eat / .move / .body` のサフィックスで適用。
- データ属性で状態切替: `data-theme`, `data-active`, etc.
