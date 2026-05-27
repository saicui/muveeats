import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { BodyRecord, Profile } from "@/lib/types";
import { Icon } from "@/app/icons";
import { estimateBMR } from "@/lib/met";

export default async function BodyPage() {
  let records: BodyRecord[] = [];
  let profile: Profile | null = null;
  let connError: string | null = null;
  try {
    const supabase = await createClient();
    const [r1, r2] = await Promise.all([
      supabase
        .from("body_records")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(200),
      supabase.from("profiles").select("*").maybeSingle(),
    ]);
    if (r1.error) throw r1.error;
    records = (r1.data ?? []) as BodyRecord[];
    profile = (r2.data ?? null) as Profile | null;
  } catch (e) {
    connError = e instanceof Error ? e.message : JSON.stringify(e);
  }

  const latest = records[0] ?? null;
  const weights = records.map((r) => r.weight_kg).filter(notNull);
  const fats = records.map((r) => r.body_fat_pct).filter(notNull);

  const weekDelta = (key: "weight_kg" | "body_fat_pct") => {
    if (records.length === 0) return null;
    const now = new Date(records[0].recorded_at).getTime();
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    const older = records.find(
      (r) => new Date(r.recorded_at).getTime() <= cutoff && r[key] != null,
    );
    if (!older || records[0][key] == null) return null;
    return Number(records[0][key]) - Number(older[key]);
  };

  const wDelta = weekDelta("weight_kg");
  const fDelta = weekDelta("body_fat_pct");
  const bmi =
    latest?.weight_kg && profile?.height_cm
      ? Number(latest.weight_kg) /
        ((Number(profile.height_cm) / 100) * (Number(profile.height_cm) / 100))
      : null;
  const bmr =
    latest?.bmr_kcal ??
    (profile?.age && profile?.height_cm && latest?.weight_kg
      ? estimateBMR({
          sex: (profile.sex ?? "other") as "male" | "female" | "other",
          age: profile.age,
          heightCm: Number(profile.height_cm),
          weightKg: Number(latest.weight_kg),
        })
      : null);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <h1 className="page-title">体組成</h1>
        <Link href="/body/new" className="btn btn-primary">
          <Icon name="plus" size="sm" />
          記録する
        </Link>
      </div>
      <p className="page-subtitle">体重 / 体脂肪率 / 筋肉量</p>

      {connError && (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid var(--warn)",
            color: "var(--warn)",
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          {connError}
        </div>
      )}

      <GraphCard
        title="体重"
        unit="kg"
        value={latest?.weight_kg}
        delta={wDelta}
        deltaSuffix="kg / 7d"
        color="var(--body)"
        points={weights.slice().reverse()}
      />
      <GraphCard
        title="体脂肪率"
        unit="%"
        value={latest?.body_fat_pct}
        delta={fDelta}
        deltaSuffix="% / 7d"
        color="var(--move)"
        points={fats.slice().reverse()}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <Cell label="筋肉量" value={latest?.muscle_kg} unit="kg" />
        <Cell label="内臓脂肪" value={latest?.visceral_fat} unit="" />
        <Cell label="基礎代謝" value={bmr} unit="kcal" />
        <Cell label="BMI" value={bmi ? Number(bmi.toFixed(1)) : null} unit="" />
      </div>

      <div className="section-title">記録履歴</div>
      {records.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            border: "1px dashed var(--line)",
            borderRadius: 12,
            background: "var(--surface)",
          }}
        >
          <div style={{ fontWeight: 600 }}>まだ記録がありません</div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {records.slice(0, 20).map((r) => (
            <div
              key={r.id}
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--line-soft)",
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 32,
                  borderRadius: 2,
                  background: "var(--body)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {new Date(r.recorded_at).toLocaleDateString("ja-JP", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {new Date(r.recorded_at).toLocaleTimeString("ja-JP", {
                    timeStyle: "short",
                  })}{" "}
                  · 手動記録
                </div>
              </div>
              <div className="num" style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {r.weight_kg ?? "—"}
                  <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 2 }}>kg</span>
                </div>
                {r.body_fat_pct != null && (
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>
                    体脂肪 {r.body_fat_pct}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function notNull(v: number | null): v is number {
  return v != null;
}

function Cell({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: 14,
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
        {label}
      </div>
      <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>
        {value ?? "—"}
        {value != null && unit && (
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
            {" "}
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function GraphCard({
  title,
  unit,
  value,
  delta,
  deltaSuffix,
  color,
  points,
}: {
  title: string;
  unit: string;
  value: number | null | undefined;
  delta: number | null;
  deltaSuffix: string;
  color: string;
  points: number[];
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 18,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 600,
            }}
          >
            {title}
          </div>
          <div
            className="num"
            style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            {value ?? "—"}
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
              {" "}
              {unit}
            </span>
          </div>
          {delta != null && (
            <div
              className="num"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: delta < 0 ? "var(--eat)" : delta > 0 ? "var(--warn)" : "var(--muted)",
              }}
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} {deltaSuffix}
            </div>
          )}
        </div>
      </div>
      <Sparkline points={points} color={color} />
    </div>
  );
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) {
    return (
      <div
        style={{
          height: 60,
          fontSize: 11,
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        記録が 2 点以上必要です
      </div>
    );
  }
  const w = 400;
  const h = 60;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(0.001, max - min);
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map((v) => h - 10 - ((v - min) / range) * (h - 20));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 60 }}
    >
      <path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={3} fill={color} />
    </svg>
  );
}
