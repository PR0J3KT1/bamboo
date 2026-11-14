"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export type AdminNavItem = { href: string; label: string };

/* The grove bar across every admin page: where you are, where you can go (only the places your
   role can use), and who's signed in. */
export function AdminBar({ nav, who }: { nav: AdminNavItem[]; who: string }) {
  const path = usePathname();
  const router = useRouter();
  const current = nav.filter((n) => (n.href === "/admin" ? path === "/admin" : path.startsWith(n.href))).at(-1);
  return (
    <header className="grove-bg text-on-grove">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 md:px-5">
        <Link href="/admin" className="font-display text-[1.5rem] font-extrabold uppercase">Bamboo Cask</Link>
        <nav aria-label="Admin" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:mx-0 md:ml-auto md:w-auto">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={current?.href === n.href ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center rounded-full px-3.5 font-semibold",
                current?.href === n.href ? "bg-lime/20 text-lime" : "text-on-grove hover:bg-on-grove/10",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-[0.875rem] md:ml-0">
          <span className="text-on-grove-2">{who}</span>
          <button
            type="button"
            className="h-10 underline"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
