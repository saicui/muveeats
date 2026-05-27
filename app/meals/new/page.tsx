"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/app/icons";
import { LoadingBar, Spinner } from "@/app/components/loading";
import { TAG_CATEGORIES } from "@/lib/tags";
import { inferAllTags, inferMacroTags } from "@/lib/auto-tags";
import type { ChainItem, AnalysisResult } from "@/lib/types";

type Mode = "search" | "photo" | "manual";

type SelectedItem = {
  source: "chain" | "photo" | "manual";
  name: string;
  size: string[];
  chain_id: string | null;
  chain_name: string | null;
  item_id: string | null;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  ai_confidence: number | null;
  ai_note: string | null;
  autoGenreTags: string[]; // 例: ["バーガー", "ファストフード"]
  aiSuggestedTags: string[];
};

export default function NewMealPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("search");
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [eatenAt, setEatenAt] = useState(() => isoLocal(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickChain(item: ChainItem) {
    const auto = [...item.chain_genre];
    const inferred = inferAllTags({
      nutrition: {
        name: item.display_name,
        calories: item.calories,
        protein_g: item.protein_g,
        fat_g: item.fat_g,
        carbs_g: item.carbs_g,
      },
      source: "chain",
      chainGenres: item.chain_genre,
    });
    setSelected({
      source: "chain",
      name: item.display_name,
      size: item.size,
      chain_id: item.chain_id,
      chain_name: item.chain_name,
      item_id: item.id,
      calories: item.calories,
      protein_g: item.protein_g,
      fat_g: item.fat_g,
      carbs_g: item.carbs_g,
      ai_confidence: null,
      ai_note: null,
      autoGenreTags: auto,
      aiSuggestedTags: inferred,
    });
    setTags(new Set(inferred));
  }

  function pickAnalysis(result: AnalysisResult) {
    // Gemini が返したタグに加えて、PFC からも推測（補完）
    const macroInferred = inferMacroTags({
      calories: result.calories,
      protein_g: result.protein_g,
      fat_g: result.fat_g,
      carbs_g: result.carbs_g,
    });
    const combined = [
      ...(result.tags ?? []),
      ...macroInferred,
      ...inferAllTags({
        nutrition: { name: result.name },
        source: "photo",
      }),
    ];
    const dedup = Array.from(new Set(combined));
    setSelected({
      source: "photo",
      name: result.name,
      size: [],
      chain_id: null,
      chain_name: null,
      item_id: null,
      calories: Math.round(result.calories),
      protein_g: result.protein_g,
      fat_g: result.fat_g,
      carbs_g: result.carbs_g,
      ai_confidence: result.confidence,
      ai_note: result.notes ?? null,
      autoGenreTags: [],
      aiSuggestedTags: dedup,
    });
    setTags(new Set(dedup));
  }

  function pickManual(p: ManualFields) {
    const inferred = inferAllTags({
      nutrition: p,
      source: "manual",
    });
    setSelected({
      source: "manual",
      name: p.name,
      size: [],
      chain_id: null,
      chain_name: null,
      item_id: null,
      calories: p.calories,
      protein_g: p.protein_g,
      fat_g: p.fat_g,
      carbs_g: p.carbs_g,
      ai_confidence: null,
      ai_note: null,
      autoGenreTags: [],
      aiSuggestedTags: inferred,
    });
    setTags(new Set(inferred));
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");
      const allTags = Array.from(
        new Set([...selected.autoGenreTags, ...Array.from(tags)]),
      );
      const { error } = await supabase.from("meals").insert({
        user_id: auth.user.id,
        name: selected.name,
        calories: selected.calories,
        protein_g: selected.protein_g,
        fat_g: selected.fat_g,
        carbs_g: selected.carbs_g,
        chain_id: selected.chain_id,
        chain_name: selected.chain_name,
        item_id: selected.item_id,
        size: selected.size.length ? selected.size.join(" ") : null,
        source: selected.source,
        ai_confidence: selected.ai_confidence,
        ai_note: selected.ai_note,
        tags: allTags,
        eaten_at: new Date(eatenAt).toISOString(),
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

  if (selected) {
    return (
      <>
        <LoadingBar active={saving} />
        <ConfirmStep
          selected={selected}
          tags={tags}
          toggleTag={(label) => {
            const next = new Set(tags);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            setTags(next);
          }}
          eatenAt={eatenAt}
          setEatenAt={setEatenAt}
          onBack={() => setSelected(null)}
          onSave={save}
          saving={saving}
          error={error}
        />
      </>
    );
  }

  return (
    <div>
      <LoadingBar active={false} />
      <h1 className="page-title">食事を記録</h1>
      <p className="page-subtitle">チェーン店検索 / 写真解析 / 手動入力</p>

      <ModeTabs mode={mode} setMode={setMode} />

      {mode === "search" && <ChainSearchStep onPick={pickChain} />}
      {mode === "photo" && <PhotoStep onResult={pickAnalysis} />}
      {mode === "manual" && <ManualStep onSubmit={pickManual} />}
    </div>
  );
}

// ============================================================
// Mode tabs
// ============================================================
function ModeTabs({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const tabs: { id: Mode; label: string; icon: "search" | "camera" | "edit" }[] = [
    { id: "search", label: "検索", icon: "search" },
    { id: "photo", label: "写真", icon: "camera" },
    { id: "manual", label: "手動", icon: "edit" },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 3,
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        marginBottom: 20,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setMode(t.id)}
          className="btn btn-ghost"
          style={{
            flex: 1,
            justifyContent: "center",
            background: mode === t.id ? "var(--surface)" : "transparent",
            color: mode === t.id ? "var(--ink)" : "var(--muted)",
            fontWeight: mode === t.id ? 600 : 500,
            boxShadow: mode === t.id ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
            padding: "8px 12px",
            fontSize: 12,
          }}
        >
          <Icon name={t.icon} size="sm" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Chain search step
// ============================================================
function ChainSearchStep({ onPick }: { onPick: (item: ChainItem) => void }) {
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<{ chains: number; items: number } | null>(
    null,
  );
  const [results, setResults] = useState<ChainItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/chains/list")
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/chains/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.items ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ChainItem[]>();
    for (const item of results) {
      const key = item.chain_name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries());
  }, [results]);

  return (
    <div>
      <div className="section-title">
        <span>チェーン店から検索</span>
        {stats && (
          <span className="aux">
            <strong>{stats.chains}</strong> チェーン ·{" "}
            <strong>{stats.items}</strong> 品目
          </span>
        )}
      </div>

      <div className="search-input" style={{ marginBottom: 16 }}>
        <Icon name="search" className="ic-search" />
        <input
          className="input"
          placeholder="店名 or メニュー名（例: ビッグマック、牛丼、ラテ）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className="clear-btn"
            onClick={() => setQuery("")}
            aria-label="クリア"
          >
            <Icon name="close" size="sm" />
          </button>
        )}
      </div>

      {!query && (
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "12px 14px",
            display: "flex",
            gap: 12,
            alignItems: "center",
            fontSize: 12,
            color: "var(--muted)",
            marginBottom: 12,
          }}
        >
          <Icon name="database" />
          <div style={{ flex: 1 }}>
            公式の栄養情報を <strong style={{ color: "var(--ink)" }}>32 チェーン</strong> 分収録。
            該当しない場合は「写真」または「手動」で記録できます。
          </div>
        </div>
      )}

      {loading && <div style={{ fontSize: 12, color: "var(--muted)" }}>検索中…</div>}

      {!loading && query && results.length === 0 && (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            background: "var(--surface)",
            border: "1px dashed var(--line)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            「{query}」に一致するメニューがありません
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            写真や手動入力で記録してください
          </div>
        </div>
      )}

      {grouped.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {grouped.map(([chainName, items]) => (
            <div key={chainName}>
              <div
                style={{
                  padding: "8px 14px",
                  background: "var(--surface-2)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--muted)",
                  fontWeight: 600,
                  borderBottom: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{chainName}</span>
                <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: "none" }}>
                  {items.length} 件
                </span>
              </div>
              {items.map((item) => (
                <button
                  key={`${item.chain_id}-${item.id}`}
                  type="button"
                  onClick={() => onPick(item)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: 0,
                    borderBottom: "1px solid var(--line-soft)",
                    background: "transparent",
                    color: "var(--ink)",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.display_name}</div>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 4,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {item.size.map((s) => (
                        <span key={s} className="size-tag">
                          {s}
                        </span>
                      ))}
                      <span className="official-tag">official</span>
                    </div>
                  </div>
                  <div className="num" style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {item.calories ?? "—"}
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          marginLeft: 2,
                          fontWeight: 500,
                        }}
                      >
                        kcal
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>
                      {item.protein_g != null
                        ? `P${item.protein_g} / F${item.fat_g} / C${item.carbs_g}`
                        : "PFC 値非公開"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Photo step
// ============================================================
function PhotoStep({ onResult }: { onResult: (r: AnalysisResult) => void }) {
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
      const res = await fetch("/api/analyze-meal", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "解析に失敗しました");
      onResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div>
      <div className="section-title">食事の写真</div>
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
          capture="environment"
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
              タップして写真を選択 / 撮影
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
        {analyzing ? "解析中…" : "解析する"}
      </button>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: "var(--surface)",
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

// ============================================================
// Manual step
// ============================================================
type ManualFields = {
  name: string;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
};

function ManualStep({ onSubmit }: { onSubmit: (p: ManualFields) => void }) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      calories: calories ? Number(calories) : null,
      protein_g: protein ? Number(protein) : null,
      fat_g: fat ? Number(fat) : null,
      carbs_g: carbs ? Number(carbs) : null,
    });
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="料理名" required>
        <input
          className="input"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="鶏胸肉のサラダ"
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        <Field label="kcal">
          <input className="input" type="number" inputMode="numeric"
            value={calories} onChange={(e) => setCalories(e.target.value)} />
        </Field>
        <Field label="P (g)">
          <input className="input" type="number" step="0.1"
            value={protein} onChange={(e) => setProtein(e.target.value)} />
        </Field>
        <Field label="F (g)">
          <input className="input" type="number" step="0.1"
            value={fat} onChange={(e) => setFat(e.target.value)} />
        </Field>
        <Field label="C (g)">
          <input className="input" type="number" step="0.1"
            value={carbs} onChange={(e) => setCarbs(e.target.value)} />
        </Field>
      </div>

      <button className="btn btn-primary btn-block" type="submit">
        次へ
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
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--muted)",
          fontWeight: 600,
        }}
      >
        {label}
        {required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}
      </span>
      {children}
    </label>
  );
}

// ============================================================
// Confirm step
// ============================================================
function ConfirmStep({
  selected,
  tags,
  toggleTag,
  eatenAt,
  setEatenAt,
  onBack,
  onSave,
  saving,
  error,
}: {
  selected: SelectedItem;
  tags: Set<string>;
  toggleTag: (label: string) => void;
  eatenAt: string;
  setEatenAt: (s: string) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}) {
  // ジャンルセクションのみ別扱い
  const genreCat = TAG_CATEGORIES.find((c) => c.id === "genre")!;
  const otherCats = TAG_CATEGORIES.filter((c) => c.id !== "genre");
  const aiSuggested = new Set(selected.aiSuggestedTags);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button type="button" className="header-action" onClick={onBack}
          aria-label="戻る">
          <Icon name="chevron-left" />
        </button>
        <h1 className="page-title" style={{ fontSize: 22 }}>
          記録する内容
        </h1>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--ink)",
          borderRadius: 12,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {selected.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {selected.chain_name && <span>{selected.chain_name}</span>}
              {selected.source === "chain" && <span className="official-tag">official</span>}
              {selected.source === "photo" && (
                <>
                  <span>写真解析</span>
                  {selected.ai_confidence != null && (
                    <span style={{ color: "var(--ai)" }}>
                      自信度 {Math.round(selected.ai_confidence * 100)}%
                    </span>
                  )}
                </>
              )}
              {selected.source === "manual" && <span>手動入力</span>}
              {selected.size.map((s) => (
                <span key={s} className="size-tag">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: "transparent",
              border: 0,
              fontSize: 11,
              color: "var(--ink-2)",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            変更
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {(["calories", "protein_g", "fat_g", "carbs_g"] as const).map((k, i) => (
            <div
              key={k}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "10px 6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--muted)",
                  fontWeight: 600,
                }}
              >
                {["kcal", "P", "F", "C"][i]}
              </div>
              <div className="num" style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>
                {selected[k] != null ? Math.round(Number(selected[k])) : "—"}
              </div>
            </div>
          ))}
        </div>

        {selected.ai_note && (
          <div
            style={{
              marginTop: 10,
              background: "var(--surface-2)",
              borderLeft: "3px solid var(--ai)",
              padding: "8px 10px",
              fontSize: 12,
              color: "var(--ink-2)",
              borderRadius: "0 6px 6px 0",
            }}
          >
            {selected.ai_note}
          </div>
        )}
      </div>

      <div className="section-title">食べた時刻</div>
      <input
        className="input"
        type="datetime-local"
        value={eatenAt}
        onChange={(e) => setEatenAt(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <div className="section-title">
        <span>タグ</span>
        <span className="aux">• 自動付与 / 破線 = AI 提案</span>
      </div>

      {selected.autoGenreTags.length > 0 && (
        <TagGroup
          label="ジャンル（自動）"
          tags={selected.autoGenreTags.map((label) => ({ label, kind: "auto" as const }))}
          onToggle={() => {}}
        />
      )}

      {otherCats.map((cat) => (
        <TagGroup
          key={cat.id}
          label={cat.label}
          tags={cat.tags.map((t) => ({
            label: t.label,
            kind: aiSuggested.has(t.label) ? ("ai" as const) : ("normal" as const),
            selected: tags.has(t.label),
          }))}
          onToggle={toggleTag}
        />
      ))}

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: "var(--surface)",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block"
        style={{ padding: 12, marginTop: 16 }}
        disabled={saving}
        onClick={onSave}
      >
        {saving ? (
          <>
            <Spinner /> 保存中…
          </>
        ) : (
          "記録する"
        )}
      </button>
    </div>
  );
}

function TagGroup({
  label,
  tags,
  onToggle,
}: {
  label: string;
  tags: { label: string; kind: "auto" | "ai" | "normal"; selected?: boolean }[];
  onToggle: (label: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--muted)",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {tags.map((t) => {
          const classes = ["tag"];
          if (t.kind === "auto") classes.push("auto");
          if (t.kind === "ai") classes.push("ai");
          if (t.selected) classes.push("selected");
          return (
            <button
              type="button"
              key={t.label}
              className={classes.join(" ")}
              onClick={() => t.kind !== "auto" && onToggle(t.label)}
              style={{ cursor: t.kind === "auto" ? "default" : "pointer" }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// helpers
// ============================================================
function isoLocal(d: Date): string {
  const local = new Date(d);
  local.setMinutes(local.getMinutes() - d.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}
