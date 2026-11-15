import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { menuHere, toCatalog } from "@/db/queries/menu";
import { getViewer } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { CatalogProvider } from "@/components/order/catalog";
import { Brand } from "@/components/brand";
import { Planner } from "./planner";
import { Loader } from "@/components/ui/loader";

export const metadata: Metadata = {
  title: "Plan a party",
  description: "Pick the occasion and the number of guests: the planner works out the choma, the sides and the drinks from Bamboo Cask's menu, at the lounge's prices.",
};

async function Party({ searchParams }: { searchParams: PageProps<"/party">["searchParams"] }) {
  const [menu, viewer, settings, sp] = await Promise.all([menuHere(), getViewer(), getSettings(), searchParams]);
  return (
    <CatalogProvider catalog={toCatalog(menu, viewer.adult)} showBasket={false}>
      <Planner start={typeof sp.occ === "string" ? sp.occ : null} phone={settings.phone} ordering={settings.ordering.open} />
    </CatalogProvider>
  );
}

export default function PartyPage(props: PageProps<"/party">) {
  return (
    <>
      <header className="grove-bg text-on-grove">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 pt-4 pb-4 md:px-8">
          <Link href="/" aria-label="Bamboo Cask, back to the menu"><Brand /></Link>
          <Link href="/#party" className="flex h-11 items-center gap-1 rounded-full px-3 font-semibold hover:bg-on-grove/10">
            <ChevronLeft aria-hidden className="size-5" /> Menu
          </Link>
        </div>
      </header>
      <Suspense fallback={<Loader label="Setting up the planner" />}>
        <Party searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
