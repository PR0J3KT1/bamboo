import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getMenu, toCatalog } from "@/db/queries/menu";
import { getViewer } from "@/lib/session";
import { game, GAMES, type GameId } from "@/lib/games/core";
import { CatalogProvider } from "@/components/order/catalog";
import { Play } from "./play";

export async function generateMetadata({ params }: PageProps<"/games/[id]">): Promise<Metadata> {
  const g = game((await params).id);
  return g ? { title: g.name, description: g.line } : { title: "Games" };
}
export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

async function Game({ params }: { params: PageProps<"/games/[id]">["params"] }) {
  const { id } = await params;
  const g = game(id);
  if (!g) notFound();
  const [menu, viewer] = await Promise.all([getMenu(), getViewer()]);
  if (g.adult && !viewer.adult) {
    return (
      <main className="grove-bg flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center text-on-grove">
        <h1 className="font-stencil text-h1 font-black uppercase">{g.name}</h1>
        <p className="max-w-prose">This is one of the Cask Room games, for accounts aged 18 or over. {viewer.user ? "" : "Sign in with your phone number to play it."}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {!viewer.user && <Link href={`/sign-in?next=/games/${g.id}`} className="flex h-12 items-center rounded-full bg-lime px-6 font-bold text-on-lime">Sign in</Link>}
          <Link href="/games" className="flex h-12 items-center rounded-full border-[1.5px] border-on-grove/30 px-5 font-semibold">Other games</Link>
        </div>
      </main>
    );
  }
  return (
    <CatalogProvider catalog={toCatalog(menu, viewer.adult)} showBasket={false}>
      <Play id={g.id as GameId} />
    </CatalogProvider>
  );
}

export default function GamePage(props: PageProps<"/games/[id]">) {
  return (
    <Suspense fallback={<div className="grove-bg min-h-dvh" />}>
      <Game params={props.params} />
    </Suspense>
  );
}
