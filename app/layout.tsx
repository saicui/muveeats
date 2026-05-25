import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MuveEats — 動いて食べて、記録する",
  description: "トレーニングと食事を一体で記録できるヘルスケアアプリ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <a href="/" className="font-bold tracking-tight text-lg">
              🥗 MuveEats
            </a>
            {user ? (
              <nav className="flex items-center gap-4 text-sm">
                <a href="/" className="hover:underline">
                  ダッシュボード
                </a>
                <a href="/log" className="hover:underline">
                  記録
                </a>
                <a href="/analyze" className="hover:underline">
                  写真解析
                </a>
                <span className="hidden text-xs text-neutral-500 sm:inline">
                  {user.email}
                </span>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-50"
                  >
                    サインアウト
                  </button>
                </form>
              </nav>
            ) : (
              <a
                href="/login"
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                サインイン
              </a>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
