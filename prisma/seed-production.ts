import { prisma } from "../lib/prisma";
import { seedDemoData } from "./seed";
import { seedAdmin } from "./seed-admin";

async function main() {
  await seedDemoData(true, true);
  await seedAdmin();
}

void main()
  .catch((error: unknown) => {
    console.error("Production seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
