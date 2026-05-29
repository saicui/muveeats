"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/app/icons";
import { LoadingBar, Spinner } from "@/app/components/loading";
import {
  EXERCISES,
  BODY_PARTS,
  searchExercises,
  matchExerciseByName,
  buildCustomExercise,
  findExercise,
} from "@/lib/exercises";
import type {
  WorkoutTemplate,
  StrengthTemplatePayload,
  Exercise,
} from "@/lib/types";

type Draft = {
  id?: string;
  label: string;
  exercises: {
    exercise_id: string;
    exercise_name: string;
    sets: { weight_kg: number | null; reps: number | null }[];
  }[];
  sort_order: number;
};

function emptyDraft(sortOrder: number): Draft {
  return { label: "", exercises: [], sort_order: sortOrder };
}

function templateToDraft(t: WorkoutTemplate): Draft {
  const p = t.payload as StrengthTemplatePayload;
  return {
    id: t.id,
    label: t.label,
    exercises: p.exercises ?? [],
    sort_order: t.sort_order,
  };
}

export function WorkoutTemplatesClient({
  templates: initial,
  error,
}: {
  templates: WorkoutTemplate[];
  error: string | null;
}) {
  const router = useRouter();
  // strength のみ表示・編集
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(
    initial.filter((t) => t.kind === "strength"),
  );
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function save(draft: Draft) {
    if (!draft.label.trim()) {
      setErrorMsg("テンプレ名を入力してください");
      return;
    }
    if (draft.exercises.length === 0) {
      setErrorMsg("種目を1つ以上追加してください");
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");
      const payload: StrengthTemplatePayload = { exercises: draft.exercises };
      const row = {
        user_id: auth.user.id,
        label: draft.label.trim(),
        kind: "strength" as const,
        payload,
        enabled: true,
        sort_order: draft.sort_order,
      };
      if (draft.id) {
        const { error: e } = await supabase
          .from("workout_templates")
          .update(row)
          .eq("id", draft.id);
        if (e) throw e;
        setTemplates((p) =>
          p.map((t) =>
            t.id === draft.id ? ({ ...t, ...row, payload } as WorkoutTemplate) : t,
          ),
        );
      } else {
        const { data, error: e } = await supabase
          .from("workout_templates")
          .insert(row)
          .select("*")
          .single();
        if (e) throw e;
        setTemplates((p) => [...p, data as WorkoutTemplate]);
      }
      setEditing(null);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("このテンプレを削除しますか?")) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: e } = await supabase
        .from("workout_templates")
        .delete()
        .eq("id", id);
      if (e) {
        setErrorMsg(e.message);
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
        <h1 className="page-title">運動テンプレ</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setEditing(emptyDraft(templates.length))}
        >
          <Icon name="plus" size="sm" />
          新規
        </button>
      </div>
      <p className="page-subtitle">よくやる種目セットをワンタップで開始</p>

      {(error || errorMsg) && (
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
          {error || errorMsg}
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
            まだ運動テンプレがありません
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>
            「胸の日」「脚の日」などの典型メニューを登録しておくと便利
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setEditing(emptyDraft(0))}
          >
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
            const p = t.payload as StrengthTemplatePayload;
            const summary = p.exercises
              .map((e) => e.exercise_name)
              .slice(0, 3)
              .join("・");
            const more = p.exercises.length > 3 ? ` 他${p.exercises.length - 3}` : "";
            return (
              <div
                key={t.id}
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--line-soft)",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{t.label}</div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {summary || "(種目なし)"}{more}
                  </div>
                </div>
                <Link
                  href={`/workouts/new?template=${t.id}`}
                  className="btn btn-primary"
                  style={{ padding: "6px 10px", fontSize: 14 }}
                >
                  開始
                </Link>
                <button
                  type="button"
                  className="header-action"
                  onClick={() => setEditing(templateToDraft(t))}
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
          draft={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
          busy={busy}
        />
      )}
    </div>
  );
}

function TemplateEditor({
  draft: initial,
  onCancel,
  onSave,
  busy,
}: {
  draft: Draft;
  onCancel: () => void;
  onSave: (d: Draft) => void;
  busy: boolean;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [picking, setPicking] = useState(false);

  function addExercise(ex: Exercise) {
    setD((p) => ({
      ...p,
      exercises: [
        ...p.exercises,
        {
          exercise_id: ex.id,
          exercise_name: ex.name,
          sets: [{ weight_kg: null, reps: null }],
        },
      ],
    }));
    setPicking(false);
  }

  function updateSet(
    exIdx: number,
    setIdx: number,
    patch: Partial<{ weight_kg: number | null; reps: number | null }>,
  ) {
    setD((p) => ({
      ...p,
      exercises: p.exercises.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j === setIdx ? { ...s, ...patch } : s,
              ),
            }
          : ex,
      ),
    }));
  }

  function addSet(exIdx: number) {
    setD((p) => ({
      ...p,
      exercises: p.exercises.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: [...ex.sets, { weight_kg: null, reps: null }] }
          : ex,
      ),
    }));
  }

  function removeSet(exIdx: number, setIdx: number) {
    setD((p) => ({
      ...p,
      exercises: p.exercises.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
          : ex,
      ),
    }));
  }

  function removeExercise(exIdx: number) {
    setD((p) => ({
      ...p,
      exercises: p.exercises.filter((_, i) => i !== exIdx),
    }));
  }

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ height: "92dvh" }}
      >
        <div className="sheet-handle" />
        <div
          style={{
            padding: "8px 18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700, flexShrink: 0 }}>
            {d.id ? "テンプレを編集" : "新規運動テンプレ"}
          </div>
          <input
            className="input"
            placeholder="胸の日 / 脚の日 など"
            value={d.label}
            onChange={(e) => setD({ ...d, label: e.target.value })}
            style={{ flexShrink: 0 }}
          />

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {d.exercises.map((ex, exIdx) => (
              <div
                key={`${ex.exercise_id}-${exIdx}`}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  background: "var(--surface)",
                  padding: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>
                    {ex.exercise_name}
                  </div>
                  <button
                    type="button"
                    className="header-action"
                    onClick={() => removeExercise(exIdx)}
                    aria-label="種目を削除"
                  >
                    <Icon name="trash" size="sm" />
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {ex.sets.map((s, setIdx) => (
                    <div
                      key={setIdx}
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <div style={{ width: 24, fontSize: 13, color: "var(--muted)" }}>
                        #{setIdx + 1}
                      </div>
                      <input
                        className="input"
                        type="number"
                        step="0.5"
                        inputMode="decimal"
                        placeholder="kg"
                        value={s.weight_kg ?? ""}
                        onChange={(e) =>
                          updateSet(exIdx, setIdx, {
                            weight_kg: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        style={{ flex: 1 }}
                      />
                      <input
                        className="input"
                        type="number"
                        inputMode="numeric"
                        placeholder="reps"
                        value={s.reps ?? ""}
                        onChange={(e) =>
                          updateSet(exIdx, setIdx, {
                            reps: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        style={{ flex: 1 }}
                      />
                      {ex.sets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSet(exIdx, setIdx)}
                          className="header-action"
                          aria-label="セットを削除"
                        >
                          <Icon name="close" size="sm" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => addSet(exIdx)}
                    style={{ fontSize: 14, padding: "5px 10px", alignSelf: "flex-start" }}
                  >
                    <Icon name="plus" size="sm" />
                    セット追加
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn"
              onClick={() => setPicking(true)}
              style={{ borderStyle: "dashed", justifyContent: "center" }}
            >
              <Icon name="plus" size="sm" />
              種目を追加
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
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
              onClick={() => onSave(d)}
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

      {picking && <ExercisePicker onPick={addExercise} onClose={() => setPicking(false)} />}
    </div>
  );
}

function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [part, setPart] = useState<Exercise["body_part"] | "all">("all");

  const list = (() => {
    const base = part === "all" ? EXERCISES : EXERCISES.filter((e) => e.body_part === part);
    const filtered = query.trim() ? searchExercises(query) : base;
    return part === "all" ? filtered : filtered.filter((e) => e.body_part === part);
  })();
  const exactMatch = matchExerciseByName(query);
  const showCustomCta = query.trim().length > 0 && !exactMatch;

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{ zIndex: 20 }}
    >
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ height: "92dvh" }}
      >
        <div className="sheet-handle" />
        <div
          style={{
            padding: "8px 18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700, flexShrink: 0 }}>
            種目を選ぶ
          </div>
          <div className="search-input" style={{ flexShrink: 0 }}>
            <Icon name="search" className="ic-search" />
            <input
              className="input"
              placeholder="種目名 / エイリアスで検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flexShrink: 0 }}>
            <button
              className={`tag ${part === "all" ? "selected" : ""}`}
              onClick={() => setPart("all")}
            >
              すべて
            </button>
            {BODY_PARTS.map((p) => (
              <button
                key={p.id}
                className={`tag ${part === p.id ? "selected" : ""}`}
                onClick={() => setPart(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {showCustomCta && (
            <button
              type="button"
              onClick={() => onPick(buildCustomExercise(query))}
              style={{
                padding: "12px 14px",
                border: "2px dashed var(--ai)",
                borderRadius: 10,
                background: "var(--surface-2)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                color: "var(--ink)",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                「{query}」をカスタム種目として追加
              </div>
            </button>
          )}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              overflow: "hidden",
              flex: 1,
              minHeight: 80,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {list.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 15 }}>
                該当する種目がありません
              </div>
            ) : (
              list.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onPick(e)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 12px",
                    border: 0,
                    borderBottom: "1px solid var(--line-soft)",
                    background: "transparent",
                    textAlign: "left",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    color: "var(--ink)",
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {BODY_PARTS.find((p) => p.id === e.body_part)?.label}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
