"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX, X } from "lucide-react";
import { claimReward } from "@/app/actions/rewards";
import { reward } from "@/lib/basket";
import { deal as dealPure, game, INTRO, SAY, SETUP, TEAM_COLOURS, TEAM_NAMES, THRESHOLD, turnOrder, winners, type GameId, type Team, type Turn } from "@/lib/games/core";
import { DECKS } from "@/lib/games/core";
import { cn } from "@/lib/utils";

/* The stage every game plays on: the setup (solo, or teams on one phone), "pass the phone" between
   turns, the clock, sounds, and the end (a solo high score claims the reward). Each game is a
   component that runs its own rounds and talks to the stage through useStage(). */

/* ── this phone's memory: what's been dealt, best scores, sound, the teams ── */
function store<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function keep(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}
/** Deal without repeating what this phone has seen lately (per deck). */
export function deal<T>(deck: string, pool: readonly T[], n: number, id: (x: T) => string, topic?: (x: T) => string) {
  const all = store<Record<string, string[]>>("bc-app-play-seen", {});
  const r = dealPure(pool, n, id, all[deck] ?? [], topic);
  all[deck] = r.seen;
  keep("bc-app-play-seen", all);
  return r.hand;
}

let audio: AudioContext | null = null;
export function cue(kind?: "go" | "good" | "bad") {
  if (store("bc-app-play-mute", false)) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio ??= new Ctx();
    const o = audio.createOscillator();
    const v = audio.createGain();
    const t = audio.currentTime;
    o.type = "sine";
    o.frequency.value = kind === "go" ? 880 : kind === "bad" ? 196 : kind === "good" ? 660 : 523;
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
    v.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(v);
    v.connect(audio.destination);
    o.start(t);
    o.stop(t + 0.3);
  } catch {
    /* no sound here */
  }
}
export const pickLine = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];

/** Keep a press on its element even if the finger slides off; never let a browser that refuses
    it stop the drawing or the pour. */
export function capture(e: { currentTarget: Element; pointerId: number }) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {
    /* not capturable: the press still works */
  }
}

/** A countdown that ticks every tenth of a second while running, and calls onUp once at nought. */
export function useClock(secs: number, running: boolean, onUp: () => void, restart: unknown) {
  const [left, setLeft] = useState(secs);
  const up = useRef(onUp);
  useEffect(() => {
    up.current = onUp;
  });
  useEffect(() => {
    if (!running) return;
    const t0 = performance.now();
    let done = false;
    const iv = setInterval(() => {
      const l = Math.max(0, secs - (performance.now() - t0) / 1000);
      setLeft(l);
      if (l <= 0 && !done) {
        done = true;
        clearInterval(iv);
        up.current();
      }
    }, 100);
    return () => clearInterval(iv);
  }, [secs, running, restart]);
  return running ? left : secs;
}

/* ── the stage's context ── */
type Party = { solo: boolean; teams: Team[]; secs: number; deck: string; names: string[] };
type StageCtx = {
  id: GameId;
  party: Party;
  order: Turn[];
  scores: number[];
  live: boolean; // false while the phone is being passed
  turnKey: number; // changes as each turn starts
  addScore: (team: number, n: number) => void;
  setScores: (s: number[]) => void;
  /** Pass the phone to the player whose turn number this is, then start their turn. */
  handoff: (turn: number, note?: string) => void;
  soloEnd: (score: number, of: number, unit: string) => void;
  teamEnd: (unit: string) => void;
  /** Start the same game again, with the same players. */
  restart: () => void;
};
const Ctx = createContext<StageCtx | null>(null);
export function useStage() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStage outside the stage");
  return c;
}

export function TeamColour({ team }: { team: number }) {
  return <i aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: TEAM_COLOURS[team] }} />;
}

/** The scores across the top in a team game. */
export function Board({ current }: { current?: number }) {
  const { party, scores } = useStage();
  if (party.solo) return null;
  return (
    <div aria-label="Scores" className="flex flex-wrap gap-2">
      {party.teams.map((t, i) => (
        <span key={i} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-fine font-semibold", i === current ? "bg-on-grove/20 ring-2 ring-[var(--c)]" : "bg-on-grove/10")} style={{ "--c": t.colour } as React.CSSProperties}>
          <TeamColour team={i} /> {t.name} <b className="tabular-nums">{Math.round(scores[i] * 10) / 10}</b>
        </span>
      ))}
    </div>
  );
}

/** The time left, as a bar in the team's colour. */
export function TimeBar({ left, secs, team }: { left: number; secs: number; team: number }) {
  return (
    <div className="flex items-center gap-2" role="timer" aria-label={`${Math.ceil(left)} seconds left`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-on-grove/10">
        <div className="h-full origin-left rounded-full transition-transform duration-100 ease-linear" style={{ transform: `scaleX(${Math.max(0, left / secs)})`, background: TEAM_COLOURS[team] }} />
      </div>
      <span className="w-9 text-right text-fine tabular-nums text-on-grove-2">{Math.ceil(left)}s</span>
    </div>
  );
}

/** "Question 3 of 10" on the left, whose turn or the running score on the right. */
export function Head({ left, right }: { left: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-fine font-semibold text-on-grove-2">
      <span>{left}</span>
      <span className="text-right">{right}</span>
    </div>
  );
}

export function GoButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" autoFocus onClick={onClick} disabled={disabled} className="h-14 w-full rounded-full bg-lime px-6 text-[1.0625rem] font-bold text-on-lime disabled:opacity-40 sm:w-auto sm:self-start">
      {children}
    </button>
  );
}

/** What was said after an answer, and why. */
export function Said({ good, line, children }: { good: boolean; line: string; children?: React.ReactNode }) {
  return (
    <div role="status" className={cn("rounded-2xl border-l-4 p-4", good ? "border-lime bg-lime/10" : "border-[#EE8A70] bg-[#EE8A70]/10")}>
      <b className="block">{line}</b>
      {children && <div className="mt-1 text-on-grove-2">{children}</div>}
    </div>
  );
}

/* ── the stage ── */
type Phase = "setup" | "play" | "handoff" | "end" | "team-end";

export function Stage({ id, children }: { id: GameId; children: React.ReactNode }) {
  const g = game(id)!;
  const o = SETUP[id];
  const [phase, setPhase] = useState<Phase>("setup");
  const [setup, setSetup] = useState(() => ({
    solo: o.solo !== false,
    teams: [
      { name: "Simba", players: ["Wanjiku", "Otieno"] },
      { name: "Chui", players: ["Achieng'", "Kamau"] },
    ] as { name: string; players: string[] }[],
    secs: o.def ?? 20,
    deck: "mix",
    names: [] as string[],
  }));
  /* saved teams and names come back after the first render, so the server's page matches */
  useEffect(() => {
    const t = store<{ teams?: { name: string; players: string[] }[] } | null>("bc-app-play-party", null);
    const n = store<string[] | null>("bc-app-play-names", null);
    Promise.resolve().then(() => setSetup((s) => ({ ...s, teams: t?.teams && t.teams.length >= 2 ? t.teams : s.teams, names: n ?? s.names })));
  }, []);
  const names = setup.names.length ? setup.names : ["Wanjiku", "Otieno", "Achieng'", "Kamau", "Njeri", "Kiprop"];

  const [party, setParty] = useState<Party | null>(null);
  const [order, setOrder] = useState<Turn[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [turnKey, setTurnKey] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [note, setNote] = useState("");
  const [turnAt, setTurnAt] = useState(0);
  const [res, setRes] = useState<{ score: number; of: number; unit: string; best: number | null; isBest: boolean } | null>(null);
  const [unit, setUnit] = useState("");
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    const m = store("bc-app-play-mute", false);
    Promise.resolve().then(() => setMuted(m));
  }, []);
  const [problem, setProblem] = useState<string | null>(null);

  function start() {
    setProblem(null);
    const solo = o.names ? true : setup.solo && o.solo !== false;
    const teams = solo ? [{ name: "You", players: ["You"], colour: TEAM_COLOURS[1] }] : setup.teams.filter((t) => t.players.length).map((t, i) => ({ name: t.name.trim() || TEAM_NAMES[i], players: t.players, colour: TEAM_COLOURS[i] }));
    if (!o.names && !solo && teams.length < 2) return setProblem("Put a player in at least two teams first.");
    if (!solo) keep("bc-app-play-party", { teams: setup.teams });
    if (o.names) keep("bc-app-play-names", names);
    const p = { solo, teams, secs: setup.secs, deck: setup.deck, names };
    setParty(p);
    setOrder(turnOrder(solo ? null : teams));
    setScores(teams.map(() => 0));
    setRes(null);
    setGameKey((k) => k + 1);
    setTurnKey((k) => k + 1);
    setTurnAt(0);
    setNote("");
    setPhase(solo ? "play" : "handoff");
    cue("go");
  }

  const ctx: StageCtx | null = party && {
    id,
    party,
    order,
    scores,
    live: phase === "play",
    turnKey,
    addScore: (team, n) => setScores((s) => s.map((x, i) => (i === team ? x + n : x))),
    setScores,
    handoff: (turn, n) => {
      setTurnAt(turn);
      setNote(n ?? "");
      setPhase("handoff");
    },
    soloEnd: (score, of, u) => {
      const bests = store<Record<string, number>>("bc-app-play-best", {});
      const was = bests[id];
      const isBest = was === undefined || score > was;
      if (isBest) keep("bc-app-play-best", { ...bests, [id]: score });
      setRes({ score, of, unit: u, best: was ?? null, isBest: isBest && was !== undefined });
      setPhase("end");
    },
    teamEnd: (u) => {
      setUnit(u);
      setPhase("team-end");
    },
    restart: () => start(),
  };

  const go = useCallback(() => {
    cue("go");
    setTurnKey((k) => k + 1);
    setPhase("play");
  }, []);

  return (
    <div className="grove-bg min-h-dvh text-on-grove">
      <div className="mx-auto flex min-h-dvh w-full max-w-[760px] flex-col gap-4 px-4 pt-3 pb-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/games" className="flex h-11 items-center gap-1.5 rounded-full px-2 font-semibold hover:bg-on-grove/10"><X aria-hidden className="size-5" /> Games</Link>
          <span className="font-display text-[1.25rem] font-extrabold uppercase">{g.name}</span>
          <button
            type="button"
            aria-pressed={muted}
            aria-label={muted ? "Sound off" : "Sound on"}
            onClick={() => {
              keep("bc-app-play-mute", !muted);
              setMuted(!muted);
            }}
            className="flex size-11 items-center justify-center rounded-full hover:bg-on-grove/10"
          >
            {muted ? <VolumeX aria-hidden className="size-5" /> : <Volume2 aria-hidden className="size-5" />}
          </button>
        </div>

        {phase === "setup" && (
          <SetupView id={id} setup={setup} setSetup={setSetup} names={names} problem={problem} onStart={start} />
        )}

        {ctx && phase !== "setup" && (
          <Ctx.Provider value={ctx}>
            {phase === "handoff" && <Handoff key={`${turnAt}-${turnKey}`} turn={order[turnAt % Math.max(1, order.length)]} note={note} onGo={go} />}
            {/* the game stays mounted while the phone is passed, so it keeps its place */}
            <div key={gameKey} hidden={phase !== "play"} className="flex flex-col gap-4">
              {children}
            </div>
            {phase === "end" && res && <SoloEnd id={id} res={res} onAgain={start} />}
            {phase === "team-end" && <TeamEnd unit={unit} onAgain={start} />}
          </Ctx.Provider>
        )}
      </div>
    </div>
  );
}

function SetupView({ id, setup, setSetup, names, problem, onStart }: {
  id: GameId;
  setup: { solo: boolean; teams: { name: string; players: string[] }[]; secs: number; deck: string; names: string[] };
  setSetup: React.Dispatch<React.SetStateAction<{ solo: boolean; teams: { name: string; players: string[] }[]; secs: number; deck: string; names: string[] }>>;
  names: string[];
  problem: string | null;
  onStart: () => void;
}) {
  const g = game(id)!;
  const o = SETUP[id];
  const solo = setup.solo && o.solo !== false;
  const pill = (on: boolean) => cn("h-10 rounded-full border-[1.5px] px-3.5 font-semibold", on ? "border-lime bg-lime text-on-lime" : "border-on-grove/25 hover:border-on-grove/50");
  const threshold = THRESHOLD[id];
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-prose font-serif text-lead italic">{INTRO[id]}</p>

      {o.names && (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Who&rsquo;s at the table? <span className="font-normal text-on-grove-2">{names.length} names, 2 to 12</span></p>
          <Players list={names} min={2} max={12} onChange={(list) => setSetup((s) => ({ ...s, names: list }))} placeholder="Add a name" />
        </div>
      )}

      {o.deck && (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">The deck</p>
          <div role="group" aria-label="Deck" className="flex flex-wrap gap-2">
            {[["mix", "Mix ya kila kitu"], ...Object.entries(DECKS).map(([k, d]) => [k, d[0]])].map(([k, name]) => (
              <button key={k} type="button" aria-pressed={setup.deck === k} onClick={() => setSetup((s) => ({ ...s, deck: k }))} className={pill(setup.deck === k)}>{name}</button>
            ))}
          </div>
        </div>
      )}

      {!o.names && o.solo !== false && !o.noTeams && g.teams && (
        <div role="group" aria-label="How are you playing?" className="flex self-start rounded-full bg-on-grove/10 p-1">
          {[["Solo", true], ["Teams, one phone", false]].map(([label, v]) => (
            <button key={String(label)} type="button" aria-pressed={setup.solo === v} onClick={() => setSetup((s) => ({ ...s, solo: v as boolean }))} className={cn("h-10 rounded-full px-4 font-semibold", setup.solo === v ? "bg-on-grove text-grove" : "")}>{label}</button>
          ))}
        </div>
      )}

      {!o.names && !o.noTeams && !solo && (
        <div className="grid gap-3 sm:grid-cols-2">
          {setup.teams.map((t, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-2xl border-[1.5px] p-3" style={{ borderColor: TEAM_COLOURS[i] }}>
              <div className="flex items-center gap-2">
                <TeamColour team={i} />
                <input aria-label={`Team ${i + 1} name`} maxLength={14} value={t.name} onChange={(e) => setSetup((s) => ({ ...s, teams: s.teams.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))} className="min-w-0 flex-1 bg-transparent font-display text-[1.25rem] font-extrabold uppercase outline-none" />
                {setup.teams.length > 2 && (
                  <button type="button" aria-label={`Remove team ${t.name}`} onClick={() => setSetup((s) => ({ ...s, teams: s.teams.filter((_, j) => j !== i) }))} className="flex size-8 items-center justify-center rounded-full hover:bg-on-grove/10"><X aria-hidden className="size-4" /></button>
                )}
              </div>
              <Players list={t.players} min={0} max={8} onChange={(list) => setSetup((s) => ({ ...s, teams: s.teams.map((x, j) => (j === i ? { ...x, players: list } : x)) }))} placeholder={`Add a player to ${t.name || "the team"}`} />
            </div>
          ))}
          {setup.teams.length < 4 && (
            <button type="button" onClick={() => setSetup((s) => ({ ...s, teams: [...s.teams, { name: TEAM_NAMES[s.teams.length], players: [] }] }))} className="min-h-24 rounded-2xl border-[1.5px] border-dashed border-on-grove/30 font-semibold hover:border-on-grove/60">+ Add a team</button>
          )}
        </div>
      )}

      {o.secs && (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">{solo ? "Time per go" : "Time per turn"}</p>
          <div role="group" aria-label="Seconds" className="flex flex-wrap gap-2">
            {o.secs.map((s) => (
              <button key={s} type="button" aria-pressed={setup.secs === s} onClick={() => setSetup((x) => ({ ...x, secs: s }))} className={pill(setup.secs === s)}>{s}s</button>
            ))}
          </div>
        </div>
      )}

      {g.rewarded && threshold !== undefined && (
        <p className="text-on-grove-2">{solo ? `Score ${threshold} or more to win a share off the food in your next order.` : "Team games are for bragging rights. The reward is for a solo score."}</p>
      )}
      {problem && <p role="alert" className="font-semibold text-[#EE8A70]">{problem}</p>}
      <GoButton onClick={onStart}>{o.start ?? "Twende, let’s go"}</GoButton>
    </div>
  );
}

function Players({ list, min, max, onChange, placeholder }: { list: string[]; min: number; max: number; onChange: (l: string[]) => void; placeholder: string }) {
  const [v, setV] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {list.map((p, j) => (
          <span key={`${p}-${j}`} className="flex items-center gap-1 rounded-full bg-on-grove/10 py-1 pr-1 pl-3 text-[0.875rem]">
            {p}
            {list.length > min && (
              <button type="button" aria-label={`Remove ${p}`} onClick={() => onChange(list.filter((_, k) => k !== j))} className="flex size-6 items-center justify-center rounded-full hover:bg-on-grove/20"><X aria-hidden className="size-3.5" /></button>
            )}
          </span>
        ))}
      </div>
      {list.length < max && (
        <div className="flex gap-2">
          <input
            value={v}
            maxLength={16}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && v.trim()) {
                e.preventDefault();
                onChange([...list, v.trim()]);
                setV("");
              }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-10 min-w-0 flex-1 rounded-full border border-on-grove/25 bg-on-grove/5 px-3 placeholder:text-on-grove-2"
          />
          <button type="button" aria-label="Add" disabled={!v.trim()} onClick={() => { onChange([...list, v.trim()]); setV(""); }} className="size-10 rounded-full bg-on-grove/15 font-bold disabled:opacity-40">+</button>
        </div>
      )}
    </div>
  );
}

/** Pass the phone: whose turn, a 3-2-1, or tap to start now. */
function Handoff({ turn, note, onGo }: { turn: Turn; note: string; onGo: () => void }) {
  const { party } = useStage();
  const [n, setN] = useState(3);
  const go = useRef(onGo);
  useEffect(() => {
    go.current = onGo;
  });
  useEffect(() => {
    const iv = setInterval(() => {
      setN((x) => {
        if (x <= 1) {
          clearInterval(iv);
          setTimeout(() => go.current(), 0);
          return 0;
        }
        cue();
        return x - 1;
      });
    }, 800);
    return () => clearInterval(iv);
  }, []);
  const team = party.teams[turn.team];
  return (
    <div className="flex flex-col gap-4">
      <button type="button" autoFocus onClick={onGo} className="flex flex-col items-center gap-2 rounded-3xl border-[3px] bg-on-grove/5 px-6 py-10 text-center" style={{ borderColor: team.colour }}>
        <span className="text-fine font-semibold text-on-grove-2">Pass the phone, Team {team.name}</span>
        <b className="font-display text-[2.75rem] leading-none font-extrabold uppercase">{turn.player}</b>
        {note && <span className="text-on-grove-2">{note}</span>}
        <span aria-live="assertive" className="figures text-[4rem] leading-none" style={{ color: team.colour }}>{Math.max(1, n)}</span>
        <small className="text-on-grove-2">Tap to start now</small>
      </button>
      <Board current={turn.team} />
    </div>
  );
}

function SoloEnd({ id, res, onAgain }: { id: GameId; res: { score: number; of: number; unit: string; best: number | null; isBest: boolean }; onAgain: () => void }) {
  const g = game(id)!;
  const threshold = THRESHOLD[id];
  const won = g.rewarded && threshold !== undefined && res.score >= threshold;
  const [code, setCode] = useState<{ code: string; percent: number } | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const claimed = useRef(false);
  useEffect(() => {
    if (!won || claimed.current) return;
    claimed.current = true;
    cue("good");
    claimReward(id, res.score).then((r) => {
      if (r.ok) {
        setCode({ code: r.code, percent: r.percent });
        reward.set({ code: r.code, percent: r.percent, expires: r.expires });
      } else setClaimError(r.error);
    });
  }, [won, id, res.score]);
  const head = won ? SAY.win : g.rewarded && threshold !== undefined && res.score >= threshold * 0.8 ? SAY.close : "Game imeisha";
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="font-semibold text-lime">{head}</p>
      <p className="flex items-baseline gap-2"><b className="figures text-[5rem] leading-none">{res.score}</b><span className="text-on-grove-2">/ {res.of} {res.unit}</span></p>
      <p className="text-on-grove-2">{res.isBest ? "A new personal best." : res.best !== null ? `Your best: ${res.best}.` : ""}</p>
      {won && (
        <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-3xl border-[1.5px] border-lime bg-lime/10 p-5">
          {code ? (
            <>
              <span className="font-semibold">{code.percent}% off the food in your next order</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code.code);
                    setCopied(true);
                  } catch {
                    /* the code is on screen to copy by hand */
                  }
                }}
                className="figures rounded-2xl bg-grove px-5 py-2 text-[2rem] tracking-wider"
              >
                {code.code}
              </button>
              <small className="text-on-grove-2">{copied ? "Copied." : "Tap to copy."} It&rsquo;s saved on this phone and comes off the food at checkout. One order, within 14 days.</small>
            </>
          ) : claimError ? (
            <span className="text-[#EE8A70]">{claimError}</span>
          ) : (
            <span className="text-on-grove-2">Getting your code…</span>
          )}
        </div>
      )}
      {!won && g.rewarded && threshold !== undefined && <p className="text-on-grove-2">Score {threshold} or more to win a share off the food. Rudia tu!</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" autoFocus onClick={onAgain} className="h-12 rounded-full bg-lime px-6 font-bold text-on-lime">Play again</button>
        <Link href="/games" className="flex h-12 items-center rounded-full border-[1.5px] border-on-grove/30 px-5 font-semibold">Other games</Link>
        {won && <Link href="/" className="flex h-12 items-center rounded-full border-[1.5px] border-on-grove/30 px-5 font-semibold">Order food</Link>}
      </div>
    </div>
  );
}

function TeamEnd({ unit, onAgain }: { unit: string; onAgain: () => void }) {
  const { party, scores } = useStage();
  const win = winners(scores);
  useEffect(() => cue("good"), []);
  const ranked = party.teams.map((t, i) => ({ t, i, s: scores[i] })).sort((a, b) => b.s - a.s);
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="font-semibold text-lime">{win.length > 1 ? "Sare, it’s a draw!" : "Hapo sawa!"}</p>
      <p className="font-display text-[3rem] leading-none font-extrabold uppercase">{win.length > 1 ? win.map((i) => party.teams[i].name).join(" and ") : `Team ${party.teams[win[0]].name}`}</p>
      <p className="text-on-grove-2">{win.length > 1 ? "share the top spot" : "takes it"}</p>
      <ol className="flex w-full max-w-sm flex-col gap-2">
        {ranked.map((r) => (
          <li key={r.i} className="flex items-center justify-between rounded-full bg-on-grove/10 px-4 py-2">
            <span className="flex items-center gap-2"><TeamColour team={r.i} /> {r.t.name}</span>
            <b className="tabular-nums">{Math.round(r.s * 10) / 10} {unit}</b>
          </li>
        ))}
      </ol>
      <p className="text-on-grove-2">Team games are for bragging rights. The reward is for a solo score.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" autoFocus onClick={onAgain} className="h-12 rounded-full bg-lime px-6 font-bold text-on-lime">Play again</button>
        <Link href="/games" className="flex h-12 items-center rounded-full border-[1.5px] border-on-grove/30 px-5 font-semibold">Other games</Link>
      </div>
    </div>
  );
}
