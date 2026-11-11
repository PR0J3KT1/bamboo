"""Build the games' data for the Bamboo Cask page from the game banks of the earlier games site.

usage: python -I play_data.py <games dump dir with games.json> src/play-data.json

The question banks, word decks, dares and would-you-rathers come over as they are. The game list is
rewritten for Bamboo Cask: its own reward code (a placeholder until the lounge approves one), the
reward is off the food only, and the games about drinks are marked adult so the age gate hides them.
"""
import json, sys, os

SRC, OUT = sys.argv[1], sys.argv[2]
g = json.load(open(os.path.join(SRC, "games.json"), encoding="utf-8"))

# id, kind, minutes, players, rewarded, adult, art, name, sw, line
GAMES = [
    ("history", "quiz", 6, None, True, False, "scroll", None, None, None),
    ("sheng", "quiz", 5, None, True, False, "bubble", None, None, None),
    ("methali", "quiz", 5, None, True, False, "quote", None, None, None),
    ("kaunti", "quiz", 5, None, True, False, "pin", None, None, None),
    ("headsup", "party", 10, "3+ players", False, False, "phone", None, None, None),
    ("wyr", "party", 15, "Any crowd", False, False, "split", None, None,
     "Githeri for a month or no chapo ever? Would-you-rather for the whole table."),
    ("chora", "party", 15, "2 teams", False, False, "pencil", None, None, None),
    ("bei", "skill", 5, None, True, False, "tag", None, None,
     "A real price off the Bamboo Cask menu. Slide to your number; the closer you land, the more it scores."),
    ("memory", "skill", 5, None, True, False, "cards", None, None,
     "Flip two, find the pair. Real dishes and bottles from the menu, and a sharp memory."),
    ("guess", "skill", 4, None, True, True, "bottle", None, None,
     "A bottle from the Cask Room steps out of the dark. Name it before the light comes up."),
    ("pour", "skill", 3, None, True, True, "glass", None, None, None),
    ("trivia", "quiz", 5, None, True, True, "ask", None, None, None),
    ("spin", "party", 15, "The whole table", False, True, "spin", None, None,
     "Names round the table, a bottle in the middle, and a dare for whoever it picks."),
]
lh = {x["id"]: x for x in g["GAMES"]}
games = []
for gid, kind, mins, players, rewarded, adult, art, name, sw, line in GAMES:
    s = lh[gid]
    assert s["kind"] == kind, gid
    games.append({"id": gid, "name": name or s["name"], "sw": sw or s["sw"], "line": line or s["line"],
                  "kind": kind, "minutes": mins, "players": players, "rewarded": rewarded,
                  "adult": adult, "art": art, "teams": s.get("teams", True)})

reward = {"code": "BAMBOO5", "percent": 5, "threshold": g["REWARD"]["threshold"]}

def qs(xs):
    return [[q["q"], q["options"], q["answer"], q.get("fact", ""), q.get("topic") or "", q.get("level") or ""] for q in xs]

data = {
    "games": games, "reward": reward, "say": g["SAY"],
    "quiz": {"history": qs(g["HISTORY"]), "sheng": qs(g["SHENG"]), "methali": qs(g["METHALI"]),
             "kaunti": qs(g["KAUNTI"]), "trivia": qs(g["TRIVIA"])},
    "dares": g["DARES"], "names": g["SPIN_NAMES"],
    "decks": {k: [v["name"], v["words"]] for k, v in g["HEADSUP"].items()},
    "wyr": g["WYR"], "chora": g["CHORA"],
}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(OUT, os.path.getsize(OUT), "bytes;", len(games), "games;",
      {k: len(v) for k, v in data["quiz"].items()}, "decks", {k: len(v[1]) for k, v in data["decks"].items()})
