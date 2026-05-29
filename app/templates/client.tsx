"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/app/icons";
import { LoadingBar, Spinner } from "@/app/components/loading";
import type { MealTemplate, MealTemplateSkip } from "@/lib/types";

export function TemplatesClient({
  templates: initial,
  todaySkips: initialSkips,
  todayISO,
  error,
}: {
  templates: MealTemplate[];
  todaySkips: MealTemplateSkip[];
  todayISO: string;
  error: string | null;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initial);
  const [skips, setSkips] = useState<Set<string>>(
    new Set(initialSkips.map((s) => s.template_id)),
  );
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<MealTemplate> | null>(null);

  async function toggleSkip(t: MealTemplate) {
    setBusyId(t.id);
    setBusy(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");
      if (skips.has(t.id)) {
        // skip 解除
        const { error } = await supabase
          .from("meal_template_skips")
          .delete()
          .eq("template_id", t.id)
          .eq("skip_date", todayISO);
        if (error) throw error;
        setSkips((p) => {
          const next = new Set(p);
          next.delete(t.id);
          return next;
        });
      } else {
        const { error } = await supabase.from("meal_template_skips").insert({
          user_id: auth.user.id,
          template_id: t.id,
          skip_date: todayISO,
        });
        if (error) throw error;
        setSkips((p) => new Set([...p, t.id]));
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  }

  async function logNow(t: MealTemplate) {
    setBusyId(t.id);
    setBusy(true);
    setErrorMsg(null);
    setSavedMsg(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");
      const now = new Date();
      // default_time があれば今日の時刻に上書き
      let eatenAt = now;
      if (t.default_time) {
        const [hh, mm] = t.default_time.split(":").map((x) => Number(x));
        if (!isNaN(hh) && !isNaN(mm)) {
          const d = new Date();
          d.setHours(hh, mm, 0, 0);
          eatenAt = d;
        }
      }
      const { error } = await supabase.from("meals").insert({
        user_id: auth.user.id,
        eaten_at: eatenAt.toISOString(),
        name: t.name,
        calories: t.calories,
        protein_g: t.protein_g,
        fat_g: t.fat_g,
        carbs_g: t.carbs_g,
        chain_id: t.chain_id,
        chain_name: t.chain_name,
        item_id: t.item_id,
        size: t.size,
        source: t.chain_id ? "chain" : "manual",
        tags: t.tags ?? [],
      });
      if (error) throw error;
      setSavedMsg(`「${t.label}」を記録しました`);
      router.refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  }

  async function saveTemplate(patch: Partial<MealTemplate>) {
    setBusy(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");
      if (!patch.label || !patch.name) {
        throw new Error("テンプレ名と料理名は必須です");
      }
      const payload = {
        user_id: auth.user.id,
        label: patch.label,
        name: patch.name,
        default_time: patch.default_time || null,
        calories: patch.calories ?? null,
        protein_g: patch.protein_g ?? null,
        fat_g: patch.fat_g ?? null,
        carbs_g: patch.carbs_g ?? null,
        chain_id: patch.chain_id ?? null,
        chain_name: patch.chain_name ?? null,
        item_id: patch.item_id ?? null,
        size: patch.size ?? null,
        tags: patch.tags ?? [],
        enabled: patch.enabled ?? true,
        sort_order: patch.sort_order ?? templates.length,
      };
      if (patch.id) {
        const { error } = await supabase
          .from("meal_templates")
          .update(payload)
          .eq("id", patch.id);
        if (error) throw error;
        setTemplates((prev) =>
          prev.map((t) => (t.id === patch.id ? { ...t, ...payload } : t)),
        );
      } else {
        const { data, error } = await supabase
          .from("meal_templates")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        setTemplates((prev) => [...prev, data as MealTemplate]);
      }
      setEditing(null);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("このテンプレを削除しますか？")) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("meal_templates")
        .delete()
        .eq("id", id);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setTemplates((p) => p.filter((t) => t.id !== id));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <LoadingBar active={busy} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <h1 className="page-title">食事テンプレ</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setEditing({})}
        >
          <Icon name="plus" size="sm" />
          新規
        </button>
      </div>
      <p className="page-subtitle">毎日の固定分をワンタップ記録</p>

      {error && (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid var(--warn)",
            color: "var(--warn)",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {savedMsg && (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid var(--eat)",
            color: "var(--eat)",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {savedMsg}
        </div>
      )}
      {errorMsg && (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {errorMsg}
        </div>
      )}

      {templates.length === 0 ? (
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
            まだテンプレがありません
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>
            毎日同じ朝食などを登録しておくと便利です
          </div>
          <button className="btn btn-primary" onClick={() => setEditing({})}>
            最初のテンプレを作る
          </button>
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
          {templates.map((t) => {
            const skipped = skips.has(t.id);
            return (
              <div
                key={t.id}
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--line-soft)",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  opacity: skipped ? 0.5 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {t.label}
                    {skipped && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "1px 6px",
                          background: "var(--surface-2)",
                          border: "1px solid var(--line)",
                          borderRadius: 4,
                          color: "var(--ink-2)",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          fontWeight: 600,
                          marginLeft: 6,
                        }}
                      >
                        今日はスキップ
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      marginTop: 2,
                    }}
                  >
                    {t.name}
                    {t.default_time ? ` · ${t.default_time}` : ""}
                    {t.calories ? ` · ${Math.round(t.calories)} kcal` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={() => toggleSkip(t)}
                  disabled={busy}
                  style={{ padding: "6px 10px", fontSize: 14 }}
                >
                  {skipped ? "戻す" : "今日休む"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => logNow(t)}
                  disabled={busy || skipped}
                  style={{ padding: "6px 10px", fontSize: 14 }}
                >
                  {busyId === t.id ? <Spinner size={12} /> : "記録"}
                </button>
                <button
                  type="button"
                  className="header-action"
                  onClick={() => setEditing(t)}
                  aria-label="編集"
                >
                  <Icon name="edit" size="sm" />
                </button>
                <button
                  type="button"
                  className="header-action"
                  onClick={() => remove(t.id)}
                  aria-label="削除"
                >
                  <Icon name="trash" size="sm" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editing !== null && (
        <TemplateEditor
          template={editing}
          onCancel={() => setEditing(null)}
          onSave={saveTemplate}
          busy={busy}
        />
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  onCancel,
  onSave,
  busy,
}: {
  template: Partial<MealTemplate>;
  onCancel: () => void;
  onSave: (t: Partial<MealTemplate>) => void;
  busy: boolean;
}) {
  const [t, setT] = useState<Partial<MealTemplate>>(template);

  function patch<K extends keyof MealTemplate>(k: K, v: MealTemplate[K] | null) {
    setT((p) => ({ ...p, [k]: v }));
  }

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ padding: "8px 18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            {t.id ? "テンプレを編集" : "新規テンプレ"}
          </div>

          <FormField label="テンプレ名" required>
            <input
              className="input"
              placeholder="毎朝のオートミール"
              value={t.label ?? ""}
              onChange={(e) => patch("label", e.target.value)}
            />
          </FormField>
          <FormField label="料理名" required>
            <input
              className="input"
              placeholder="オートミール + バナナ + プロテイン"
              value={t.name ?? ""}
              onChange={(e) => patch("name", e.target.value)}
            />
          </FormField>
          <FormField label="既定の時刻 (HH:MM)">
            <input
              className="input"
              type="time"
              value={t.default_time ?? ""}
              onChange={(e) => patch("default_time", e.target.value || null)}
            />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            <FormField label="kcal">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                value={t.calories ?? ""}
                onChange={(e) =>
                  patch("calories", e.target.value ? Number(e.target.value) : null)
                }
              />
            </FormField>
            <FormField label="P (g)">
              <input
                className="input"
                type="number"
                step="0.1"
                inputMode="decimal"
                value={t.protein_g ?? ""}
                onChange={(e) =>
                  patch("protein_g", e.target.value ? Number(e.target.value) : null)
                }
              />
            </FormField>
            <FormField label="F (g)">
              <input
                className="input"
                type="number"
                step="0.1"
                inputMode="decimal"
                value={t.fat_g ?? ""}
                onChange={(e) =>
                  patch("fat_g", e.target.value ? Number(e.target.value) : null)
                }
              />
            </FormField>
            <FormField label="C (g)">
              <input
                className="input"
                type="number"
                step="0.1"
                inputMode="decimal"
                value={t.carbs_g ?? ""}
                onChange={(e) =>
                  patch("carbs_g", e.target.value ? Number(e.target.value) : null)
                }
              />
            </FormField>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-block"
              onClick={onCancel}
              disabled={busy}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => onSave(t)}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Spinner /> 保存中…
                </>
              ) : (
                "保存"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
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
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--muted)",
          fontWeight: 600,
        }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>
        )}
      </span>
      {children}
    </label>
  );
}
