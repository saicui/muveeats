import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  let email: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  } catch {
    // ignore
  }

  return (
    <div>
      <h1 className="page-title">設定</h1>
      <p className="page-subtitle">プロフィール / 目標 / データ</p>

      <div className="section-title">アカウント</div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        サインイン中:{" "}
        <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>
          {email ?? "未認証"}
        </span>
      </div>

      <div className="section-title">プレビュー版のおしらせ</div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 16,
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.7,
        }}
      >
        現在は <strong>食事記録の MVP</strong> として公開しています。
        目標値の設定 / AI 相談 / トレーニング記録 / 体組成記録 は順次追加予定です。
        フィードバックは GitHub の Issue へどうぞ。
      </div>

      <form action="/auth/signout" method="post" style={{ marginTop: 20 }}>
        <button type="submit" className="btn btn-block btn-danger">
          サインアウト
        </button>
      </form>
    </div>
  );
}
