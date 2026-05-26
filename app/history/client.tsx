"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/app/icons";
import { createClient } from "@/lib/supabase/client";
import type { Meal } from "@/lib/types";

const PAGE_SIZE = 15;

export function HistoryClient({
  meals: initial,
  error,
}: {
  meals: Meal[];
  error: string | null;
}) {
  const [meals, setMeals] = useState<Meal[]>(initial);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filter, setFilter] = useState<"all" | "chain" | "photo" | "manual">(
    "all",
  );
  const [selected, setSelected] = useState<Meal | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return meals;
    return meals.filter((m) => m.source === filter);
  }, [meals, filter]);

  const byDay = useMemo(() => {
    const map = new Map<string, Meal[]>();
    for (const m of filtered.slice(0, visible)) {
      const key = m.eaten_at.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [filtered, visible]);

  async function remove(id: string) {
    if (!confirm("この記録を削除しますか？")) return;
    const supabase = createClient();
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setMeals((prev) => prev.filter((m) => m.id !== id));
    setSelected(null);
  }

  return (
    <div>
      <h1 className="page-title">履歴</h1>
      <p className="page-subtitle">タップで詳細</p>

      {error && (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--surface)",
            border: "1px solid var(--warn)",
            color: "var(--warn)",
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "すべて" },
          { id: "chain", label: "チェーン" },
          { id: "photo", label: "写真" },
          { id: "manual", label: "手動" },
        ].map((f) => (
          <button
            key={f.id}
            className={`tag ${filter === f.id ? "selected" : ""}`}
            onClick={() => setFilter(f.id as typeof filter)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            background: "var(--surface)",
            border: "1px dashed var(--line)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontWeight: 600 }}>記録がありません</div>
        </div>
      ) : (
        byDay.map(([day, items]) => {
          const total = items.reduce(
            (acc, m) => acc + (Number(m.calories) || 0),
            0,
          );
          const date = new Date(day);
          return (
            <div key={day} style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 8,
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {date.toLocaleDateString("ja-JP", {
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>
                    {date.toLocaleDateString("ja-JP", { weekday: "short" })}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  <span className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>
                    {Math.round(total)}
                  </span>{" "}
                  kcal · {items.length} 件
                </div>
              </div>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {items.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
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
                    <div
                      style={{
                        width: 3,
                        height: 32,
                        borderRadius: 2,
                        background: "var(--eat)",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.name}
                        {m.size && (
                          <span className="size-tag" style={{ marginLeft: 6 }}>
                            {m.size}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          marginTop: 2,
                        }}
                      >
                        {new Date(m.eaten_at).toLocaleTimeString("ja-JP", {
                          timeStyle: "short",
                        })}
                        {m.chain_name ? ` · ${m.chain_name}` : ` · ${sourceLabel(m.source)}`}
                      </div>
                    </div>
                    <div className="num" style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        {m.calories != null ? Math.round(Number(m.calories)) : "—"}
                        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 2 }}>
                          kcal
                        </span>
                      </div>
                      {m.protein_g != null && (
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>
                          P{m.protein_g} / F{m.fat_g} / C{m.carbs_g}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}

      {visible < filtered.length && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button className="btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            もっと見る ({filtered.length - visible} 件残り)
          </button>
        </div>
      )}

      {selected && (
        <MealDetailSheet meal={selected} onClose={() => setSelected(null)} onDelete={() => remove(selected.id)} />
      )}
    </div>
  );
}

function MealDetailSheet({
  meal,
  onClose,
  onDelete,
}: {
  meal: Meal;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ padding: "8px 18px 20px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            {meal.name}
            {meal.size && (
              <span className="size-tag" style={{ marginLeft: 6 }}>
                {meal.size}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginBottom: 14,
              display: "flex",
              gap: 6,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span>
              {new Date(meal.eaten_at).toLocaleString("ja-JP", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </span>
            <span>·</span>
            {meal.chain_name ? (
              <>
                <span>{meal.chain_name}</span>
                <span className="official-tag">official</span>
              </>
            ) : (
              <span>{sourceLabel(meal.source)}</span>
            )}
            {meal.ai_confidence != null && (
              <span style={{ color: "var(--ai)" }}>
                自信度 {Math.round(meal.ai_confidence * 100)}%
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12 }}>
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
                  {meal[k] != null ? Math.round(Number(meal[k])) : "—"}
                </div>
              </div>
            ))}
          </div>

          {meal.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
              {meal.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}

          {meal.ai_note && (
            <div
              style={{
                background: "var(--surface-2)",
                borderLeft: "3px solid var(--ai)",
                padding: "8px 10px",
                fontSize: 12,
                color: "var(--ink-2)",
                marginBottom: 12,
                borderRadius: "0 6px 6px 0",
              }}
            >
              {meal.ai_note}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={onDelete}>
              <Icon name="trash" size="sm" />
              削除
            </button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function sourceLabel(s: string) {
  switch (s) {
    case "photo":
      return "写真記録";
    case "chain":
      return "チェーン店";
    case "manual":
    default:
      return "手動記録";
  }
}
