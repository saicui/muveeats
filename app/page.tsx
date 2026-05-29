import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "./icons";
import type {
  Meal,
  Workout,
  BodyRecord,
  Profile,
  MealTemplate,
} from "@/lib/types";
import { TemplateQuickPick } from "./templates-quick";
import { Sparkline } from "./components/sparkline";
import { CoachFeedback } from "./coach-feedback";
import { fmtTime } from "@/lib/format";

function sumNum(arr: (number | null)[]): number {
  return arr.reduce<number>((acc, v) => acc + (Number(v) || 0), 0);
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function DashboardPage() {
  let meals: Meal[] = [];
  let workouts: Workout[] = [];
  let body: BodyRecord | null = null;
  let bodyWeekAgo: BodyRecord | null = null;
  let bodyList: BodyRecord[] = [];
  let profile: Profile | null = null;
  let templates: MealTemplate[] = [];
  let todaySkipIds = new Set<string>();
  let loggedTemplateIds = new Set<string>();
  let connError: string | null = null;

  try {
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString().slice(0, 10);
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([
      supabase
        .from("meals")
        .select("*")
        .gte("eaten_at", since.toISOString())
        .order("eaten_at", { ascending: false })
        .limit(100),
      supabase
        .from("workouts")
        .select("*")
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("body_records")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(20),
      supabase.from("profiles").select("*").maybeSingle(),
      supabase
        .from("meal_templates")
        .select("*")
        .eq("enabled", true)
        .order("sort_order"),
      supabase
        .from("meal_template_skips")
        .select("template_id")
        .eq("skip_date", todayISO),
    ]);
    if (r1.error) throw r1.error;
    if (r2.error) throw r2.error;
    if (r3.error) throw r3.error;
    meals = (r1.data ?? []) as Meal[];
    workouts = (r2.data ?? []) as Workout[];
    bodyList = (r3.data ?? []) as BodyRecord[];
    body = bodyList[0] ?? null;
    if (body) {
      const cutoff = new Date(body.recorded_at).getTime() - 7 * 24 * 60 * 60 * 1000;
      bodyWeekAgo =
        bodyList.find(
          (r) => new Date(r.recorded_at).getTime() <= cutoff && r.weight_kg != null,
        ) ?? null;
    }
    profile = (r4.data ?? null) as Profile | null;
    if (!r5.error) templates = (r5.data ?? []) as MealTemplate[];
    if (!r6.error)
      todaySkipIds = new Set(
        (r6.data ?? []).map((row: { template_id: string }) => row.template_id),
      );
    // 今日すでにテンプレと同じ名前で記録された分も「済」扱いに
    const todayNames = new Set(
      meals
        .filter((m) => new Date(m.eaten_at) >= todayStart)
        .map((m) => m.name),
    );
    loggedTemplateIds = new Set(
      templates.filter((t) => todayNames.has(t.name)).map((t) => t.id),
    );
  } catch (e) {
    connError = e instanceof Error ? e.message : JSON.stringify(e);
  }

  const today = startOfDay(new Date());
  const todayMeals = meals.filter((m) => new Date(m.eaten_at) >= today);
  const todayWorkouts = workouts.filter((w) => new Date(w.started_at) >= today);

  const intake = sumNum(todayMeals.map((m) => m.calories));
  const burn = sumNum(todayWorkouts.map((w) => w.est_kcal));
  const intakeP = sumNum(todayMeals.map((m) => m.protein_g));
  const intakeF = sumNum(todayMeals.map((m) => m.fat_g));
  const intakeC = sumNum(todayMeals.map((m) => m.carbs_g));
  const strengthMin = sumNum(
    todayWorkouts.filter((w) => w.kind === "strength").map((w) => w.duration_min),
  );
  const cardioMin = sumNum(
    todayWorkouts.filter((w) => w.kind === "cardio").map((w) => w.duration_min),
  );

  // ストリーク（記録があった日が連続している日数）
  const streak = computeStreak(meals, workouts, body ? [body] : []);

  // 7 日ドット
  const week = buildWeekDots(meals, workouts, [body, bodyWeekAgo].filter(Boolean) as BodyRecord[]);

  // 直近 14 日のトレンド (摂取・消費 kcal / 体重)
  const trend = buildTrend(meals, workouts, bodyList);

  const targetKcal = profile?.target_kcal ?? null;
  const net = intake - burn;

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
            border: "1px solid var(--warn)",
            color: "var(--warn)",
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          {connError}
        </div>
      )}

      {/* INTAKE / BURN */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <SummaryCard
          accent="eat"
          label="INTAKE"
          value={Math.round(intake)}
          unit="kcal"
          meta={[
            { label: "P", value: Math.round(intakeP) },
            { label: "F", value: Math.round(intakeF) },
            { label: "C", value: Math.round(intakeC) },
          ]}
        />
        <SummaryCard
          accent="move"
          label="BURN"
          value={Math.round(burn)}
          unit="kcal"
          meta={[
            ...(strengthMin
              ? [{ label: "筋トレ", value: `${strengthMin}分` }]
              : []),
            ...(cardioMin ? [{ label: "有酸素", value: `${cardioMin}分` }] : []),
            ...(!strengthMin && !cardioMin
              ? [{ label: "未記録", value: "—" }]
              : []),
          ]}
        />
      </div>

      {/* Energy balance */}
      <EnergyBalance
        intake={intake}
        burn={burn}
        net={net}
        target={targetKcal}
      />

      {/* Body */}
      <BodyCard latest={body} weekAgo={bodyWeekAgo} />

      {/* Trend */}
      <TrendCard trend={trend} />

      {/* AI フィードバック */}
      <CoachFeedback />

      {/* Week strip */}
      <div className="section-title">直近 7日</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 18,
        }}
      >
        {week.map((d) => (
          <div
            key={d.iso}
            style={{
              background: d.today ? "var(--surface)" : "var(--surface-2)",
              border: d.today ? "1px solid var(--ink)" : "1px solid var(--line)",
              borderRadius: 8,
              padding: "8px 4px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--muted)",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {d.dow}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 2, height: 14, alignItems: "center" }}>
              {d.eat && <Dot color="var(--eat)" />}
              {d.move && <Dot color="var(--move)" />}
              {d.body && <Dot color="var(--body)" />}
              {!d.eat && !d.move && !d.body && <Dot empty />}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="section-title">記録する</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <QuickAction href="/meals/new" icon="fork" label="食事" />
        <QuickAction href="/workouts/new" icon="dumbbell" label="筋トレ" />
        <QuickAction href="/cardio/new" icon="run" label="有酸素" />
        <QuickAction href="/body/new" icon="scale" label="体組成" />
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <>
          <div className="section-title">
            <span>食事テンプレ</span>
            <Link href="/templates" className="aux" style={{ color: "var(--ink-2)" }}>
              管理
            </Link>
          </div>
          <TemplateQuickPick
            templates={templates}
            initialSkipIds={Array.from(todaySkipIds)}
            initialLoggedIds={Array.from(loggedTemplateIds)}
          />
        </>
      )}
      {templates.length === 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px dashed var(--line)",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 22,
            fontSize: 12,
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            毎日同じ朝食などをテンプレ化するとワンタップで記録できます
          </div>
          <Link
            href="/templates"
            className="btn"
            style={{ padding: "6px 10px", fontSize: 12, flexShrink: 0 }}
          >
            設定
          </Link>
        </div>
      )}

      {/* Recent meals + workouts */}
      <div className="section-title">
        <span>最近の記録</span>
        <Link href="/history" className="aux" style={{ color: "var(--ink-2)" }}>
          すべて見る
        </Link>
      </div>
      <RecentList meals={meals.slice(0, 5)} workouts={workouts.slice(0, 5)} body={body} />

      <div
        style={{
          textAlign: "center",
          marginTop: 12,
          fontSize: 11,
          color: "var(--muted)",
        }}
      >
        {streak > 0 ? `記録ストリーク ${streak} 日` : "記録ストリーク 0 日"}
      </div>
    </div>
  );
}

function Dot({ color, empty }: { color?: string; empty?: boolean }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: empty ? "transparent" : color,
        border: empty ? "1px solid var(--line)" : "none",
      }}
    />
  );
}

function SummaryCard({
  accent,
  label,
  value,
  unit,
  meta,
}: {
  accent: "eat" | "move" | "body";
  label: string;
  value: number | string;
  unit: string;
  meta: { label: string; value: number | string }[];
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
          flexWrap: "wrap",
        }}
      >
        {meta.map((m) => (
          <div key={m.label}>
            <span style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
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

function EnergyBalance({
  intake,
  burn,
  net,
  target,
}: {
  intake: number;
  burn: number;
  net: number;
  target: number | null;
}) {
  const cap = Math.max(intake + burn, target ?? 2000, 1500);
  const intakePct = Math.min(100, (intake / cap) * 100);
  const burnPct = Math.min(100, (burn / cap) * 100);
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--muted)",
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        <span>ENERGY BALANCE</span>
        {target && (
          <span>
            TARGET {target.toLocaleString()}
          </span>
        )}
      </div>
      <div
        style={{
          position: "relative",
          height: 6,
          background: "var(--line)",
          borderRadius: 3,
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${intakePct}%`,
            background: "var(--eat)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: `${burnPct}%`,
            background: "var(--move)",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <Legend dotColor="var(--eat)" label="摂取" value={`+${Math.round(intake)}`} />
        <Legend dotColor="var(--move)" label="消費" value={`−${Math.round(burn)}`} />
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "var(--muted)",
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px solid var(--line)",
        }}
      >
        純摂取{" "}
        <span
          className="num"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          {net >= 0 ? "+" : ""}
          {Math.round(net)}
        </span>{" "}
        kcal
      </div>
    </div>
  );
}

function Legend({
  dotColor,
  label,
  value,
}: {
  dotColor: string;
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: dotColor,
        }}
      />
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="num" style={{ color: "var(--ink)", fontWeight: 600, marginLeft: 4 }}>
        {value}
      </span>
    </div>
  );
}

function BodyCard({
  latest,
  weekAgo,
}: {
  latest: BodyRecord | null;
  weekAgo: BodyRecord | null;
}) {
  if (!latest) {
    return (
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
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--body)" }} />
          <span>BODY</span>
          <span style={{ marginLeft: "auto", color: "var(--muted)", fontWeight: 500, letterSpacing: 0 }}>
            未記録
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          まだ体組成の記録がありません。
          <Link href="/body/new" style={{ color: "var(--ink-2)", textDecoration: "underline", textUnderlineOffset: 3, marginLeft: 4 }}>
            最初の記録を作る →
          </Link>
        </div>
      </div>
    );
  }

  const wDelta =
    weekAgo?.weight_kg && latest.weight_kg
      ? Number(latest.weight_kg) - Number(weekAgo.weight_kg)
      : null;

  return (
    <Link
      href="/body"
      style={{
        display: "block",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 18,
        textDecoration: "none",
        color: "var(--ink)",
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
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--body)" }} />
        <span>BODY</span>
        <span style={{ marginLeft: "auto", color: "var(--muted)", fontWeight: 500, letterSpacing: 0 }}>
          {new Date(latest.recorded_at).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
      <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
        <div>
          <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>
            {latest.weight_kg ?? "—"}
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}> kg</span>
          </div>
          {wDelta != null && (
            <div
              className="num"
              style={{
                fontSize: 11,
                fontWeight: 600,
                marginTop: 2,
                color: wDelta < 0 ? "var(--eat)" : wDelta > 0 ? "var(--warn)" : "var(--muted)",
              }}
            >
              {wDelta > 0 ? "+" : ""}
              {wDelta.toFixed(1)} / 7d
            </div>
          )}
        </div>
        {latest.body_fat_pct != null && (
          <div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>
              {latest.body_fat_pct}
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}> %</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>体脂肪</div>
          </div>
        )}
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: "fork" | "dumbbell" | "run" | "scale";
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "12px 8px",
        textAlign: "center",
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
    </Link>
  );
}

function RecentList({
  meals,
  workouts,
  body,
}: {
  meals: Meal[];
  workouts: Workout[];
  body: BodyRecord | null;
}) {
  type Row = {
    id: string;
    at: string;
    name: string;
    meta: string;
    accent: "eat" | "move" | "body";
    primary: string;
    sub?: string;
  };
  const rows: Row[] = [
    ...meals.map<Row>((m) => ({
      id: `m-${m.id}`,
      at: m.eaten_at,
      name: m.name,
      meta: `${fmtTime(m.eaten_at)} · ${m.chain_name ?? sourceLabel(m.source)}`,
      accent: "eat",
      primary: m.calories != null ? `+${Math.round(Number(m.calories))} kcal` : "—",
      sub: m.protein_g != null ? `P${m.protein_g} / F${m.fat_g} / C${m.carbs_g}` : undefined,
    })),
    ...workouts.map<Row>((w) => ({
      id: `w-${w.id}`,
      at: w.started_at,
      name:
        w.title ||
        (w.kind === "strength"
          ? "筋トレ"
          : w.cardio_type === "run"
          ? "ラン"
          : w.cardio_type === "walk"
          ? "ウォーク"
          : w.cardio_type === "bike"
          ? "バイク"
          : "有酸素"),
      meta: `${fmtTime(w.started_at)} · ${w.kind === "strength" ? "筋トレ" : "有酸素"}${w.duration_min ? ` · ${w.duration_min}分` : ""}`,
      accent: "move",
      primary: w.est_kcal != null ? `−${Math.round(Number(w.est_kcal))} kcal` : "—",
    })),
    ...(body
      ? [
          {
            id: `b-${body.id}`,
            at: body.recorded_at,
            name: `体組成 ${body.weight_kg ?? "—"}kg`,
            meta: `${fmtTime(body.recorded_at)} · 手動記録`,
            accent: "body" as const,
            primary:
              body.body_fat_pct != null
                ? `体脂肪 ${body.body_fat_pct}%`
                : "—",
          },
        ]
      : []),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 8);

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "32px 16px",
          textAlign: "center",
          background: "var(--surface)",
          border: "1px dashed var(--line)",
          borderRadius: 12,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>まだ記録がありません</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          上のクイックアクションから最初の1件を記録しましょう
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {rows.map((r) => {
        const accentColor =
          r.accent === "eat"
            ? "var(--eat)"
            : r.accent === "move"
            ? "var(--move)"
            : "var(--body)";
        return (
          <div
            key={r.id}
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
                background: accentColor,
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
                {r.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {r.meta}
              </div>
            </div>
            <div className="num" style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{r.primary}</div>
              {r.sub && (
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>
                  {r.sub}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function sourceLabel(s: string) {
  switch (s) {
    case "photo":
      return "写真";
    case "chain":
      return "チェーン";
    default:
      return "手動";
  }
}

function buildWeekDots(
  meals: Meal[],
  workouts: Workout[],
  bodyRecords: BodyRecord[],
) {
  // 各日のローカルタイム ISO を 1 パスで Set 化 (旧実装は 7×N で new Date を走らせていた)。
  // .slice(0,10) は UTC ベースで深夜帯の日付がズレるのでローカルで計算する。
  const mealDays = new Set(meals.map((m) => isoDate(new Date(m.eaten_at))));
  const workoutDays = new Set(
    workouts.map((w) => isoDate(new Date(w.started_at))),
  );
  const bodyDays = new Set(
    bodyRecords.map((b) => isoDate(new Date(b.recorded_at))),
  );

  const today = startOfDay(new Date());
  const result: {
    iso: string;
    dow: string;
    today: boolean;
    eat: boolean;
    move: boolean;
    body: boolean;
  }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = isoDate(d);
    result.push({
      iso,
      dow: d.toLocaleDateString("ja-JP", { weekday: "short" }),
      today: i === 0,
      eat: mealDays.has(iso),
      move: workoutDays.has(iso),
      body: bodyDays.has(iso),
    });
  }
  return result;
}

/** タイムゾーン補正済み YYYY-MM-DD。toISOString は UTC で日跨ぎするため使わない。 */
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Trend = {
  days: { iso: string; intakeKcal: number | null; burnKcal: number | null; weightKg: number | null }[];
};

function buildTrend(meals: Meal[], workouts: Workout[], body: BodyRecord[]): Trend {
  const today = startOfDay(new Date());
  // 直近 14 日ぶんを集約。データが null の日もエントリは入れて欠損として扱う。
  const intake: Record<string, number> = {};
  const burn: Record<string, number> = {};
  const weight: Record<string, number> = {};
  for (const m of meals) {
    const key = isoDate(new Date(m.eaten_at));
    intake[key] = (intake[key] ?? 0) + (Number(m.calories) || 0);
  }
  for (const w of workouts) {
    const key = isoDate(new Date(w.started_at));
    burn[key] = (burn[key] ?? 0) + (Number(w.est_kcal) || 0);
  }
  // 体重は同日複数件あれば最新値
  for (const b of body) {
    if (b.weight_kg == null) continue;
    const key = isoDate(new Date(b.recorded_at));
    if (!(key in weight)) weight[key] = Number(b.weight_kg);
  }
  const days: Trend["days"] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = isoDate(d);
    days.push({
      iso,
      intakeKcal: intake[iso] != null ? intake[iso] : null,
      burnKcal: burn[iso] != null ? burn[iso] : null,
      weightKg: weight[iso] ?? null,
    });
  }
  return { days };
}

function TrendCard({ trend }: { trend: Trend }) {
  const intakePoints = trend.days.map((d) => d.intakeKcal);
  const burnPoints = trend.days.map((d) => d.burnKcal);
  const weightPoints = trend.days.map((d) => d.weightKg);
  const hasAnyIntake = intakePoints.some((v) => v != null && v > 0);
  const hasAnyBurn = burnPoints.some((v) => v != null && v > 0);
  const hasAnyWeight = weightPoints.filter((v) => v != null).length >= 2;
  if (!hasAnyIntake && !hasAnyBurn && !hasAnyWeight) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      <div className="section-title">直近 14日のトレンド</div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {hasAnyIntake && (
          <TrendRow
            label="摂取 kcal"
            color="var(--eat)"
            fill="var(--eat)"
            points={intakePoints}
            latest={lastNonNull(intakePoints)}
            unit="kcal"
          />
        )}
        {hasAnyBurn && (
          <TrendRow
            label="消費 kcal"
            color="var(--move)"
            fill="var(--move)"
            points={burnPoints}
            latest={lastNonNull(burnPoints)}
            unit="kcal"
          />
        )}
        {hasAnyWeight && (
          <TrendRow
            label="体重"
            color="var(--body)"
            points={weightPoints}
            latest={lastNonNull(weightPoints)}
            unit="kg"
            decimals={1}
          />
        )}
      </div>
    </div>
  );
}

function lastNonNull(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) return arr[i];
  }
  return null;
}

function TrendRow({
  label,
  color,
  fill,
  points,
  latest,
  unit,
  decimals = 0,
}: {
  label: string;
  color: string;
  fill?: string;
  points: (number | null)[];
  latest: number | null;
  unit: string;
  decimals?: number;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
          {label}
        </div>
        <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>
          {latest != null
            ? decimals > 0
              ? latest.toFixed(decimals)
              : Math.round(latest).toLocaleString()
            : "—"}
          <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 3, fontWeight: 500 }}>
            {unit}
          </span>
        </div>
      </div>
      <Sparkline
        points={points}
        width={320}
        height={42}
        color={color}
        fill={fill}
        ariaLabel={`${label}のスパークライン`}
      />
    </div>
  );
}

function computeStreak(
  meals: Meal[],
  workouts: Workout[],
  bodyRecords: BodyRecord[],
): number {
  const days = new Set<string>();
  for (const m of meals) days.add(isoDate(new Date(m.eaten_at)));
  for (const w of workouts) days.add(isoDate(new Date(w.started_at)));
  for (const b of bodyRecords) days.add(isoDate(new Date(b.recorded_at)));
  let streak = 0;
  const d = startOfDay(new Date());
  while (true) {
    if (days.has(isoDate(d))) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
