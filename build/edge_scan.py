"""Find a bottle's left and right edge on each row, as fractions of the crop, to write an "edges" outline.
python -P edge_scan.py <search.json> <choices.json> <cache dir> slug y0 y1 step xa xb [T]
From xa inward (and from xb inward) it finds the first run of 3 pixels whose colour is more than T
(default 45) from the background, which it samples as the median of the 6 pixels at the scan start."""
import sys, os, re, json
from PIL import Image
sp, cp, cache, slug = sys.argv[1:5]
y0, y1, step, xa, xb = [float(v) for v in sys.argv[5:10]]
T = float(sys.argv[10]) if len(sys.argv) > 10 else 45
cands = json.load(open(sp, encoding="utf-8")); ch = json.load(open(cp, encoding="utf-8"))[slug]
c = cands[ch["from"]][ch["pick"]]
name = re.sub(r"[^\w.-]+", "_", c["title"].split(":", 1)[1])[:120]
im = Image.open(os.path.join(cache, name)).convert("RGB")
w, h = im.size
if ch.get("crop"):
    a, b, cc, d = ch["crop"]; im = im.crop((round(a * w), round(b * h), round(cc * w), round(d * h)))
w, h = im.size; px = im.load()
dist = lambda p, q: abs(p[0] - q[0]) + abs(p[1] - q[1]) + abs(p[2] - q[2])
def med(ps):
    return tuple(sorted(p[i] for p in ps)[len(ps) // 2] for i in range(3))
def scan(y, xs):
    bg = med([px[x, y] for x in xs[:6]])
    run = 0
    for i, x in enumerate(xs):
        if dist(px[x, y], bg) > T:
            run += 1
            if run == 3:
                return xs[i - 2]
        else:
            run = 0
    return None
y = y0
out = []
while y <= y1 + 1e-9:
    yy = min(h - 1, round(y * h))
    L = scan(yy, list(range(round(xa * w), round(xb * w))))
    R = scan(yy, list(range(round(xb * w), round(xa * w), -1)))
    out.append([round(y, 3), None if L is None else round(L / w, 3), None if R is None else round(R / w, 3)])
    y += step
print(json.dumps(out))
