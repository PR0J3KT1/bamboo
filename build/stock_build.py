"""Build the Cask Room drinks from Bamboo Cask's own stock list, at its selling prices.

usage: python -I stock_build.py data/stock-sell.json data/drinks.json photo_fixes.json data/stock-drinks.json stock_fixes.json

stock-sell.json holds only the names and SELLING prices from the lounge's stock sheet (no buying prices).
stock_rows.py turns each sheet name into a drink (name, shelf, type, size) and names the catalogue bottle
whose photo it may reuse. The catalogue (data/drinks.json, from the earlier crawl) is used for photos,
strength and tasting notes only; every price comes from the stock list.
Writes the drinks list for bs_sprites.py / bs_embed.py, and a fixes file whose alias table points each
new drink at the photo its catalogue bottle already used.
"""
import sys, os, re, json, unicodedata, collections
here = os.path.dirname(os.path.abspath(__file__))
ns = {}
exec(open(os.path.join(here, "stock_rows.py"), encoding="utf-8").read(), ns)
ROWS = ns["ROWS"]
STOCK, CAT, FIX, OUT, OUTFIX = sys.argv[1:6]
stock = json.load(open(STOCK, encoding="utf-8"))
cat = json.load(open(CAT, encoding="utf-8"))
fixes = json.load(open(FIX, encoding="utf-8"))
commons, drop = fixes.get("commons", {}), set(fixes.get("drop", []))
HOUSE_PRICE = {"k1": 2000, "k2": 3000, "k3": 2500, "k4": 3500, "k5": 4000, "k6": 8000}

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def is_can(c):
    return c["size"] == "Can" or bool(re.search(r"\bcan\b|\dcan\b", c["name"], re.I))

def photo_key(c):
    """The alias target that makes bs_sprites.py use the same picture this catalogue bottle used."""
    if not c.get("sp"):
        return None
    if c["slug"] in commons:
        return c["slug"]
    return c.get("photo_from") or c["slug"]

FULL = {"750ml": 0, "700ml": 1, "1L": 2, "500ml": 3}
def pick(rx, size):
    # a leading "~" means the drink only comes in a can, so the catalogue needn't say "can"
    any_pack = rx.startswith("~")
    rx = rx.lstrip("~")
    cands = [c for c in cat if not c.get("house") and re.search(rx, c["name"], re.I)]
    want_can = size == "Can"
    if not any_pack:
        cands = [c for c in cands if is_can(c) == want_can]
    if not cands:
        return None
    cands.sort(key=lambda c: (0 if c.get("sp") else 1, 0 if c["size"] == size else 1, FULL.get(c["size"], 9)))
    return cands[0]

sys.stdout.reconfigure(encoding="utf-8")
out, alias, seen = [], {}, {}
left_off, food, report = collections.defaultdict(list), [], []
for r in stock["bar"]:
    raw, price = r["name"], r["sell"]
    row = ROWS.get(raw)
    if row is None:
        sys.exit("no row for %r" % raw)
    if row[0] == "X":
        left_off[row[1]].append((raw, price)); continue
    if row[0] == "FOOD":
        food.append((row[1], raw, price)); continue
    if row[0] == "HOUSE":
        if HOUSE_PRICE[row[1]] != price:
            report.append("HOUSE %s price %s on the sheet, %s on the page" % (row[1], price, HOUSE_PRICE[row[1]]))
        continue
    name, brand, shelf, typ, size, abv, origin, rx = row
    key = (name, size)
    if key in seen:
        if seen[key] != price:
            report.append("DUPLICATE %s %s at %s and %s; kept the first" % (name, size, seen[key], price))
        continue
    seen[key] = price
    c = None
    if rx and size not in ("Mug", "Jug"):
        c = pick(rx, size)
        if c is None:
            report.append("NO MATCH %r for %s %s" % (rx, name, size))
    slug = "bc-" + slugify(name + " " + (size or "bottle"))
    d = {"name": name, "brand": brand, "shelf": shelf, "type": typ or (c and c["type"]) or "",
         "price": price, "size": size,
         "abv": (c["abv"] if c and c.get("abv") is not None else abv),
         "origin": origin or (c and c["origin"]) or "",
         "notes": (c["notes"] if c else "") or "", "slug": slug, "img": False}
    pk = photo_key(c) if c else None
    if pk:
        alias[slug] = pk
    out.append(d)
    report.append("%-44s %-14s %6d  <- %s" % (name, size or "-", price, ("%s [%s]%s" % (c["name"], c["size"], " photo" if pk else "")) if c else "drawn"))

# One photo per drink: every size of the same bottle (and its tot or glass) shows the picture of
# its standard bottle, so the shelf looks consistent. A can keeps its own; a 5-litre box keeps its own.
PREF = {"750ml": 0, "700ml": 1, "1L": 2}
groups = collections.defaultdict(list)
for d in out:
    groups[(d["name"], d["size"] == "Can")].append(d)
for g in groups.values():
    have = [d for d in g if d["slug"] in alias and d["size"] != "5L"]
    if not have:
        continue
    best = min(have, key=lambda d: PREF.get(d["size"], 9))
    for d in g:
        if d["size"] != "5L":
            alias[d["slug"]] = alias[best["slug"]]

# the six house bottles keep their own entries (and photos) from the catalogue
out = [c for c in cat if c.get("house")] + out
nf = dict(fixes); nf["alias"] = alias
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
json.dump(nf, open(OUTFIX, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\n".join(report))
print("\n%d drinks (+%d house), %d with a reused photo" % (len(out) - 5, 5, len(alias)))
print(collections.Counter(d["shelf"] for d in out))
print("food on the bar sheet:", food)
for k, v in left_off.items():
    print("left off (%s):" % k, ", ".join(n for n, p in v))
