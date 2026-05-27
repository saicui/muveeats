"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/app/icons";
import { estimateCardioKcal } from "@/lib/met";
import type { CardioType, Intensity } from "@/lib/types";

const TYPES: { id: CardioType; label: string }[] = [
  { id: "run", label: "ラン" },
  { id: "walk", label: "ウォーク" },
  { id: "bike", label: "バイク" },
  { id: "other", label: "その他" },
];

const INTENSITIES: { id: Intensity; label: string }[] = [
  { id: "low", label: "軽い" },
  { id: "mid", label: "中" },
  { id: "high", label: "強い" },
];

export default function NewCardioPage() {
  const router = useRouter();
  const [type, setType] = useState<CardioType>("run");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("mid");
  const [note, setNote] = useState("");
  const [bodyWeight, setBodyWeight] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 後日記録 (任意): null なら現在時刻を終了時刻として処理する
  const [endedAtOverride, setEndedAtOverride] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("body_records")
        .select("weight_kg")
        .not("weight_kg", "is", null)
        .order("recorded_at", { ascending: false })
        .limit(1);
      if (data && data[0]?.weight_kg) setBodyWeight(Number(data[0].weight_kg));
    })();
  }, []);

  const estKcal = useMemo(() => {
    const d = Number(duration);
    if (!d || d <= 0) return null;
    return estimateCardioKcal({
      type,
      intensity,
      durationMin: d,
      bodyWeightKg: bodyWeight,
    });
  }, [type, intensity, duration, bodyWeight]);

  const pacePerKm = useMemo(() => {
    const d = Number(duration);
    const km = Number(distance);
    if (!d || !km || d <= 0 || km <= 0) return null;
    const sec = (d * 60) / km;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}'${String(s).padStart(2, "0")}"`;
  }, [duration, distance]);

  async function save() {
    if (!duration || Number(duration) <= 0) {
      setError("時間を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");

      const endedAt = endedAtOverride ? new Date(endedAtOverride) : new Date();
      const startedAt = new Date(endedAt.getTime() - Number(duration) * 60000);

      const { error } = await supabase.from("workouts").insert({
        user_id: auth.user.id,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_min: Number(duration),
        kind: "cardio",
        cardio_type: type,
        distance_km: distance ? Number(distance) : null,
        avg_hr: avgHr ? Number(avgHr) : null,
        intensity,
        est_kcal: estKcal,
        note: note || null,
      });
      if (error) throw error;
      router.push("/workouts");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">有酸素</h1>
      <p className="page-subtitle">時間 / 距離 / 強度を入力 → MET 法で消費 kcal を概算</p>

      <CardioBackdateField value={endedAtOverride} onChange={setEndedAtOverride} />

      <div className="section-title">種目</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          marginBottom: 18,
        }}
      >
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            style={{
              padding: "10px 4px",
              border: `1px solid ${type === t.id ? "var(--ink)" : "var(--line)"}`,
              background: "var(--surface)",
              color: "var(--ink)",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: type === t.id ? 600 : 500,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 4, color: "var(--ink-2)" }}>
              <Icon name="run" />
            </div>
            {t.label}
          </button>
        ))}
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <Field label="時間 (分)" required>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            style={{ border: 0, textAlign: "right", padding: "8px 12px" }}
          />
        </Field>
        <Field label="距離 (km)" sub="任意">
          <input
            className="input"
            type="number"
            step="0.1"
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            style={{ border: 0, textAlign: "right", padding: "8px 12px" }}
          />
        </Field>
        <Field label="平均心拍 (bpm)" sub="任意">
          <input
            className="input"
            type="number"
            inputMode="numeric"
            value={avgHr}
            onChange={(e) => setAvgHr(e.target.value)}
            style={{ border: 0, textAlign: "right", padding: "8px 12px" }}
          />
        </Field>
        <Field label="強度">
          <select
            className="input"
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as Intensity)}
            style={{ border: 0, textAlign: "right", padding: "8px 12px" }}
          >
            {INTENSITIES.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="section-title">自動計算</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <CalcCell label="ペース" value={pacePerKm ? `${pacePerKm}` : "—"} unit=" / km" />
        <CalcCell label="消費 kcal" value={estKcal ?? "—"} unit=" kcal" />
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.55, marginBottom: 16 }}>
        MET × 体重 × 時間で算出した目安値。実測ではありません。
        {!bodyWeight && " 体重は仮値 65kg を使用中。"}
      </div>

      <div className="section-title">メモ</div>
      <textarea
        className="input"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="気付き、コース、天候など"
        style={{ resize: "vertical", marginBottom: 16 }}
      />

      {error && (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={save}
        disabled={saving}
        style={{ padding: 12 }}
      >
        {saving ? "保存中…" : "記録する"}
      </button>
    </div>
  );
}

function Field({
  label,
  sub,
  required,
  children,
}: {
  label: string;
  sub?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--line-soft)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {label}
          {required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>}
      </div>
      <div style={{ width: 130 }}>{children}</div>
    </div>
  );
}

function CalcCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
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
      <div className="num" style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
        {value}
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

function CardioBackdateField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(Boolean(value));
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: 0,
          color: "var(--muted)",
          fontSize: 11,
          padding: "4px 0",
          cursor: "pointer",
          fontFamily: "inherit",
          marginBottom: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Icon name="clock" size="sm" />
        後日記録する場合は終了日時を指定
      </button>
    );
  }
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: "8px 10px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Icon name="clock" size="sm" />
      <input
        type="datetime-local"
        className="input"
        value={value ?? now.toISOString().slice(0, 16)}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, padding: "4px 6px", fontSize: 13 }}
      />
      <button
        type="button"
        onClick={() => {
          onChange(null);
          setOpen(false);
        }}
        className="header-action"
        aria-label="後日記録を解除"
      >
        <Icon name="close" size="sm" />
      </button>
    </div>
  );
}
