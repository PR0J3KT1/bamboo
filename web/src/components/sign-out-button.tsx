"use client";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="h-11 px-1 text-on-grove-2 underline"
      onClick={async () => {
        await signOut();
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
