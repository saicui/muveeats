import { NextResponse } from "next/server";
import { listChains, getCatalogStats } from "@/lib/chains";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    stats: getCatalogStats(),
    chains: listChains(),
  });
}
