import { NextRequest, NextResponse } from "next/server";
import { searchChainItems } from "@/lib/chains";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) {
    return NextResponse.json({ items: [] });
  }
  const items = searchChainItems(q, 50);
  return NextResponse.json({ items });
}
