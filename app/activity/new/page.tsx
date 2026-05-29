"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/app/icons";
import { RecordSwitch } from "@/app/components/record-switch";
import { LoadingBar, Spinner } from "@/app/components/loading";

type Mode = "manual" | "photo";

export default function NewActivityPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("manual");
  const [recordedAt, setRecordedAt] = useState(() => isoLocal(new Date()));
  const [steps, setSteps] = useState("");
  const [activeKcal, setActiveKcal] = useState("");
  const [distance, setDistance] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState<"manual" | "photo">("manual");
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!steps && !activeKcal) {
      setError("歩数か消費カロリーのどちらかは入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");
      const { error } = await supabase.from("activity_records").insert({
        user_id: auth.user.id,
        recorded_at: new Date(recordedAt).toISOString(),
        steps: steps ? Math.round(Number(steps)) : null,
        active_kcal: activeKcal ? Number(activeKcal) : null,
        distance_km: distance ? Number(distance) : null,
        source,
        ai_confidence: aiConfidence,
        ai_note: aiNote,
        note: note.trim() || null,
      });
      if (error) throw error;
      router.push("/history");
      router.refresh();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <LoadingBar active={saving} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <h1 className="page-title">歩数・活動</h1>
        <RecordSwitch current="activity" />
      </div>
      <p className="page-subtitle">
        スマートウォッチ / ヘルスケアアプリの画面から自動入力 or 数値を直接入力
      </p>

      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 3,
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          marginBottom: 18,
        }}
      >
        <ModeTab active={mode === "photo"} onClick={() => setMode("photo")} icon="camera" label="写真" />
        <ModeTab active={mode === "manual"} onClick={() => setMode("manual")} icon="edit" label="手動" />
      </div>

      {mode === "photo" && (
        <PhotoMode
          onResult={(r) => {
            if (r.steps != null) setSteps(String(Math.round(r.steps)));
            if (r.active_kcal != null) setActiveKcal(String(r.active_kcal));
            if (r.distance_km != null) setDistance(String(r.distance_km));
            setSource("photo");
            setAiConfidence(r.confidence);
            setAiNote(r.note ?? null);
            setMode("manual");
          }}
        />
      )}

      {mode === "manual" && (
        <form onSubmit={save}>
          {aiConfidence != null && (
            <div
              style={{
                background: "var(--surface-2)",
                borderLeft: "3px solid var(--ai)",
                padding: "8px 10px",
                fontSize: 12,
                color: "var(--ink-2)",
                borderRadius: "0 6px 6px 0",
                marginBottom: 12,
              }}
            >
              写真から読み取り (自信度 {Math.round(aiConfidence * 100)}%) 値を確認・修正してから保存してください。
              {aiNote && <div style={{ marginTop: 4 }}>{aiNote}</div>}
            </div>
          )}

          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <Field label="記録日時">
              <input
                className="input"
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                style={{ border: 0, padding: "8px 12px" }}
              />
            </Field>
            <Field label="歩数" unit="歩">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                value={steps}
                onChange={(e) => {
                  setSteps(e.target.value);
                  setSource("manual");
                }}
                style={{ border: 0, padding: "8px 12px", textAlign: "right" }}
              />
            </Field>
            <Field label="消費カロリー" unit="kcal">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                value={activeKcal}
                onChange={(e) => {
                  setActiveKcal(e.target.value);
                  setSource("manual");
                }}
                style={{ border: 0, padding: "8px 12px", textAlign: "right" }}
              />
            </Field>
            <Field label="移動距離" unit="km">
              <input
                className="input"
                type="number"
                step="0.1"
                inputMode="decimal"
                value={distance}
                onChange={(e) => {
                  setDistance(e.target.value);
                  setSource("manual");
                }}
                style={{ border: 0, padding: "8px 12px", textAlign: "right" }}
              />
            </Field>
          </div>

          <div className="section-title">メモ</div>
          <textarea
            className="input"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="デバイス名や補足など"
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
            type="submit"
            className="btn btn-primary btn-block"
            disabled={saving}
            style={{ padding: 12 }}
          >
            {saving ? (
              <>
                <Spinner /> 保存中…
              </>
            ) : (
              "記録する"
            )}
          </button>
        </form>
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: "camera" | "edit";
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-ghost"
      style={{
        flex: 1,
        justifyContent: "center",
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--ink)" : "var(--muted)",
        fontWeight: active ? 600 : 500,
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <Icon name={icon} size="sm" />
      {label}
    </button>
  );
}

type AnalyzeResult = {
  steps: number | null;
  active_kcal: number | null;
  distance_km: number | null;
  confidence: number;
  note?: string | null;
};

function PhotoMode({ onResult }: { onResult: (r: AnalyzeResult) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/analyze-activity", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "解析に失敗しました");
      onResult(json);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div>
      <LoadingBar active={analyzing} />
      <div className="section-title">スマートウォッチ / ヘルスケア画面</div>
      <label
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: previewUrl ? 8 : 32,
          border: "2px dashed var(--line)",
          background: "var(--surface)",
          borderRadius: 12,
          cursor: "pointer",
          marginBottom: 12,
          minHeight: 200,
        }}
      >
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="プレビュー"
            style={{
              maxHeight: 280,
              borderRadius: 8,
              objectFit: "contain",
            }}
          />
        ) : (
          <>
            <Icon name="camera" size="lg" />
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              タップして撮影 / 選択
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", maxWidth: 280 }}>
              歩数・消費カロリーが大きく写っているスクリーンショットほど精度が上がります
            </div>
          </>
        )}
      </label>

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={analyze}
        disabled={!file || analyzing}
      >
        {analyzing ? (
          <>
            <Spinner /> 解析中…
          </>
        ) : (
          "数値を読み取る"
        )}
      </button>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  unit,
  children,
}: {
  label: string;
  unit?: string;
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
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {unit && <div style={{ fontSize: 11, color: "var(--muted)" }}>{unit}</div>}
      </div>
      <div style={{ width: 140 }}>{children}</div>
    </div>
  );
}

function isoLocal(d: Date): string {
  const local = new Date(d);
  local.setMinutes(local.getMinutes() - d.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

/** Supabase の PostgrestError は Error 派生ではないので message/details/hint/code を拾う。 */
function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const o = e as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const base = o.message || o.details || o.hint;
    if (base) return o.code ? `${base} (${o.code})` : base;
    if (o.code) return `エラーコード ${o.code}`;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}
