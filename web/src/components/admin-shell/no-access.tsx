import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export function NoAccess({ reason, path = "/admin" }: { reason: "signed-out" | "forbidden"; path?: string }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="font-display text-h2 font-extrabold uppercase">{reason === "signed-out" ? "Sign in to continue" : "Not for this account"}</h1>
      <p className="text-body text-ink-2">
        {reason === "signed-out"
          ? "The admin is for the lounge's staff. Sign in with the number the lounge gave access to."
          : "Your account doesn't have access to this part of the admin. Ask an admin at the lounge if you need it."}
      </p>
      <Link href={reason === "signed-out" ? `/sign-in?next=${encodeURIComponent(path)}` : "/"} className={buttonStyles({ variant: "main", size: "lg" })}>
        {reason === "signed-out" ? "Sign in" : "Back to the menu"}
      </Link>
    </main>
  );
}
