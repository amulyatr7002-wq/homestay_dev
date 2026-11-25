import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getActiveUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, role: true, suspendedAt: true },
  });
  if (!user || user.suspendedAt) return null;
  return user;
}

export async function requireApiRole(roles: UserRole[]) {
  const user = await getActiveUser();
  return user && roles.includes(user.role) ? user : null;
}

export async function requirePageRole(role: UserRole) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== role && user.role !== "ADMIN") redirect("/");
  return user;
}
