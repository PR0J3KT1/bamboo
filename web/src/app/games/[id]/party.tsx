"use client";
import { useEffect, useRef, useState } from "react";
import { CHORA, DARES, DECKS, WYR } from "@/lib/games/core";
import { cn } from "@/lib/utils";
import { Board, capture, cue, deal, GoButton, Head, TimeBar, useClock, useStage } from "./stage";

/* ── Kichwa Juu: phone on the forehead, the table acts it out ── */
export function HeadsUp() {
  const st = useStage();
  const { party, order, live, turnKey } = st;
  const [words] = useState(() => {
    const all = party.deck === "mix" || !DECKS[party.deck] ? Object.values(DECKS).flatMap((d) => d[1]) : DECKS[party.deck][1];
    return deal(`hu-${party.deck}`, all, Math.min(all.length, 80), (w) => w);
  });
  const [w, setW] = useState(0);
  const [i, setI] = useState(0);
  const [got, setGot] = useState(0);
  const [log, setLog] = useState<{ w: string; got: boolean }[]>([]);
  const [flash, setFlash] = useState<"got" | "pass" | "">("");
  const [over, setOver] = useState(false);
  const turn = order[i % order.length];
  const left = useClock(party.secs, live && !over, () => {
    cue("bad");
    setOver(true);
  }, `${turnKey}-${i}`);
  const word = words[w % words.length];

  function mark(g: boolean) {
    if (over || !live) return;
    setLog((l) => [...l, { w: word, got: g }]);
    setW((x) => x + 1);
    if (g) {
      setGot((x) => x + 1);
      st.addScore(turn.team, 1);
    }
    cue(g ? "good" : "bad");
    setFlash(g ? "got" : "pass");
    setTimeout(() => setFlash(""), 350);
  }
  useEffect(() => {
    if (!live || over) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") mark(true);
      if (e.key === "ArrowLeft") mark(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  function next() {
    const n = i + 1;
    if (party.solo || n >= order.length) return party.solo ? st.soloEnd(got, Math.max(got, log.length), "got it") : st.teamEnd("words");
    setI(n);
    setGot(0);
    setLog([]);
    setOver(false);
    st.handoff(n);
  }

  if (over) {
    const last = party.solo || i + 1 >= order.length;
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="font-semibold text-lime">{got >= 8 ? "Noma sana!" : got >= 4 ? "Hapo sawa!" : "Aii, next time!"}</p>
        <p className="flex items-baseline gap-2"><b className="figures text-[4.5rem] leading-none">{got}</b><span className="text-on-grove-2">{party.solo ? "got it" : `for ${turn.player}, Team ${party.teams[turn.team].name}`}</span></p>
        <Board />
        <div className="flex flex-wrap justify-center gap-1.5">
          {log.map((l, k) => (
            <span key={k} className={cn("rounded-full px-3 py-1 text-[0.875rem]", l.got ? "bg-lime/20 text-lime" : "bg-on-grove/10 text-on-grove-2")}>{l.got ? "✓" : "–"} {l.w}</span>
          ))}
        </div>
        <GoButton onClick={next}>{last ? (party.solo ? "See the score" : "See who won") : "Next turn"}</GoButton>
      </div>
    );
  }
  return (
    <>
      <TimeBar left={left} secs={party.secs} team={turn.team} />
      <div className={cn("relative grid min-h-[60dvh] grid-cols-2 overflow-hidden rounded-3xl transition-colors", flash === "got" ? "bg-lime/30" : flash === "pass" ? "bg-[#EE8A70]/25" : "bg-on-grove/5")}>
        <button type="button" onClick={() => mark(false)} className="flex items-end justify-start p-4 text-fine font-semibold text-on-grove-2">← Pass</button>
        <button type="button" autoFocus onClick={() => mark(true)} className="flex items-end justify-end p-4 text-fine font-semibold text-lime">Got it →</button>
        <p aria-live="polite" className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center font-display text-[clamp(2.5rem,9vw,4.5rem)] leading-none font-extrabold uppercase">{word}</p>
      </div>
      <p className="text-center text-fine text-on-grove-2">{got} got so far. Keys: ← pass, → got it.</p>
    </>
  );
}

/* ── Ungependa?: would you rather, for the whole table ── */
export function Wyr() {
  const st = useStage();
  const [pairs] = useState(() => deal("wyr", WYR, 12, (p) => p[0]));
  const [i, setI] = useState(0);
  const [v, setV] = useState([0, 0]);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(false);
  const tot = v[0] + v[1];
  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="font-semibold text-lime">Hiyo ndio deck</p>
        <p className="font-display text-[3rem] leading-none font-extrabold uppercase">That&rsquo;s the deck</p>
        <p className="text-on-grove-2">Twelve choices, and a table that knows itself a little better.</p>
        <GoButton onClick={st.restart}>Another deck</GoButton>
      </div>
    );
  }
  const p = pairs[i];
  return (
    <>
      <Head left={`${i + 1} of ${pairs.length}`} right={`${tot} ${tot === 1 ? "vote" : "votes"}`} />
      <p className="font-display text-[2rem] font-extrabold uppercase">Ungependa…</p>
      <div className="flex flex-col gap-2">
        {p.map((o, k) => {
          const pc = tot ? Math.round((v[k] / tot) * 100) : 0;
          return (
            <div key={k} className="contents">
              <button
                type="button"
                autoFocus={k === 0}
                disabled={shown}
                onClick={() => {
                  setV((x) => x.map((n, j) => (j === k ? n + 1 : n)));
                  cue();
                }}
                className="relative flex min-h-24 items-center justify-between gap-3 overflow-hidden rounded-3xl border-[1.5px] border-on-grove/25 px-5 text-left text-lead font-semibold"
              >
                {shown && <span aria-hidden className="absolute inset-y-0 left-0" style={{ width: `${pc}%`, background: k ? "rgb(238 138 112 / .3)" : "rgb(205 223 123 / .3)" }} />}
                <span className="relative">{o}</span>
                <b className="relative shrink-0 tabular-nums">{shown ? `${pc}%` : v[k] ? `+${v[k]}` : "Tap"}</b>
              </button>
              {k === 0 && <span aria-hidden className="self-center font-serif text-lead italic text-on-grove-2">au</span>}
            </div>
          );
        })}
      </div>
      {shown ? (
        <GoButton onClick={() => (i + 1 >= pairs.length ? setDone(true) : (setI(i + 1), setV([0, 0]), setShown(false)))}>{i + 1 >= pairs.length ? "That’s the deck" : "Next one"}</GoButton>
      ) : (
        <GoButton onClick={() => setShown(true)} disabled={!tot}>Show the split</GoButton>
      )}
    </>
  );
}

/* ── Chora!: the drawer draws, the team guesses ── */
const INKS = ["#F1ECD7", "#CDDF7B", "#EE8A70", "#8FC3E8"];
export function Chora() {
  const st = useStage();
  const { party, order, live, turnKey } = st;
  const [words] = useState(() => deal("chora", CHORA, CHORA.length, (w) => w));
  const [w, setW] = useState(0);
  const [i, setI] = useState(0);
  const [got, setGot] = useState(0);
  const [seen, setSeen] = useState(false);
  const [ink, setInk] = useState(INKS[0]);
  const [over, setOver] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const turn = order[i % order.length];
  const left = useClock(party.secs, live && !over, () => {
    cue("bad");
    setOver(true);
  }, `${turnKey}-${i}`);

  /* the pad: sized to its box at the screen's pixel density */
  useEffect(() => {
    const cv = canvas.current;
    if (!cv || over) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const wpx = cv.parentElement!.clientWidth;
    const hpx = Math.round(Math.min(wpx * 0.75, window.innerHeight * 0.5));
    cv.width = wpx * dpr;
    cv.height = hpx * dpr;
    cv.style.height = `${hpx}px`;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;
  }, [w, over, live]);
  const pen = useRef<[number, number] | null>(null);
  const at = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as [number, number];
  };
  const clear = () => {
    const cv = canvas.current;
    if (cv) cv.getContext("2d")!.clearRect(0, 0, cv.width, cv.height);
  };
  function word(g: boolean) {
    if (g) {
      setGot((x) => x + 1);
      st.addScore(turn.team, 1);
      cue("good");
    } else cue();
    setW((x) => x + 1);
    setSeen(false);
    clear();
  }
  function next() {
    const n = i + 1;
    if (n >= order.length) return st.teamEnd("drawings");
    setI(n);
    setGot(0);
    setOver(false);
    setSeen(false);
    st.handoff(n);
  }
  if (over) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="font-semibold text-lime">Time imeisha!</p>
        <p className="flex items-baseline gap-2"><b className="figures text-[4.5rem] leading-none">{got}</b><span className="text-on-grove-2">for {turn.player}, Team {party.teams[turn.team].name}</span></p>
        <Board />
        <GoButton onClick={next}>{i + 1 >= order.length ? "See who won" : "Next turn"}</GoButton>
      </div>
    );
  }
  return (
    <>
      <TimeBar left={left} secs={party.secs} team={turn.team} />
      <Board current={turn.team} />
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-on-grove/5 px-4 py-2">
        {seen ? (
          <>
            <span>Draw: <b className="font-display text-[1.5rem] uppercase">{words[w % words.length]}</b></span>
            <button type="button" onClick={() => setSeen(false)} className="h-9 rounded-full border border-on-grove/30 px-3 text-fine font-semibold">Hide</button>
          </>
        ) : (
          <button type="button" autoFocus onClick={() => setSeen(true)} className="h-10 w-full font-semibold">Drawer: tap to see your word</button>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border-[1.5px] border-on-grove/25 bg-[#0f1d14]">
        <canvas
          ref={canvas}
          aria-label="Drawing pad"
          className="block w-full touch-none"
          onPointerDown={(e) => {
            capture(e);
            const p = at(e);
            pen.current = p;
            const ctx = e.currentTarget.getContext("2d")!;
            ctx.strokeStyle = ink;
            ctx.beginPath();
            ctx.moveTo(p[0], p[1]);
            ctx.lineTo(p[0] + 0.1, p[1]);
            ctx.stroke();
          }}
          onPointerMove={(e) => {
            if (!pen.current) return;
            const p = at(e);
            const ctx = e.currentTarget.getContext("2d")!;
            ctx.strokeStyle = ink;
            ctx.beginPath();
            ctx.moveTo(pen.current[0], pen.current[1]);
            ctx.lineTo(p[0], p[1]);
            ctx.stroke();
            pen.current = p;
          }}
          onPointerUp={() => (pen.current = null)}
          onPointerCancel={() => (pen.current = null)}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Colour" className="flex items-center gap-2">
          {INKS.map((c) => (
            <button key={c} type="button" aria-label="Colour" aria-pressed={ink === c} onClick={() => setInk(c)} className={cn("size-9 rounded-full border-2", ink === c ? "border-lime" : "border-transparent")} style={{ background: c }} />
          ))}
          <button type="button" onClick={clear} className="h-9 rounded-full border border-on-grove/30 px-3 text-fine font-semibold">Clear</button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => word(false)} className="h-12 rounded-full border-[1.5px] border-on-grove/30 px-4 font-semibold">Skip</button>
          <button type="button" onClick={() => word(true)} className="h-12 rounded-full bg-lime px-5 font-bold text-on-lime">They got it</button>
        </div>
      </div>
    </>
  );
}

/* ── Spin the Bottle: a dare for whoever it points at, never a drink ── */
export function Spin() {
  const { party } = useStage();
  const names = party.names;
  const [rot, setRot] = useState(0);
  const [at, setAt] = useState<number | null>(null);
  const [dare, setDare] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const btl = useRef<SVGSVGElement>(null);
  function spin() {
    if (spinning) return;
    const n = names.length;
    const k = Math.floor(Math.random() * n);
    const target = (k / n) * 360;
    const cur = ((rot % 360) + 360) % 360;
    const to = rot + (4 + Math.floor(Math.random() * 3)) * 360 + ((target - cur + 360) % 360);
    setSpinning(true);
    setAt(null);
    setDare(null);
    cue("go");
    const fin = () => {
      setSpinning(false);
      setRot(to);
      setAt(k);
      setDare(deal("dares", DARES, 1, (d) => d)[0]);
      cue("good");
    };
    const el = btl.current;
    if (el?.animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const a = el.animate([{ transform: `rotate(${rot}deg)` }, { transform: `rotate(${to}deg)` }], { duration: 2600, easing: "cubic-bezier(.12,.6,.14,1)", fill: "forwards" });
      a.onfinish = fin;
    } else fin();
  }
  return (
    <>
      <div className="relative mx-auto aspect-square w-full max-w-[420px]">
        {names.map((nm, k) => {
          const a = (k / names.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <span key={k} className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[0.875rem] font-semibold whitespace-nowrap", at === k ? "bg-lime text-on-lime" : "bg-on-grove/10")} style={{ left: `${50 + Math.cos(a) * 41}%`, top: `${50 + Math.sin(a) * 41}%` }}>
              {nm}
            </span>
          );
        })}
        <svg ref={btl} viewBox="0 0 60 200" aria-hidden className="absolute top-1/2 left-1/2 h-[46%] -translate-x-1/2 -translate-y-1/2" style={{ transform: `translate(-50%, -50%) rotate(${rot}deg)` }}>
          <path d="M24 8h12v26l8 14v130a10 10 0 0 1-10 10H26a10 10 0 0 1-10-10V48l8-14z" fill="#1d2a20" stroke="#CDDF7B" strokeWidth="2" />
          <rect x="18" y="96" width="24" height="44" rx="3" fill="#E8AA45" />
          <rect x="23" y="4" width="14" height="10" rx="2" fill="#CDDF7B" />
        </svg>
      </div>
      <div role="status" className={cn("rounded-2xl border-l-4 p-4", dare ? "border-lime bg-lime/10" : "border-on-grove/20 bg-on-grove/5")}>
        {spinning ? <><b>Inazunguka…</b><p className="text-on-grove-2">Round and round it goes.</p></> : dare && at !== null ? <><b>{names[at]}, your dare:</b><p className="text-on-grove-2">{dare}</p></> : <><b>Ready?</b><p className="text-on-grove-2">Put the phone in the middle of the table.</p></>}
      </div>
      <GoButton onClick={spin} disabled={spinning}>{dare ? "Spin again" : "Spin the bottle"}</GoButton>
    </>
  );
}
