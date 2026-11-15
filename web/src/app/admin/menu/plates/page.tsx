import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { asc } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db, schema } from "@/db";
import { checkPermission } from "@/lib/session";
import { NoAccess } from "@/components/admin-shell/no-access";
import photos from "@/db/seed-data/photos.json";
import { PlatesEditor } from "./plates-editor";
import { Loader } from "@/components/ui/loader";

export const metadata: Metadata = { title: "Who's eating? plates" };

async function Plates() {
  const { denied } = await checkPermission({ menu: ["edit"] });
  if (denied) return <NoAccess reason={denied} path="/admin/menu/plates" />;
  const [bundles, parts, items] = await Promise.all([
    db.select().from(schema.bundles).orderBy(asc(schema.bundles.sort), asc(schema.bundles.id)),
    db.select().from(schema.bundleParts),
    db.select({ id: schema.items.id, name: schema.items.name, price: schema.items.price, active: schema.items.active, alcohol: schema.items.alcohol }).from(schema.items).orderBy(asc(schema.items.sort)),
  ]);
  const plates = bundles.map((b) => ({ id: b.id, name: b.name, who: b.who as "one" | "two" | "table", photoKey: b.photoKey, parts: parts.filter((p) => p.bundleId === b.id).map((p) => ({ itemId: p.itemId, qty: p.qty })) }));
  const lounge = Object.entries(photos.lounge).map(([key, p]) => ({ key, src: p.src, alt: p.alt }));
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-4 py-5 md:px-5">
      <Link href="/admin/menu" className="-ml-2 flex h-10 items-center gap-1 self-start rounded-full px-2 font-semibold"><ChevronLeft aria-hidden className="size-5" /> Menu and prices</Link>
      <div>
        <h1 className="font-display text-h2 font-extrabold uppercase">Who&rsquo;s eating? plates</h1>
        <p className="text-ink-2">Dishes put together for one, two or the table. Each costs what its dishes cost on their own, and a sold-out dish hides the plate until it&rsquo;s back.</p>
      </div>
      <PlatesEditor plates={plates} items={items} photos={lounge} />
    </main>
  );
}

export default function PlatesPage() {
  return (
    <Suspense fallback={<Loader label="Loading the plates" />}>
      <Plates />
    </Suspense>
  );
}
