import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const adminSchema = z.object({
  email: z.string().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72),
  name: z.string().trim().min(2).max(80).default("Namma Stay Admin"),
});

export async function seedAdmin() {
  const parsed = adminSchema.safeParse({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || undefined,
  });
  if (!parsed.success) {
    throw new Error("Set ADMIN_EMAIL, ADMIN_PASSWORD (at least 12 characters), and optionally ADMIN_NAME before running db:seed:admin.");
  }
  const passwordHash = await hash(parsed.data.password, 12);
  await prisma.user.upsert({
    where: { email: parsed.data.email },
    create: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: "ADMIN",
      suspendedAt: null,
    },
    update: {
      name: parsed.data.name,
      passwordHash,
      role: "ADMIN",
      suspendedAt: null,
    },
  });
  console.info(`Admin account ready for ${parsed.data.email}.`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/seed-admin.ts")) {
  void seedAdmin()
    .catch((error) => {
      console.error("Could not seed the admin account:", error);
      process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
}
