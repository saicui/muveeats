# MuveEats — Design System

> デザイントークンとコンポーネントの仕様。`mock-v6.html` の CSS 実装が一次ソース。
> 新しい画面を作る際はこの定義に従ってください。
> 修正履歴は [`CHANGELOG.md`](./CHANGELOG.md) を参照。

---

## 1. カラートークン

### 1.1 基本構造

全色を CSS 変数で定義し、`data-theme` 属性で切替えます。

```
:root[data-theme="light" | "dark"] {
  --bg, --surface, --surface-2,
  --ink, --ink-2, --muted,
  --line, --line-soft,
  --eat, --move, --body,
  --ai,
  --warn, --danger,
  --shadow-modal, --shadow-toast
}
```

> v4 にあった `--accent` / `--accent-ink` は撤廃しました（v5）。CTA は `var(--ink)` / `var(--bg)` を直接参照します。
> v5 にあった Pastel テーマは撤廃しました（v6）。Light との視覚差が小さく、運用コストに見合わないため。

### 1.2 各テーマの値

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#fafaf9` | `#0c0a09` |
| `--surface` | `#ffffff` | `#1c1917` |
| `--surface-2` | `#f5f5f4` | `#292524` |
| `--ink` | `#0c0a09` | `#fafaf9` |
| `--ink-2` | `#44403c` | `#d6d3d1` |
| `--muted` | `#78716c` | `#a8a29e` |
| `--line` | `#e7e5e4` | `#3a3633` |
| `--line-soft` | `#f5f5f4` | `#292524` |
| `--eat` | `#0e7c66` | `#2dd4bf` |
| `--move` | `#5b4ce0` | `#a78bfa` |
| `--body` | `#b8826b` | `#d4a584` |
| `--ai` | `#57534e` | `#a8a29e` |
| `--warn` | `#a16207` | `#fbbf24` |
| `--danger` | `#991b1b` | `#f87171` |
| `--shadow-modal` | `0 8px 24px rgba(12,10,9,0.08)` | `0 8px 24px rgba(0,0,0,0.4)` |
| `--shadow-toast` | `0 2px 8px rgba(12,10,9,0.10)` | `0 2px 8px rgba(0,0,0,0.5)` |

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

使わない場面:
- ❌ ボタンの背景色、テキスト本体の色
- ❌ チェックマーク・成功表示（→ `--ink` を使う）
- ❌ 3色を1画面に混在させすぎない（隣接配置は2色まで）

### 1.4 AI 色 (`--ai`)

AI が介在した情報の識別用。`--muted` よりわずかに濃い。

使い方:
- `.tag.ai` の破線ボーダー色
- 「自信度 82%」「AI 提案」ラベルのテキスト色
- AI 出力が変更可能なインプットの背景強調（弱め）

CTA や強調背景には使わない。

### 1.5 CTA

- CTA は `background: var(--ink); color: var(--bg);` で表現（全テーマ共通）。
- 二次 CTA は `background: var(--surface); border: 1px solid var(--line); color: var(--ink);`
- 色付き CTA は作らない。

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
- **数値表示は `.num` クラス**: `tabular-nums` を必ず付ける。
- **単位は数値より小さく / muted で**: `<span class="unit">` を数値の直後に付ける。font-size はおおむね親の 0.55em。
- **ゼロ・未入力は `—`**（em dash, U+2014）: `0` を表示しない（誤って入力済みに見える）。`null` / `undefined` も同様。
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
| `--sp-7` | 32px | ページ間セクションの大きな区切り |
| `--sp-8` | 40px | 空状態 / モーダル内余白 |

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

カードのフローティング感は **境界線**で表現する。シャドウはモーダル / トーストにのみ使う。

```css
--shadow-modal: 0 8px 24px rgba(12, 10, 9, 0.08);   /* ボトムシート、モーダル */
--shadow-toast: 0 2px 8px  rgba(12, 10, 9, 0.10);   /* トースト、ポップオーバー */
```

カードやリストには `box-shadow` を**付けない**。誤用しやすいので汎用 `--shadow` トークンは廃止。

---

## 7. アイコン

### 7.1 仕様

- 形式: **インライン SVG**（フォントアイコンや絵文字は使用禁止）
- ストローク: `1.5px` を基本、`stroke-linecap: round`, `stroke-linejoin: round`
- 塗り: `fill: none`（outline スタイル）
- サイズ: `14px (ic-sm)` / `18px (ic)` / `22px (ic-lg)`
- 色: `stroke: currentColor` で親要素の色を継承

### 7.2 既存アイコン（`mock-v6.html` に定義済み）

```
#i-menu, #i-close, #i-plus, #i-search, #i-minus
#i-home, #i-fork (食事), #i-dumbbell (筋トレ), #i-run (有酸素)
#i-scale (体組成), #i-book (履歴), #i-settings
#i-camera, #i-edit, #i-clock, #i-check, #i-chevron-down, #i-chevron-right
#i-trash, #i-heart, #i-bot, #i-target, #i-user
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
.btn-danger   削除系（surface + 1px line + danger 文字色）
```

サイズ: `padding: 9px 14px / font-size: 13px` が標準。
タップターゲットは最小 44×44px を確保。`<button>` 自体が 44 未満になる場合は `padding` で確保するか、外側にタップエリアを持たせる。
内部にアイコンを置く場合: アイコン → テキストの順、`gap: 6px`。

### 8.2 Summary Card / 8.3 List Row / 8.4 Field Group / 8.5 Tag Chip / 8.6 Section Title / 8.7 Balance Bar / 8.8 Sparkline Chart

(v4 から変更なし。`mock-v5.html` 実装参照)

### 8.9 Bottom Sheet (新規)

履歴・体組成入力など、画面遷移を伴わない詳細表示に使う。

```
.sheet                            黒半透明オーバーレイ (rgba(0,0,0,0.4))
  .sheet-panel                    下からスライド
    .sheet-handle                 4×36px の灰バー（上端センター）
    .sheet-header                 タイトル + close
    .sheet-body                   スクロール領域
    .sheet-footer                 CTA（オプション）
```

- `border-radius: 20px 20px 0 0`
- `box-shadow: var(--shadow-modal)`
- 最大高さ `85vh`
- スライドアニメーション `transform: translateY()` × `--dur-slow`
- 背景タップ or ハンドル下スワイプで閉じる（実装は Claude Code 側）

### 8.10 Bottom Nav (仕様確定)

```
height: 56px
padding: 6px 0 calc(8px + env(safe-area-inset-bottom));
```

- アクティブ表現は **色のみ** (`color: var(--ink); font-weight: 600`)
- バッジ・下線・背景色は使わない
- 各アイテムのタップエリアは最低 44×44px
- `z-index: var(--z-nav)`

### 8.11 Skeleton (新規)

```css
.skeleton {
  background: var(--surface-2);
  background-image: linear-gradient(90deg,
    transparent 0%,
    rgba(120,113,108,0.08) 50%,
    transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
  border-radius: var(--r-2);
  color: transparent;
}
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
```

ローディング中はテキストノードを `.skeleton` のラッパで包む or 行の shape だけを `.skeleton` で表示。

---

## 9. インタラクション原則

### 9.1 状態

- **Hover**: ボタンは `border-color: --ink-2` に変更。リスト行は `background: --surface-2`。
- **Focus (キーボード)**: `:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }`
  - リスト行など border 非依存の要素でも視認できる。
  - `:focus` ではなく `:focus-visible` を使い、マウスクリック時のリングは出さない。
- **Active/Pressed**: `opacity: 0.9` 程度で軽く沈める。

### 9.2 トランジション / モーション

```css
:root {
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --dur-fast: 120ms;
  --dur-base: 180ms;
  --dur-slow: 280ms;
}
transition: all var(--dur-base) var(--ease);
```

- ホバー・フォーカス・色変化: `--dur-fast`
- ドロワー / ボトムシート: `--dur-slow`
- 数値カウントアップなど装飾系: 使わない

`prefers-reduced-motion: reduce` でアニメーションは全て無効化。

### 9.3 ローディング

スピナーよりも**スケルトン** (`.skeleton`) を優先。データ行のシェイプを薄いグレーで表示する。

### 9.4 空状態

絵文字や派手なイラストは使わず、薄い説明文 + 操作 CTA のみ。
```
記録がまだありません
[食事を記録する]
```

### 9.5 エラー

- フィールドエラー: 入力枠の `border-color: var(--danger)` + 直下に `<div class="hint danger">` 11px。
- 画面レベルエラー: トーストまたはバナー (`background: surface-2; border-left: 3px solid danger;`)。

---

## 10. グリッド / レイアウト

- 1画面のメインコンテナ: `max-width: 440px`（モバイル前提）
- ページパディング: 左右 `20px`、上 `22px`、下 `20px`
- カード間: `12px`
- セクション間: `20-24px`
- セーフエリア: ボトムナビは `env(safe-area-inset-bottom)` を考慮

---

## 11. z-index 階層

```css
--z-nav:   10;   /* bottom-nav */
--z-sheet: 20;   /* bottom sheet overlay + panel */
--z-modal: 25;   /* centered modal */
--z-toast: 30;   /* 最前面 */
```

数値を直書きせず、必ずトークン経由で参照する。

---

## 12. 命名規則

- CSS クラスは BEM 風ではなく、シンプルな機能名 (`.btn`, `.list-row`, `.section-title`)。
- 数値表示には `.num` クラスを必ず付ける。
- 役割色は `.eat / .move / .body` のサフィックスで適用。
- データ属性で状態切替: `data-theme`, `data-active`, `aria-pressed`, etc.
- AI 由来は `.ai` サフィックス or `data-ai="true"`。
