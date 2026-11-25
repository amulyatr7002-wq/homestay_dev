import { NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  q: z.string().max(100).optional(),
  role: z.nativeEnum(UserRole).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
const changeSchema = z.object({
  userId: z.string().cuid(),
  action: z.enum(["suspend", "restore", "role"]),
  role: z.nativeEnum(UserRole).optional(),
}).refine((value) => value.action !== "role" || value.role !== undefined, "Choose a role.");

export async function GET(request: Request) {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid user search." }, { status: 400 });
  const where = {
    ...(parsed.data.role ? { role: parsed.data.role } : {}),
    ...(parsed.data.q ? { OR: [
      { name: { contains: parsed.data.q, mode: "insensitive" as const } },
      { email: { contains: parsed.data.q, mode: "insensitive" as const } },
    ] } : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, image: true, role: true, suspendedAt: true, createdAt: true, _count: { select: { bookings: true, listings: true } } },
      orderBy: { createdAt: "desc" },
      skip: (parsed.data.page - 1) * 20,
      take: 20,
    }),
    prisma.user.count({ where }),
  ]);
  return NextResponse.json({ users, total, page: parsed.data.page, pageSize: 20 });
}

export async function PATCH(request: Request) {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid user action." }, { status: 400 }); }
  const parsed = changeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the user action." }, { status: 400 });
  if (parsed.data.userId === admin.id) return NextResponse.json({ error: "You cannot change your own account access." }, { status: 409 });
  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const target = await transaction.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, role: true, suspendedAt: true } });
      if (!target) return { error: "User not found.", status: 404 as const };
      if (parsed.data.action === "role" && parsed.data.role === "HOST") {
        const profile = await transaction.hostProfile.findUnique({ where: { userId: target.id }, select: { id: true } });
        if (!profile) return { error: "The user must complete host onboarding before receiving the host role.", status: 409 as const };
      }
      const nextRole = parsed.data.action === "role" ? parsed.data.role ?? target.role : target.role;
      const nextSuspended = parsed.data.action === "suspend" ? new Date() : parsed.data.action === "restore" ? null : target.suspendedAt;
      if (target.role === "ADMIN" && (nextRole !== "ADMIN" || nextSuspended !== null)) {
        const activeAdmins = await transaction.user.count({ where: { role: "ADMIN", suspendedAt: null } });
        if (activeAdmins <= 1) return { error: "The last active admin cannot be suspended or demoted.", status: 409 as const };
      }
      await transaction.user.update({ where: { id: target.id }, data: { role: nextRole, suspendedAt: nextSuspended } });
      await transaction.auditLog.create({
        data: {
          adminId: admin.id,
          action: parsed.data.action === "role" ? "user.role_changed" : `user.${parsed.data.action}`,
          entityType: "User",
          entityId: target.id,
          details: { previousRole: target.role, role: nextRole },
        },
      });
      return { updated: true as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    return NextResponse.json({ updated: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Another admin update happened at the same time. Please refresh and try again." }, { status: 409 });
    }
    console.error("Could not update user account:", error);
    return NextResponse.json({ error: "The account could not be updated." }, { status: 500 });
  }
}
