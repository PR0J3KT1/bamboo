"""Photos for the dishes the lounge hasn't photographed, and put them into the page.

usage: python -P food_photos.py <search.json> <lounge photo dir> <cache dir> ../bamboo-cask.html

food_photos.json (next to this script) says which photo each dish gets:
  "subjects": {key: {"pick": n, "x": .5, "y": .5, "zoom": 1}}  - candidate n from search.json (a Commons
               search, see the README), cut to 4:3 around x, y (fractions); zoom > 1 cuts tighter.
               Or {"own": "<file in the lounge photo dir>", ...} for one of the lounge's own photos.
  "dishes":   {item or family id: key}
Writes ../photos/food/<key>.webp (640 x 480) and the BC_FOODPH block in the page: each photo's file,
alt text and credit, and which dish uses it. Commons photos are fetched once, at the standard 960 width,
into the cache dir. Only CC BY, CC BY-SA, CC0 and public-domain files are used.
"""
import sys, os, re, io, json, time, urllib.request
from PIL import Image

SEARCH, LOUNGE, CACHE, PAGE = sys.argv[1:5]
here = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(here, "..", "photos", "food")
UA = "MenuPhotoLicenceCheck/1.0 (python urllib)"
cfg = json.load(open(os.path.join(here, "food_photos.json"), encoding="utf-8"))
cands = json.load(open(SEARCH, encoding="utf-8"))
os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)
OK_LIC = re.compile(r"^(cc[ -]by(-sa)?[ -]?\d|cc0|public domain|pd)", re.I)


def fetch(c, width=960):
    name = re.sub(r"[^\w.-]+", "_", c["title"].split(":", 1)[1])[:120]
    p = os.path.join(CACHE, name if width == 960 else "%d-%s" % (width, name))
    if not os.path.exists(p):
        # the 330px search thumb's URL with the width swapped for 960 (or 1920 for a tight crop), standard Commons widths
        url = re.sub(r"/\d+px-", "/%dpx-" % width, c["thumb"]) if c["w"] > width else c["url"]
        for attempt in range(4):
            try:
                data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read()
                Image.open(io.BytesIO(data)).verify()
                open(p, "wb").write(data)
                break
            except Exception as e:
                print("  retry", attempt, c["title"], e, flush=True)
                time.sleep(4 + attempt * 5)
        time.sleep(1)
    return Image.open(p)


def crop43(im, x, y, zoom):
    w, h = im.size
    cw, ch = (w, w * 3 / 4) if w / h < 4 / 3 else (h * 4 / 3, h)
    cw, ch = cw / zoom, ch / zoom
    l = min(max(0, x * w - cw / 2), w - cw)
    t = min(max(0, y * h - ch / 2), h - ch)
    return im.crop((int(l), int(t), int(l + cw), int(t + ch)))


photos = {}
for key, s in cfg["subjects"].items():
    if "own" in s:
        im, credit = Image.open(os.path.join(LOUNGE, s["own"])), None
    else:
        c = cands[s.get("from", key)][s["pick"]]
        assert OK_LIC.match(c["licence"]), (key, c["licence"])
        im = fetch(c, 1920 if s.get("zoom", 1) > 1 else 960)
        # the author's name only: the field sometimes carries a note after the name, or the name twice
        artist = (c["artist"] or "").split("\n")[0].strip()
        artist = re.sub(r"^(.+?) \(\1\)$", r"\1", artist) or "Unknown author"
        credit = [artist, c["licence"], c["descurl"]]
    im = crop43(im.convert("RGB"), s.get("x", .5), s.get("y", .5), s.get("zoom", 1))
    if im.width > 640:
        im = im.resize((640, 480), Image.LANCZOS)
    p = os.path.join(OUT, key + ".webp")
    im.save(p, "WEBP", quality=74, method=6)
    photos[key] = {"src": "photos/food/%s.webp" % key, "alt": s["alt"], "credit": credit}
    print(key, im.size, os.path.getsize(p), (credit or ["the lounge's own"])[0][:40], flush=True)

dishes = cfg["dishes"]
missing = sorted(set(dishes.values()) - set(photos))
assert not missing, missing
data = json.dumps({"photos": photos, "dishes": dishes}, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
block = "<!--FOODPH:start--><script>window.BC_FOODPH=" + data + ";</script><!--FOODPH:end-->"
s = open(PAGE, encoding="utf-8", newline="").read()
if "<!--FOODPH:start-->" in s:
    i, j = s.index("<!--FOODPH:start-->"), s.index("<!--FOODPH:end-->") + len("<!--FOODPH:end-->")
    s = s[:i] + block + s[j:]
else:
    a = "<!--PHOTOS:end-->"
    assert s.count(a) == 1
    s = s.replace(a, a + "\n" + block)


def once(old, new):
    """a one-time edit; skipped when it has already been made"""
    global s
    if new in s:
        return
    assert s.count(old) == 1, ("expected one of", old[:80], s.count(old))
    s = s.replace(old, new)


# each dish without the lounge's own photo takes its illustration photo; the dish sheet credits it
once('''function fillPhotos(root){''', '''/* Dishes the lounge hasn't photographed yet show a free-licensed photo (BC_FOODPH), for illustration,
   with the credit on the dish. The drawn plates and name tiles below stay as the fallback. */
var FOODPH = window.BC_FOODPH || {photos:{}, dishes:{}};
Object.keys(FOODPH.photos).forEach(function(k){ PH["f-"+k]=FOODPH.photos[k].src; PH_ALT["f-"+k]=FOODPH.photos[k].alt; });
Object.keys(FOODPH.dishes).forEach(function(id){
  var k="f-"+FOODPH.dishes[id];
  (FAM[id] ? FAM[id].ids : [id]).forEach(function(x){ var o=ITEMS[x]||BUNDLES[x]; if(o && !o.ph) o.ph=k; });
});
function kCredit(id){
  var o=ITEMS[id]||BUNDLES[id], k=o && o.ph, p=k && k.indexOf("f-")===0 && FOODPH.photos[k.slice(2)], c=p && p.credit;
  return c ? '<p class="kcredit">A photo for illustration; the lounge\\u2019s plate may look different. Photo: '+esc(c[0])+", "+esc(c[1])+', <a href="'+esc(c[2])+'" target="_blank" rel="noopener">Wikimedia Commons</a>.</p>' : "";
}
function fillPhotos(root){''')
once('''    if(n) h+='<p class="kin">'+n+" in your order</p>";
  }
  return h;''', '''    if(n) h+='<p class="kin">'+n+" in your order</p>";
  }
  h+=kCredit(id);
  return h;''')
once('''.kph{position:relative;display:block;overflow:hidden;background:var(--k-ph);border-radius:inherit}''',
     '''.kph{position:relative;display:block;overflow:hidden;background:var(--k-ph);border-radius:inherit}
.kcredit{margin:12px 0 0;font-size:12px;line-height:1.45;color:var(--k-mute);overflow-wrap:anywhere}
.kcredit a{color:inherit;text-decoration:underline;text-underline-offset:2px}''')
once('''/* the lounge's own photo where there is one, otherwise a drawn plate, otherwise a sand tile with the dish's short name */''',
     '''/* the lounge's own photo, or a photo for illustration (BC_FOODPH); otherwise a drawn plate, otherwise a sand tile with the dish's short name */''')
once('''Food and lounge photos by Bamboo Cask Lounge.''',
     '''Food and lounge photos by Bamboo Cask Lounge. Dishes it hasn't photographed yet show a free-licensed photo from Wikimedia Commons, for illustration, with the credit on the dish.''')
open(PAGE, "w", encoding="utf-8", newline="").write(s)
print(len(photos), "photos,", len(dishes), "dishes; page", len(s))
