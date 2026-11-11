"""Put the games and the party packages into bamboo-cask.html.

usage: python -I play_embed.py ../bamboo-cask.html

The code lives in build/src (play.css, play.js, party.js, play-data.json from play_data.py) and goes into
the page between markers, so running this again replaces it. The first run also wires it into the page:
the two menu sections, the two dialogs, the keys, and the game reward on the order totals.
"""
import sys, os, re, json
P = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
src = lambda f: open(os.path.join(here, "src", f), encoding="utf-8").read()
s = open(P, encoding="utf-8", newline="").read()

def block(begin, end, body, anchor, before=True):
    """replace what is between the markers, or put the markers in at the anchor"""
    global s
    if begin in s:
        i, j = s.index(begin), s.index(end) + len(end)
        s = s[:i] + begin + body + end + s[j:]
    else:
        assert s.count(anchor) == 1, anchor[:60]
        new = begin + body + end
        s = s.replace(anchor, (new + "\n" + anchor) if before else (anchor + "\n" + new))

def once(old, new, n=1):
    """a one-time edit; skipped when it has already been made"""
    global s
    if new in s:
        return
    c = s.count(old)
    if c != n:
        sys.exit("expected %d of %r, found %d" % (n, old[:80], c))
    s = s.replace(old, new)

data = json.dumps(json.load(open(os.path.join(here, "src", "play-data.json"), encoding="utf-8")), ensure_ascii=False, separators=(",", ":"))
data = data.replace("</", "<\\/")
block("/*<play-css>*/", "/*</play-css>*/", "\n" + src("play.css") + "\n", "\n</style>")
block("<!--play-->", "<!--/play-->", '''
<div class="modal" id="play" role="dialog" aria-modal="true" aria-labelledby="play-name" hidden>
  <div class="modal__card stage" id="play-card"></div>
</div>
<div class="modal" id="plan" role="dialog" aria-modal="true" aria-labelledby="plan-name" hidden>
  <div class="modal__card k-theme plan-card" id="plan-card"></div>
</div>
''', "\n<!-- product detail -->", before=False)
block("/*<play-js>*/", "/*</play-js>*/", "\nvar PLAYD = " + data + ";\n" + src("play.js") + "\n" + src("party.js") + '''
/* the reward a game won: 5% off the food, one code per order */
function discount(){ var c=store.get("bc-code",null); if(!c || !c.code) return 0; return Math.round(lines().reduce(function(s,l){ return s+(FOODCAT[l.item.cat] ? l.qty*l.item.price : 0); },0)*PLAYD.reward.percent/100); }
function discLine(){ var d=discount(); return d ? '<div class="line disc"><span>Game reward, '+esc(PLAYD.reward.code)+"<small>"+PLAYD.reward.percent+'% off the food</small></span><span class="p">−'+KES(d)+"</span></div>" : ""; }
function sheetsOpen(){ return !$("pd").hidden || PLAY.isOpen() || PLAN.isOpen(); }
$("play").addEventListener("click", PLAY.onClick);
$("play").addEventListener("submit", PLAY.onSubmit);
$("play").addEventListener("input", PLAY.onInput);
$("plan").addEventListener("click", PLAN.onClick);
$("plan").addEventListener("input", PLAN.onInput);
$("plan").addEventListener("change", PLAN.onChange);
document.addEventListener("keyup", function(e){ PLAY.onKey(e); });
document.addEventListener("click", function(e){
  var t=e.target.closest("[data-play],[data-gkind],[data-lopen],[data-locc-open]"); if(!t || t.closest("#play,#plan")) return;
  if(t.hasAttribute("data-play")) PLAY.open(t.getAttribute("data-play"));
  else if(t.hasAttribute("data-gkind")) PLAY.setKind(t.getAttribute("data-gkind"));
  else if(t.hasAttribute("data-lopen")) PLAN.open(null);
  else PLAN.open(t.getAttribute("data-locc-open"), 1);
});
''', "/* ===================== product detail ===================== */")

# the two sections in the menu
once('''  {id:"breakfast", name:"Breakfast and hot drinks",''', '''  {id:"party", name:"Party packages", kind:"party", note:"Eight occasions, from a match night for twelve to a ruracio for eighty, priced from the menu."},
  {id:"breakfast", name:"Breakfast and hot drinks",''')
once('''var FOODCAT={today:1, who:1, breakfast:1,''', '''var FOODCAT={today:1, who:1, party:1, breakfast:1,''')
if '{id:"games"' not in s:
    m = re.search(r'(\n  \{id:"rooms", name:"Rooms", kind:"rooms"[^\n]*?\})(,?)\n', s)
    s = (s[:m.start()] + m.group(1) + ',\n  {id:"games", name:"Games", kind:"games", pill:"Win 5% off", note:"Quizzes, party games and skill games for the table. Solo, or in teams on one phone."}'
         + m.group(2) + "\n" + s[m.end():])
once('''    else if(c.kind==="rooms") h+=roomsHtml();''', '''    else if(c.kind==="rooms") h+=roomsHtml();
    else if(c.kind==="party") h+=PLAN.sectionHtml();
    else if(c.kind==="games") h+=PLAY.hubHtml();''')
once('''    if(i===2 || c.kind==="rooms") side.insertAdjacentHTML''', '''    if(c.id==="breakfast" || c.kind==="rooms") side.insertAdjacentHTML''')
once('''var LUX = {bar:"cask", soft:"cask", rooms:"claret"};''', '''var LUX = {bar:"cask", soft:"cask", rooms:"claret", games:"play"};''')
once('''function isSig(c){ return c.id==="bar" || c.kind==="rooms"; }''', '''function isSig(c){ return c.id==="bar" || c.kind==="rooms" || c.kind==="games"; }''')
once('''  var strip = k==="claret" ? ["Upstairs at Keiyo Road","Standard and Deluxe","Book on WhatsApp"] :''',
     '''  var strip = k==="play" ? [PLAY.count()+" games","Solo or in teams","Win 5% off the food"] : k==="claret" ? ["Upstairs at Keiyo Road","Standard and Deluxe","Book on WhatsApp"] :''')

# the dialogs: the page behind them is locked, and the order bar hides
once('''  var gate=!$("gate").hidden, pdOn=!$("pd").hidden, ov=''', '''  var gate=!$("gate").hidden, pdOn=sheetsOpen(), ov=''')
once('''  $("fbar").classList.toggle("is-shown", n>0 && current==="menu" && !drawerOpen && $("pd").hidden);''', '''  $("fbar").classList.toggle("is-shown", n>0 && current==="menu" && !drawerOpen && !sheetsOpen());''')
once('''document.addEventListener("keydown",function(e){
  if(!$("lb").hidden && $("gate").hidden){''', '''document.addEventListener("keydown",function(e){
  if($("gate").hidden && (PLAY.onKey(e) || PLAN.onKey(e))) return;
  if(!$("lb").hidden && $("gate").hidden){''')
once('''  if(!$("pd").hidden) closePD();
  refreshBar();''', '''  if(!$("pd").hidden) closePD();
  PLAY.close(); PLAN.close();
  refreshBar();''')

# the reward on the order
once('''function total(){ return subtotal()+delivery(); }''', '''function total(){ return subtotal()+delivery()-discount(); }''')
once('''(mode!=="delivery"?"Free":a?KES(delivery()):"Add location")+'</span></div><div class="line grand">''',
     '''(mode!=="delivery"?"Free":a?KES(delivery()):"Add location")+'</span></div>'+discLine()+'<div class="line grand">''', n=2)
once('''    subtotal:subtotal(), delivery:delivery(), total:total(), alcohol:hasAlcohol(),''', '''    subtotal:subtotal(), delivery:delivery(), discount:discount(), code:discount()?PLAYD.reward.code:null, total:total(), alcohol:hasAlcohol(),''')
once('''    order=o; store.set("bc-order",order);''', '''    order=o; store.set("bc-order",order); if(o.discount) store.del("bc-code");''')
once('''.totals .line.grand{''', '''.totals .line.disc small{display:block;font-size:12px;font-weight:600;color:var(--ink-3)}
.totals .line.disc .p{color:var(--bamboo)}
.totals .line.grand{''')

# the events card points at the planner
once('''<div class="xcta"><a class="btn btn--wa" data-wa="Hi Bamboo Cask, I'm planning an event.''', '''<div class="xcta"><button type="button" class="btn btn--amber" data-goto="party">Use the party planner</button><a class="btn btn--wa" data-wa="Hi Bamboo Cask, I'm planning an event.''')

# the games and party cards' photos (play.js and party.js credit each one under its section)
FOOT = "A few bottle photos come from Wikimedia Commons, with the credit on each bottle."
FOOT_NOW = FOOT + " Some game and party photos come from Pexels, credited under each section.</p>"
if FOOT_NOW not in s:
    for old in (FOOT + " Some game photos come from Pexels, credited under the games.</p>", FOOT + "</p>"):
        if old in s:
            s = s.replace(old, FOOT_NOW)
            break
    else:
        sys.exit("footer credit line not found")

open(P, "w", encoding="utf-8", newline="").write(s)
print("embedded", len(s), "bytes")
