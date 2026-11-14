import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getViewer } from "@/lib/session";
import { SignInFlow } from "./sign-in-flow";

export const metadata: Metadata = { title: "Sign in" };

async function Flow() {
  await connection();
  const { user, profileComplete } = await getViewer();
  return <SignInFlow signedIn={!!user} profileComplete={profileComplete} />;
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <Flow />
    </Suspense>
  );
}
