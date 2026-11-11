"""Show cut-outs large on a two-tone background, to check their edges: python -P cut_zoom.py <out.jpg> png ..."""
import sys
from PIL import Image, ImageDraw
out, ps = sys.argv[1], sys.argv[2:]
H = 640
tiles = []
for p in ps:
    im = Image.open(p).convert("RGBA")
    im = im.resize((max(1, round(im.width * H / im.height)), H), Image.LANCZOS)
    bg = Image.new("RGBA", (im.width + 20, H + 20), (40, 160, 200, 255))
    ImageDraw.Draw(bg).rectangle((0, (H + 20) // 2, im.width + 20, H + 20), fill=(230, 90, 160, 255))
    bg.alpha_composite(im, (10, 10))
    tiles.append(bg)
W = sum(t.width for t in tiles) + 8 * len(tiles)
page = Image.new("RGB", (W, H + 20), (20, 20, 20))
x = 0
for t in tiles:
    page.paste(t.convert("RGB"), (x, 0)); x += t.width + 8
page.save(out, quality=88)
print(page.size)
