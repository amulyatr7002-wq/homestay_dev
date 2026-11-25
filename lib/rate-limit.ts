import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const hashedKey = createHash("sha256").update(key).digest("hex");
  const resetAt = new Date(now.getTime() + windowMs);
  const [bucket] = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "ApiRateLimit" ("key", "count", "resetAt")
    VALUES (${hashedKey}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "ApiRateLimit"."resetAt" <= ${now} THEN 1 ELSE "ApiRateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "ApiRateLimit"."resetAt" <= ${now} THEN EXCLUDED."resetAt" ELSE "ApiRateLimit"."resetAt" END
    RETURNING "count", "resetAt"
  `;

  if (Math.random() < 0.01) {
    await prisma.apiRateLimit.deleteMany({ where: { resetAt: { lte: now } } });
  }

  return {
    allowed: bucket.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000)),
  };
}

export function clientAddress(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")
    || "unknown";
}
