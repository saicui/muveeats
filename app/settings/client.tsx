"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, BodyRecord } from "@/lib/types";
import { Icon } from "@/app/icons";
import { ThemePicker } from "@/app/theme";

type Suggestion = {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
};

type ChatTurn = {
  role: "user" | "ai";
  text: string;
  suggestion?: Suggestion;
};

export function SettingsClient({
  email,
  profile: initialProfile,
  latestBody,
  error: connError,
}: {
  email: string | null;
  profile: Profile | null;
  latestBody: BodyRecord | null;
  error: string | null;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<Profile>>(initialProfile ?? {});
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [message, setMessage] = useState("");
  const [askingAi, setAskingAi] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  async function purgeAll() {
    const confirmText = "DELETE";
    const input = window.prompt(
      `この操作は全データ (食事 / 運動 / 体組成 / テンプレ) を完全に削除します。\n復元できません。\n本当に実行する場合は ${confirmText} と入力してください。`,
    );
    if (input !== confirmText) {
      setPurgeMsg("キャンセルしました");
      return;
    }
    setPurging(true);
    setPurgeMsg(null);
    setSaveError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");
      const uid = auth.user.id;
      // exercise_sets は workouts の cascade で消えるが念のため明示。
      // meal_template_skips は meal_templates の cascade。
      const tables = [
        "exercise_sets",
        "meal_template_skips",
        "meals",
        "workouts",
        "activity_records",
        "body_records",
        "meal_templates",
        "workout_templates",
      ] as const;
      for (const t of tables) {
        const { error } = await supabase.from(t).delete().eq("user_id", uid);
        if (error) throw new Error(`${t}: ${error.message}`);
      }
      setPurgeMsg("全データを削除しました");
      router.refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setPurging(false);
    }
  }

  function patch<K extends keyof Profile>(k: K, v: Profile[K] | null) {
    setProfile((p) => ({ ...p, [k]: v }));
  }

  async function saveProfile(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setSaveError(null);
    setInfo(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("サインインが必要です");
      const payload = {
        user_id: auth.user.id,
        display_name: profile.display_name ?? null,
        sex: profile.sex ?? null,
        age: profile.age ?? null,
        height_cm: profile.height_cm ?? null,
        activity_level: profile.activity_level ?? null,
        goal: profile.goal ?? null,
        target_kcal: profile.target_kcal ?? null,
        target_protein_g: profile.target_protein_g ?? null,
        target_fat_g: profile.target_fat_g ?? null,
        target_carbs_g: profile.target_carbs_g ?? null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;
      setInfo("保存しました");
      router.refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function askAi() {
    const msg = message.trim();
    if (!msg) return;
    setAskingAi(true);
    setChat((c) => [...c, { role: "user", text: msg }]);
    setMessage("");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: msg,
          profile: {
            ...profile,
            weight_kg: latestBody?.weight_kg ?? null,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI 応答に失敗しました");
      setChat((c) => [
        ...c,
        { role: "ai", text: json.reply, suggestion: json.suggestion },
      ]);
    } catch (e) {
      setChat((c) => [
        ...c,
        { role: "ai", text: e instanceof Error ? e.message : String(e) },
      ]);
    } finally {
      setAskingAi(false);
    }
  }

  function applySuggestion(s: Suggestion) {
    setProfile((p) => ({
      ...p,
      target_kcal: Math.round(s.kcal),
      target_protein_g: Math.round(s.protein_g),
      target_fat_g: Math.round(s.fat_g),
      target_carbs_g: Math.round(s.carbs_g),
    }));
    setInfo("提案を目標値に反映しました。下の「保存」を押して確定してください。");
  }

  return (
    <div>
      <h1 className="page-title">設定</h1>
      <p className="page-subtitle">プロフィール / 目標 / AI 相談</p>

      {connError && (
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
          {connError}
        </div>
      )}

      {/* AI 相談 */}
      <div
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--ai)",
          borderRadius: 12,
          padding: 14,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 700,
            fontSize: 16,
            marginBottom: 4,
          }}
        >
          <Icon name="bot" size="sm" />
          目標を AI に相談
        </div>
        <div style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 10 }}>
          下のプロフィールを埋めてから質問すると、より具体的な提案が返ります
        </div>

        {chat.length > 0 && (
          <div
            style={{
              background: "var(--surface)",
              borderRadius: 8,
              padding: 8,
              marginBottom: 10,
              maxHeight: 280,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {chat.map((m, i) => (
              <div
                key={i}
                style={{
                  fontSize: 14,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: m.role === "user" ? "var(--surface-2)" : "transparent",
                  borderLeft: m.role === "ai" ? "2px solid var(--ai)" : undefined,
                  marginLeft: m.role === "user" ? 24 : 0,
                  marginRight: m.role === "ai" ? 24 : 0,
                  color: "var(--ink-2)",
                }}
              >
                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                {m.suggestion && (
                  <div
                    style={{
                      marginTop: 8,
                      background: "var(--surface)",
                      border: "1px dashed var(--ai)",
                      borderRadius: 6,
                      padding: "8px 10px",
                    }}
                  >
                    <div
                      className="num"
                      style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 6 }}
                    >
                      推奨 {Math.round(m.suggestion.kcal)} kcal · P
                      {Math.round(m.suggestion.protein_g)} / F
                      {Math.round(m.suggestion.fat_g)} / C
                      {Math.round(m.suggestion.carbs_g)}
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: 13, padding: "4px 10px" }}
                      onClick={() => applySuggestion(m.suggestion!)}
                    >
                      この値を目標に
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 6 }}>
          <input
            className="input"
            placeholder="例: 3ヶ月で5kg減らしたい"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void askAi();
              }
            }}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={askingAi || !message.trim()}
            onClick={askAi}
          >
            {askingAi ? "…" : "送信"}
          </button>
        </div>
      </div>

      <form onSubmit={saveProfile}>
        {/* 1日の目標 */}
        <div className="section-title">1日の目標</div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 18,
          }}
        >
          <Row label="カロリー" unit="kcal">
            <NumberInput
              value={profile.target_kcal}
              onChange={(v) => patch("target_kcal", v)}
            />
          </Row>
          <Row label="タンパク質" unit="g">
            <NumberInput
              value={profile.target_protein_g}
              onChange={(v) => patch("target_protein_g", v)}
            />
          </Row>
          <Row label="脂質" unit="g">
            <NumberInput
              value={profile.target_fat_g}
              onChange={(v) => patch("target_fat_g", v)}
            />
          </Row>
          <Row label="炭水化物" unit="g">
            <NumberInput
              value={profile.target_carbs_g}
              onChange={(v) => patch("target_carbs_g", v)}
            />
          </Row>
        </div>

        {/* プロフィール */}
        <div className="section-title">プロフィール</div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 18,
          }}
        >
          <Row label="性別">
            <SelectInput
              value={profile.sex ?? ""}
              onChange={(v) => patch("sex", (v || null) as Profile["sex"])}
              options={[
                { v: "", l: "—" },
                { v: "male", l: "男性" },
                { v: "female", l: "女性" },
                { v: "other", l: "無回答" },
              ]}
            />
          </Row>
          <Row label="年齢">
            <NumberInput value={profile.age} onChange={(v) => patch("age", v)} />
          </Row>
          <Row label="身長" unit="cm">
            <NumberInput
              value={profile.height_cm}
              onChange={(v) => patch("height_cm", v)}
              step="0.1"
            />
          </Row>
          <Row
            label="体重"
            unit="kg"
            sub="体組成記録から自動更新"
          >
            <div className="num" style={{ color: "var(--ink-2)", fontSize: 16 }}>
              {latestBody?.weight_kg ?? "—"}
            </div>
          </Row>
          <Row label="活動レベル">
            <SelectInput
              value={profile.activity_level ?? ""}
              onChange={(v) =>
                patch("activity_level", (v || null) as Profile["activity_level"])
              }
              options={[
                { v: "", l: "—" },
                { v: "low", l: "低い" },
                { v: "mid", l: "中" },
                { v: "high", l: "高い" },
              ]}
            />
          </Row>
          <Row label="目標">
            <SelectInput
              value={profile.goal ?? ""}
              onChange={(v) => patch("goal", (v || null) as Profile["goal"])}
              options={[
                { v: "", l: "—" },
                { v: "cut", l: "減量" },
                { v: "maintain", l: "維持" },
                { v: "bulk", l: "増量" },
              ]}
            />
          </Row>
        </div>

        {/* アカウント */}
        <div className="section-title">アカウント</div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 18,
            fontSize: 15,
          }}
        >
          サインイン中:{" "}
          <span style={{ color: "var(--ink-2)" }}>{email ?? "未認証"}</span>
        </div>

        {saveError && (
          <div
            style={{
              padding: "10px 12px",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 12,
            }}
          >
            {saveError}
          </div>
        )}
        {info && (
          <div
            style={{
              padding: "10px 12px",
              border: "1px solid var(--eat)",
              color: "var(--eat)",
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 12,
            }}
          >
            {info}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={saving}
          style={{ padding: 12, marginBottom: 12 }}
        >
          {saving ? "保存中…" : "保存する"}
        </button>
      </form>

      <div className="section-title">表示</div>
      <div style={{ marginBottom: 18 }}>
        <ThemePicker />
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
          システムを選ぶと OS のダークモード設定に追従します
        </div>
      </div>

      <div className="section-title">機能</div>
      <a
        href="/templates"
        className="btn btn-block"
        style={{
          justifyContent: "space-between",
          marginBottom: 8,
          textDecoration: "none",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="fork" size="sm" />
          食事テンプレを管理
        </span>
        <Icon name="chevron-right" size="sm" />
      </a>
      <a
        href="/workouts/templates"
        className="btn btn-block"
        style={{
          justifyContent: "space-between",
          marginBottom: 12,
          textDecoration: "none",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="dumbbell" size="sm" />
          運動テンプレを管理
        </span>
        <Icon name="chevron-right" size="sm" />
      </a>

      <form action="/auth/signout" method="post">
        <button type="submit" className="btn btn-block btn-danger">
          サインアウト
        </button>
      </form>

      <div
        style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          危険ゾーン
        </div>
        <button
          type="button"
          onClick={purgeAll}
          disabled={purging}
          className="btn btn-block"
          style={{
            color: "var(--danger)",
            borderColor: "var(--danger)",
            background: "transparent",
            justifyContent: "center",
          }}
        >
          {purging ? "削除中…" : "記録を全て削除"}
        </button>
        <div
          style={{
            fontSize: 13,
            color: "var(--muted)",
            marginTop: 6,
          }}
        >
          食事 / 運動 / 体組成 / テンプレすべてを削除します。アカウントは残ります。
        </div>
        {purgeMsg && (
          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              color: purgeMsg.includes("削除しました") ? "var(--eat)" : "var(--muted)",
            }}
          >
            {purgeMsg}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  unit,
  sub,
  children,
}: {
  label: string;
  unit?: string;
  sub?: string;
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
        <div style={{ fontSize: 15, fontWeight: 500 }}>{label}</div>
        {(unit || sub) && (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {sub ?? unit}
          </div>
        )}
      </div>
      <div style={{ minWidth: 100, textAlign: "right" }}>{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  step,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  step?: string;
}) {
  return (
    <input
      className="input"
      type="number"
      step={step}
      inputMode={step ? "decimal" : "numeric"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      style={{ border: 0, textAlign: "right", padding: "4px 8px", background: "transparent", width: 100 }}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ border: 0, textAlign: "right", padding: "4px 8px", background: "transparent" }}
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}
