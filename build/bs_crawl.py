"""Read every shelf listing on beyondsweetness.ke and write one JSON row per product.

usage: python -I bs_crawl.py <out dir>
Row: slug, name, shelf, price, size, img (catalogue image URL).
Polite: one request at a time, a short pause between pages.
"""
import sys, os, re, json, time, html, urllib.request

OUT = sys.argv[1]
os.makedirs(os.path.join(OUT, "pages"), exist_ok=True)
SHELVES = ["whisky", "vodka", "gin", "rum", "tequila", "brandy", "liqueur", "wine",
           "champagne", "beer", "rtd", "mixers", "snacks", "gifts", "tobacco", "essentials"]
UA = {"User-Agent": "Mozilla/5.0 (catalogue copy for a TumaBoda demo)"}

def get(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            print("  retry", url, e); time.sleep(2 + attempt * 3)
    raise SystemExit("failed " + url)

CARD = re.compile(r'<article class="card" data-id="([^"]+)">(.*?)</article>', re.S)
rows, seen = [], set()
for shelf in SHELVES:
    page, total = 1, None
    while True:
        url = "https://beyondsweetness.ke/shop?shelf=%s&page=%d" % (shelf, page)
        h = get(url)
        open(os.path.join(OUT, "pages", "%s-%02d.html" % (shelf, page)), "w", encoding="utf-8").write(h)
        if total is None:
            m = re.search(r'<span class="count">([\d,]+) products</span>', h)
            total = int(m.group(1).replace(",", "")) if m else 0
        cards = CARD.findall(h)
        for slug, body in cards:
            if slug in seen:
                continue
            seen.add(slug)
            img = re.search(r'<img class="shot-cutout" src="([^"]+)"', body)
            name = re.search(r'<h3 class="card-name"><a [^>]*>(.*?)</a>', body, re.S)
            price = re.search(r'<span class="price"><span class="cur">KSh</span>([\d,]+)', body)
            meta = re.search(r'<div class="card-meta">(.*?)</div>', body, re.S)
            rows.append({
                "slug": slug, "shelf": shelf,
                "name": html.unescape(re.sub(r"<[^>]+>", "", name.group(1))).strip() if name else slug,
                "price": int(price.group(1).replace(",", "")) if price else None,
                "size": html.unescape(re.sub(r"<[^>]+>", " ", meta.group(1))).strip() if meta else "",
                "img": html.unescape(img.group(1)) if img else None,
            })
        print(shelf, "page", page, "cards", len(cards), "of", total)
        if not cards or page * 24 >= total:
            break
        page += 1
        time.sleep(0.6)

json.dump(rows, open(os.path.join(OUT, "listing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(rows), "products")
