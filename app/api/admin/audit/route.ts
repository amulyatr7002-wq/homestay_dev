import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) });

export async function GET(request: Request) {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid audit page." }, { status: 400 });
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ include: { admin: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, skip: (parsed.data.page - 1) * 25, take: 25 }),
    prisma.auditLog.count(),
  ]);
  return NextResponse.json({ logs, total, page: parsed.data.page, pageSize: 25 });
}
