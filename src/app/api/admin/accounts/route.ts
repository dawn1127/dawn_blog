import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";

const accountSelect = {
  id: true,
  login: true,
  displayName: true,
  role: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
};

const loginSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-zA-Z0-9._-]+$/);

const createAccountSchema = z.object({
  login: loginSchema,
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(8).max(200),
  role: z.enum(["admin", "user"]),
  enabled: z.boolean().default(true),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const accounts = await getDb().user.findMany({
    orderBy: [{ role: "asc" }, { login: "asc" }],
    select: accountSelect,
  });

  return Response.json({ accounts });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const body = createAccountSchema.parse(await request.json());
  const db = getDb();
  const existing = await db.user.findUnique({
    where: { login: body.login },
    select: { id: true },
  });

  if (existing) {
    return new Response("Login already exists", { status: 409 });
  }

  const account = await db.user.create({
    data: {
      login: body.login,
      displayName: body.displayName,
      passwordHash: await bcrypt.hash(body.password, 12),
      role: body.role as UserRole,
      enabled: body.enabled,
    },
    select: accountSelect,
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "account.create",
    entityType: "User",
    entityId: account.id,
    metadata: {
      login: account.login,
      displayName: account.displayName,
      role: account.role,
      enabled: account.enabled,
    },
  });

  return Response.json({ account });
}

