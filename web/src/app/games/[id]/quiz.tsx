"use client";
import { useEffect, useState } from "react";
import { QUIZ, SAY, type Question } from "@/lib/games/core";
import { cn } from "@/lib/utils";
import { Board, deal, GoButton, Head, pickLine, Said, TimeBar, useClock, useStage, cue } from "./stage";

const LETTER = ["A", "B", "C", "D"];
export type QuizId = keyof typeof QUIZ;

/* The quizzes: ten questions solo, or two a player in teams, a clock on each. History, Sheng,
   Methali and Kaunti deal across their topics; Bar Trivia is for adults. */
export function Quiz({ id }: { id: QuizId }) {
  const st = useStage();
  const { party, order, live, turnKey } = st;
  const [qs] = useState<Question[]>(() => {
    const pool = QUIZ[id];
    const n = party.solo ? Math.min(10, pool.length) : Math.min(pool.length, order.length * 2);
    return deal(id, pool, n, (q) => q[0], id === "trivia" ? undefined : (q) => q[4] ?? "");
  });
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [line, setLine] = useState("");
  const asking = chosen === null;
  const turn = order[i % order.length];
  const q = qs[i];

  function answer(k: number) {
    if (!asking) return;
    const ok = k === q[2];
    setChosen(k);
    setLine(k < 0 ? SAY.timeUp : ok ? pickLine(SAY.right) : pickLine(SAY.wrong));
    if (ok) {
      setRight((r) => r + 1);
      st.addScore(turn.team, 1);
    }
    cue(ok ? "good" : "bad");
  }
  function next() {
    const n = i + 1;
    if (n >= qs.length) {
      if (party.solo) st.soloEnd(right, qs.length, "right");
      else st.teamEnd("right");
      return;
    }
    setI(n);
    setChosen(null);
    if (!party.solo) st.handoff(n);
  }
  const left = useClock(party.secs, live && asking, () => answer(-1), `${turnKey}-${i}`);

  /* keys: 1 to 4 or A to D to answer, Enter for the next question */
  useEffect(() => {
    if (!live) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
      if (asking && k >= 0 && k < 4) answer(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!q) return null;
  return (
    <>
      <Head left={`Question ${i + 1} of ${qs.length}`} right={party.solo ? `${right} right` : `${turn.player}, Team ${party.teams[turn.team].name}`} />
      <TimeBar left={asking ? left : 0} secs={party.secs} team={turn.team} />
      <Board current={turn.team} />
      {q[4] && <p className="text-fine font-semibold text-lime">{q[4]}{q[5] ? `, ${q[5]}` : ""}</p>}
      <p id="q-text" className="text-[1.375rem] leading-snug font-semibold">{q[0]}</p>
      <div role="group" aria-labelledby="q-text" className="grid gap-2 sm:grid-cols-2">
        {q[1].map((o, k) => {
          const state = asking ? "" : k === q[2] ? "right" : k === chosen ? "wrong" : "dim";
          return (
            <button
              key={k}
              type="button"
              disabled={!asking}
              autoFocus={asking && k === 0}
              onClick={() => answer(k)}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 text-left font-semibold",
                state === "" && "border-on-grove/25 hover:border-lime",
                state === "right" && "border-lime bg-lime text-on-lime",
                state === "wrong" && "border-[#EE8A70] bg-[#EE8A70]/20",
                state === "dim" && "border-on-grove/10 opacity-50",
              )}
            >
              <i className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/15 text-fine not-italic">{LETTER[k]}</i>
              {o}
            </button>
          );
        })}
      </div>
      {!asking && (
        <>
          <Said good={chosen === q[2]} line={line}><p>{q[3]}</p></Said>
          <GoButton onClick={next}>{i + 1 >= qs.length ? (party.solo ? "See your score" : "See who won") : party.solo ? "Next question" : "Pass the phone"}</GoButton>
        </>
      )}
    </>
  );
}
