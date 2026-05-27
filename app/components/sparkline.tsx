/**
 * 軽量 SVG スパークライン。依存ゼロ。
 * - points: 古い→新しい順に並んだ数値配列 (null は欠損として扱う)
 * - 内部で値域を正規化して描画。データ点数は自動でフィット
 */

type Props = {
  points: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
  /** 最新値に丸ドットを置く */
  showLast?: boolean;
  /** 横軸ベースライン (値域の中央線) を薄く出す */
  showAxis?: boolean;
  /** 値域を強制する場合 [min, max] */
  range?: [number, number];
  ariaLabel?: string;
};

export function Sparkline({
  points,
  width = 220,
  height = 56,
  color = "var(--ink)",
  fill,
  showLast = true,
  showAxis = false,
  range,
  ariaLabel,
}: Props) {
  const valid = points
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v != null && isFinite(p.v));
  if (valid.length < 2) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "var(--muted)",
        }}
      >
        データ不足
      </div>
    );
  }

  const xs = valid.map((p) => p.i);
  const ys = valid.map((p) => p.v);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const [minY, maxY] = range ?? [Math.min(...ys), Math.max(...ys)];
  const spanY = maxY - minY || 1;
  const padX = 2;
  const padY = 4;

  const scaleX = (x: number) =>
    padX + ((x - minX) / Math.max(1, maxX - minX)) * (width - padX * 2);
  const scaleY = (y: number) =>
    height - padY - ((y - minY) / spanY) * (height - padY * 2);

  const d = valid
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.i).toFixed(1)} ${scaleY(p.v).toFixed(1)}`)
    .join(" ");
  const area = fill
    ? `${d} L${scaleX(valid[valid.length - 1].i).toFixed(1)} ${height - padY} L${scaleX(valid[0].i).toFixed(1)} ${height - padY} Z`
    : null;

  const last = valid[valid.length - 1];
  const lastX = scaleX(last.i);
  const lastY = scaleY(last.v);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height }}
    >
      {showAxis && (
        <line
          x1={padX}
          x2={width - padX}
          y1={height / 2}
          y2={height / 2}
          stroke="var(--line)"
          strokeDasharray="2 3"
        />
      )}
      {area && <path d={area} fill={fill} opacity={0.18} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {showLast && (
        <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
      )}
    </svg>
  );
}
