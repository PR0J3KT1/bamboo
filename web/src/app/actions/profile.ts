"use server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { eighteenthBirthday, isAdult, isValidDob } from "@/lib/age";
import { getSession } from "@/lib/session";

export type ProfileResult =
  | { ok: true; adult: boolean; eighteenOn: string | null }
  | { ok: false; error: string };

/* After the first sign-in: the customer's name and date of birth. The date of birth is set once;
   it can't be changed from the app, so nobody can make an under-18 account into an adult one. */
export async function completeProfile(input: { name: string; dateOfBirth: string; confirmed: boolean }): Promise<ProfileResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in first." };
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Enter your name." };
  if (!isValidDob(input.dateOfBirth)) return { ok: false, error: "Enter a real date of birth." };
  if (!input.confirmed) return { ok: false, error: "Confirm that your date of birth is correct." };

  const updated = await db
    .update(schema.user)
    .set({ name, dateOfBirth: input.dateOfBirth })
    .where(and(eq(schema.user.id, session.user.id), isNull(schema.user.dateOfBirth)))
    .returning({ id: schema.user.id });
  if (!updated.length) return { ok: false, error: "Your date of birth is already set." };

  const adult = isAdult(input.dateOfBirth);
  return { ok: true, adult, eighteenOn: adult ? null : eighteenthBirthday(input.dateOfBirth) };
}
