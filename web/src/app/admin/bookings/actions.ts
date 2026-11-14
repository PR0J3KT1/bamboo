"use server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { sendSms } from "@/lib/sms";
import { displayPhone } from "@/lib/phone";
import { getSettings } from "@/lib/settings";
import { bookingSms, canMoveBooking, STATUS_LABEL, type BookingStatus } from "@/lib/bookings";
import { NotAllowed, requirePermission, type UserRow } from "@/lib/session";

export type BookingActionResult = { ok: true; message: string; warning?: string } | { ok: false; error: string };

const TO = z.enum(["confirmed", "declined", "cancelled", "completed"]);

/** Confirm, decline, cancel or close a booking. Confirming and declining text the customer, with
    the reply if there is one; declining needs one. A failed text doesn't undo the change. */
export async function moveBooking(id: string, toInput: string, replyInput?: string): Promise<BookingActionResult> {
  let me: UserRow;
  try {
    me = await requirePermission({ booking: ["update"] });
  } catch (e) {
    if (e instanceof NotAllowed) return { ok: false, error: e.message };
    throw e;
  }
  const to = TO.safeParse(toInput);
  if (!to.success || !z.uuid().safeParse(id).success) return { ok: false, error: "That isn't a step a booking can take." };
  const reply = (replyInput ?? "").trim().slice(0, 300) || null;
  if (to.data === "declined" && !reply) return { ok: false, error: "Say why, or what else you can offer. The customer gets it by SMS." };

  const moved = await db.transaction(async (tx) => {
    const [b] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, id)).for("update").limit(1);
    if (!b) return { error: "That booking no longer exists." } as const;
    if (!canMoveBooking(b.status as BookingStatus, to.data)) return { error: `${b.code} is ${STATUS_LABEL[b.status as BookingStatus].toLowerCase()}; it can't be changed that way.` } as const;
    const by = me.name || me.phoneNumber || "Staff";
    await tx.update(schema.bookings).set({ status: to.data, reply: reply ?? b.reply, handledBy: by }).where(eq(schema.bookings.id, b.id));
    await audit(tx, me, "booking.status", { type: "booking", id: b.id }, { status: b.status }, { status: to.data, reply: reply ?? undefined });
    return { b } as const;
  });
  if ("error" in moved) return { ok: false, error: moved.error! };
  const b = moved.b;

  let warning: string | undefined;
  if (to.data === "confirmed" || to.data === "declined") {
    const { phone } = await getSettings();
    try {
      await sendSms(b.phone, bookingSms(b, to.data, reply, displayPhone(phone)));
    } catch (e) {
      console.error("booking sms", e);
      warning = `The text to ${displayPhone(b.phone)} didn't go. Call or WhatsApp them.`;
    }
  }
  const verb = { confirmed: "confirmed", declined: "declined", cancelled: "cancelled", completed: "marked done" }[to.data];
  return { ok: true, message: `${b.code} ${verb}${(to.data === "confirmed" || to.data === "declined") && !warning ? ", and the customer was texted" : ""}`, warning };
}
