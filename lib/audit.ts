import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function recordAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: { adminId, action, entityType, entityId, details: details ?? Prisma.JsonNull },
  });
}
