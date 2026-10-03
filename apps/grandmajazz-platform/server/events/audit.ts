import { db } from "../db";
import { auditLog } from "@shared/events-schema";

export async function audit(entry: {
  businessId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      businessId: entry.businessId ?? null,
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
      requestId: entry.requestId ?? null,
    });
  } catch (err) {
    // Audit failures must never break the primary operation, but must be visible.
    console.error("[events][audit] failed to record audit entry:", err);
  }
}
