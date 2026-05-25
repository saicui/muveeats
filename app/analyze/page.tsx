"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AnalysisResult } from "@/lib/types";

export default function AnalyzePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function onFile(f: File | null) {
    setFile(f);
    setResult(null);
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
      const res = await fetch("/api/analyze-meal", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "解析に失敗しました");
      setResult(json as AnalysisResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");
      const { error } = await supabase.from("meals").insert({
        user_id: auth.user.id,
        name: result.name,
        calories: result.calories,
        protein_g: result.protein_g,
        fat_g: result.fat_g,
        carbs_g: result.carbs_g,
        notes: result.notes ?? null,
        eaten_at: new Date().toISOString(),
        source: "photo",
      });
      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">写真からカロリーを推定</h1>
      <p className="text-sm text-neutral-500">
        食事の写真をアップロードすると、Gemini が料理名・カロリー・PFC を推定します。
      </p>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-neutral-300 bg-white p-6 hover:bg-neutral-50">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="プレビュー"
            className="max-h-80 rounded-md object-contain"
          />
        ) : (
          <>
            <span className="text-4xl">📷</span>
            <span className="text-sm text-neutral-600">
              タップして写真を選択 / 撮影
            </span>
          </>
        )}
      </label>

      <button
        onClick={analyze}
        disabled={!file || analyzing}
        className="w-full rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {analyzing ? "解析中…" : "解析する"}
      </button>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
          <div>
            <div className="text-xs text-neutral-500">料理</div>
            <div className="text-lg font-bold">{result.name}</div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="kcal" value={Math.round(result.calories)} />
            <Stat label="P (g)" value={result.protein_g} />
            <Stat label="F (g)" value={result.fat_g} />
            <Stat label="C (g)" value={result.carbs_g} />
          </div>
          <div className="text-xs text-neutral-500">
            自信度: {(result.confidence * 100).toFixed(0)}%
          </div>
          {result.notes && (
            <p className="text-sm text-neutral-700">{result.notes}</p>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "保存中…" : "この内容で記録する"}
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-neutral-100 p-2">
      <div className="text-[10px] text-neutral-500">{label}</div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  );
}
