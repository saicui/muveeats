"use client";

/**
 * ページ最上部に薄い進捗バーを表示する。`active` のときだけ動く。
 * fetch / save の長い処理に使う。
 */
export function LoadingBar({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden={!active}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "transparent",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: active ? "30%" : "0%",
          height: "100%",
          background: "var(--ink)",
          opacity: active ? 1 : 0,
          transition: active ? "width 0.8s ease-out, opacity 0.15s" : "opacity 0.3s",
          animation: active ? "loadingBar 1.4s infinite ease-in-out" : "none",
        }}
      />
      <style jsx>{`
        @keyframes loadingBar {
          0% {
            margin-left: -30%;
          }
          100% {
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * インラインスピナー。ボタン内など。
 */
export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "1.5px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        verticalAlign: "middle",
      }}
    >
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </span>
  );
}
