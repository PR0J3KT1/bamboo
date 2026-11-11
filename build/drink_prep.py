"""Fetch the chosen Commons bottle photos, cut each bottle out, and record its credit for the page.

usage: python -P drink_prep.py <build dir> <search.json> <choices.json> <img dir> <cache dir> <review.jpg>
choices.json: {stock slug: {"from": subject, "pick": n, "crop": [x0, y0, x1, y1] fractions or null,
               "cut": ["grow", local, lo, hi] | [thresh, minv] | null, "blank": [[x0, y0, x1, y1], ...],
               "also": [other stock slugs that are the same bottle in another size]}}
Writes <img dir>/commons/<slug>.png (a cut-out) and puts the credit under "commons" in
<build dir>/stock_fixes.json, with "also" slugs as aliases of it. Then a review sheet of every cut-out.
"""
import sys, os, io, re, json, time, urllib.request
from collections import deque
from PIL import Image, ImageDraw, ImageFilter, ImageFont

build, search_p, choices_p, img_dir, cache, review_p = sys.argv[1:7]
sys.path.insert(0, build)
import bs_sprites

UA = "MenuPhotoLicenceCheck/1.0 (python urllib)"
OK_LIC = re.compile(r"^(cc[ -]by(-sa)?[ -]?\d|cc0|public domain|pd)", re.I)
cands = json.load(open(search_p, encoding="utf-8"))
choices = json.load(open(choices_p, encoding="utf-8"))
os.makedirs(os.path.join(img_dir, "commons"), exist_ok=True)
os.makedirs(cache, exist_ok=True)


def fetch(c):
    name = re.sub(r"[^\w.-]+", "_", c["title"].split(":", 1)[1])[:120]
    p = os.path.join(cache, name)
    if not os.path.exists(p):
        url = re.sub(r"/\d+px-", "/960px-", c["thumb"]) if c["w"] > 960 and re.search(r"/\d+px-", c["thumb"] or "") else c["url"]
        for attempt in range(4):
            try:
                data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read()
                Image.open(io.BytesIO(data)).verify()
                open(p, "wb").write(data)
                break
            except Exception as e:
                print("  retry", attempt, c["title"], e, flush=True)
                time.sleep(5 + attempt * 8)
        time.sleep(1.5)
    im = Image.open(p)
    im.load()
    if im.mode in ("RGBA", "LA", "PA") or (im.mode == "P" and "transparency" in im.info):
        rgba = im.convert("RGBA"); white = Image.new("RGBA", rgba.size, (255, 255, 255, 255)); white.alpha_composite(rgba); im = white
    return im.convert("RGB")


def cut_grow(rgb, local=7, lo=110, hi=255):
    """Grow the background in from the edges through pixels whose brightness is in [lo, hi] and that
    change only a little from their neighbour, so a shaded wall goes too. Keep the largest solid shape
    (the bottle) and fill holes in it (clear glass shows the wall through)."""
    w, h = rgb.size
    s = 600 / max(w, h)
    if s < 1:
        rgb = rgb.resize((round(w * s), round(h * s)), Image.LANCZOS); w, h = rgb.size
    px = rgb.load()
    lum = lambda p: (p[0] * 299 + p[1] * 587 + p[2] * 114) // 1000
    ok = lambda p: lo <= lum(p) <= hi
    bg = bytearray(w * h); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if ok(px[x, y]) and not bg[y * w + x]: bg[y * w + x] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if ok(px[x, y]) and not bg[y * w + x]: bg[y * w + x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft(); p = px[x, y]
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx]:
                n = px[nx, ny]
                if abs(n[0] - p[0]) + abs(n[1] - p[1]) + abs(n[2] - p[2]) <= local * 3 and ok(n):
                    bg[ny * w + nx] = 1; q.append((nx, ny))
    seen = bytearray(w * h); best = []
    for start in range(w * h):
        if bg[start] or seen[start]:
            continue
        comp = [start]; seen[start] = 1; i = 0
        while i < len(comp):
            k = comp[i]; i += 1; x, y = k % w, k // w
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if not bg[j] and not seen[j]: seen[j] = 1; comp.append(j)
        if len(comp) > len(best):
            best = comp
    mask = bytearray(w * h)
    for k in best:
        mask[k] = 255
    alpha = Image.frombytes("L", (w, h), bytes(mask))
    holes = Image.eval(alpha, lambda v: 255 - v)
    for p in [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]:
        if holes.getpixel(p) == 255:
            ImageDraw.floodfill(holes, p, 0)
    alpha.paste(255, mask=holes)
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out = rgb.convert("RGBA"); out.putalpha(alpha)
    return out


fixes_p = os.path.join(build, "stock_fixes.json")
fixes = json.load(open(fixes_p, encoding="utf-8"))
commons = fixes.setdefault("commons", {})
alias = fixes.setdefault("alias", {})
cells = []
for slug, ch in choices.items():
    c = cands[ch["from"]][ch["pick"]]
    assert OK_LIC.match(c["licence"]), (slug, c["licence"])
    im = fetch(c)
    w, h = im.size
    if ch.get("blank"):
        dr = ImageDraw.Draw(im)
        for r in ch["blank"]:
            dr.rectangle((round(r[0] * w), round(r[1] * h), round(r[2] * w), round(r[3] * h)), fill=(245, 245, 245))
    if ch.get("crop"):
        x0, y0, x1, y1 = ch["crop"]
        im = im.crop((round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h)))
    cut = ch.get("cut")
    if ch.get("profile"):
        # a round bottle or can, traced as a centre line and its half-width at each height
        cx, pts = ch["profile"]
        ch["poly"] = [(cx - hw, y) for y, hw in pts] + [(cx + hw, y) for y, hw in reversed(pts)]
    if ch.get("edges"):
        # a bottle seen a little off-square: its left and right edge at each height
        ch["poly"] = [(xl, y) for y, xl, xr in ch["edges"]] + [(xr, y) for y, xl, xr in reversed(ch["edges"])]
    if ch.get("poly"):
        # a bottle in a busy scene: its outline traced by hand, as fractions of the crop
        cw_, chh = im.size
        s = 4  # draw the mask large, then shrink it, for a smooth edge
        m = Image.new("L", (cw_ * s, chh * s), 0)
        dm = ImageDraw.Draw(m)
        for pg, val in [(ch["poly"], 255)] + [(e, 255) for e in ch.get("extra", [])] + [(e, 0) for e in ch.get("holes", [])]:
            dm.polygon([(x * cw_ * s, y * chh * s) for x, y in pg], fill=val)
        m = m.resize((cw_, chh), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
        if cut:
            # the outline only clears clutter (a counter top, a shelf); the cut then finds the true edge,
            # so paint everything outside the outline the colour of the wall
            im = Image.composite(im, Image.new("RGB", im.size, tuple(ch.get("pad", [245, 245, 245]))), m)
        else:
            out = im.convert("RGBA"); out.putalpha(m)
            sc = 600 / max(out.size)
            if sc < 1:
                out = out.resize((round(out.width * sc), round(out.height * sc)), Image.LANCZOS)
    if ch.get("poly") and not cut:
        pass
    elif isinstance(cut, list) and cut and cut[0] == "grow":
        out = cut_grow(im, *cut[1:])
    else:
        tmp = os.path.join(cache, "_crop_%s.png" % slug)
        im.save(tmp)
        out = bs_sprites.cutout(tmp, *(cut or []))
    box = out.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    if box:
        out = out.crop(box)
    out.save(os.path.join(img_dir, "commons", slug + ".png"))
    # the author's name only; the field can carry a note after it (read it before choosing the photo)
    note = commons.get(slug, {}).get("note")  # keep a stand-in note written earlier
    artist = (c["artist"] or "").split("\n")[0].strip()
    artist = re.sub(r"^(.+?) \(\1\)$", r"\1", artist)
    artist = re.sub(r"\s+", " ", artist)[:80] or "Unknown author"
    commons[slug] = {"artist": artist, "licence": c["licence"], "page": c["descurl"], "file": c["title"], "ready": True}
    if note:
        commons[slug]["note"] = note
    for other in ch.get("also", []):
        alias[other] = slug
    cells.append((slug, out))
    print("ok", slug, "<-", c["title"][5:70], "|", c["licence"], "|", artist[:40], flush=True)

json.dump(fixes, open(fixes_p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

try:
    font = ImageFont.truetype("arial.ttf", 12)
except OSError:
    font = ImageFont.load_default()
CW, CH = 170, 250
rows = (len(cells) + 7) // 8 or 1
page = Image.new("RGB", (8 * CW, rows * (CH + 18)), (128, 112, 96))
dr = ImageDraw.Draw(page)
for i, (slug, cut) in enumerate(cells):
    x, y = (i % 8) * CW, (i // 8) * (CH + 18)
    c = cut.copy(); c.thumbnail((CW - 10, CH - 10))
    page.paste(c, (x + (CW - c.width) // 2, y + CH - c.height - 4), c)
    dr.text((x + 3, y + CH + 2), slug[3:29], fill=(255, 255, 255), font=font)
page.save(review_p, quality=85)
print(len(cells), "cut-outs")
