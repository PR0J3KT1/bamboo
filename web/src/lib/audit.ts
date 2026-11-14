import "server-only";
import { db, schema } from "@/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Actor = { id: string; name: string; phoneNumber?: string | null } | null;

/** Record a change made in the admin. Pass the transaction the change runs in, so the record
    and the change are saved together or not at all. */
export async function audit(
  tx: Tx | typeof db,
  actor: Actor,
  action: string,
  entity: { type: string; id: string },
  before: unknown,
  after: unknown,
) {
  await tx.insert(schema.auditEvents).values({
    actorId: actor?.id ?? null,
    actorName: actor ? actor.name || actor.phoneNumber || actor.id : "system",
    action,
    entityType: entity.type,
    entityId: entity.id,
    before: before ?? null,
    after: after ?? null,
  });
}
