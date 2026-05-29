"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { Spinner } from "./components/loading";

type FeedbackData = {
  headline: string;
  good: string;
  improve: string;
  action: string;
  stats: { days: number; meals: number; workouts: number };
};

export function CoachFeedback() {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "失敗しました");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <div className="section-title">
        <span>AI フィードバック</span>
        {data && (
          <button
            type="button"
            onClick={ask}
            disabled={loading}
            className="aux"
            style={{
              color: "var(--ink-2)",
              background: "transparent",
              border: 0,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            再生成
          </button>
        )}
      </div>

      {!data && !error && (
        <button
          type="button"
          className="btn btn-block"
          onClick={ask}
          disabled={loading}
          style={{
            justifyContent: "center",
            border: "1px dashed var(--ai)",
            color: "var(--ai)",
            background: "var(--surface)",
            padding: 14,
          }}
        >
          {loading ? (
            <>
              <Spinner size={14} /> 直近の記録を解析中…
            </>
          ) : (
            <>
              <Icon name="bot" size="sm" />
              直近7日を踏まえてアドバイス
            </>
          )}
        </button>
      )}

      {error && (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {data && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              lineHeight: 1.4,
            }}
          >
            {data.headline}
          </div>
          <Block label="GOOD" color="var(--eat)" text={data.good} />
          <Block label="改善" color="var(--warn)" text={data.improve} />
          <Block label="明日のアクション" color="var(--ai)" text={data.action} />
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              borderTop: "1px solid var(--line)",
              paddingTop: 8,
            }}
          >
            {data.stats.days}日 / 食事{data.stats.meals}件 / 運動{data.stats.workouts}件 を元に生成
          </div>
        </div>
      )}
    </div>
  );
}

function Block({
  label,
  color,
  text,
}: {
  label: string;
  color: string;
  text: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 600,
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
        {label}
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}
