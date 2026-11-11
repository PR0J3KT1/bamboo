"""Put the beyondsweetness.ke drinks list into the Bamboo Cask page.

usage: python -I bs_embed.py <drinks.json> <html file>
Writes window.BC_DRINKS (and window.BC_HOUSE for the six house bottles) between
<!--DRINKS:start--> and <!--DRINKS:end-->.
Row: [name, brand, shelf, type, price, size, abv, origin, notes, sprite "sheet:cell" or "", credit index?]
A drink whose photo comes from Wikimedia Commons carries an 11th field, its row in window.BC_CREDITS.
"""
import sys, re, json, collections
rows = json.load(open(sys.argv[1], encoding="utf-8"))
html_path = sys.argv[2]
out, house, credits, cidx = [], {}, [], {}
for d in rows:
    sp = "%s:%d" % tuple(d["sp"]) if d.get("sp") else ""
    if d.get("house"):
        house[d["house"]] = {"sp": sp, "abv": d["abv"]}
        continue
    row = [d["name"], d["brand"], d["shelf"], d["type"], d["price"], d["size"], d["abv"], d["origin"], d["notes"], sp]
    c = d.get("credit") if sp else None
    if c:
        # credit row: [author, licence, file page on Wikimedia Commons, and for a stand-in photo
        # (a plain mug, glass or water bottle) the note saying so]
        key = c["page"]
        if key not in cidx:
            cidx[key] = len(credits); credits.append([c["artist"], c["licence"], c["page"]] + ([c["note"]] if c.get("note") else []))
        row.append(cidx[key])
    out.append(row)
# A short hash of the sprite sheets. The page adds it to each sheet's address, so a browser that
# kept last version's sheets fetches the new ones instead of showing old bottles at the new positions.
import os, hashlib
sheet_dir = os.path.join(os.path.dirname(os.path.abspath(html_path)), "drinks")
hsh = hashlib.sha1(json.dumps(out, ensure_ascii=False).encode("utf-8"))
for f in sorted(os.listdir(sheet_dir)) if os.path.isdir(sheet_dir) else []:
    hsh.update(f.encode("utf-8")); hsh.update(open(os.path.join(sheet_dir, f), "rb").read())
sheet_v = hsh.hexdigest()[:10]
js = ("<script>window.BC_DRINKS=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) +
      ";window.BC_HOUSE=" + json.dumps(house, separators=(",", ":")) +
      ";window.BC_CREDITS=" + json.dumps(credits, ensure_ascii=False, separators=(",", ":")) +
      ";window.BC_SHEETV=" + json.dumps(sheet_v) + ";</script>")
html = open(html_path, encoding="utf-8", newline="").read()
if "<!--DRINKS:start-->" not in html:
    sys.exit("marker missing")
html = re.sub(r"<!--DRINKS:start-->.*?<!--DRINKS:end-->", lambda m: "<!--DRINKS:start-->" + js + "<!--DRINKS:end-->", html, flags=re.S)
open(html_path, "w", encoding="utf-8", newline="").write(html)
sys.stdout.reconfigure(encoding="utf-8")
print(len(out), "drinks,", sum(1 for r in out if r[9]), "with photos,", len(js), "bytes; sheets v", sheet_v, "; house", house)
print(collections.Counter(r[2] for r in out))
