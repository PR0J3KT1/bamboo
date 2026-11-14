import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber } from "better-auth/plugins";
import { db, schema } from "@/db";
import { isKenyanMobile } from "@/lib/phone";
import { sendSms } from "@/lib/sms";

export const auth = betterAuth({
  appName: "Bamboo Cask",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  user: {
    additionalFields: {
      /* Written only by completeProfile(), once; never from the client. */
      dateOfBirth: { type: "string", required: false, input: false },
      role: { type: "string", required: false, defaultValue: "customer", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
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
        await sendSms(phoneNumber, `${code} is your Bamboo Cask code. It expires in 10 minutes.`);
      },
      /* First sign-in with a number creates the account; the name and date of birth come next. */
      signUpOnVerification: {
        getTempEmail: (p) => `${p.replace("+", "")}@phone.bamboocask.invalid`,
      },
    }),
    nextCookies(), // keep last
  ],
});

export type Session = typeof auth.$Infer.Session;
