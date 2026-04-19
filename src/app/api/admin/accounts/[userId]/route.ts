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

const updateAccountSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  password: z.string().max(200).optional(),
  role: z.enum(["admin", "user"]).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const { userId } = await context.params;
  const body = updateAccountSchema.parse(await request.json());
  const db = getDb();
  const account = await db.user.findUnique({
    where: { id: userId },
    select: accountSelect,
  });

  if (!account) {
    return new Response("Account not found", { status: 404 });
  }

  const nextRole = body.role ?? account.role;
  const nextEnabled = body.enabled ?? account.enabled;
  const wouldRemoveEnabledAdmin =
    account.role === "admin" && account.enabled && (nextRole !== "admin" || !nextEnabled);

  if (wouldRemoveEnabledAdmin) {
    const enabledAdminCount = await db.user.count({
      where: {
        role: "admin",
        enabled: true,
      },
    });

    if (enabledAdminCount <= 1) {
      return new Response("Cannot remove the last enabled admin", { status: 409 });
    }
  }

  const data: {
    displayName?: string;
    passwordHash?: string;
    role?: UserRole;
    enabled?: boolean;
  } = {};
  const changedFields: string[] = [];
  const nextPassword = body.password;
  const passwordUpdated = nextPassword !== undefined && nextPassword.length > 0;

  if (body.displayName !== undefined) {
    data.displayName = body.displayName;
    changedFields.push("displayName");
  }

  if (passwordUpdated) {
    if (nextPassword.length < 8) {
      return new Response("Password must be at least 8 characters", { status: 400 });
    }

    data.passwordHash = await bcrypt.hash(nextPassword, 12);
    changedFields.push("password");
  }

  if (body.role !== undefined) {
    data.role = body.role as UserRole;
    changedFields.push("role");
  }

  if (body.enabled !== undefined) {
    data.enabled = body.enabled;
    changedFields.push("enabled");
  }

  if (changedFields.length === 0) {
    return Response.json({ account });
  }

  const updated = await db.user.update({
    where: { id: account.id },
    data,
    select: accountSelect,
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "account.update",
    entityType: "User",
    entityId: updated.id,
    metadata: {
      login: updated.login,
      changedFields,
      passwordUpdated,
      role: updated.role,
      enabled: updated.enabled,
    },
  });

  return Response.json({ account: updated });
}
