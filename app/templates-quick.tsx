"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/app/components/loading";
import type { MealTemplate } from "@/lib/types";

/**
 * ダッシュボード上に並ぶ、テンプレからワンタップ記録するチップ列。
 */
export function TemplateQuickPick({
  templates,
  initialSkipIds,
  initialLoggedIds,
}: {
  templates: MealTemplate[];
  initialSkipIds: string[];
  initialLoggedIds: string[];
}) {
  const router = useRouter();
  const [skipped, setSkipped] = useState<Set<string>>(new Set(initialSkipIds));
  const [logged, setLogged] = useState<Set<string>>(new Set(initialLoggedIds));
  const [busyId, setBusyId] = useState<string | null>(null);
  const todayISO = new Date().toISOString().slice(0, 10);

  async function logTemplate(t: MealTemplate) {
    setBusyId(t.id);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      let eatenAt = new Date();
      if (t.default_time) {
        const [hh, mm] = t.default_time.split(":").map((x) => Number(x));
        if (!isNaN(hh) && !isNaN(mm)) {
          eatenAt = new Date();
          eatenAt.setHours(hh, mm, 0, 0);
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
      if (!error) {
        setLogged((p) => new Set([...p, t.id]));
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSkip(t: MealTemplate) {
    setBusyId(t.id);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      if (skipped.has(t.id)) {
        await supabase
          .from("meal_template_skips")
          .delete()
          .eq("template_id", t.id)
          .eq("skip_date", todayISO);
        setSkipped((p) => {
          const next = new Set(p);
          next.delete(t.id);
          return next;
        });
      } else {
        await supabase.from("meal_template_skips").insert({
          user_id: auth.user.id,
          template_id: t.id,
          skip_date: todayISO,
        });
        setSkipped((p) => new Set([...p, t.id]));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 22,
      }}
    >
      {templates.map((t) => {
        const isSkipped = skipped.has(t.id);
        const isLogged = logged.has(t.id);
        const isBusy = busyId === t.id;
        return (
          <div
            key={t.id}
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid var(--line-soft)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: isSkipped || isLogged ? 0.55 : 1,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{t.label}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                {t.name}
                {t.default_time ? ` · ${t.default_time}` : ""}
                {t.calories ? ` · ${Math.round(t.calories)} kcal` : ""}
              </div>
            </div>
            {isLogged ? (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--eat)",
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "var(--surface-2)",
                }}
              >
                記録済
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => toggleSkip(t)}
                  disabled={isBusy}
                  style={{ padding: "5px 10px", fontSize: 14 }}
                >
                  {isSkipped ? "戻す" : "休む"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => !isSkipped && logTemplate(t)}
                  disabled={isBusy || isSkipped}
                  style={{ padding: "5px 10px", fontSize: 14 }}
                >
                  {isBusy ? <Spinner size={12} /> : "記録"}
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
