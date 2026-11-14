"use client";
import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields, phoneNumberClient } from "better-auth/client/plugins";
import { ac, roles } from "@/lib/permissions";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [phoneNumberClient(), adminClient({ ac, roles }), inferAdditionalFields<typeof auth>()],
});

export const { useSession, signOut } = authClient;
