"""Crop the photos for the games cards and the party package cards.

usage: python -P game_art.py <scene dir> <lounge photo dir> ..

<scene dir> holds the Pexels scene photos, in games/ and party/ (history.webp, birthday.webp, ...), and
<lounge photo dir> the lounge's own photos as downloaded from its site. Each card photo is cut to 16:9
around the spot given below (x and y as fractions of the photo), then saved twice under the output root:
<folder>/<id>.webp (up to 800 wide) and <folder>/<id>-sm.webp (480 wide; skipped when the crop is
narrower). The Pexels page numbers for the credits are in play.js (games) and party.js (party).
"""
import os, sys
from PIL import Image

SCENES, LOUNGE, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
G, P = os.path.join(SCENES, "games"), os.path.join(SCENES, "party")

# (out folder, card id): (photo folder, file, centre x, centre y, box)
# box (x0, y0, x1, y1, as fractions) is cut first: it trims a white frame the lounge drew on some photos,
# or keeps a drink out of the shot, because under-18s see these cards too.
CROPS = {
    ("games", "history"): (G, "history.webp", .5, .5, None),
    ("games", "sheng"):   (G, "sheng.webp", .5, .3, None),
    ("games", "methali"): (G, "methali.webp", .5, .27, None),
    ("games", "kaunti"):  (G, "kaunti.webp", .5, .56, None),
    ("games", "headsup"): (G, "headsup.webp", .5, .55, None),
    ("games", "wyr"):     (G, "wyr.webp", .5, .42, None),
    ("games", "chora"):   (G, "chora.webp", .5, .42, None),
    ("games", "trivia"):  (LOUNGE, "Best-Sports-Bar-in-Ngara-Nairobi-Bamboo-Cask-Lounge.jpg", .5, .5, None),
    ("games", "bei"):     (LOUNGE, "tasty-nyama-choma-in-ngara-nairobi.jpg", .5, .56, None),
    ("games", "memory-food"): (LOUNGE, "best-fish-and-chips-in-nairobi-bamboo-cask-lounge.jpg", .5, .5, (.07, .07, .93, .93)),
    # the eight occasions
    ("party", "birthday"):   (P, "birthday.webp", .5, .42, None),
    ("party", "nyama"):      (P, "nyama.webp", .5, .55, None),
    ("party", "ruracio"):    (P, "ruracio.webp", .5, .42, None),
    ("party", "match"):      (P, "match.webp", .6, .5, (0, 0, 1, .66)),      # the beer on the coffee table stays out
    ("party", "office"):     (P, "office.webp", .5, .5, None),               # a bottle in hand: adults only
    ("party", "sundowner"):  (P, "sundowner.webp", .5, .5, None),            # a toast with bottles: adults only
    ("party", "graduation"): (P, "graduation.webp", .5, .38, None),
    ("party", "newyear"):    (P, "newyear.webp", .5, .45, (.42, 0, 1, 1)),   # the glass of bubbly stays out
    # what under-18s see instead, from the lounge's own photos
    ("party", "office-u18"):    (LOUNGE, "Corporate-Events-in-Nairobi.jpg", .5, .55, None),
    ("party", "sundowner-u18"): (LOUNGE, "private-parties-and-graduating-gardens-in-ngara.jpg", .45, .5, (0, .45, 1, 1)),  # under the beer sign
}


def crop169(im, cx, cy, box):
    if box:
        w, h = im.size
        im = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
    w, h = im.size
    if w / h > 16 / 9:
        nw, nh = int(h * 16 / 9), h
    else:
        nw, nh = w, int(w * 9 / 16)
    x = min(max(0, int(cx * w - nw / 2)), w - nw)
    y = min(max(0, int(cy * h - nh / 2)), h - nh)
    return im.crop((x, y, x + nw, y + nh))


only = set(sys.argv[4:])  # optional: just these card ids
for (folder, key), (src, name, cx, cy, box) in CROPS.items():
    if only and key not in only:
        continue
    os.makedirs(os.path.join(OUT, folder), exist_ok=True)
    c = crop169(Image.open(os.path.join(src, name)).convert("RGB"), cx, cy, box)
    for suffix, width in (("", 800), ("-sm", 480)):
        if suffix and c.width <= width:
            continue
        w = min(width, c.width)
        out = c.resize((w, round(w * 9 / 16)), Image.LANCZOS) if w != c.width else c
        p = os.path.join(OUT, folder, key + suffix + ".webp")
        out.save(p, "WEBP", quality=74, method=6)
        print(p, out.size, os.path.getsize(p))
