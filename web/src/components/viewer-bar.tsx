import Link from "next/link";
import { getViewer } from "@/lib/session";
import { displayPhone } from "@/lib/phone";
import { buttonStyles } from "@/components/ui/button";
import { SignOutButton } from "./sign-out-button";
import { can } from "@/lib/permissions";

export async function ViewerBar() {
  const { user, profileComplete } = await getViewer();
  if (!user) {
    return (
      <Link href="/sign-in" className={buttonStyles({ variant: "grove", size: "sm" })}>
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3 text-[0.875rem]">
      {can(user.role, { order: ["view"] }) && (
        <Link href="/admin" className="rounded-full bg-lime px-3.5 py-2 font-bold text-on-lime">Admin</Link>
      )}
      {profileComplete ? (
        <span className="font-semibold">{user.name}</span>
      ) : (
        <Link href="/sign-in" className="font-semibold text-lime underline">Finish your account</Link>
      )}
      {user.phoneNumber && <span className="hidden text-on-grove-2 sm:inline">{displayPhone(user.phoneNumber)}</span>}
      <SignOutButton />
    </div>
  );
}
