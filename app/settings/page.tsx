import { createClient } from "@/lib/supabase/server";
import type { Profile, BodyRecord } from "@/lib/types";
import { SettingsClient } from "./client";

export default async function SettingsPage() {
  let profile: Profile | null = null;
  let latestBody: BodyRecord | null = null;
  let email: string | null = null;
  let connError: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;

    const [p, b] = await Promise.all([
      supabase.from("profiles").select("*").maybeSingle(),
      supabase
        .from("body_records")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (p.error) throw p.error;
    profile = (p.data ?? null) as Profile | null;
    latestBody = (b.data ?? null) as BodyRecord | null;
  } catch (e) {
    connError = e instanceof Error ? e.message : JSON.stringify(e);
  }

  return (
    <SettingsClient
      email={email}
      profile={profile}
      latestBody={latestBody}
      error={connError}
    />
  );
}
