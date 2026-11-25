import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireApiRole(["HOST"]);
  if (!user) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  const count = await prisma.message.count({
    where: { conversation: { hostId: user.id }, senderId: { not: user.id }, readAt: null },
  });
  return NextResponse.json({ unread: count });
}
