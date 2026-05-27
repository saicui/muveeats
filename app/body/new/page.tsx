"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewBodyRecordPage() {
  const router = useRouter();
  const [recordedAt, setRecordedAt] = useState(() => isoLocal(new Date()));
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [visceral, setVisceral] = useState("");
  const [bmr, setBmr] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!weight && !bodyFat && !muscle && !visceral && !bmr) {
      setError("少なくとも1つの値を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");
      const { error } = await supabase.from("body_records").insert({
        user_id: auth.user.id,
        recorded_at: new Date(recordedAt).toISOString(),
        weight_kg: weight ? Number(weight) : null,
        body_fat_pct: bodyFat ? Number(bodyFat) : null,
        muscle_kg: muscle ? Number(muscle) : null,
        visceral_fat: visceral ? Number(visceral) : null,
        bmr_kcal: bmr ? Number(bmr) : null,
      });
      if (error) throw error;
      router.push("/body");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">体組成を記録</h1>
      <p className="page-subtitle">計測した数値を手動で入力</p>

      <form onSubmit={save}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <Field label="計測日時">
            <input
              className="input"
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              style={{ border: 0, padding: "8px 12px" }}
            />
          </Field>
          <Field label="体重" unit="kg">
            <input
              className="input"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              style={{ border: 0, padding: "8px 12px", textAlign: "right" }}
            />
          </Field>
          <Field label="体脂肪率" unit="%">
            <input
              className="input"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              style={{ border: 0, padding: "8px 12px", textAlign: "right" }}
            />
          </Field>
          <Field label="筋肉量" unit="kg">
            <input
              className="input"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={muscle}
              onChange={(e) => setMuscle(e.target.value)}
              style={{ border: 0, padding: "8px 12px", textAlign: "right" }}
            />
          </Field>
          <Field label="内臓脂肪レベル" unit="">
            <input
              className="input"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={visceral}
              onChange={(e) => setVisceral(e.target.value)}
              style={{ border: 0, padding: "8px 12px", textAlign: "right" }}
            />
          </Field>
          <Field label="基礎代謝" unit="kcal">
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={bmr}
              onChange={(e) => setBmr(e.target.value)}
              style={{ border: 0, padding: "8px 12px", textAlign: "right" }}
            />
          </Field>
        </div>

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
          {saving ? "保存中…" : "記録する"}
        </button>
      </form>
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
