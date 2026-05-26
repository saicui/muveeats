import { NextRequest, NextResponse } from "next/server";
import { getChain, listChainItems } from "@/lib/chains";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chainId: string }> },
) {
  const { chainId } = await params;
  const chain = getChain(chainId);
  if (!chain) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({
    chain,
    items: listChainItems(chainId),
  });
}
