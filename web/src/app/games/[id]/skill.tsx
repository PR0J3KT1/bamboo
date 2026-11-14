"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogItem } from "@/db/queries/menu";
import { useCatalog } from "@/components/order/catalog";
import { Pic } from "@/components/ui/picture";
import { BEI_MAX, beiPoints, guessPoints, MEASURES, memoryScore, outOf100, PAIRS, POUR_CAP, POUR_RATE, pourAccuracy, SAY, shuffle } from "@/lib/games/core";
import { cn } from "@/lib/utils";
import { Board, capture, cue, deal, GoButton, Head, pickLine, Said, TimeBar, useClock, useStage } from "./stage";

const LETTER = ["A", "B", "C", "D"];
const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const label = (it: CatalogItem) => it.name + (it.size && !it.name.includes(it.size) && (it.alcohol || it.categoryId === "soft") ? `, ${it.size}` : "");

/** Bottles with a photo, one of each name: the pool for the bottle games. */
function useBottles() {
  const { catalog } = useCatalog();
  return useMemo(() => {
    const seen = new Set<string>();
    return catalog.items.filter((i) => {
      if (!i.alcohol || i.picture?.kind !== "bottle" || seen.has(i.name)) return false;
      seen.add(i.name);
      return true;
    });
  }, [catalog]);
}

/** An item's picture on a stage: a bottle in the dark, a dish on its plate. */
function ItemPic({ it, className, style }: { it: CatalogItem; className?: string; style?: React.CSSProperties }) {
  if (!it.picture) return <div className={cn("flex items-center justify-center rounded-2xl bg-on-grove/5 p-4 text-center font-display text-[1.5rem] uppercase", className)}>{it.name}</div>;
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", it.picture.kind === "bottle" && "bottle-stage", className)} style={style}>
      <Pic picture={it.picture} alt="" sizes="(min-width: 760px) 360px, 80vw" />
    </div>
  );
}

const nextLabel = (last: boolean, solo: boolean, what: string) => (last ? (solo ? "See your score" : "See who won") : solo ? `Next ${what}` : "Pass the phone");

/* ── Guess the Bottle ── */
export function Guess() {
  const st = useStage();
  const { party, order, live, turnKey } = st;
  const bottles = useBottles();
  const [rounds] = useState(() => {
    const n = party.solo ? 8 : Math.min(bottles.length, order.length * 2);
    return deal("guess", bottles, n, (b) => b.name).map((b) => {
      const same = bottles.filter((x) => x.id !== b.id && x.shelfId === b.shelfId);
      const other = bottles.filter((x) => x.id !== b.id && x.shelfId !== b.shelfId);
      let wrong = shuffle(same).slice(0, 3);
      if (wrong.length < 3) wrong = wrong.concat(shuffle(other).slice(0, 3 - wrong.length));
      return { b, opts: shuffle([b, ...wrong]) };
    });
  });
  const [i, setI] = useState(0);
  const [pts, setPts] = useState(0);
  const [chosen, setChosen] = useState<string | null | undefined>(undefined); // undefined: still guessing; null: time ran out
  const [line, setLine] = useState("");
  const guessing = chosen === undefined;
  const turn = order[i % order.length];
  const r = rounds[i];
  const left = useClock(party.secs, live && guessing, () => answer(null), `${turnKey}-${i}`);
  const k = Math.max(0, left / party.secs); // 1 at the start: dark and blurred

  function answer(id: string | null) {
    if (!guessing) return;
    const ok = id === r.b.id;
    const p = guessPoints(ok, party.secs - left, party.secs);
    setChosen(id);
    setLine(id === null ? SAY.timeUp : ok ? `${pickLine(SAY.right)} +${p}` : pickLine(SAY.wrong));
    setPts((x) => x + p);
    st.addScore(turn.team, p);
    cue(ok ? "good" : "bad");
  }
  function next() {
    const n = i + 1;
    if (n >= rounds.length) return party.solo ? st.soloEnd(outOf100(pts, rounds.length), 100, "points") : st.teamEnd("points");
    setI(n);
    setChosen(undefined);
    if (!party.solo) st.handoff(n);
  }
  if (!r) return <p>The bottle photos are still loading. Try again in a moment.</p>;
  return (
    <>
      <Head left={`Bottle ${i + 1} of ${rounds.length}`} right={party.solo ? `${pts} pts` : `${turn.player}, Team ${party.teams[turn.team].name}`} />
      <TimeBar left={guessing ? left : 0} secs={party.secs} team={turn.team} />
      <Board current={turn.team} />
      <ItemPic it={r.b} className="mx-auto aspect-[4/5] w-full max-w-[280px] transition-[filter] duration-100" style={{ filter: guessing ? `blur(${(k * 20).toFixed(1)}px) brightness(${(0.25 + 0.75 * (1 - k)).toFixed(2)})` : "none" }} />
      <div role="group" aria-label="Which bottle?" className="grid gap-2 sm:grid-cols-2">
        {r.opts.map((o, j) => {
          const s = guessing ? "" : o.id === r.b.id ? "right" : o.id === chosen ? "wrong" : "dim";
          return (
            <button key={o.id} type="button" disabled={!guessing} autoFocus={guessing && j === 0} onClick={() => answer(o.id)} className={cn("flex min-h-14 items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 text-left font-semibold", s === "" && "border-on-grove/25 hover:border-lime", s === "right" && "border-lime bg-lime text-on-lime", s === "wrong" && "border-[#EE8A70] bg-[#EE8A70]/20", s === "dim" && "border-on-grove/10 opacity-50")}>
              <i className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/15 text-fine not-italic">{LETTER[j]}</i>
              {o.name}
            </button>
          );
        })}
      </div>
      {!guessing && (
        <>
          <Said good={chosen === r.b.id} line={line}>
            <p>{label(r.b)}. On the shelf at {kes(r.b.price)}.</p>
          </Said>
          <GoButton onClick={next}>{nextLabel(i + 1 >= rounds.length, party.solo, "bottle")}</GoButton>
        </>
      )}
    </>
  );
}

/* ── Perfect Pour ── */
const LIQUID: Record<string, string> = { whisky: "#B5651D", rum: "#7A3E12", brandy: "#8E3B13", tequila: "#E0B44C", vodka: "#DCE8EE", gin: "#E3EEF0", liqueur: "#6B2A1A" };
const GL = { top: 160, bot: 376, xT: 136, wT: 128, xB: 146, wB: 108 };
const MOUTH = { x: 196, y: 118 };
const yFor = (ml: number) => GL.bot - (ml / POUR_CAP) * (GL.bot - GL.top);
const xAt = (y: number) => {
  const k = (GL.bot - y) / (GL.bot - GL.top);
  return { l: GL.xB + (GL.xT - GL.xB) * k, w: GL.wB + (GL.wT - GL.wB) * k };
};

function Glass({ target, ml, pouring, poured, liquid }: { target: number; ml: number; pouring: boolean; poured: boolean; liquid: string }) {
  const lvl = Math.min(ml, POUR_CAP);
  const y = yFor(lvl);
  const a = xAt(y);
  const ty = yFor(target);
  const b = xAt(ty);
  return (
    <svg viewBox="0 0 400 420" role="img" aria-label={poured ? `${Math.round(ml)} ml in the glass` : "A glass, filling"} className="mx-auto w-full max-w-[360px] touch-none select-none">
      <defs>
        <linearGradient id="pg" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset=".5" stopColor="#fff" stopOpacity=".04" /><stop offset="1" stopColor="#fff" stopOpacity=".12" /></linearGradient>
      </defs>
      <ellipse cx="200" cy="392" rx="120" ry="12" fill="#000" opacity=".35" />
      <g transform={`translate(${MOUTH.x} ${MOUTH.y}) rotate(${pouring ? 118 : 96})`}>
        <rect x="-9" y="-30" width="18" height="30" rx="3" fill="#1d2a20" stroke="#CDDF7B" strokeOpacity=".5" />
        <path d="M-9 -30 L-26 -62 L-26 -170 Q-26 -180 -16 -180 L16 -180 Q26 -180 26 -170 L26 -62 L9 -30 Z" fill="#1d2a20" stroke="#CDDF7B" strokeOpacity=".5" />
        <path d="M-22 -70 L-22 -165 L22 -165 L22 -70 Z" fill={liquid} opacity=".85" />
        <rect x="-24" y="-140" width="48" height="40" rx="3" fill="#F1ECD7" opacity=".9" />
      </g>
      {pouring && <rect x={MOUTH.x - 2.5} y={MOUTH.y + 6} width="5" height={Math.max(0, y - MOUTH.y - 6)} rx="2.5" fill={liquid} />}
      {lvl > 0 && <path d={`M${a.l.toFixed(1)} ${y.toFixed(1)} L${(a.l + a.w).toFixed(1)} ${y.toFixed(1)} L${GL.xB + GL.wB} ${GL.bot} L${GL.xB} ${GL.bot} Z`} fill={liquid} opacity=".92" />}
      <path d={`M${GL.xT} ${GL.top} L${GL.xB} ${GL.bot} L${GL.xB + GL.wB} ${GL.bot} L${GL.xT + GL.wT} ${GL.top}`} fill="url(#pg)" stroke="#F1ECD7" strokeOpacity=".7" strokeWidth="3" strokeLinejoin="round" />
      <line x1={(b.l - 14).toFixed(1)} y1={ty.toFixed(1)} x2={(b.l + b.w + 14).toFixed(1)} y2={ty.toFixed(1)} stroke="#CDDF7B" strokeWidth="2.5" strokeDasharray="7 6" />
      <text x={(b.l + b.w + 20).toFixed(1)} y={(ty + 5).toFixed(1)} fill="#CDDF7B" fontSize="15" fontWeight="700">{target} ml</text>
      {poured && <text x={(a.l - 18).toFixed(1)} y={(y + 5).toFixed(1)} textAnchor="end" fill="#F1ECD7" fontSize="15" fontWeight="700">{Math.round(ml)} ml</text>}
    </svg>
  );
}

export function Pour() {
  const st = useStage();
  const { party, order, live, turnKey } = st;
  const { catalog } = useCatalog();
  const [rounds] = useState(() => {
    const spirits = catalog.items.filter((i) => i.alcohol && /whisky|rum|brandy|tequila|vodka|gin|liqueur/.test(i.shelfId ?? ""));
    const n = party.solo ? MEASURES.length : order.length * 2;
    const ms = shuffle(MEASURES);
    const bt = shuffle(spirits);
    return Array.from({ length: n }, (_, k) => ({ m: ms[k % ms.length], it: bt[k % Math.max(1, bt.length)] }));
  });
  const [i, setI] = useState(0);
  const [ml, setMl] = useState(0);
  const [pouring, setPouring] = useState(false);
  const [res, setRes] = useState<{ poured: number; acc: number; spilt: boolean; late?: boolean } | null>(null);
  const [accs, setAccs] = useState<number[]>([]);
  const sums = useRef<{ sum: number[]; cnt: number[] }>({ sum: party.teams.map(() => 0), cnt: party.teams.map(() => 0) });
  const raf = useRef(0);
  const mlRef = useRef(0);
  const turn = order[i % order.length];
  const r = rounds[i];

  function record(acc: number, result: { poured: number; acc: number; spilt: boolean; late?: boolean }) {
    setRes(result);
    setAccs((a) => [...a, acc]);
    const s = sums.current;
    s.sum[turn.team] += acc;
    s.cnt[turn.team]++;
    st.setScores(s.sum.map((x, k) => (s.cnt[k] ? Math.round(x / s.cnt[k]) : 0)));
    cue(acc >= 85 ? "good" : "bad");
  }
  function settle() {
    cancelAnimationFrame(raf.current);
    setPouring(false);
    const a = pourAccuracy(mlRef.current, r.m.ml);
    record(a.acc, { poured: mlRef.current, acc: a.acc, spilt: a.spilt });
  }
  function down() {
    if (res || pouring || !live) return;
    setPouring(true);
    let last = performance.now();
    const step = (now: number) => {
      mlRef.current += (POUR_RATE * (now - last)) / 1000;
      last = now;
      if (mlRef.current >= POUR_CAP) {
        mlRef.current = POUR_CAP;
        setMl(POUR_CAP);
        settle();
        return;
      }
      setMl(mlRef.current);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }
  function up() {
    if (pouring && !res) settle();
  }
  const left = useClock(party.secs, live && !res, () => (pouring ? settle() : record(0, { poured: mlRef.current, acc: 0, spilt: false, late: true })), `${turnKey}-${i}`);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  /* the space bar pours too */
  useEffect(() => {
    if (!live || res) return;
    const d = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        down();
      }
    };
    const u = (e: KeyboardEvent) => {
      if (e.code === "Space") up();
    };
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => {
      window.removeEventListener("keydown", d);
      window.removeEventListener("keyup", u);
    };
  });

  function next() {
    const n = i + 1;
    if (n >= rounds.length) {
      const all = [...accs];
      return party.solo ? st.soloEnd(Math.round(all.reduce((s, x) => s + x, 0) / Math.max(1, all.length)), 100, "% accurate") : st.teamEnd("% average");
    }
    setI(n);
    setMl(0);
    mlRef.current = 0;
    setRes(null);
    if (!party.solo) st.handoff(n);
  }
  if (!r?.it) return <p>No spirits on the menu to pour just now.</p>;
  const liquid = LIQUID[r.it.shelfId ?? ""] ?? "#B5651D";
  const avg = accs.length ? Math.round(accs.reduce((s, x) => s + x, 0) / accs.length) : null;
  return (
    <>
      <Head left={`Pour ${i + 1} of ${rounds.length}`} right={party.solo ? (avg === null ? "First pour" : `${avg}% average`) : `${turn.player}, Team ${party.teams[turn.team].name}`} />
      <TimeBar left={res ? 0 : left} secs={party.secs} team={turn.team} />
      <Board current={turn.team} />
      <p className="text-center text-lead"><b>{r.m.l}</b> of {r.it.name}<small className="block text-fine text-on-grove-2">Target {r.m.ml} ml. The dashed line is your mark.</small></p>
      <div onPointerDown={(e) => { capture(e); down(); }} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}>
        <Glass target={r.m.ml} ml={ml} pouring={pouring} poured={!!res} liquid={liquid} />
      </div>
      {res ? (
        <>
          <Said good={res.acc >= 85} line={res.late ? SAY.timeUp : res.spilt ? "Imemwagika: spilt!" : res.acc >= 85 ? pickLine(SAY.right) : res.acc >= 60 ? SAY.close : pickLine(SAY.wrong)}>
            <p>{Math.round(res.poured)} ml poured, target {r.m.ml} ml: <b>{res.acc}%</b></p>
          </Said>
          <GoButton onClick={next}>{nextLabel(i + 1 >= rounds.length, party.solo, "pour")}</GoButton>
        </>
      ) : (
        <>
          <button
            type="button"
            autoFocus
            onPointerDown={(e) => { e.preventDefault(); capture(e); down(); }}
            onPointerUp={up}
            onPointerCancel={up}
            onLostPointerCapture={up}
            className={cn("h-16 w-full touch-none rounded-full text-[1.125rem] font-bold select-none", pouring ? "bg-[#E8AA45] text-grove" : "bg-lime text-on-lime")}
          >
            {pouring ? "Pouring… let go on the line" : "Hold to pour"}
          </button>
          <p className="text-center text-fine text-on-grove-2">Press and hold, or hold the space bar.</p>
        </>
      )}
    </>
  );
}

/* ── Bei Gani? ── */
export function Bei() {
  const st = useStage();
  const { party, order, live, turnKey } = st;
  const { catalog } = useCatalog();
  const [rounds] = useState(() => {
    const food = catalog.items.filter((i) => !i.alcohol && i.categoryId !== "soft" && i.price >= 100 && i.price <= BEI_MAX);
    const seen = new Set<string>();
    const drink = catalog.items.filter((i) => {
      const k = i.name + i.size;
      if (!i.alcohol || !i.picture || i.price < 300 || i.price > BEI_MAX || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const n = party.solo ? 6 : order.length * 2;
    const f = deal("bei-f", food, n, (x) => x.id);
    const d = drink.length ? deal("bei-d", drink, n, (x) => x.id) : [];
    let fi = 0;
    let di = 0;
    return Array.from({ length: n }, (_, k) => (d.length && k % 2 === 1 ? d[di++ % d.length] : f[fi++ % f.length]));
  });
  const [i, setI] = useState(0);
  const [pts, setPts] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const [got, setGot] = useState<number | null>(null); // null: still guessing
  const turn = order[i % order.length];
  const it = rounds[i];
  const guessing = got === null;
  const set = (v: number | null) => setGuess(v === null || Number.isNaN(v) ? null : Math.max(50, Math.min(BEI_MAX, v)));

  function lock() {
    if (!guessing) return;
    const p = guess === null ? 0 : beiPoints(guess, it.price);
    setGot(p);
    setPts((x) => x + p);
    st.addScore(turn.team, p);
    cue(p >= 5 ? "good" : "bad");
  }
  const left = useClock(party.secs, live && guessing, lock, `${turnKey}-${i}`);
  function next() {
    const n = i + 1;
    if (n >= rounds.length) return party.solo ? st.soloEnd(outOf100(pts, rounds.length), 100, "points") : st.teamEnd("points");
    setI(n);
    setGuess(null);
    setGot(null);
    if (!party.solo) st.handoff(n);
  }
  if (!it) return null;
  return (
    <>
      <Head left={`${it.alcohol ? "Bottle" : "Dish"} ${i + 1} of ${rounds.length}`} right={party.solo ? `${pts} pts` : `${turn.player}, Team ${party.teams[turn.team].name}`} />
      <TimeBar left={guessing ? left : 0} secs={party.secs} team={turn.team} />
      <Board current={turn.team} />
      <ItemPic it={it} className={cn("mx-auto w-full", it.picture?.kind === "bottle" ? "aspect-[4/5] max-w-[240px]" : "aspect-[4/3] max-w-[420px]")} />
      <p className="text-center font-display text-[1.75rem] leading-none font-extrabold uppercase">{label(it)}</p>
      {guessing ? (
        <div className="flex flex-col gap-3">
          <label className="mx-auto flex h-14 items-center gap-2 rounded-full border-[1.5px] border-on-grove/30 bg-on-grove/5 px-5">
            <span className="text-fine font-bold text-on-grove-2">KES</span>
            <input
              type="number"
              inputMode="numeric"
              autoFocus
              min={50}
              max={BEI_MAX}
              step={50}
              placeholder="Your guess"
              value={guess ?? ""}
              onChange={(e) => set(e.target.value ? Number(e.target.value) : null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && guess !== null) {
                  e.preventDefault();
                  lock();
                }
              }}
              className="figures w-40 bg-transparent text-[1.75rem] outline-none"
            />
          </label>
          <input type="range" aria-label="Your guess in shillings" min={50} max={BEI_MAX} step={50} value={guess ?? 50} onChange={(e) => set(Number(e.target.value))} className="accent-[#CDDF7B]" />
          <div className="flex flex-wrap justify-center gap-2">
            {[-500, -50, 50, 500].map((d) => (
              <button key={d} type="button" onClick={() => set((guess ?? 2000) + d)} className="h-10 rounded-full border-[1.5px] border-on-grove/25 px-3.5 font-semibold">{d > 0 ? "+" : "−"}{Math.abs(d)}</button>
            ))}
          </div>
          <GoButton onClick={lock} disabled={guess === null}>Lock it in</GoButton>
        </div>
      ) : (
        <>
          <Said good={got >= 5} line={`${guess === null ? SAY.timeUp : got >= 8 ? pickLine(SAY.right) : got >= 2 ? SAY.close : pickLine(SAY.wrong)}${got ? ` +${got}` : ""}`}>
            <p>It&rsquo;s <b>{kes(it.price)}</b> on the menu.{guess !== null ? ` You said ${kes(guess)}, ${Math.round((Math.abs(guess - it.price) / it.price) * 100)}% off.` : ""}</p>
          </Said>
          <GoButton onClick={next}>{nextLabel(i + 1 >= rounds.length, party.solo, "one")}</GoButton>
        </>
      )}
    </>
  );
}

/* ── Kumbukumbu ── */
export function Memory() {
  const st = useStage();
  const { party, order, live, turnKey } = st;
  const { catalog, byId } = useCatalog();
  const bottles = useBottles();
  const adult = catalog.items.some((i) => i.alcohol);
  const [cards, setCards] = useState(() => {
    const lead = (f: string) => catalog.families.find((x) => x.id === f)?.leadItemId ?? f;
    const dishes = ["bf", "wf", "d1", lead("kc"), lead("hgp"), lead("mvz"), lead("pk"), "s1", lead("mbc"), lead("bfc"), "cf", lead("kb")].filter((id) => byId.get(id)?.picture);
    const ids = adult && bottles.length >= 4 ? [...deal("mem-d", bottles, 4, (b) => b.name).map((b) => b.id), ...shuffle(dishes).slice(0, 2)] : shuffle(dishes).slice(0, PAIRS);
    return shuffle([...ids, ...ids]).map((id, k) => ({ id, k, up: false, done: false }));
  });
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [t, setT] = useState(0); // whose turn, in teams
  const turn = order[t % order.length];
  const pairsLeft = cards.filter((c) => !c.done).length / 2;

  function pass() {
    setCards((cs) => cs.map((c) => (c.done ? c : { ...c, up: false })));
    setOpen([]);
    setLock(false);
    const n = t + 1;
    setT(n);
    st.handoff(n);
  }
  const left = useClock(party.secs, live && !party.solo && !lock, pass, `${turnKey}-${t}`);

  function flip(k: number) {
    const c = cards[k];
    if (lock || c.up || c.done || !live) return;
    const up = cards.map((x, j) => (j === k ? { ...x, up: true } : x));
    setCards(up);
    cue();
    const o = [...open, k];
    if (o.length < 2) return setOpen(o);
    setMoves((m) => m + 1);
    const [a, b] = o.map((j) => up[j]);
    if (a.id === b.id) {
      const done = up.map((x, j) => (o.includes(j) ? { ...x, done: true } : x));
      setCards(done);
      setOpen([]);
      st.addScore(turn.team, 1);
      cue("good");
      if (done.every((x) => x.done)) {
        setLock(true);
        const m = moves + 1;
        setTimeout(() => (party.solo ? st.soloEnd(memoryScore(m), 100, `points, ${m} moves`) : st.teamEnd("pairs")), 700);
      }
    } else {
      setOpen(o);
      setLock(true);
      setTimeout(() => {
        if (party.solo) {
          setCards((cs) => cs.map((x, j) => (o.includes(j) ? { ...x, up: false } : x)));
          setOpen([]);
          setLock(false);
        } else pass();
      }, 900);
    }
  }
  return (
    <>
      <Head left={party.solo ? `${moves} ${moves === 1 ? "move" : "moves"}` : `${turn.player}, Team ${party.teams[turn.team].name}`} right={`${pairsLeft} pairs to find`} />
      {!party.solo && <TimeBar left={left} secs={party.secs} team={turn.team} />}
      <Board current={turn.team} />
      <div role="group" aria-label="Cards" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {cards.map((c, k) => {
          const it = byId.get(c.id)!;
          const up = c.up || c.done;
          return (
            <button key={k} type="button" disabled={c.done} onClick={() => flip(k)} aria-label={up ? it.name : `Card ${k + 1}, face down`} className={cn("relative aspect-[3/4] overflow-hidden rounded-2xl border-[1.5px] transition-transform sm:aspect-square motion-reduce:transition-none", up ? "border-lime bg-on-grove/10" : "border-on-grove/20 bg-[repeating-linear-gradient(45deg,#1d3526_0_10px,#14291c_10px_20px)] hover:-translate-y-0.5", c.done && "opacity-70")}>
              {up && (
                <>
                  {it.picture && <span className={cn("absolute inset-0", it.picture.kind === "bottle" && "bottle-stage")}><Pic picture={it.picture} alt="" sizes="140px" /></span>}
                  <small className="absolute inset-x-1 bottom-1 truncate rounded-full bg-grove/80 px-2 py-0.5 text-[0.6875rem]">{(catalog.families.find((f) => f.id === it.familyId)?.name ?? it.name).replace(/, (1 kg|whole|half|½ kg)$/, "")}</small>
                </>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
