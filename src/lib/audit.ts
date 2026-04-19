import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";

type AuditInput = {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput) {
  return getDb().auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
