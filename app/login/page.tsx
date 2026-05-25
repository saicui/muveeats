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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setInfo(
            "確認メールを送信しました。受信トレイのリンクから認証してください。" +
              "（Supabase でメール確認が無効の場合はこのままサインインできます）",
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
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">MuveEats へようこそ</h1>
        <p className="text-sm text-neutral-500">
          {mode === "signin"
            ? "メールアドレスとパスワードでサインインしてください。"
            : "アカウントを新規作成します。"}
        </p>
      </div>

      <div className="flex rounded-md border border-neutral-300 bg-white p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
            mode === "signin" ? "bg-neutral-900 text-white" : "text-neutral-600"
          }`}
        >
          サインイン
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
            mode === "signup" ? "bg-neutral-900 text-white" : "text-neutral-600"
          }`}
        >
          新規登録
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">メールアドレス</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">パスワード</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
          />
        </label>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-800">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
