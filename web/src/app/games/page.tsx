import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { getMenu } from "@/db/queries/menu";
import { getViewer } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { pictureFor } from "@/lib/pictures";
import { GAMES, STAGE_BOTTLE, type GameId } from "@/lib/games/core";
import { Brand } from "@/components/brand";
import { GameHub, type HubGame } from "./hub";
import { Loader } from "@/components/ui/loader";

export const metadata: Metadata = {
  title: "Games",
  description: "Quizzes, party games and skill games for the table at Bamboo Cask. Solo, or in teams on one phone; a high score wins a share off the food.",
};

async function Hub() {
  const [menu, viewer, settings] = await Promise.all([getMenu(), getViewer(), getSettings()]);
  /* the bottle that stands on each bottle game's card */
  const bottle = (id: GameId) => {
    const s = STAGE_BOTTLE[id];
    const it = s && menu.items.find((i) => i.name === s[0] && i.size === s[1] && i.sprite);
    return it ? pictureFor(it) : null;
  };
  const games: HubGame[] = GAMES.filter((g) => !g.adult || viewer.adult).map((g) => ({ ...g, bottle: bottle(g.id) }));
  return <GameHub games={games} adult={viewer.adult} reward={settings.rewards.open ? settings.rewards.percent : null} />;
}

export default function GamesPage() {
  return (
    <>
      <header className="grove-bg text-on-grove">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 pt-4 md:px-8">
          <Link href="/" aria-label="Bamboo Cask, back to the menu"><Brand /></Link>
          <Link href="/" className="flex h-11 items-center gap-1 rounded-full px-3 font-semibold hover:bg-on-grove/10"><ChevronLeft aria-hidden className="size-5" /> Menu</Link>
        </div>
        <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-4 pt-8 pb-8 md:px-8">
          <h1 className="font-stencil text-h1 font-black md:text-[4.5rem]">CHEZA!</h1>
          <p className="max-w-lg font-serif text-lead text-lime italic">Quizzes, party games and skill games for the table. Solo, or in teams on one phone.</p>
        </div>
      </header>
      <Suspense fallback={<Loader label="Racking up the games" />}>
        <Hub />
      </Suspense>
    </>
  );
}
