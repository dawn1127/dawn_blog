import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const login = process.env.BOOTSTRAP_ADMIN_LOGIN || "admin";
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const displayName = process.env.BOOTSTRAP_ADMIN_NAME || "Administrator";

  if (!password) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD is required for seeding.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { login },
    update: {
      displayName,
      passwordHash,
      role: UserRole.admin,
      enabled: true,
    },
    create: {
      login,
      displayName,
      passwordHash,
      role: UserRole.admin,
      enabled: true,
    },
  });

  console.log(`Seeded admin user: ${login}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
