"use client";

/**
 * テーマ管理。Light / Dark / System の3択。
 * - 永続化先: localStorage["muveeats-theme"]
 * - 初回 paint 前にインラインスクリプトで data-theme を適用 (FOUC 防止)
 * - 設定画面の <ThemePicker> から切替
 */

import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "muveeats-theme";

/**
 * <head> に埋め込むインラインスクリプト。
 * SSR 後、最初の paint 前に data-theme を適用するため。
 */
export const THEME_BOOT_SCRIPT = `
(function(){
  try {
    var saved = localStorage.getItem('${STORAGE_KEY}') || 'light';
    var theme = saved;
    if (saved === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

function applyTheme(choice: ThemeChoice) {
  const effective =
    choice === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : choice;
  document.documentElement.setAttribute("data-theme", effective);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>("light");

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeChoice) ?? "light";
    setThemeState(saved);
    applyTheme(saved);

    // System テーマ選択時に OS 設定が変わったら追従
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (localStorage.getItem(STORAGE_KEY) === "system") {
        applyTheme("system");
      }
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  return { theme, setTheme };
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const options: { id: ThemeChoice; label: string }[] = [
    { id: "light", label: "ライト" },
    { id: "dark", label: "ダーク" },
    { id: "system", label: "システム" },
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
      }}
      role="radiogroup"
      aria-label="テーマ"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setTheme(o.id)}
          role="radio"
          aria-checked={theme === o.id}
          style={{
            flex: 1,
            padding: "8px 10px",
            border: 0,
            background:
              theme === o.id ? "var(--surface)" : "transparent",
            color: theme === o.id ? "var(--ink)" : "var(--muted)",
            fontWeight: theme === o.id ? 600 : 500,
            borderRadius: 6,
            fontSize: 14,
            fontFamily: "inherit",
            cursor: "pointer",
            boxShadow: theme === o.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
