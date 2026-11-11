"""Draw a choice's hand-traced outline over its photo, large, with a 5% grid:
python -P outline_check.py <search.json> <choices.json> <cache dir> <out.jpg> slug [top bottom]
top/bottom (fractions of the crop) zoom into a band of the height."""
import sys, os, re, json
from PIL import Image, ImageDraw, ImageFont
sp, cp, cache, out, slug = sys.argv[1:6]
band = [float(v) for v in sys.argv[6:8]] if len(sys.argv) > 7 else [0, 1]
cands = json.load(open(sp, encoding="utf-8")); ch = json.load(open(cp, encoding="utf-8"))[slug]
c = cands[ch["from"]][ch["pick"]]
name = re.sub(r"[^\w.-]+", "_", c["title"].split(":", 1)[1])[:120]
im = Image.open(os.path.join(cache, name)).convert("RGB")
w, h = im.size
if ch.get("crop"):
    x0, y0, x1, y1 = ch["crop"]; im = im.crop((round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h)))
if ch.get("profile"):
    cx, pts = ch["profile"]
    poly = [(cx - hw, y) for y, hw in pts] + [(cx + hw, y) for y, hw in reversed(pts)]
elif ch.get("edges"):
    poly = [(xl, y) for y, xl, xr in ch["edges"]] + [(xr, y) for y, xl, xr in reversed(ch["edges"])]
else:
    poly = ch.get("poly", [])
H = 900
t, b = band
sub = im.crop((0, round(t * im.height), im.width, round(b * im.height)))
s = H / sub.height
sub = sub.resize((round(sub.width * s), H), Image.LANCZOS)
dr = ImageDraw.Draw(sub)
try: font = ImageFont.truetype("arial.ttf", 13)
except OSError: font = ImageFont.load_default()
for k in range(0, 41):
    f = k / 40
    x = f * im.width * s
    if x <= sub.width:
        dr.line((x, 0, x, H), fill=(0, 255, 255) if k % 4 else (255, 0, 255), width=1)
        if k % 4 == 0: dr.text((x + 2, 2), "%.1f" % f, fill=(255, 0, 255), font=font)
    yf = f
    if t <= yf <= b:
        y = (yf - t) * im.height * s
        dr.line((0, y, sub.width, y), fill=(0, 255, 255) if k % 4 else (255, 0, 255), width=1)
        dr.text((2, y + 2), "%.3f" % yf, fill=(255, 255, 0), font=font)
for pg, col in [(poly, (255, 0, 0))] + [(e, (255, 128, 0)) for e in ch.get("extra", [])] + [(e, (0, 0, 255)) for e in ch.get("holes", [])]:
    if pg:
        pts = [(x * im.width * s, (y - t) * im.height * s) for x, y in pg]
        dr.line(pts + [pts[0]], fill=col, width=2)
sub.save(out, quality=88)
print(sub.size)
