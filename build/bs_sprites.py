"""Cut the bottle photos out of their white backgrounds and pack them into sprite sheets.

usage: python -I bs_sprites.py <drinks.json> <image dir> <out dir> <fixes.json> [--review <dir>]

Writes <out>/<shelf>-<n>.avif and .webp (COLS x ROWS cells of CW x CH, bottles standing on the
bottom edge) and sets "sp": [sheet name, cell index] on each drink in drinks.json that got a picture.
fixes.json: {"alias": {slug: donor slug}, "drop": [slug, ...]}
  alias: a drink with no photo of its own borrows the photo of the same bottle in another size.
  drop:  a drink whose catalogue photo shows the wrong product goes back to a drawn bottle.
--review writes labelled contact sheets of every cut-out, for checking by eye.
Drinks inside each shelf are ordered photos first, so a shelf's first rail uses one sheet.
"""
import sys, os, re, json, glob
from PIL import Image, ImageDraw, ImageChops, ImageFilter, ImageFont

COLS, ROWS, CW, CH = 6, 5, 180, 252
PAD_X, PAD_TOP, PAD_BOT = 12, 10, 6
SENT = (255, 0, 255)
WEBP = dict(quality=76, alpha_quality=80, method=6)
AVIF = dict(quality=50, speed=4)

def cutout(path, thresh=22, minv=228):
    im = Image.open(path)
    im.load()
    if im.mode in ("RGBA", "LA", "PA") or (im.mode == "P" and "transparency" in im.info):
        # some "cut-outs" are a white panel on a transparent canvas: lay them on white, then cut as usual
        rgba = im.convert("RGBA")
        white = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        white.alpha_composite(rgba)
        im = white
    rgb = im.convert("RGB")
    w, h = rgb.size
    scale = 600 / max(w, h)
    if scale < 1:
        rgb = rgb.resize((round(w * scale), round(h * scale)), Image.LANCZOS); w, h = rgb.size
    filled = rgb.copy()
    step = max(4, min(w, h) // 40)
    seeds = [(x, 0) for x in range(0, w, step)] + [(x, h - 1) for x in range(0, w, step)] + \
            [(0, y) for y in range(0, h, step)] + [(w - 1, y) for y in range(0, h, step)]
    for s in seeds:
        p = filled.getpixel(s)
        if p != SENT and min(p) > minv and max(p) - min(p) < 18:
            ImageDraw.floodfill(filled, s, SENT, thresh=thresh)
    diff = ImageChops.difference(filled, Image.new("RGB", (w, h), SENT)).convert("L")
    alpha = diff.point(lambda v: 255 if v > 0 else 0)
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out

def fit(img):
    a = img.getchannel("A")
    box = a.point(lambda v: 255 if v > 24 else 0).getbbox()
    if not box:
        return None
    img = img.crop(box)
    w, h = img.size
    if w < 8 or h < 8:
        return None
    s = min((CW - 2 * PAD_X) / w, (CH - PAD_TOP - PAD_BOT) / h)
    img = img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    cell = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    cell.alpha_composite(img, ((CW - img.size[0]) // 2, CH - PAD_BOT - img.size[1]))
    return cell

# Featured order: the best-known brands first, one bottle per brand before any brand repeats,
# full-size bottles before minis. The site lists A to Z, which leads every shelf with odd picks.
FEATURE = {
 "whisky": ["johnnie walker black","jameson","jack daniel","chivas","glenfiddich","the glenlivet","macallan","singleton","monkey shoulder","johnnie walker","black & white","grant","ballantine","famous grouse","vat 69","bushmills","jim beam","bulleit","talisker","lagavulin","laphroaig","glenmorangie","dalmore","cardhu","tullamore","buffalo trace","wild turkey","j&b","teacher","william lawson"],
 "vodka": ["absolut","smirnoff","grey goose","belvedere","cîroc","ketel one","beluga","danzka","kibao","chrome"],
 "gin": ["tanqueray","gordon","bombay","hendrick","beefeater","gilbey","the botanist","malfy","whitley","inverroche","bulldog","58","konyagi"],
 "rum": ["captain morgan","bacardi","kenya cane","malibu","havana","appleton","old monk","myers","bumbu"],
 "tequila": ["don julio","patrón","casamigos","jose cuervo","olmeca","1800","clase azul","cincoro","camino"],
 "brandy": ["hennessy","martell","rémy","courvoisier","camus","grand marnier","viceroy","kwv","richot","st rémy"],
 "liqueur": ["baileys","amarula","jägermeister","kahlúa","cointreau","disaronno","campari","martini","southern comfort","sheridan","frangelico","tia maria","jinro"],
 "wine": ["4th street","four cousins","robertson","nederburg","casillero","jacob","drostdy","cellar cask","tall horse","frontera","gato negro","kwv","durbanville","asconi","the guv","mucho mas","pearly bay","namaqua"],
 "champagne": ["moët","veuve","dom perignon","belaire","bollinger","taittinger","piper","mumm","martini","canti","cielo"],
 "beer": ["tusker","guinness","white cap","heineken","balozi","pilsner","corona","budweiser","desperados","hop house","kingfisher","windhoek"],
 "rtd": ["smirnoff","savanna","hunter","snapp","gordon","jameson","ko ","tusker cider","breezer","58"],
 "mixers": ["schweppes","tonic","coke","sprite","stoney","soda","red bull","monster","keringet","dasani","minute maid","del monte","krest","fanta"],
}
FLAV = re.compile(r"honey|apple|fire|spic|raspberr|mango|peach|berry|lemon|lime|orange|coconut|vanilla|pineapple|citron|pink|rose|flavour")

def featured(drinks, shelf, idx):
    keys = FEATURE.get(shelf, [])
    groups = {}
    for i in idx:
        n = drinks[i]["name"].lower() + " "
        r = next((k for k, kw in enumerate(keys) if n.startswith(kw) or (" " + kw) in (" " + n)), None)
        g = ("k%03d" % r) if r is not None else "z" + drinks[i]["brand"].lower()
        groups.setdefault(g, []).append(i)
    full = lambda i: 0 if drinks[i]["size"] in ("750ml", "700ml", "1L") else 1
    pos = {i: k for k, i in enumerate(idx)}
    names = sorted(groups, key=lambda g: (g[0] != "k", g if g[0] == "k" else min(pos[i] for i in groups[g])))
    for g in names:
        groups[g].sort(key=lambda i: (1 if FLAV.search(drinks[i]["name"].lower()) else 0, full(i), pos[i]))
    # one of every brand first (known brands ahead of the rest), then the second bottle of each, and so on
    out, rnd = [], 0
    while len(out) < len(idx):
        for part in ([g for g in names if g[0] == "k"], [g for g in names if g[0] != "k"]):
            for g in part:
                if rnd < len(groups[g]):
                    out.append(groups[g][rnd])
        rnd += 1
    return out

def review(cells, path_fmt):
    """Contact sheets: 8 x 6 cut-outs on a mid-tone ground, each labelled with its slug and name."""
    try:
        font = ImageFont.truetype("arial.ttf", 11)
    except OSError:
        font = ImageFont.load_default()
    per, cw, ch, lab = 48, 150, 210, 30
    for n in range(0, len(cells), per):
        page = Image.new("RGB", (8 * cw, 6 * (ch + lab)), (128, 112, 96))
        dr = ImageDraw.Draw(page)
        for k, (d, c) in enumerate(cells[n:n + per]):
            x, y = (k % 8) * cw, (k // 8) * (ch + lab)
            page.paste(c.resize((cw, ch), Image.LANCZOS), (x, y), c.resize((cw, ch), Image.LANCZOS))
            dr.rectangle((x, y + ch, x + cw - 1, y + ch + lab - 1), fill=(250, 248, 244))
            dr.text((x + 3, y + ch + 2), ("%d " % (n + k)) + d["name"][:24], fill=(20, 20, 20), font=font)
            dr.text((x + 3, y + ch + 15), d["slug"][:26], fill=(110, 110, 110), font=font)
        page.save(path_fmt % (n // per))

def main():
    args = sys.argv[1:]
    rev = None
    if "--review" in args:
        k = args.index("--review"); rev = args[k + 1]; del args[k:k + 2]
    DRINKS, SRC, OUT, FIXES = args
    os.makedirs(OUT, exist_ok=True)
    drinks = json.load(open(DRINKS, encoding="utf-8"))
    fixes = json.load(open(FIXES, encoding="utf-8"))
    files = {os.path.splitext(os.path.basename(f))[0]: f for f in glob.glob(os.path.join(SRC, "*"))}
    for f in glob.glob(os.path.join(OUT, "*.webp")) + glob.glob(os.path.join(OUT, "*.avif")):
        os.remove(f)  # sheets are rebuilt from scratch, so no stale sheet survives a reshuffle
    drop, alias = set(fixes.get("drop", [])), fixes.get("alias", {})
    # free-licensed photos from Wikimedia Commons, kept in <image dir>/commons/<slug>.png, credited on the page
    commons = fixes.get("commons", {})
    for slug in commons:
        p = os.path.join(SRC, "commons", slug + ".png")
        if os.path.exists(p):
            files["commons:" + slug] = p
    for d in drinks:
        d.pop("sp", None); d.pop("photo_from", None); d.pop("credit", None)
        donor = alias.get(d["slug"])
        if "commons:" + d["slug"] in files:
            d["photo"] = "commons:" + d["slug"]; d["credit"] = commons[d["slug"]]
        elif d["slug"] in files and (d.get("img") or d.get("house")) and d["slug"] not in drop:
            d["photo"] = d["slug"]
        elif donor and "commons:" + donor in files:
            d["photo"] = "commons:" + donor; d["photo_from"] = donor; d["credit"] = commons[donor]
        elif donor and donor in files and donor not in drop:
            d["photo"] = donor; d["photo_from"] = donor
        else:
            d["photo"] = None
    order = {}
    for i, d in enumerate(drinks):
        order.setdefault(d["shelf"], []).append(i)
    for k in order:
        order[k] = featured(drinks, k, order[k])
    sheets, bad, all_cells = [], [], []
    cache = {}
    for shelf, idx in order.items():
        # one cell per picture: the same bottle in several sizes (or as a tot) shares its cell
        cells, uses, at = [], [], {}
        for i in [i for i in idx if drinks[i]["photo"]]:
            d = drinks[i]
            src = d["photo"]
            if src not in cache:
                try:
                    if fixes.get("commons", {}).get(src[8:], {}).get("ready"):
                        # cut out by hand along a traced outline, with see-through parts kept (a mug handle): use it as it is
                        cache[src] = fit(Image.open(files[src]).convert("RGBA"))
                    else:
                        cache[src] = fit(cutout(files[src], *fixes.get("cut", {}).get(src, [])))
                except Exception as e:
                    cache[src] = None; bad.append((src, str(e)))
            if cache[src] is None:
                bad.append((d["slug"], "no usable picture")); continue
            if src not in at:
                at[src] = len(cells)
                cells.append((i, cache[src]))
                all_cells.append((d, cache[src]))
            uses.append((i, at[src]))
        for i, ci in uses:
            drinks[i]["sp"] = ["%s-%d" % (shelf, ci // (COLS * ROWS)), ci % (COLS * ROWS)]
        for n in range(0, len(cells), COLS * ROWS):
            chunk = cells[n:n + COLS * ROWS]
            name = "%s-%d" % (shelf, n // (COLS * ROWS))
            sheet = Image.new("RGBA", (COLS * CW, ROWS * CH), (0, 0, 0, 0))
            for k, (i, c) in enumerate(chunk):
                sheet.alpha_composite(c, ((k % COLS) * CW, (k // COLS) * CH))
            sizes = []
            for ext, opts in (("webp", WEBP), ("avif", AVIF)):
                path = os.path.join(OUT, name + "." + ext)
                sheet.save(path, ext.upper(), **opts)
                sizes.append(os.path.getsize(path))
            sheets.append((name, len(chunk), sizes))
        # photos first inside the shelf, featured order otherwise
        order[shelf] = [i for i in idx if "sp" in drinks[i]] + [i for i in idx if "sp" not in drinks[i]]
    ordered = [drinks[i] for s in order for i in order[s]]
    for d in ordered:
        d.pop("photo", None)
    json.dump(ordered, open(DRINKS, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    sys.stdout.reconfigure(encoding="utf-8")
    if rev:
        os.makedirs(rev, exist_ok=True)
        for f in glob.glob(os.path.join(rev, "*.png")):
            os.remove(f)
        review(all_cells, os.path.join(rev, "review-%02d.png"))
    print(len(sheets), "sheets,", sum(s[1] for s in sheets), "bottles,",
          "webp", round(sum(s[2][0] for s in sheets) / 1024), "KB,", "avif", round(sum(s[2][1] for s in sheets) / 1024), "KB,",
          sum(1 for d in ordered if d.get("photo_from")), "borrowed from another size")
    for s in sheets:
        print("  ", s[0], s[1], "webp", round(s[2][0] / 1024), "avif", round(s[2][1] / 1024))
    for b in bad:
        print("  no picture:", b)

if __name__ == "__main__":
    main()
