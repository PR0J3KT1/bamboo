/* Give an account a role from the command line. Needed once, for the first admin: until one
   exists, nobody can grant roles in the admin. The person must have signed in once.
   usage: pnpm admin:grant 0712345678 admin   (roles: customer, staff, admin) */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { normalizeKenyanPhone } from "../src/lib/phone";

try {
  process.loadEnvFile(".env.local");
} catch {}

async function main() {
  const [phoneArg, role] = process.argv.slice(2);
  const ROLES = ["customer", "staff", "admin"];
  const phone = phoneArg ? normalizeKenyanPhone(phoneArg) : null;
  if (!phone || !ROLES.includes(role)) {
    console.error(
      "usage: pnpm admin:grant <Kenyan mobile number> <customer|staff|admin>",
    );
    process.exitCode = 1;
    return;
  }

  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql, { schema });

  try {
    const [u] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.phoneNumber, phone))
      .limit(1);
    if (!u) {
      console.error(
        `No account for ${phone}. Sign in once with that number first.`,
      );
      process.exitCode = 1;
    } else {
      await db.transaction(async (tx) => {
        await tx
          .update(schema.user)
          .set({ role })
          .where(eq(schema.user.id, u.id));
        await tx.insert(schema.auditEvents).values({
          actorId: null,
          actorName: "command line",
          action: "role.set",
          entityType: "user",
          entityId: u.id,
          before: { role: u.role },
          after: { role },
        });
      });
      console.log(`${u.name || phone} is now ${role}.`);
    }
  } finally {
    await sql.end();
  }
}

main();
