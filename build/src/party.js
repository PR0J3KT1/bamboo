/* ===================== party packages ===================== */
/* The party planner: pick the occasion and the guests,
   and it works out the choma, the sides and the drinks from the menu, at the lounge's prices. Every line
   can be swapped or changed, and the whole party goes into the order in one go. Under 18: food, sodas and
   water only. Quantities are an estimate; the lounge confirms big parties on WhatsApp. */
var PLAN = (function(){
  var OCC = [
    {id:"birthday", name:"Birthday Bash", sw:"Birthday ya mbogi", line:"Cake, a toast and a night that goes long.", hue:"#B83A68", icon:"cake", guests:25, hours:5, sober:15, crowd:"mixed", spirits:["vodka","whisky"], extras:["toast","shots"], meats:["mbc","cw"], sides:["ug","d1","kg"]},
    {id:"nyama", name:"Nyama Choma", sw:"Nyama na mbogi", line:"Smoke off the grill, a long table and the beer cold.", hue:"#B4421D", icon:"flame", guests:20, hours:6, sober:10, crowd:"beer", spirits:["whisky"], extras:[], meats:["mbc","bfc"], sides:["ug","kg","d1"]},
    {id:"ruracio", name:"Ruracio and Harusi", sw:"Sherehe ya familia", line:"Bubbles for the toast, cognac for the wazee, kienyeji for everyone.", hue:"#8E3552", icon:"rings", guests:80, hours:6, sober:35, crowd:"mixed", spirits:["whisky","brandy"], extras:["toast"], meats:["mbc","kc"], sides:["ug","rc","kg"]},
    {id:"match", name:"Match Night", sw:"Kick-off saa nne", line:"Beer for the match, a vodka for half time, wings to share.", hue:"#2B6E36", icon:"ball", guests:12, hours:3, sober:10, crowd:"beer", spirits:["vodka"], extras:[], meats:["pk","cw"], sides:["mc","d1"]},
    {id:"office", name:"Office Party", sw:"End-year ya ofisi", line:"Crowd-pleasers that go the distance, and sodas for the drivers.", hue:"#1F4A80", icon:"tie", guests:40, hours:4, sober:25, crowd:"mixed", spirits:["vodka","gin"], extras:["toast"], meats:["mbc","kc"], sides:["ug","d1","kg"]},
    {id:"sundowner", name:"Sundowner", sw:"Balcony, 6:40pm", line:"Gin and tonic, fish off the grill and the last of the light.", hue:"#B86A1E", icon:"sun", guests:10, hours:3, sober:10, crowd:"spirits", spirits:["gin"], extras:[], meats:["wf","cw"], sides:["d1","gr"]},
    {id:"graduation", name:"Graduation", sw:"Mtoto amemaliza!", line:"Family, photos and a toast to the graduate.", hue:"#4F3A7C", icon:"cap", guests:30, hours:5, sober:35, crowd:"wine", spirits:["whisky"], extras:["toast"], meats:["mbc","kc"], sides:["ug","rc","kg"]},
    {id:"newyear", name:"New Year", sw:"Mpaka asubuhi", line:"Countdown bubbles, a shots round and energy for 3am.", hue:"#8C6A1E", icon:"spark", guests:30, hours:10, sober:10, crowd:"spirits", spirits:["vodka","tequila","whisky"], extras:["toast","shots","energy"], meats:["mbc","pk"], sides:["ug","d1","kg"]}
  ];
  var CROWDS = {beer:{name:"Mostly beer", sw:"Baridi baridi", split:{beer:.65, wine:.15, spirits:.2}}, mixed:{name:"A bit of everything", sw:"Kidogo ya kila kitu", split:{beer:.4, wine:.25, spirits:.35}},
    spirits:{name:"Spirits first", sw:"Mzinga na mixer", split:{beer:.2, wine:.2, spirits:.6}}, wine:{name:"Wine lovers", sw:"Glasi ya wine", split:{beer:.15, wine:.6, spirits:.25}}};
  var TIERS = {pocket:{name:"Pocket-friendly", sw:"Bajeti poa", line:"The best-value bottle on each shelf."}, classic:{name:"Classic", sw:"Zile tunajua", line:"The house favourite where the lounge has one, or a middle-of-the-shelf bottle."},
    premium:{name:"Premium", sw:"Tunaenda juu", line:"The best bottle on each shelf, up to KES 15,000."}};
  var SPIRITS = [["whisky","Whisky"],["vodka","Vodka"],["gin","Gin"],["tequila","Tequila"],["rum","Rum"],["brandy","Cognac and brandy"]];
  var EXTRAS = {toast:["A toast","Sparkling wine, a glass each for the speech"], shots:["A round of shots","Tequila, two each"], energy:["Energy for late","Red Bull for the late shift"]};
  var MEATS = [["mbc","Mbuzi choma"],["bfc","Beef choma"],["pk","Pork choma"],["hgp","Honey-glazed pork"],["kc","Kienyeji chicken"],["cw","Chicken wings"],["wf","Whole fish"]];
  var SIDES = [["ug","Ugali",2],["d1","Chips",3],["kg","Kienyeji greens",3],["gr","Greens",3],["mc","Masala chips",3],["rc","Rice",3],["pl","Plantain",4]];
  var HOURS = [2,3,4,5,6,8,10];
  var STEPS = ["The occasion","Guests","Food and drinks","Budget","Your package"];
  var MIX = {gin:{re:/^tonic/i, per:2}, vodka:{re:/^soda$/i, per:6}, whisky:{re:/^soda$/i, per:6}, rum:{re:/^soda$/i, per:6}, brandy:{re:/^soda$/i, per:6}};
  var ICON = {
    cake:'<path d="M5 20h14v-7H5z"/><path d="M5 16c2 1.4 4.6 1.4 7 0s5-1.4 7 0M12 13V9M12 6.5c.8-.9.8-2 0-3-.8 1-.8 2.1 0 3z"/>',
    flame:'<path d="M12 3c.9 3.3 5 5.3 5 10a5 5 0 0 1-10 0c0-2.4 1.2-3.9 2.5-5 .2 1.8 1 2.8 2 3.2C11 8.6 11.3 5.7 12 3z"/>',
    rings:'<circle cx="9" cy="14" r="5"/><circle cx="15" cy="14" r="5"/><path d="M10 5l2-2 2 2-2 3z"/>',
    ball:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l3.5 2.6-1.3 4.1H9.8l-1.3-4.1zM12 3.5v4M20.2 9.4l-4.7.7M17 19.5l-2.8-5.3M7 19.5l2.8-5.3M3.8 9.4l4.7.7"/>',
    tie:'<path d="M10 3h4l-1 3h-2z"/><path d="M11 6l-2.5 11L12 21l3.5-4L13 6"/>',
    sun:'<circle cx="12" cy="14" r="4.5"/><path d="M3 19h18M12 4.5v2.5M5.3 7.3l1.8 1.8M18.7 7.3l-1.8 1.8M2.5 14H5M19 14h2.5"/>',
    cap:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M21 9v6"/>',
    spark:'<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>'
  };
  function icon(k){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICON[k]||ICON.spark)+"</svg>"; }
  /* each occasion's photo, from Pexels (the page numbers are for the credit). Two of them show a drink,
     so under-18s see the lounge's own events room and garden there instead. */
  var PEX = {birthday:"28863293", nyama:"14887967", ruracio:"35516036", match:"36766071", office:"8555215", sundowner:"36729891", graduation:"19837484", newyear:"5970895"};
  var U18 = {office:1, sundowner:1}, PHW = {match:791, newyear:696, "office-u18":579, "sundowner-u18":529};
  function phKey(id){ return U18[id] && adult!==true ? id+"-u18" : id; }
  function photo(id, sizes){
    var k=phKey(id);
    return '<img class="pkph" src="party/'+k+'.webp" srcset="party/'+k+"-sm.webp 480w, party/"+k+".webp "+(PHW[k]||800)+'w" sizes="'+sizes+'" alt="" loading="lazy" decoding="async">';
  }
  function creditHtml(){
    var ids=OCC.map(function(o){ return o.id; }).filter(function(id){ return phKey(id)===id; });
    return "Photos from Pexels: "+ids.map(function(id){ return '<a href="https://www.pexels.com/photo/'+PEX[id]+'/" target="_blank" rel="noopener">'+esc(occ(id).name)+"</a>"; }).join(" · ")+
      (ids.length<OCC.length ? ". The others are the lounge’s own." : "");
  }
  function occ(id){ for(var i=0;i<OCC.length;i++) if(OCC[i].id===id) return OCC[i]; return OCC[0]; }
  function fromOcc(o, tier){ return {occ:o.id, guests:o.guests, hours:o.hours, sober:o.sober, crowd:o.crowd, spirits:o.spirits.slice(), extras:o.extras.slice(), meats:o.meats.slice(), sides:o.sides.slice(), tier:tier||"classic"}; }
  var P = store.get("bc-plan", null);
  if(!P || !P.I || !P.I.meats) P = {I:fromOcc(OCC[0]), swaps:{}, adj:{}, step:0, chama:1, budget:null};
  function keep(){ store.set("bc-plan", P); }

  /* ---------- the bottles the planner can reach for ---------- */
  var POOLS = null;
  function ml(it){ var m=/(\d+(?:\.\d+)?)\s*(ml|litre)/i.exec(it.size||""); return !m ? 0 : /ml/i.test(m[2]) ? +m[1] : Math.round(+m[1]*1000); }
  function shelfOf(id){
    var it=ITEMS[id]; if(it.shelf && it.shelf!=="house") return it.shelf;
    var k=(it.kind||"")+" "+it.name;
    return /whisk/i.test(k)?"whisky":/vodka/i.test(k)?"vodka":/\brum\b/i.test(k)?"rum":/wine/i.test(k)?"wine":/\bgin\b/i.test(k)?"gin":"";
  }
  function pools(){
    if(POOLS) return POOLS;
    POOLS={};
    var house=["k6","k5","k3","k4","k1","k2"].filter(function(k){ return ITEMS[k]; });
    BAR.concat(house.filter(function(k){ return BAR.indexOf(k)<0; })).forEach(function(id){
      var it=ITEMS[id], sh=shelfOf(id), m=ml(it); if(!sh || !it.price) return;
      var ok = sh==="beer" ? /bottle/i.test(it.size||"") && !/small/i.test(it.size||"") : (m>=700 && m<=1000);
      if(!ok) return;
      (POOLS[sh]=POOLS[sh]||[]).push(id);
    });
    Object.keys(POOLS).forEach(function(k){ POOLS[k].sort(function(a,b){ return ITEMS[a].price-ITEMS[b].price; }); });
    return POOLS;
  }
  function byTier(pool, tier){
    if(!pool || !pool.length) return null;
    if(tier==="pocket") return pool[0];
    if(tier==="premium"){ var ok=pool.filter(function(id){ return ITEMS[id].price<=15000; }); return ok.length ? ok[ok.length-1] : pool[0]; }
    for(var i=0;i<pool.length;i++) if(/^k\d$/.test(pool[i])) return pool[i];
    return pool[Math.floor(pool.length/2)];
  }
  function perBottle(id, sh){ var m=ml(ITEMS[id])||750; return sh==="wine" ? Math.round(m/150) : sh==="champagne" ? Math.round(m/125) : Math.round(m/47); }
  function soft(re, prefer){ var xs=SOFT.filter(function(id){ return re.test(ITEMS[id].name); }); if(prefer){ var p=xs.filter(function(id){ return prefer.test(ITEMS[id].size||""); }); if(p.length) return p[0]; } return xs[0]||null; }
  function dname(id){ var it=ITEMS[id]; return it.name+((it.cat==="bar"||it.cat==="soft") && it.size && it.name.indexOf(it.size)<0 ? ", "+it.size : ""); }
  function kgText(k){ return (k%1 ? (Math.floor(k)?Math.floor(k)+"½":"½") : String(k))+" kg"; }

  /* ---------- the plan ---------- */
  function build(I, swaps, adj){
    swaps=swaps||{}; adj=adj||{};
    var POOL=pools(), lines=[], alc=adult===true;
    var drinkers=alc ? Math.round(I.guests*(1-I.sober/100)) : 0, sober=I.guests-drinkers;
    var per=2+Math.min(I.hours-1,5)+Math.max(0,I.hours-6)*0.5, poured=Math.round(drinkers*per);
    function add(l){ var q=adj[l.slot]!=null ? adj[l.slot] : l.qty; if(q>0 || adj[l.slot]!=null){ l.qty=Math.max(0,q); l.alts=l.alts||[]; lines.push(l); } return l; }
    function choose(slot, pool){ var s=swaps[slot]; return s && pool.indexOf(s)>=0 ? s : byTier(pool, I.tier); }
    function find(slot){ for(var i=0;i<lines.length;i++) if(lines[i].slot===slot) return lines[i]; return null; }

    /* from the kitchen: a share of the guests for each meat, and sides for everyone */
    var meats=I.meats.filter(function(m){ return FAM[m] || ITEMS[m]; }), kgHead=I.hours>=5 ? 0.4 : 0.3;
    meats.forEach(function(m){
      var share=I.guests/meats.length, who=Math.round(share)+(Math.round(share)===1?" guest":" guests");
      if(m==="kc") add({slot:"food:kc", group:"food", id:"kc-w", qty:Math.ceil(share/4), why:"a whole bird for every 4, "+who});
      else if(m==="cw") add({slot:"food:cw", group:"food", id:"cw-c", qty:Math.ceil(share/2), why:"a portion for every 2, "+who});
      else if(m==="wf") add({slot:"food:wf", group:"food", id:"wf", qty:Math.ceil(share/2), why:"a fish for every 2, "+who});
      else {
        var kg=Math.max(0.5, Math.round(share*kgHead*2)/2), whole=Math.floor(kg);
        if(whole) add({slot:"food:"+m, group:"food", id:m+"-1", qty:whole, why:kgText(kg)+" in all, about "+(kgHead*1000)+" g a head for "+who});
        if(kg%1) add({slot:"food:"+m+":h", group:"food", id:m+"-h", qty:1, why:whole?"to make up the "+kgText(kg):"about "+(kgHead*1000)+" g a head for "+who});
      }
    });
    I.sides.forEach(function(s){ var d=SIDES.filter(function(x){ return x[0]===s; })[0]; if(d && ITEMS[s]) add({slot:"side:"+s, group:"food", id:s, qty:Math.max(1,Math.ceil(I.guests/d[2])), why:"one for every "+d[2]+" guests"}); });

    /* from the bar, shared out the way the crowd drinks */
    var mixers={};
    function mixer(id, n, why){ if(!id || n<=0) return; var m=mixers[id]||(mixers[id]={id:id, qty:0, for:[]}); m.qty+=n; if(m.for.indexOf(why)<0) m.for.push(why); }
    if(alc && drinkers){
      var split={beer:CROWDS[I.crowd].split.beer, wine:CROWDS[I.crowd].split.wine, spirits:CROWDS[I.crowd].split.spirits};
      var sp=I.spirits.filter(function(s){ return POOL[s] && POOL[s].length; });
      if(!sp.length){ var k=1/(split.beer+split.wine); split.beer*=k; split.wine*=k; split.spirits=0; }
      var sd=Math.round(poured*split.spirits);
      sp.forEach(function(s){
        var share=Math.round(sd/sp.length), id=choose("spirit:"+s, POOL[s]); if(!id || !share) return;
        var dpb=perBottle(id,s), n=Math.max(1,Math.ceil(share/dpb)), name=SPIRITS.filter(function(x){ return x[0]===s; })[0][1].toLowerCase();
        add({slot:"spirit:"+s, group:"bar", id:id, qty:n, why:"about "+n*dpb+" drinks", alts:POOL[s]});
        var mx=MIX[s]; if(mx) mixer(soft(mx.re,/plastic/i), Math.ceil((adj["spirit:"+s]!=null?adj["spirit:"+s]:n)*dpb/mx.per), "the "+name);
      });
      if(I.extras.indexOf("shots")>=0 && POOL.tequila){
        var tq=find("spirit:tequila"), sid=tq ? tq.id : choose("shots", POOL.tequila), sn=Math.max(1,Math.ceil(drinkers*2/Math.max(1,Math.floor((ml(ITEMS[sid])||750)/30))));
        if(tq && adj["spirit:tequila"]==null){ tq.qty+=sn; tq.why+=", and a shots round"; }
        else add({slot:"shots", group:"bar", id:sid, qty:sn, why:"a round of shots, two each", alts:POOL.tequila});
      }
      if(I.extras.indexOf("toast")>=0 && POOL.champagne){ var tn=Math.max(1,Math.ceil(drinkers/6)); add({slot:"bubbles", group:"bar", id:choose("bubbles", POOL.champagne), qty:tn, why:"a toast, a glass each", alts:POOL.champagne}); }
      var wg=Math.round(poured*split.wine);
      if(wg && POOL.wine){ var wid=choose("wine", POOL.wine), wn=Math.ceil(wg/perBottle(wid,"wine")); add({slot:"wine", group:"bar", id:wid, qty:wn, why:"about "+wn*perBottle(wid,"wine")+" glasses", alts:POOL.wine}); }
      var bb=Math.round(poured*split.beer);
      if(bb && POOL.beer) add({slot:"beer", group:"bar", id:choose("beer", POOL.beer), qty:bb, why:"cold, by the bottle", alts:POOL.beer});
    }
    Object.keys(mixers).forEach(function(id){ var m=mixers[id]; add({slot:"mix:"+id, group:"soft", id:id, qty:m.qty, why:"mixer for "+m.for.join(" and ")}); });
    if(sober){
      var soda=soft(/^soda$/i,/plastic/i);
      if(soda){ var n2=Math.ceil(sober*(1+I.hours*0.6)/6), had=find("mix:"+soda);
        if(had && adj["mix:"+soda]==null){ had.qty+=n2; had.why+=", and sodas for "+sober+" not drinking"; }
        else if(!had) add({slot:"mix:"+soda, group:"soft", id:soda, qty:n2, why:alc?"sodas for the "+sober+" not drinking":"sodas for everyone"}); }
    }
    if(alc && drinkers && I.extras.indexOf("energy")>=0){ var rb=soft(/^red bull/i); if(rb) add({slot:"energy", group:"soft", id:rb, qty:Math.ceil(drinkers/3), why:"for the late shift"}); }
    var water=soft(/^drinking water/i,/large/i);
    if(water) add({slot:"water", group:"soft", id:water, qty:Math.max(1,Math.ceil(I.guests/4)), why:"water on every table"});

    var shown=lines.filter(function(l){ return l.qty>0; });
    function sum(g){ return shown.filter(function(l){ return !g || l.group===g; }).reduce(function(s,l){ return s+ITEMS[l.id].price*l.qty; },0); }
    return {lines:lines, drinkers:drinkers, sober:sober, poured:poured, food:sum("food"), bar:sum("bar"), soft:sum("soft"), total:sum()};
  }
  function plan(){ return build(P.I, P.swaps, P.adj); }

  /* ---------- the section in the menu ---------- */
  function sectionHtml(){
    var h='<div class="pk" data-search="party packages planner plan birthday ruracio harusi wedding graduation office match night new year sundowner nyama choma sherehe event celebration">';
    h+='<div class="pk__top"><p class="pk__lede">Pick the occasion and the number of guests. The planner works out the choma, the sides'+(adult===true?" and the drinks":", the sodas and the water")+' from the menu, at the lounge’s prices. Swap anything, then add the whole party to your order.</p><button type="button" class="btn btn--amber" data-lopen>Plan a party</button></div>';
    h+='<div class="pk__grid">'+OCC.map(function(o){
      var b=build(fromOcc(o,"classic"));
      return '<article class="pkc" style="--hue:'+o.hue+'"><button type="button" class="pkc__band" data-locc-open="'+o.id+'" aria-label="Plan a '+esc(o.name)+'">'+photo(o.id,"(max-width: 600px) 100vw, 340px")+'<span class="pkc__ic">'+icon(o.icon)+'</span><span class="pkc__g">'+o.guests+" guests</span></button>"+
        '<div class="pkc__b"><p class="pkc__sw">'+esc(o.sw)+'</p><h3 class="pkc__n">'+esc(o.name)+'</h3><p class="pkc__l">'+esc(o.line)+"</p>"+
        '<p class="pkc__m">'+o.guests+" guests · "+hoursText(o.hours)+" · "+esc(nameList(o.meats,MEATS))+"</p>"+
        '<div class="pkc__f"><span class="kprice">'+KES(b.total)+'<small>about '+KES(Math.ceil(b.total/o.guests/10)*10)+" a head</small></span>"+
        '<button type="button" class="btn btn--ghost pkc__go" data-locc-open="'+o.id+'">Plan it</button></div></div></article>';
    }).join("")+'</div><p class="pk__credit">'+creditHtml()+"</p></div>";
    return h;
  }
  function nameList(ids, from){ return ids.map(function(k){ var x=from.filter(function(f){ return f[0]===k; })[0]; return x?x[1]:k; }).join(" and "); }
  function hoursText(h){ return h>=10 ? "till morning" : h+" hours"; }

  /* ---------- the planner ---------- */
  function open(occId, step){
    if(occId){ var keepSw=P.swaps; P.I=fromOcc(occ(occId), P.I.tier||"classic"); P.adj={}; P.swaps=keepSw||{}; P.step=step==null?1:step; }
    rememberFocus("plan"); keep();
    $("plan").hidden=false; syncLayers(); refreshBar(); render();
    var f=$("plan-card").querySelector("[data-auto]")||$("plan-card").querySelector(".x"); if(f) f.focus();
  }
  function close(){ if($("plan").hidden) return; $("plan").hidden=true; syncLayers(); refreshBar(); returnFocus("plan", "[data-lopen]"); }
  function render(focusSel){
    var c=$("plan-card"), b=plan(), I=P.I, o=occ(I.occ), last=P.step===STEPS.length-1;
    var fk=null, a=document.activeElement; if(a && c.contains(a)){ ["data-lstep","data-locc","data-lhours","data-lmeat","data-lside","data-lcrowd","data-lspirit","data-lextra","data-ltier","data-lg","data-qadj","data-qswap","data-lchama"].forEach(function(k){ if(!fk && a.hasAttribute(k)) fk="["+k+'="'+a.getAttribute(k)+'"]'+(a.hasAttribute("data-d")?'[data-d="'+a.getAttribute("data-d")+'"]':""); }); if(!fk && a.id) fk="#"+a.id; }
    var h='<button type="button" class="x" data-lx aria-label="Close the planner">×</button>';
    h+='<div class="pl-head" style="--hue:'+o.hue+'"><p class="eyebrow">Party packages</p><h2 class="ktitle" id="plan-name">Plan the party</h2><p class="pl-sum">'+esc(o.name)+" · "+I.guests+" guests · "+hoursText(I.hours)+"</p></div>";
    h+='<ol class="pl-rail">'+STEPS.map(function(s,i){ return '<li><button type="button" class="pl-step'+(i===P.step?" is-on":"")+(i<P.step?" is-done":"")+'" data-lstep="'+i+'"'+(i===P.step?' aria-current="step"':"")+"><i>"+(i<P.step?"✓":i+1)+"</i><span>"+s+"</span></button></li>"; }).join("")+"</ol>";
    h+='<div class="pl-body">'+STEP[P.step](b)+"</div>";
    h+='<div class="pl-foot"><div class="pl-tot"><b>'+KES(b.total)+"</b><span>"+I.guests+" guests · about "+KES(Math.ceil(b.total/Math.max(1,I.guests)/10)*10)+" a head</span></div><div class=\"pl-nav\">"+
      (P.step>0 && P.step<3?'<button type="button" class="textbtn" data-lskip>Skip to the package</button>':"")+(P.step>0?'<button type="button" class="btn btn--ghost" data-lback>Back</button>':"")+
      (last?'<button type="button" class="btn btn--amber" data-ladd>Add it all to the order</button>':'<button type="button" class="btn btn--amber" data-lnext data-auto>Next: '+STEPS[P.step+1].toLowerCase()+"</button>")+"</div></div>";
    c.innerHTML=h; fillPhotos(c);
    var f=(focusSel && c.querySelector(focusSel)) || (fk && c.querySelector(fk)); if(f) f.focus({preventScroll:true});
  }
  function chips(attr, list, on, label){ return '<div class="pl-chips" role="group" aria-label="'+label+'">'+list.map(function(x){ var is=on.indexOf(x[0])>=0; return '<button type="button" class="kpill'+(is?" is-on":"")+'" '+attr+'="'+x[0]+'" aria-pressed="'+is+'">'+esc(x[1])+"</button>"; }).join("")+"</div>"; }
  var STEP = [
    function(){
      return '<h3 class="pl-q">What’s the occasion? <em>Pick one and the planner fills in the rest.</em></h3><div class="pl-occ">'+OCC.map(function(o){
        var on=o.id===P.I.occ;
        return '<button type="button" class="pl-o'+(on?" is-on":"")+'" data-locc="'+o.id+'" aria-pressed="'+on+'" style="--hue:'+o.hue+'"><span class="pl-o__ph">'+photo(o.id,"220px")+'<span class="pl-o__i">'+icon(o.icon)+'</span></span><b>'+esc(o.name)+"</b><small>"+esc(o.sw)+"</small><em>"+o.guests+" guests · "+hoursText(o.hours)+"</em></button>"; }).join("")+"</div>";
    },
    function(b){
      var I=P.I, h='<h3 class="pl-q">How many guests? <em>Count everyone'+(adult===true?", even the ones not drinking":"")+".</em></h3>";
      h+='<div class="pl-count"><button type="button" class="pl-round" data-lg="-1" aria-label="One fewer guest">−</button><output id="pl-g">'+I.guests+'</output><button type="button" class="pl-round" data-lg="1" aria-label="One more guest">+</button></div>';
      h+='<input class="pl-range" id="pl-guests" type="range" min="2" max="300" value="'+I.guests+'" aria-label="Guests">';
      h+='<h4 class="pl-sub">How long does it go?</h4><div class="pl-chips" role="group" aria-label="Hours">'+HOURS.map(function(x){ return '<button type="button" class="kpill'+(I.hours===x?" is-on":"")+'" data-lhours="'+x+'" aria-pressed="'+(I.hours===x)+'">'+hoursText(x)+"</button>"; }).join("")+"</div>";
      if(adult===true) h+='<h4 class="pl-sub">Not drinking <small>drivers, wazee and the teetotal</small></h4><div class="pl-sober"><input class="pl-range" id="pl-sober" type="range" min="0" max="60" step="5" value="'+I.sober+'" aria-label="Percent not drinking"><output id="pl-s">'+I.sober+"%, "+b.sober+" guests</output></div>";
      return h;
    },
    function(){
      var I=P.I, h='<h3 class="pl-q">Food and drinks <em>The meat, the sides'+(adult===true?", and how the crowd drinks":"")+".</em></h3>";
      h+='<h4 class="pl-sub">The meat <small>shared between the ones you pick</small></h4>'+chips("data-lmeat", MEATS, I.meats, "Meat");
      h+='<h4 class="pl-sub">Sides</h4>'+chips("data-lside", SIDES, I.sides, "Sides");
      if(adult===true){
        h+='<h4 class="pl-sub">How does the crowd drink?</h4><div class="pl-crowd">'+Object.keys(CROWDS).map(function(k){ var c=CROWDS[k], on=I.crowd===k;
          return '<button type="button" class="pl-cr'+(on?" is-on":"")+'" data-lcrowd="'+k+'" aria-pressed="'+on+'"><b>'+esc(c.name)+"</b><small>"+esc(c.sw)+"</small><span>"+Math.round(c.split.beer*100)+"% beer · "+Math.round(c.split.wine*100)+"% wine · "+Math.round(c.split.spirits*100)+"% spirits</span></button>"; }).join("")+"</div>";
        h+='<h4 class="pl-sub">The spirits <small>pick as many as you like</small></h4>'+chips("data-lspirit", SPIRITS, I.spirits, "Spirits");
        h+='<h4 class="pl-sub">Extras</h4>'+chips("data-lextra", Object.keys(EXTRAS).map(function(k){ return [k, EXTRAS[k][0]]; }), I.extras, "Extras");
      } else h+='<p class="pl-note">Sodas and water for everyone. The Cask Room is hidden because you said you are under 18.</p>';
      return h;
    },
    function(){
      var I=P.I, h='<h3 class="pl-q">The budget <em>'+(adult===true?"The same party, three ways to pour it.":"The package is food, sodas and water.")+"</em></h3>";
      if(adult===true) h+='<div class="pl-tiers">'+Object.keys(TIERS).map(function(k){ var t=TIERS[k], on=I.tier===k, bk=build(Object.assign({},I,{tier:k}), {}, {});
        return '<button type="button" class="pl-tier'+(on?" is-on":"")+'" data-ltier="'+k+'" aria-pressed="'+on+'"><small>'+esc(t.sw)+"</small><b>"+esc(t.name)+"</b><span>"+esc(t.line)+"</span><em>"+KES(bk.total)+"</em><i>bar "+KES(bk.bar)+"</i></button>"; }).join("")+"</div>";
      var b=plan();
      h+='<h4 class="pl-sub">Have a fixed budget? <small>optional</small></h4><label class="pl-budget"><span>KES</span><input id="pl-bud" type="number" inputmode="numeric" min="0" step="500" placeholder="e.g. 30000" value="'+(P.budget||"")+'"></label>';
      h+='<p class="pl-note" id="pl-bud-say">'+budgetSay(b)+"</p>";
      return h;
    },
    function(b){
      var I=P.I, groups=[["food","From the kitchen"],["bar","From the bar"],["soft","Soft drinks and water"]], h='<h3 class="pl-q">Your package is ready. <em>'+(adult===true?"Swap a bottle, change a number.":"Change any number to suit.")+"</em></h3>";
      groups.forEach(function(gr){
        var ls=b.lines.filter(function(l){ return l.group===gr[0]; }); if(!ls.length) return;
        h+='<h4 class="pl-sub">'+gr[1]+'</h4><ul class="pl-lines">'+ls.map(function(l){
          var it=ITEMS[l.id], nm=dname(l.id);
          var sw=l.alts.length>1 ? '<select class="pl-swap" data-qswap="'+esc(l.slot)+'" aria-label="Swap '+esc(it.name)+'">'+l.alts.map(function(id){ var x=ITEMS[id]; return '<option value="'+id+'"'+(id===l.id?" selected":"")+">"+esc(dname(id))+" · "+KES(x.price)+"</option>"; }).join("")+"</select>" : "";
          return '<li class="pl-line'+(l.qty?"":" is-off")+'"><div class="pl-line__t"><b>'+esc(nm)+"</b><small>"+esc(l.why)+"</small>"+sw+'</div><div class="stepper"><button type="button" class="minus" data-qadj="'+esc(l.slot)+'" data-d="-1" aria-label="One fewer '+esc(it.name)+'">−</button><b>'+l.qty+'</b><button type="button" class="plus-s" data-qadj="'+esc(l.slot)+'" data-d="1" aria-label="One more '+esc(it.name)+'">+</button></div><span class="pl-line__p">'+KES(it.price*l.qty)+"</span></li>";
        }).join("")+"</ul>";
      });
      h+='<div class="totals pl-totals"><div class="line"><span>Food</span><span class="p">'+KES(b.food)+"</span></div>"+(adult===true?'<div class="line"><span>Bar</span><span class="p">'+KES(b.bar)+"</span></div>":"")+'<div class="line"><span>Soft drinks and water</span><span class="p">'+KES(b.soft)+'</span></div><div class="line grand"><span>Total</span><span class="p">'+KES(b.total)+"</span></div></div>";
      var each=Math.ceil(b.total/Math.max(1,P.chama)/10)*10;
      h+='<div class="pl-chama"><span>Chipping in</span><div class="stepper"><button type="button" class="minus" data-lchama="-1" aria-label="One fewer chipping in">−</button><b>'+P.chama+'</b><button type="button" class="plus-s" data-lchama="1" aria-label="One more chipping in">+</button></div><b>'+(P.chama>1?KES(each)+" each":"The host pays it all")+"</b></div>";
      h+='<div class="pl-share"><a class="btn btn--wa" href="'+esc(waHref(listText(b)))+'" target="_blank" rel="noopener">'+waIcon()+'Send the list to the lounge</a><button type="button" class="btn btn--ghost" data-lcopy>Copy the list</button><button type="button" class="textbtn" data-lreset>Start again</button></div>';
      h+='<p class="pl-note">The quantities are the planner’s estimate. '+(I.guests>=30?"For a party this size the lounge confirms on WhatsApp before the kitchen starts, and a big choma order takes longer than 35 minutes. ":"")+"Prices are the lounge’s own; the order is checked before it is made.</p>";
      return h;
    }
  ];
  function budgetSay(b){ if(!P.budget) return "Leave it empty to see the full package."; var d=P.budget-b.total; return d>=0 ? "<b>"+KES(d)+" under</b> your budget." : "<b>"+KES(-d)+" over</b> your budget. Try "+(P.I.tier==="premium"?"Classic":P.I.tier==="classic"?"Pocket-friendly":"fewer hours or fewer guests")+"."; }
  function listText(b){
    var o=occ(P.I.occ), t="Hi Bamboo Cask, I'm planning a "+o.name+" for "+P.I.guests+" guests ("+hoursText(P.I.hours)+"). From the party planner:\n";
    b.lines.filter(function(l){ return l.qty>0; }).forEach(function(l){ t+="- "+l.qty+" x "+dname(l.id)+"\n"; });
    return t+"Total "+KES(b.total)+". Date:";
  }
  function addAll(){
    var b=plan(), n=0;
    b.lines.forEach(function(l){ if(l.qty<=0) return; var it=ITEMS[l.id]; addKey(l.id, it.options ? it.options[0] : "", l.qty); n+=l.qty; });
    save(); close(); refreshAll(); location.hash="basket";
  }
  function toggle(list, k){ var i=list.indexOf(k); if(i>=0) list.splice(i,1); else list.push(k); }
  function changed(){ P.adj={}; keep(); render(); }

  function onClick(e){
    if(e.target===$("plan")){ close(); return; }
    var t=e.target.closest("button"); if(!t) return;
    var a=function(n){ return t.getAttribute(n); }, I=P.I;
    if(t.hasAttribute("data-lx")){ close(); return; }
    if(t.hasAttribute("data-lstep")){ P.step=+a("data-lstep"); keep(); render(".pl-step.is-on"); $("plan-card").scrollTop=0; return; }
    if(t.hasAttribute("data-lnext")){ P.step=Math.min(STEPS.length-1,P.step+1); keep(); render("[data-lnext],[data-ladd]"); $("plan-card").scrollTop=0; return; }
    if(t.hasAttribute("data-lskip")){ P.step=STEPS.length-1; keep(); render("[data-ladd]"); $("plan-card").scrollTop=0; return; }
    if(t.hasAttribute("data-lback")){ P.step=Math.max(0,P.step-1); keep(); render("[data-lback],[data-lnext]"); $("plan-card").scrollTop=0; return; }
    if(t.hasAttribute("data-locc")){ P.I=fromOcc(occ(a("data-locc")), I.tier); P.adj={}; P.step=1; keep(); render("[data-lnext]"); $("plan-card").scrollTop=0; return; }
    if(t.hasAttribute("data-lg")){ I.guests=Math.max(2,Math.min(300,I.guests+(+a("data-lg")))); if(P.chama>I.guests) P.chama=I.guests; changed(); return; }
    if(t.hasAttribute("data-lhours")){ I.hours=+a("data-lhours"); changed(); return; }
    if(t.hasAttribute("data-lmeat")){ toggle(I.meats, a("data-lmeat")); changed(); return; }
    if(t.hasAttribute("data-lside")){ toggle(I.sides, a("data-lside")); changed(); return; }
    if(t.hasAttribute("data-lcrowd")){ I.crowd=a("data-lcrowd"); changed(); return; }
    if(t.hasAttribute("data-lspirit")){ toggle(I.spirits, a("data-lspirit")); changed(); return; }
    if(t.hasAttribute("data-lextra")){ toggle(I.extras, a("data-lextra")); changed(); return; }
    if(t.hasAttribute("data-ltier")){ I.tier=a("data-ltier"); P.swaps={}; changed(); return; }
    if(t.hasAttribute("data-qadj")){ var b=plan(), sl=a("data-qadj"), l=b.lines.filter(function(x){ return x.slot===sl; })[0]; if(l){ P.adj[sl]=Math.max(0,l.qty+(+a("data-d"))); keep(); render(); } return; }
    if(t.hasAttribute("data-lchama")){ P.chama=Math.max(1,Math.min(I.guests,P.chama+(+a("data-lchama")))); keep(); render(); return; }
    if(t.hasAttribute("data-lreset")){ P.swaps={}; P.adj={}; P.chama=1; keep(); render(); return; }
    if(t.hasAttribute("data-lcopy")){ var txt=listText(plan()); try{ navigator.clipboard.writeText(txt).then(function(){ t.textContent="Copied"; },function(){ t.textContent="Copy failed"; }); }catch(x){ t.textContent="Copy failed"; } return; }
    if(t.hasAttribute("data-ladd")){ addAll(); return; }
  }
  function onInput(e){
    var t=e.target, I=P.I;
    if(t.id==="pl-guests"){ I.guests=+t.value; P.adj={}; keep(); var o=$("pl-g"); if(o) o.textContent=I.guests; foot(); return; }
    if(t.id==="pl-sober"){ I.sober=+t.value; P.adj={}; keep(); var s=$("pl-s"), b=plan(); if(s) s.textContent=I.sober+"%, "+b.sober+" guests"; foot(); return; }
    if(t.id==="pl-bud"){ var v=parseInt(t.value,10); P.budget=isNaN(v)?null:v; keep(); var y=$("pl-bud-say"); if(y) y.innerHTML=budgetSay(plan()); return; }
  }
  function onChange(e){
    var t=e.target;
    if(t.hasAttribute("data-qswap")){ P.swaps[t.getAttribute("data-qswap")]=t.value; keep(); render('[data-qswap="'+t.getAttribute("data-qswap")+'"]'); return; }
    if(t.id==="pl-guests" || t.id==="pl-sober") render("#"+t.id);
  }
  function foot(){ var b=plan(), f=$("plan-card").querySelector(".pl-tot"); if(f) f.innerHTML="<b>"+KES(b.total)+"</b><span>"+P.I.guests+" guests · about "+KES(Math.ceil(b.total/Math.max(1,P.I.guests)/10)*10)+" a head</span>"; var s=$("plan-card").querySelector(".pl-sum"); if(s) s.textContent=occ(P.I.occ).name+" · "+P.I.guests+" guests · "+hoursText(P.I.hours); }
  function onKey(e){ if($("plan").hidden) return false; if(e.key==="Escape"){ close(); return true; } return false; }

  return {sectionHtml:sectionHtml, open:open, close:close, onClick:onClick, onInput:onInput, onChange:onChange, onKey:onKey, build:build, isOpen:function(){ return !$("plan").hidden; }, reset:function(){ POOLS=null; }};
})();
