"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setInfo(
            "確認メールを送信しました。メール内のリンクから認証してください。",
          );
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "32px auto", padding: "0 20px" }}>
      <h1 className="page-title" style={{ fontSize: 28 }}>
        MuveEats
      </h1>
      <p className="page-subtitle">
        動いて食べて、記録するアプリ。{mode === "signin" ? "サインインしてください。" : "アカウントを作成します。"}
      </p>

      <div
        style={{
          display: "flex",
          padding: 3,
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          marginBottom: 18,
        }}
      >
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="btn btn-ghost"
          style={{
            flex: 1,
            justifyContent: "center",
            background: mode === "signin" ? "var(--surface)" : "transparent",
            color: mode === "signin" ? "var(--ink)" : "var(--muted)",
            fontWeight: mode === "signin" ? 600 : 500,
            boxShadow: mode === "signin" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
            padding: "8px 12px",
            fontSize: 14,
          }}
        >
          サインイン
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className="btn btn-ghost"
          style={{
            flex: 1,
            justifyContent: "center",
            background: mode === "signup" ? "var(--surface)" : "transparent",
            color: mode === "signup" ? "var(--ink)" : "var(--muted)",
            fontWeight: mode === "signup" ? 600 : 500,
            boxShadow: mode === "signup" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
            padding: "8px 12px",
            fontSize: 14,
          }}
        >
          新規登録
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
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
            メールアドレス
          </span>
          <input
            className="input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
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
            パスワード
          </span>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: "var(--surface)",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
        {info && (
          <div
            style={{
              padding: "10px 12px",
              background: "var(--surface)",
              border: "1px solid var(--eat)",
              color: "var(--eat)",
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            {info}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={submitting}
          style={{ padding: 12 }}
        >
          {submitting
            ? "処理中…"
            : mode === "signin"
            ? "サインイン"
            : "アカウントを作成"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
