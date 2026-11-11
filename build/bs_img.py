"""Download the catalogue photo for every drink in listing.json.

usage: python -I bs_img.py <listing.json> <out dir>
Skips the tobacco and essentials shelves. Saves <slug>.<ext>; skips files already there.
"""
import sys, os, json, time, urllib.request, urllib.parse

rows = json.load(open(sys.argv[1], encoding="utf-8"))
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (catalogue copy for a TumaBoda demo)"}
todo = [r for r in rows if r["img"] and r["shelf"] not in ("tobacco", "essentials")]
ok = fail = 0
for i, r in enumerate(todo):
    ext = os.path.splitext(urllib.parse.urlparse(r["img"]).path)[1].lower() or ".jpg"
    dst = os.path.join(out, r["slug"] + ext)
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        ok += 1; continue
    url = urllib.parse.quote(r["img"], safe=":/?=&%")
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as resp:
                data = resp.read()
            open(dst, "wb").write(data); ok += 1
            break
        except Exception as e:
            if attempt == 2:
                print("fail", r["slug"], e); fail += 1
            time.sleep(1.5 + attempt * 2)
    if i % 50 == 0:
        print(i, "of", len(todo), flush=True)
    time.sleep(0.2)
print("done", ok, "saved,", fail, "failed")
