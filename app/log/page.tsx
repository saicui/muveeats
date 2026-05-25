"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [eatenAt, setEatenAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");
      const { error } = await supabase.from("meals").insert({
        user_id: auth.user.id,
        name,
        calories: calories ? Number(calories) : null,
        protein_g: protein ? Number(protein) : null,
        fat_g: fat ? Number(fat) : null,
        carbs_g: carbs ? Number(carbs) : null,
        eaten_at: new Date(eatenAt).toISOString(),
        notes: notes || null,
        source: "manual",
      });
      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-2xl font-bold">食事を手動で記録</h1>

      <Field label="料理名" required>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          placeholder="鶏胸肉のサラダ"
        />
      </Field>

      <Field label="食べた日時">
        <input
          type="datetime-local"
          value={eatenAt}
          onChange={(e) => setEatenAt(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="kcal">
          <input
            type="number"
            inputMode="numeric"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </Field>
        <Field label="P (g)">
          <input
            type="number"
            step="0.1"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </Field>
        <Field label="F (g)">
          <input
            type="number"
            step="0.1"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </Field>
        <Field label="C (g)">
          <input
            type="number"
            step="0.1"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </Field>
      </div>

      <Field label="メモ">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          rows={3}
        />
      </Field>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {submitting ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
