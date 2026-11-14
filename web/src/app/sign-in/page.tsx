import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getViewer } from "@/lib/session";
import { SignInFlow } from "./sign-in-flow";

export const metadata: Metadata = { title: "Sign in" };

/** Only a path on this site, never another site's address. */
function safeNext(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/";
}

async function Flow({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  await connection();
  const [{ user, profileComplete }, sp] = await Promise.all([getViewer(), searchParams]);
  return <SignInFlow signedIn={!!user} profileComplete={profileComplete} next={safeNext(sp.next)} />;
}

export default function SignInPage(props: PageProps<"/sign-in">) {
  return (
    <Suspense fallback={null}>
      <Flow searchParams={props.searchParams} />
    </Suspense>
  );
}
