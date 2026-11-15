"use client";
import Link from "next/link";
import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { pickAdminLocation } from "@/app/admin/_actions/location";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export type AdminNavItem = { href: string; label: string; count?: number };

/** Where the admin is looking: one location, or (admins only) every one. */
export type AdminPlace = { current: string | null; fixed: boolean; locations: { id: string; name: string }[] };

/* The grove bar across every admin page: where you are, where you can go (only the places your
   role can use), and who's signed in. */
export function AdminBar({ nav, who, place }: { nav: AdminNavItem[]; who: string; place: AdminPlace }) {
  const path = usePathname();
  const router = useRouter();
  const current = nav.filter((n) => (n.href === "/admin" ? path === "/admin" : path.startsWith(n.href))).at(-1);
  return (
    <header className="grove-bg text-on-grove">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 md:px-5">
        <Link href="/admin" className="font-display text-[1.5rem] font-extrabold uppercase">Bamboo Cask</Link>
        <Link href="/" className="text-fine font-semibold text-on-grove-2 underline-offset-2 hover:text-on-grove hover:underline">See the site</Link>
        <PlacePick place={place} />
        <nav aria-label="Admin" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:order-none md:mx-0 md:ml-auto md:w-auto">
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
              {!!n.count && (
                <span className="ml-1.5 min-w-5 rounded-full bg-lime px-1.5 text-center text-fine font-bold text-on-lime" aria-label={`${n.count} waiting`}>{n.count}</span>
              )}
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

/* Which location: a choice for admins when there's more than one, a label for staff and managers. */
function PlacePick({ place }: { place: AdminPlace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (place.locations.length < 2 && !place.fixed) return null;
  const name = place.locations.find((l) => l.id === place.current)?.name;
  if (place.fixed) {
    return (
      <span className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-lime">
        <MapPin aria-hidden className="size-4" /> {name ?? "No location"}
      </span>
    );
  }
  return (
    <label className="flex items-center gap-1.5 text-[0.875rem]">
      <MapPin aria-hidden className="size-4 text-lime" />
      <span className="sr-only">Location</span>
      <select
        value={place.current ?? "all"}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          start(async () => {
            if ((await pickAdminLocation(id)).ok) router.refresh();
          });
        }}
        className="h-9 cursor-pointer rounded-full bg-on-grove/10 px-3 font-semibold text-on-grove disabled:opacity-60 [&>option]:text-ink"
      >
        <option value="all">Every location</option>
        {place.locations.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
    </label>
  );
}
