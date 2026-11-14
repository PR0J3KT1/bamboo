import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, phoneNumber } from "better-auth/plugins";
import { ac, roles } from "@/lib/permissions";
import { db, schema } from "@/db";
import { isKenyanMobile } from "@/lib/phone";
import { sendSms } from "@/lib/sms";
import { APIError } from "better-auth/api";
import { BLOCKED_MESSAGE, isPhoneBlocked } from "@/lib/blocked";

export const auth = betterAuth({
  appName: "Bamboo Cask",
  /* BETTER_AUTH_URL is trusted already; list any other address the site is served from
     (a second domain, a preview URL, a dev server on another port), comma-separated. */
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  user: {
    additionalFields: {
      /* Written only by completeProfile(), once; never from the client. */
      dateOfBirth: { type: "string", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,
    /* No cookie cache: a removed role or a block takes effect on the next request, not
       five minutes later. Every session check reads the database. */
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    customRules: {
      "/phone-number/send-otp": { window: 60, max: 3 },
      "/phone-number/verify": { window: 60, max: 10 },
    },
  },
  plugins: [
    phoneNumber({
      otpLength: 6,
      expiresIn: 10 * 60,
      allowedAttempts: 5,
      phoneNumberValidator: (p) => isKenyanMobile(p),
      sendOTP: async ({ phoneNumber, code }) => {
        /* don't spend a text message on a blocked number */
        if (await isPhoneBlocked(phoneNumber)) throw new APIError("FORBIDDEN", { message: BLOCKED_MESSAGE, code: "BANNED_USER" });
        await sendSms(phoneNumber, `${code} is your Bamboo Cask code. It expires in 10 minutes.`);
      },
      /* First sign-in with a number creates the account; the name and date of birth come next. */
      signUpOnVerification: {
        getTempEmail: (p) => `${p.replace("+", "")}@phone.bamboocask.invalid`,
      },
    }),
    admin({
      ac,
      roles,
      defaultRole: "customer",
      adminRoles: ["admin"],
      bannedUserMessage: BLOCKED_MESSAGE,
    }),
    nextCookies(), // keep last
  ],
});

export type Session = typeof auth.$Infer.Session;
