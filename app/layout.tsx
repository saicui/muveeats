import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "./icons";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MuveEats — 動いて食べて、記録する",
  description: "食事・運動・体組成を一つにまとめる個人ヘルスハブ",
};

export const viewport: Viewport = {
  themeColor: "#fafaf9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let userEmail: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch {
    // 認証エラーは UI 表示に影響させない
  }

  return (
    <html lang="ja" data-theme="light" className={inter.variable}>
      <body>
        <div className="app-shell">
          {userEmail ? (
            <>
              <AppHeader email={userEmail} />
              <main className="app-main">{children}</main>
              <BottomNav />
            </>
          ) : (
            <main className="app-main" style={{ paddingBottom: 20 }}>
              {children}
            </main>
          )}
        </div>
      </body>
    </html>
  );
}

function AppHeader({ email }: { email: string }) {
  return (
    <header className="app-header">
      <Link href="/" className="brand">
        MuveEats
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="header-meta" title={email}>
          {email.length > 22 ? email.slice(0, 22) + "…" : email}
        </span>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="header-action"
            aria-label="サインアウト"
          >
            <Icon name="close" size="sm" />
          </button>
        </form>
      </div>
    </header>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <Link href="/" className="active">
        <Icon name="home" />
        ホーム
      </Link>
      <Link href="/meals/new">
        <Icon name="fork" />
        食事
      </Link>
      <Link href="/workouts">
        <Icon name="dumbbell" />
        運動
      </Link>
      <Link href="/body">
        <Icon name="scale" />
        体組成
      </Link>
      <Link href="/history">
        <Icon name="book" />
        履歴
      </Link>
      <Link href="/settings">
        <Icon name="settings" />
        設定
      </Link>
    </nav>
  );
}

// テンプレ管理は /templates。ボトムナビにはスペース上載せず、
// ダッシュボードと設定からアクセスする想定。
