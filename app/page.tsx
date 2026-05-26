import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "./icons";
import type { Meal } from "@/lib/types";

function sum(meals: Meal[], key: keyof Meal): number {
  return meals.reduce((acc, m) => acc + (Number(m[key]) || 0), 0);
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function DashboardPage() {
  let meals: Meal[] = [];
  let connError: string | null = null;

  try {
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .gte("eaten_at", since.toISOString())
      .order("eaten_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    meals = (data ?? []) as Meal[];
  } catch (e) {
    if (e instanceof Error) connError = e.message;
    else if (e && typeof e === "object") connError = JSON.stringify(e);
    else connError = String(e);
  }

  const today = startOfDay(new Date());
  const todayMeals = meals.filter((m) => new Date(m.eaten_at) >= today);
  const weekKcal = sum(meals, "calories");
  const weekDayCount = Math.max(
    1,
    Math.min(7, new Set(meals.map((m) => m.eaten_at.slice(0, 10))).size),
  );
  const todayKcal = sum(todayMeals, "calories");
  const todayP = sum(todayMeals, "protein_g");
  const todayF = sum(todayMeals, "fat_g");
  const todayC = sum(todayMeals, "carbs_g");

  return (
    <div>
      <h1 className="page-title">Today</h1>
      <p className="page-subtitle">
        {new Date().toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}
      </p>

      {connError && (
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
          Supabase 接続エラー: {connError}
        </div>
      )}

      {/* INTAKE / BURN dual */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <SummaryCard
          accent="eat"
          label="INTAKE"
          value={todayKcal}
          unit="kcal"
          meta={[
            { label: "P", value: Math.round(todayP) },
            { label: "F", value: Math.round(todayF) },
            { label: "C", value: Math.round(todayC) },
          ]}
        />
        <SummaryCard
          accent="move"
          label="BURN"
          value={0}
          unit="kcal"
          meta={[{ label: "実装予定", value: "—" }]}
          dim
        />
      </div>

      {/* Body composition (placeholder) */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "var(--body)",
            }}
          />
          <span>BODY</span>
          <span
            style={{
              marginLeft: "auto",
              color: "var(--muted)",
              fontWeight: 500,
              letterSpacing: 0,
            }}
          >
            未記録
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          体重・体脂肪率の記録機能は次フェーズで提供します
        </div>
      </div>

      {/* Quick actions */}
      <div className="section-title">記録する</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 22,
        }}
      >
        <QuickAction href="/meals/new" icon="fork" label="食事" sub="検索 / 写真" />
        <QuickAction href="#" icon="dumbbell" label="筋トレ" sub="次フェーズ" disabled />
        <QuickAction href="#" icon="run" label="有酸素" sub="次フェーズ" disabled />
      </div>

      {/* Recent meals */}
      <div className="section-title">
        <span>最近の記録</span>
        <Link href="/history" className="aux" style={{ color: "var(--ink-2)" }}>
          すべて見る
        </Link>
      </div>
      {meals.length === 0 ? (
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
            まだ記録がありません
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
            最初の1食を記録してみましょう
          </div>
          <Link href="/meals/new" className="btn btn-primary">
            食事を記録
          </Link>
        </div>
      ) : (
        <MealList meals={meals.slice(0, 10)} />
      )}

      {meals.length > 0 && (
        <div
          style={{
            textAlign: "center",
            marginTop: 12,
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          7日平均 {Math.round(weekKcal / weekDayCount)} kcal · {meals.length} 件
        </div>
      )}
    </div>
  );
}

// ============================================================
// Components
// ============================================================
function SummaryCard({
  accent,
  label,
  value,
  unit,
  meta,
  dim,
}: {
  accent: "eat" | "move" | "body";
  label: string;
  value: number | string;
  unit: string;
  meta: { label: string; value: number | string }[];
  dim?: boolean;
}) {
  const accentColor =
    accent === "eat" ? "var(--eat)" : accent === "move" ? "var(--move)" : "var(--body)";
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 14,
        opacity: dim ? 0.6 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--muted)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: accentColor,
          }}
        />
        {label}
      </div>
      <div
        className="num"
        style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
        <span
          style={{
            fontSize: 13,
            color: "var(--muted)",
            fontWeight: 500,
            marginLeft: 4,
          }}
        >
          {unit}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: 11,
          color: "var(--muted)",
          marginTop: 8,
        }}
      >
        {meta.map((m) => (
          <div key={m.label}>
            <span
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {m.label}
            </span>{" "}
            <span className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  sub,
  disabled,
}: {
  href: string;
  icon: "fork" | "dumbbell" | "run" | "scale";
  label: string;
  sub: string;
  disabled?: boolean;
}) {
  const Comp = disabled ? "div" : Link;
  return (
    <Comp
      href={href}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "12px 8px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        textDecoration: "none",
        color: "var(--ink)",
        display: "block",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 6,
          color: "var(--ink-2)",
        }}
      >
        <Icon name={icon} size="lg" />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{sub}</div>
    </Comp>
  );
}

function MealList({ meals }: { meals: Meal[] }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {meals.map((m) => (
        <div
          key={m.id}
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--line-soft)",
            display: "flex",
            gap: 12,
            alignItems: "center",
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
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                display: "flex",
                gap: 8,
                marginTop: 2,
              }}
            >
              <span>{new Date(m.eaten_at).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" })}</span>
              <span style={{ fontWeight: 600, color: "var(--ink-2)" }}>
                {m.chain_name ?? sourceLabel(m.source)}
              </span>
            </div>
          </div>
          <div className="num" style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {m.calories != null ? Math.round(Number(m.calories)) : "—"}
              <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 2 }}>kcal</span>
            </div>
            {m.protein_g != null && (
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>
                P{m.protein_g} / F{m.fat_g} / C{m.carbs_g}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function sourceLabel(s: string) {
  switch (s) {
    case "photo":
      return "写真";
    case "chain":
      return "チェーン";
    case "manual":
    default:
      return "手動";
  }
}
