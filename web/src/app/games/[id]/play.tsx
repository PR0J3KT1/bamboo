"use client";
import type { GameId } from "@/lib/games/core";
import { Stage } from "./stage";
import { Quiz } from "./quiz";
import { Bei, Guess, Memory, Pour } from "./skill";
import { Chora, HeadsUp, Spin, Wyr } from "./party";

/** Each game on the stage. */
export function Play({ id }: { id: GameId }) {
  const body =
    id === "history" || id === "sheng" || id === "methali" || id === "kaunti" || id === "trivia" ? <Quiz id={id} />
    : id === "guess" ? <Guess />
    : id === "pour" ? <Pour />
    : id === "bei" ? <Bei />
    : id === "memory" ? <Memory />
    : id === "headsup" ? <HeadsUp />
    : id === "wyr" ? <Wyr />
    : id === "chora" ? <Chora />
    : <Spin />;
  return <Stage id={id}>{body}</Stage>;
}
