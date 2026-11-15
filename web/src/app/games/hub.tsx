"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pic } from "@/components/ui/picture";
import type { Picture } from "@/lib/pictures";
import { KIND_NAME, PEXELS, PHOTO, THRESHOLD, type GameKind, type GameMeta } from "@/lib/games/core";
import { cn } from "@/lib/utils";

export type HubGame = GameMeta & { bottle: Picture | null };
const GLOW: Record<GameKind, string> = { quiz: "#CDDF7B", party: "#EE8A70", skill: "#E8AA45" };

/* The games as cards, filtered by kind. A photo on each, or the game's bottle on its shelf. */
export function GameHub({ games, adult, reward }: { games: HubGame[]; adult: boolean; reward: number | null }) {
  const [kind, setKind] = useState<GameKind | "all">("all");
  const shown = games.filter((g) => kind === "all" || g.kind === kind);
  const tab = (on: boolean) => cn("h-10 rounded-full px-4 font-semibold", on ? "bg-action text-on-action" : "bg-ground-2 text-ink-2 hover:text-ink");
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Kind of game" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={kind === "all"} onClick={() => setKind("all")} className={tab(kind === "all")}>All {games.length}</button>
          {(["quiz", "party", "skill"] as GameKind[]).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={tab(kind === k)}>{KIND_NAME[k]}s</button>
          ))}
        </div>
        {reward && <p className="rounded-full bg-lime px-4 py-2 font-semibold text-on-lime">Win {reward}% off the food</p>}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((g) => {
          const ph = PHOTO[g.id] ?? (g.id === "memory" && !adult ? "memory-food" : null);
          return (
            <li key={g.id}>
              <Link href={`/games/${g.id}`} className="group flex h-full flex-col overflow-hidden rounded-[18px] border border-line bg-card hover:border-action">
                <span className="relative block aspect-[16/10] overflow-hidden bg-grove">
                  {ph ? (
                    <Image src={`/games/${ph}.webp`} alt="" fill sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 92vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" />
                  ) : g.bottle ? (
                    <span className="bottle-stage absolute inset-0"><Pic picture={g.bottle} alt="" sizes="200px" /></span>
                  ) : null}
                  <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: GLOW[g.kind] }} />
                  <span className="absolute top-2.5 left-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-fine font-semibold text-white">{KIND_NAME[g.kind]}</span>
                  {g.adult && <span className="absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2 py-0.5 text-fine font-semibold text-[#EE9682]">18+</span>}
                </span>
                <span className="flex flex-1 flex-col gap-1.5 p-4">
                  <span className="font-serif text-ink-2 italic">{g.sw}</span>
                  <span className="font-display text-[1.5rem] leading-none font-extrabold uppercase">{g.name}</span>
                  <span className="text-[0.9375rem] text-ink-2">{g.line}</span>
                  <span className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-2 text-fine text-ink-3">
                    <span>About {g.minutes} min</span>
                    {g.players && <span>{g.players}</span>}
                    {g.rewarded && reward && THRESHOLD[g.id] !== undefined && <span className="font-semibold text-action">Solo high score wins {reward}% off</span>}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-fine text-ink-3">
        Card photos by Bamboo Cask Lounge, except these from Pexels:{" "}
        {games.filter((g) => PEXELS[g.id]).map((g, i) => (
          <span key={g.id}>{i ? ", " : ""}<a href={`https://www.pexels.com/photo/${PEXELS[g.id]}/`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{g.name}</a></span>
        ))}
        .
      </p>
    </main>
  );
}
