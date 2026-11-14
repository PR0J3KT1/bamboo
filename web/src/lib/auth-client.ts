"use client";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, phoneNumberClient } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [phoneNumberClient(), inferAdditionalFields<typeof auth>()],
});

export const { useSession, signOut } = authClient;
