import data from "@/db/seed-data/games.json";

/* The games, ported from the old site (bamboo-cask.html, PLAY and PLAYD). This file is the content
   and the rules without a screen: who plays when, how each game scores, and when a solo score
   wins the reward. Pure, so it's tested in core.test.ts; the screens are in src/app/games. */

export type GameKind = "quiz" | "party" | "skill";
export type GameId = "history" | "sheng" | "methali" | "kaunti" | "headsup" | "wyr" | "chora" | "bei" | "memory" | "guess" | "pour" | "trivia" | "spin";
export type GameMeta = {
  id: GameId;
  name: string;
  sw: string;
  line: string;
  kind: GameKind;
  minutes: number;
  players: string | null;
  rewarded: boolean;
  adult: boolean;
  teams: boolean;
};
export type Question = [question: string, options: string[], answer: number, why: string, topic?: string, level?: string];

export const GAMES = data.games as GameMeta[];
export const QUIZ = data.quiz as unknown as Record<"history" | "sheng" | "methali" | "kaunti" | "trivia", Question[]>;
export const DECKS = data.decks as unknown as Record<string, [string, string[]]>;
export const WYR = data.wyr as [string, string][];
export const CHORA = data.chora as string[];
export const DARES = data.dares as string[];
export const NAMES = data.names as string[];
export const SAY = data.say as { right: string[]; wrong: string[]; timeUp: string; win: string; close: string };
/** The score a solo game needs to win the reward. */
export const THRESHOLD = data.reward.threshold as Partial<Record<GameId, number>>;

export const KIND_NAME: Record<GameKind, string> = { quiz: "Quiz", party: "Party game", skill: "Skill game" };
export const TEAM_COLOURS = ["#E8AA45", "#CDDF7B", "#EE8A70", "#8FC3E8"];
export const TEAM_NAMES = ["Simba", "Chui", "Twiga", "Ndovu"];

/* How each game is set up: the seconds a go can take, whether it can be played solo, the deck. */
export type Setup = { secs?: number[]; def?: number; solo?: boolean; noTeams?: boolean; deck?: boolean; names?: boolean; start?: string };
export const SETUP: Record<GameId, Setup> = {
  history: { secs: [15, 20, 30, 45], def: 20 },
  sheng: { secs: [15, 20, 30, 45], def: 20 },
  methali: { secs: [15, 20, 30, 45], def: 20 },
  kaunti: { secs: [15, 20, 30, 45], def: 20 },
  trivia: { secs: [15, 20, 30, 45], def: 20 },
  guess: { secs: [8, 10, 15], def: 10 },
  pour: { secs: [10, 15, 20], def: 15 },
  bei: { secs: [15, 20, 30], def: 20 },
  memory: { secs: [10, 15, 20], def: 15 },
  headsup: { secs: [30, 45, 60, 90], def: 60, deck: true, start: "Twende, anza!" },
  wyr: { noTeams: true, start: "Anza" },
  chora: { solo: false, secs: [45, 60, 90], def: 60, start: "Twende, chora!" },
  spin: { names: true },
};

export const INTRO: Record<GameId, string> = {
  history: "The history Kenyans learnt at school, from Social Studies in primary to History and Government in Forms 1 to 4. Ten questions across the topics.",
  sheng: "Keja, mbogi, nduthi, luku. Ten questions on the language of the mtaa. Uko fiti?",
  methali: "Finish the Swahili proverb before the clock does. Ten methali, from the ones everyone knows to the ones only shosho does.",
  kaunti: "All 47 counties: the towns, the landmarks, the food. Ten questions. Unajua Kenya?",
  trivia: "Ten questions on Kenyan drinks, the bar and the bottle.",
  guess: "A bottle from the Cask Room steps out of the dark. Name it from four before the light comes up: the sooner you call it, the more it is worth, up to 10 a bottle.",
  pour: "Hold to pour, let go on the line. The millilitres are hidden while you pour: that’s the game. Overfill the glass and it spills, and the pour scores nothing.",
  bei: "A real price off the Bamboo Cask menu. Slide or type your number and lock it in before the clock does. Within 5% scores 10, within 10% scores 8, within 20% scores 5, within 35% scores 2.",
  memory: "Twelve cards, six pairs from the menu. Flip two: a match stays up. Solo, fewer moves score more, and six is perfect. In teams, a match keeps your turn.",
  headsup: "Weka simu kwa kichwa, screen facing out. The table describes or acts it out: no saying the word! Tap the right half when you get it, the left half to pass.",
  wyr: "Would you rather? Read it out, and everyone taps the side they’d choose. Then see how the table split.",
  chora: "Teams take turns. The drawer sees the word, draws it on the phone, and the team shouts guesses before time is up. No letters, no numbers.",
  spin: "Names round the table, a bottle in the middle. Spin it, and whoever it points at takes the dare. Every dare is a laugh, never a drink.",
};

/* Card photos: Pexels for the quiz and party scenes (credited), the lounge's own for the rest. */
export const PEXELS: Partial<Record<GameId, string>> = { history: "15483543", sheng: "9705753", methali: "32685497", kaunti: "37489738", headsup: "6861096", wyr: "30689324", chora: "4238483" };
export const PHOTO: Partial<Record<GameId, string>> = { history: "history", sheng: "sheng", methali: "methali", kaunti: "kaunti", headsup: "headsup", wyr: "wyr", chora: "chora", trivia: "trivia", bei: "bei" };
/** The bottle that stands on a bottle game's card. */
export const STAGE_BOTTLE: Partial<Record<GameId, [string, string]>> = { guess: ["Tanqueray London Dry", "750 ml"], pour: ["Courvoisier VS", "700 ml"], spin: ["Gilbey's Gin", "750 ml"], memory: ["Hennessy VS", "700 ml"] };

export function game(id: string) {
  return GAMES.find((g) => g.id === id) ?? null;
}

/* ── chance ── */
export function shuffle<T>(xs: readonly T[], rand = Math.random): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const pick = <T,>(xs: readonly T[], rand = Math.random) => xs[Math.floor(rand() * xs.length)];

/** Deal n from a pool, skipping what this phone has seen (the last 500 per deck) until the pool
    runs out; with `topic`, the hand takes turns across topics so ten questions aren't all one. */
export function deal<T>(pool: readonly T[], n: number, id: (x: T) => string, seen: readonly string[], topic?: (x: T) => string, rand = Math.random): { hand: T[]; seen: string[] } {
  let sh = shuffle(pool, rand);
  if (topic) {
    const by = new Map<string, T[]>();
    for (const x of sh) {
      const t = topic(x) || "";
      by.set(t, [...(by.get(t) ?? []), x]);
    }
    sh = [];
    for (let more = true; more; ) {
      more = false;
      for (const list of by.values()) {
        const x = list.shift();
        if (x !== undefined) {
          sh.push(x);
          more = true;
        }
      }
    }
  }
  const was = new Set(seen);
  let hand = sh.filter((x) => !was.has(id(x))).slice(0, n);
  let kept = [...seen];
  if (hand.length < n) {
    const inHand = new Set(hand.map(id));
    hand = hand.concat(sh.filter((x) => !inHand.has(id(x))).slice(0, n - hand.length));
    kept = [];
  }
  return { hand, seen: kept.concat(hand.map(id)).slice(-500) };
}

/* ── teams ── */
export type Team = { name: string; players: string[]; colour: string };
export type Turn = { team: number; player: string };

/** Who goes when: round the teams, each team's players in turn. Solo is one turn, "You". */
export function turnOrder(teams: Team[] | null): Turn[] {
  if (!teams) return [{ team: 0, player: "You" }];
  const max = Math.max(0, ...teams.map((t) => t.players.length));
  const out: Turn[] = [];
  for (let r = 0; r < max; r++) teams.forEach((t, ti) => out.push({ team: ti, player: t.players[r % t.players.length] }));
  return out;
}

export function winners(scores: number[]) {
  const top = Math.max(...scores);
  return scores.flatMap((s, i) => (s === top ? [i] : []));
}

/* ── scoring ── */
/** Guess the Bottle: 5 for the right bottle, up to 5 more for calling it early. */
export const guessPoints = (right: boolean, elapsed: number, secs: number) => (right ? 5 + Math.round(5 * (1 - Math.min(elapsed, secs) / secs)) : 0);
/** Points out of 10 a round, as a score out of 100. */
export const outOf100 = (points: number, rounds: number) => Math.round((points / (rounds * 10)) * 100);
/** Bei Gani: within 5% scores 10, 10% scores 8, 20% scores 5, 35% scores 2. */
export function beiPoints(guess: number, price: number) {
  const off = Math.abs(guess - price) / price;
  return off <= 0.05 ? 10 : off <= 0.1 ? 8 : off <= 0.2 ? 5 : off <= 0.35 ? 2 : 0;
}
export const BEI_MAX = 25000;
/** Perfect Pour: how close to the mark, out of 100; spilling (filling the glass) scores nothing. */
export const POUR_CAP = 200;
export const POUR_RATE = 42; // ml a second
export const MEASURES = [{ l: "One tot", ml: 25 }, { l: "A double", ml: 50 }, { l: "Three fingers", ml: 75 }, { l: "Half the glass", ml: 100 }, { l: "A long one", ml: 150 }];
export function pourAccuracy(poured: number, target: number) {
  const spilt = poured >= POUR_CAP;
  const err = Math.abs(poured - target);
  return { spilt, acc: spilt ? 0 : Math.max(0, Math.round(100 - (err / Math.max(target, 40)) * 100)) };
}
/** Kumbukumbu: six pairs, six moves is perfect, each extra move costs 6. */
export const PAIRS = 6;
export const memoryScore = (moves: number) => Math.max(0, Math.min(100, 100 - (moves - PAIRS) * 6));

/** A solo score that wins the reward. */
export function earnsReward(id: GameId, score: number) {
  const g = game(id);
  const t = THRESHOLD[id];
  return !!g?.rewarded && t !== undefined && score >= t;
}
