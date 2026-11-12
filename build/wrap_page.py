"""Wrap the page into a full HTML document for a plain web host (Vercel, or a local server).

usage: python -I wrap_page.py ../bamboo-cask.html ../index.html

bamboo-cask.html is written without <html>, <head> or <body>, the way the artifact host wants it.
Everything before its first <style> (the <title>, <meta>, <link> tags and the early theme script)
goes into <head>, so link previews and browsers find the title and description where they expect
them. The rest goes into <body>. The small reset matches the artifact host's, so both look the same.
"""
import sys

src, dst = sys.argv[1], sys.argv[2]
page = open(src, encoding="utf-8", newline="").read()
cut = page.index("<style")
lead, body = page[:cut].strip(), page[cut:]
assert lead.startswith("<title>"), "the page should start with its <title>"
reset = (
    '<meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);'
    'padding-bottom:env(safe-area-inset-bottom,0px)}'
    'body{margin:0;font:14px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
    'img{max-width:100%}[hidden]{display:none!important}</style>'
)
out = '<!doctype html><html lang="en"><head>' + reset + "\n" + lead + "\n</head><body>" + body + "</body></html>\n"
open(dst, "w", encoding="utf-8", newline="").write(out)
print("wrote", dst, len(out), "chars")
