/**
 * ルート共通の Suspense フォールバック。
 * Server Component が Supabase からデータを取得する間、即座にこの
 * スケルトンが描画されるため、タブ切替時の体感遅延が消える。
 */
export default function Loading() {
  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <SkeletonLine width="60%" height={22} />
      <SkeletonLine width="40%" height={12} />
      <SkeletonBox height={120} />
      <SkeletonBox height={80} />
      <SkeletonBox height={80} />
    </div>
  );
}

function SkeletonLine({ width, height }: { width: string; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: "var(--surface-2)",
        animation: "skeleton-pulse 1.2s ease-in-out infinite",
      }}
    />
  );
}

function SkeletonBox({ height }: { height: number }) {
  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 12,
        background: "var(--surface-2)",
        animation: "skeleton-pulse 1.2s ease-in-out infinite",
      }}
    />
  );
}
