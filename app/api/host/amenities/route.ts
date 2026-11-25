import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireApiRole(["HOST", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  const amenities = await prisma.amenity.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });
  return NextResponse.json({ amenities });
}
