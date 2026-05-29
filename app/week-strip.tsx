"use client";

import { useState } from "react";

export type WeekDay = {
  iso: string;
  dow: string;
  label: string;
  today: boolean;
  eat: boolean;
  move: boolean;
  body: boolean;
  intake: number;
  burn: number;
  protein: number;
  fat: number;
  carbs: number;
  mealCount: number;
};

export function WeekStrip({ days }: { days: WeekDay[] }) {
  const [sel, setSel] = useState<WeekDay | null>(null);
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 18,
        }}
      >
        {days.map((d) => (
          <button
            key={d.iso}
            type="button"
            onClick={() => setSel(d)}
            style={{
              background: d.today ? "var(--surface)" : "var(--surface-2)",
              border: d.today ? "1px solid var(--ink)" : "1px solid var(--line)",
              borderRadius: 8,
              padding: "8px 4px",
              textAlign: "center",
              cursor: "pointer",
              fontFamily: "inherit",
              color: "var(--ink)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--muted)",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {d.dow}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                height: 14,
                alignItems: "center",
              }}
            >
              {d.eat && <Dot color="var(--eat)" />}
              {d.move && <Dot color="var(--move)" />}
              {d.body && <Dot color="var(--body)" />}
              {!d.eat && !d.move && !d.body && <Dot empty />}
            </div>
          </button>
        ))}
      </div>

      {sel && <DaySheet day={sel} onClose={() => setSel(null)} />}
    </>
  );
}

function DaySheet({ day, onClose }: { day: WeekDay; onClose: () => void }) {
  const net = day.intake - day.burn;
  const hasData = day.mealCount > 0 || day.burn > 0;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ padding: "8px 18px 22px" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{day.label}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, marginBottom: 16 }}>
            その日のサマリー
          </div>

          {!hasData ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                background: "var(--surface-2)",
                border: "1px dashed var(--line)",
                borderRadius: 10,
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              この日の記録はありません
            </div>
          ) : (
            <>
              {/* 純摂取 */}
              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  純摂取 (摂取 − 消費)
                </div>
                <div
                  className="num"
                  style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}
                >
                  {net.toLocaleString()}
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
                    {" "}
                    kcal
                  </span>
                </div>
              </div>

              {/* 摂取 / 消費 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <StatCell label="摂取" value={day.intake} unit="kcal" color="var(--eat)" />
                <StatCell label="消費" value={day.burn} unit="kcal" color="var(--move)" />
              </div>

              {/* PFC */}
              <div className="section-title" style={{ marginTop: 6 }}>
                PFC
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                <StatCell label="P タンパク質" value={day.protein} unit="g" />
                <StatCell label="F 脂質" value={day.fat} unit="g" />
                <StatCell label="C 炭水化物" value={day.carbs} unit="g" />
              </div>

              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
                食事 {day.mealCount} 件
                {day.burn > 0 ? " · 消費は運動・歩数の記録ベース" : ""}
              </div>
            </>
          )}

          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 18, justifyContent: "center" }}
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--muted)",
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        className="num"
        style={{
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: color ?? "var(--ink)",
        }}
      >
        {value.toLocaleString()}
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>
          {" "}
          {unit}
        </span>
      </div>
    </div>
  );
}

function Dot({ color, empty }: { color?: string; empty?: boolean }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: empty ? "transparent" : color,
        border: empty ? "1px solid var(--line)" : "none",
      }}
    />
  );
}
