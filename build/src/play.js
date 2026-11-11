/* ===================== games ===================== */
/* Thirteen games: five quizzes, four party games and four skill games.
   Solo or in teams on one phone. Solo high scores on the rewarded games win a code for 5% off the food in
   the next order; team games are for bragging rights. The games about drinks sit behind the age gate, and
   none of them tells anyone to drink. */
var PLAY = (function(){
  var D = PLAYD, R = D.reward;
  var TEAMC = ["#E8AA45","#CDDF7B","#EE8A70","#8FC3E8"];
  var TEAMN = ["Simba","Chui","Twiga","Ndovu"];
  var KIND = {quiz:"Quiz", party:"Party game", skill:"Skill game"};
  var S = null, T = {iv:null, raf:null, to:[]}, AC = null, hubKind = "all";

  /* ---------- helpers ---------- */
  function g(id){ for(var i=0;i<D.games.length;i++) if(D.games[i].id===id) return D.games[i]; return null; }
  function can(x){ return !x.adult || adult===true; }
  function shuffle(xs){ var a=xs.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function pick(xs){ return xs[Math.floor(Math.random()*xs.length)]; }
  /* deal n items nobody on this device has had yet; topics are dealt in turn, so a hand covers many */
  function deal(deck, pool, n, idf, topf){
    var sh=shuffle(pool);
    if(topf){ var by={}, ord=[]; sh.forEach(function(x){ var t=topf(x)||""; if(!by[t]){ by[t]=[]; ord.push(t); } by[t].push(x); });
      sh=[]; for(var more=true; more;){ more=false; ord.forEach(function(t){ if(by[t].length){ sh.push(by[t].shift()); more=true; } }); } }
    var all=store.get("bc-play-seen",{}), seen=all[deck]||[], set={};
    seen.forEach(function(s){ set[s]=1; });
    var hand=sh.filter(function(x){ return !set[idf(x)]; }).slice(0,n);
    if(hand.length<n){ var inH={}; hand.forEach(function(x){ inH[idf(x)]=1; }); hand=hand.concat(sh.filter(function(x){ return !inH[idf(x)]; }).slice(0,n-hand.length)); seen=[]; }
    all[deck]=seen.concat(hand.map(idf)).slice(-500); store.set("bc-play-seen",all);
    return hand;
  }
  function best(id){ var b=store.get("bc-play-best",{}); return b[id]==null ? null : b[id]; }
  function setBest(id,n){ var b=store.get("bc-play-best",{}), was=b[id]; if(was==null || n>was){ b[id]=n; store.set("bc-play-best",b); return was!=null; } return false; }
  function stop(){ if(T.iv){ clearInterval(T.iv); T.iv=null; } if(T.raf){ cancelAnimationFrame(T.raf); T.raf=null; } T.to.forEach(clearTimeout); T.to=[]; }
  function later(f,ms){ T.to.push(setTimeout(f,ms)); }
  /* a clock that calls back every tenth of a second, and once when it runs out */
  function clock(secs, tick, up){
    if(T.iv) clearInterval(T.iv);
    var t0=performance.now();
    tick(secs,0);
    T.iv=setInterval(function(){ var el=(performance.now()-t0)/1000, left=Math.max(0,secs-el); tick(left,el); if(left<=0){ clearInterval(T.iv); T.iv=null; up(); } },100);
  }
  function muted(){ return store.get("bc-play-mute",false); }
  function cue(kind){
    if(muted()) return;
    try{
      AC=AC||new (window.AudioContext||window.webkitAudioContext)();
      var o=AC.createOscillator(), v=AC.createGain(), t=AC.currentTime;
      o.type="sine"; o.frequency.value = kind==="go" ? 880 : kind==="bad" ? 196 : kind==="good" ? 660 : 523;
      v.gain.setValueAtTime(.0001,t); v.gain.exponentialRampToValueAtTime(.14,t+.02); v.gain.exponentialRampToValueAtTime(.0001,t+.28);
      o.connect(v); v.connect(AC.destination); o.start(t); o.stop(t+.3);
    }catch(e){}
  }
  var GLYPH = {
    scroll:'<path d="M14 10h26a6 6 0 0 1 6 6v26a6 6 0 0 0 6 6H22a6 6 0 0 1-6-6V14a4 4 0 0 0-4-4"/><path d="M24 22h14M24 29h14M24 36h9"/>',
    bubble:'<path d="M10 14h40a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H28l-10 9v-9h-8a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z"/><path d="M20 28h0M30 28h0M40 28h0"/>',
    quote:'<path d="M14 40c0-10 4-16 12-19M34 40c0-10 4-16 12-19"/><path d="M14 40a5 5 0 1 0 10 0 5 5 0 0 0-10 0M34 40a5 5 0 1 0 10 0 5 5 0 0 0-10 0"/>',
    pin:'<path d="M30 52s16-15 16-27a16 16 0 0 0-32 0c0 12 16 27 16 27z"/><circle cx="30" cy="25" r="6"/>',
    phone:'<rect x="19" y="8" width="22" height="42" rx="4"/><path d="M27 44h6"/><path d="M8 20c3-3 3-9 0-12M52 20c-3-3-3-9 0-12"/>',
    split:'<path d="M30 8v44"/><path d="M22 20l-10 10 10 10M38 20l10 10-10 10"/>',
    pencil:'<path d="M12 48l4-14 26-26 10 10-26 26z"/><path d="M36 14l10 10"/><path d="M12 48l10-4"/>',
    tag:'<path d="M8 30V10h20l24 24-18 18z"/><circle cx="18" cy="20" r="3"/>',
    cards:'<rect x="8" y="14" width="24" height="34" rx="4" transform="rotate(-8 20 31)"/><rect x="28" y="12" width="24" height="34" rx="4" transform="rotate(8 40 29)"/>',
    bottle:'<path d="M26 6h8v10l4 6v28a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4V22l4-6z"/><path d="M27 33c0-3 6-3 6 0s-3 3-3 6M30 44h0"/>',
    glass:'<path d="M14 10h32l-5 40H19z"/><path d="M16 26h28" stroke-dasharray="3 3"/>',
    ask:'<circle cx="30" cy="30" r="22"/><path d="M24 24a6 6 0 1 1 9 5c-2 1-3 3-3 5M30 41h0"/>',
    spin:'<path d="M26 18h8v6l3 4v14a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V28l3-4z"/><path d="M50 30a20 20 0 0 1-34 14M10 30a20 20 0 0 1 34-14"/><path d="M44 10v7h-7M16 50v-7h7"/>'
  };
  var GLOW = {quiz:"#CDDF7B", party:"#EE8A70", skill:"#E8AA45"};
  function glyph(k){ return '<svg viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(GLYPH[k]||GLYPH.ask)+"</svg>"; }

  /* ---------- card pictures ----------
     Quiz and party scenes are Pexels photos (free to use; the page numbers are for the credit).
     Bar Trivia, Bei Gani and the under-18 Kumbukumbu use the lounge's own photos.
     The bottle games stand a real bottle from the menu's photo sheets on the card. */
  var PEXELS = {history:"15483543", sheng:"9705753", methali:"32685497", kaunti:"37489738", headsup:"6861096", wyr:"30689324", chora:"4238483"};
  var PIC = {history:1, sheng:1, methali:1, kaunti:1, headsup:1, wyr:1, chora:1, trivia:1, bei:1};
  var STAGE = {guess:["Tanqueray London Dry","750ml"], pour:["Courvoisier VS","700ml"], spin:["Gilbey's Gin","750ml"], memory:["Hennessy VS","700ml"]}, stageIds = {};
  function stageItem(gid){
    if(stageIds[gid]) return stageIds[gid];
    var s=STAGE[gid], hit=null, sz=s && sizeLabel(s[1]);
    if(s) BAR.some(function(id){ var it=ITEMS[id]; if(it.sp && it.name===s[0] && it.size===sz){ hit=id; return true; } return false; });
    return hit ? (stageIds[gid]=hit) : null;
  }
  function photo(key, sm){
    return '<img class="gcard__img" src="games/'+key+'.webp"'+(sm?' srcset="games/'+key+'-sm.webp 480w, games/'+key+'.webp 800w" sizes="(max-width: 600px) 100vw, 340px"':"")+' alt="" loading="lazy" decoding="async">';
  }
  function shotOf(id){ var p=ITEMS[id].sp.split(":"), c=+p[1]; return '<span class="shot" data-sp="'+esc(p[0])+'" style="--x:'+(c%6)+";--y:"+Math.floor(c/6)+'" data-id="'+id+'" aria-hidden="true"></span>'; }
  function artHtml(x){
    if(x.id==="memory" && adult!==true) return photo("memory-food", false);
    if(PIC[x.id]) return photo(x.id, true);
    var id=stageItem(x.id); if(!id) return '<span class="gcard__glyph">'+glyph(x.art)+"</span>";
    var b=shotOf(id), h='<span class="gstage gstage--'+x.id+'" aria-hidden="true">';
    if(x.id==="memory") h+='<span class="gpair"><i>'+b+"</i><i>"+b+"</i></span>";
    else if(x.id==="pour") h+=b+'<svg class="gglass" viewBox="0 0 60 72"><path class="gglass__fill" d="M15.6 40h28.8l-3 26H18.6z"/><path class="gglass__line" d="M13 30h34"/><path class="gglass__cup" d="M10 6h40l-6 62H16z"/></svg>';
    else if(x.id==="spin") h+='<svg class="garcs" viewBox="0 0 100 56"><path d="M86 28a36 22 0 0 1-60 16M14 28a36 22 0 0 1 60-16"/><path d="M78 6v8h-8M22 50v-8h8"/></svg>'+b;
    else h+=b;
    return h+"</span>";
  }
  function creditHtml(){
    var ks=Object.keys(PEXELS).filter(function(k){ return can(g(k)); });
    return "Card photos by Bamboo Cask Lounge, except these from Pexels: "+ks.map(function(k){
      return '<a href="https://www.pexels.com/photo/'+PEXELS[k]+'/" target="_blank" rel="noopener">'+esc(g(k).name)+"</a>"; }).join(" · ");
  }

  /* ---------- the hub, in the menu ---------- */
  function hubHtml(){
    var vis=D.games.filter(can), code=store.get("bc-code",null);
    var h='<div class="gwrap" data-search="games game play quiz trivia party sheng methali kaunti history historia chora memory spin pour guess bei michezo">';
    h+='<div class="gtop">';
    h+='<p class="gtop__win" id="g-win">'+winHtml(code)+"</p></div>";
    h+='<div class="gfilter" role="group" aria-label="Show games">'+[["all","All "+vis.length],["quiz","Quizzes"],["party","Party games"],["skill","Skill games"]].map(function(k){
      return '<button type="button" class="chip'+(hubKind===k[0]?" is-on":"")+'" data-gkind="'+k[0]+'" aria-pressed="'+(hubKind===k[0])+'">'+k[1]+"</button>"; }).join("")+"</div>";
    h+='<div class="games" id="g-list">'+vis.map(cardHtml).join("")+"</div>";
    h+='<p class="gfoot">Rewards are for a solo score, one code per order, and come off the food only. Team games are for bragging rights.'+(adult===true?"":" Games about drinks are hidden, because you said you are under 18.")+'</p><p class="gfoot gfoot--credit">'+creditHtml()+"</p></div>";
    return h;
  }
  function winHtml(code){
    return code ? '<b>Your code '+esc(code.code)+' is saved.</b> '+R.percent+'% comes off the food in your next order, automatically.'
                : 'Score high on a solo game with a <b>'+R.percent+'%</b> badge and win '+R.percent+'% off the food in your next order.';
  }
  function cardHtml(x){
    var b=best(x.id), on=hubKind==="all"||hubKind===x.kind;
    return '<article class="gcard"'+(on?"":" hidden")+' data-gk="'+x.kind+'" style="--g:'+GLOW[x.kind]+'">'+
      '<button type="button" class="gcard__art" data-play="'+x.id+'" aria-label="Play '+esc(x.name)+'">'+artHtml(x)+'<span class="gcard__ico">'+glyph(x.art)+"</span>"+(x.adult?'<span class="age-pill">18+</span>':"")+"</button>"+
      '<div class="gcard__b"><p class="gcard__k">'+KIND[x.kind]+" · "+x.minutes+" min"+(x.players?" · "+esc(x.players):"")+"</p>"+
      '<h3 class="gcard__n">'+esc(x.name)+'</h3><p class="gcard__sw">'+esc(x.sw)+'</p><p class="gcard__l">'+esc(x.line)+"</p>"+
      '<div class="gcard__f">'+(x.rewarded?'<span class="gbadge">'+R.percent+"% off the food</span>":'<span class="gbadge gbadge--fun">For fun</span>')+
      (b!=null?'<span class="gbest">Best '+b+"</span>":"")+'<button type="button" class="btn btn--amber gcard__go" data-play="'+x.id+'">Play</button></div></div></article>';
  }
  function refreshHub(){
    var w=$("g-win"); if(w) w.innerHTML=winHtml(store.get("bc-code",null));
    var l=$("g-list"); if(l){ var fk=document.activeElement && l.contains(document.activeElement) ? document.activeElement.getAttribute("data-play") : null;
      l.innerHTML=D.games.filter(can).map(cardHtml).join(""); Array.prototype.forEach.call(l.querySelectorAll(".shot"), lightShot); if(fk){ var b=l.querySelector('.gcard__go[data-play="'+fk+'"]'); if(b) b.focus(); } }
  }
  function setKind(k){
    hubKind=k;
    Array.prototype.forEach.call(document.querySelectorAll("[data-gkind]"),function(b){ var on=b.getAttribute("data-gkind")===k; b.classList.toggle("is-on",on); b.setAttribute("aria-pressed",String(on)); });
    Array.prototype.forEach.call(document.querySelectorAll(".gcard"),function(c){ c.hidden = !(k==="all" || c.getAttribute("data-gk")===k); });
  }

  /* ---------- the stage ---------- */
  function open(id){
    var x=g(id); if(!x || !can(x)) return;
    stop(); rememberFocus("play");
    S={g:x, phase:"setup", setup:setupDefault(x)};
    $("play").hidden=false; syncLayers(); refreshBar();
    render();
    var f=$("play-card").querySelector("[data-pstart],.st-x"); if(f) f.focus();
  }
  function close(){
    if($("play").hidden) return;
    stop(); S=null; $("play").hidden=true; $("play-card").innerHTML="";
    syncLayers(); refreshBar(); refreshHub(); returnFocus("play", "[data-play]");
  }
  function headHtml(){
    var x=S.g;
    return '<div class="st-head"><div class="st-head__t"><p class="st-k">'+KIND[x.kind]+(x.rewarded?" · win "+R.percent+"% off the food":"")+'</p><h2 id="play-name">'+esc(x.name)+'</h2><p class="st-sw">'+esc(x.sw)+"</p></div>"+
      '<button type="button" class="st-snd" data-psnd aria-pressed="'+(!muted())+'" aria-label="Sound">'+sndSvg()+"</button>"+
      '<button type="button" class="st-x" data-px aria-label="Close the game">×</button></div>';
  }
  function sndSvg(){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/>'+(muted()?'<path d="M22 9l-6 6M16 9l6 6"/>':'<path d="M17 8a5 5 0 0 1 0 8M20 5a9 9 0 0 1 0 14"/>')+"</svg>"; }
  function render(focusSel){
    if(!S) return;
    var c=$("play-card");
    c.innerHTML=headHtml()+'<div class="st-body" id="st-body">'+bodyHtml()+"</div>";
    fillPhotos(c); Array.prototype.forEach.call(c.querySelectorAll(".shot"), lightShot);
    after();
    var f=c.querySelector(focusSel||"[data-auto]"); if(f) f.focus({preventScroll:true});
  }
  function bodyHtml(){
    if(S.phase==="setup") return setupHtml();
    if(S.phase==="handoff") return handoffHtml();
    if(S.phase==="team-end") return teamEndHtml();
    if(S.phase==="end") return endHtml();
    return GAME[S.g.id].html();
  }
  function after(){ if(S.phase==="handoff") runHandoff(); else if(S.phase!=="setup" && S.phase!=="end" && S.phase!=="team-end" && GAME[S.g.id].after) GAME[S.g.id].after(); }

  /* ---------- solo or teams ---------- */
  function setupDefault(x){
    var saved=store.get("bc-play-party",null), teams;
    if(saved && saved.teams && saved.teams.length>=2) teams=saved.teams;
    else teams=[{name:"Simba", players:["Wanjiku","Otieno"]},{name:"Chui", players:["Achieng'","Kamau"]}];
    var o=GAME[x.id].setup||{};
    return {solo:o.solo!==false, teams:teams, secs:o.def||20, deck:"mix", names:(store.get("bc-play-names",null)||D.names).slice()};
  }
  function setupHtml(){
    var o=GAME[S.g.id].setup||{}, st=S.setup, h='<p class="st-lede">'+GAME[S.g.id].intro+"</p>";
    if(o.names) return h+namesHtml()+'<button type="button" class="sbtn sbtn--go" data-pstart data-auto>Start</button>';
    if(o.deck) h+='<p class="st-sub">The deck</p><div class="st-pills st-pills--deck" role="group" aria-label="Deck">'+[["mix","Mix ya kila kitu"]].concat(Object.keys(D.decks).map(function(k){ return [k, D.decks[k][0]]; })).map(function(d){
      return '<button type="button" class="spill'+(st.deck===d[0]?" is-on":"")+'" data-pdeck="'+d[0]+'" aria-pressed="'+(st.deck===d[0])+'">'+esc(d[1])+"</button>"; }).join("")+"</div>";
    if(o.solo!==false && !o.noTeams){
      h+='<div class="seg" role="group" aria-label="How are you playing?"><button type="button" data-pmode="solo" aria-pressed="'+st.solo+'">Solo</button><button type="button" data-pmode="teams" aria-pressed="'+(!st.solo)+'">Teams, one phone</button></div>';
    }
    if(!st.solo || o.solo===false) h+=teamsHtml();
    if(o.secs) h+='<p class="st-sub">'+(st.solo && o.solo!==false ? "Time per go" : "Time per turn")+'</p><div class="st-pills" role="group" aria-label="Seconds">'+o.secs.map(function(s){
      return '<button type="button" class="spill'+(st.secs===s?" is-on":"")+'" data-psecs="'+s+'" aria-pressed="'+(st.secs===s)+'">'+s+"s</button>"; }).join("")+"</div>";
    if(S.g.rewarded) h+='<p class="st-note">'+(st.solo && o.solo!==false ? "Score "+thr()+" or more to win "+R.percent+"% off the food in your next order." : "Team games are for bragging rights. The code is for a solo score.")+"</p>";
    return h+'<button type="button" class="sbtn sbtn--go" data-pstart data-auto>'+(o.start||"Twende, let’s go")+"</button>";
  }
  function teamsHtml(){
    var st=S.setup;
    return '<div class="teams">'+st.teams.map(function(t,i){
      return '<div class="team" style="--team:'+TEAMC[i]+'"><div class="team__top"><input class="team__name" data-tname="'+i+'" value="'+esc(t.name)+'" maxlength="14" aria-label="Team '+(i+1)+' name">'+
        (st.teams.length>2?'<button type="button" class="team__del" data-tdel="'+i+'" aria-label="Remove team '+esc(t.name)+'">×</button>':"")+"</div>"+
        '<div class="team__ps">'+t.players.map(function(p,j){ return '<span class="pchip">'+esc(p)+'<button type="button" data-pdel="'+i+":"+j+'" aria-label="Remove '+esc(p)+'">×</button></span>'; }).join("")+"</div>"+
        '<form class="team__add" data-padd="'+i+'"><input placeholder="Add a player" maxlength="16" aria-label="Add a player to '+esc(t.name)+'"><button type="submit" aria-label="Add">+</button></form></div>';
    }).join("")+(st.teams.length<4?'<button type="button" class="team team--new" data-tnew>+ Add a team</button>':"")+"</div>";
  }
  function namesHtml(){
    var n=S.setup.names;
    return '<p class="st-sub">Who’s at the table? <small>'+n.length+' names, 2 to 12</small></p><div class="team"><div class="team__ps">'+n.map(function(p,j){
      return '<span class="pchip">'+esc(p)+(n.length>2?'<button type="button" data-ndel="'+j+'" aria-label="Remove '+esc(p)+'">×</button>':"")+"</span>"; }).join("")+"</div>"+
      (n.length<12?'<form class="team__add" data-nadd><input placeholder="Add a name" maxlength="16" aria-label="Add a name"><button type="submit" aria-label="Add">+</button></form>':"")+"</div>";
  }
  function thr(){ return R.threshold[S.g.id]; }
  function party(){
    var st=S.setup, o=GAME[S.g.id].setup||{}, solo=st.solo && o.solo!==false;
    var teams=solo ? [{name:"You", players:["You"], c:TEAMC[0]}] : st.teams.filter(function(t){ return t.players.length; }).map(function(t,i){ return {name:t.name||TEAMN[i], players:t.players.slice(), c:TEAMC[i]}; });
    if(!solo) store.set("bc-play-party",{teams:st.teams});
    return {solo:solo, teams:teams, secs:st.secs};
  }
  function order(p){
    if(p.solo) return [{team:0, player:"You"}];
    var max=0, out=[]; p.teams.forEach(function(t){ max=Math.max(max,t.players.length); });
    for(var r=0;r<max;r++) p.teams.forEach(function(t,ti){ out.push({team:ti, player:t.players[r%t.players.length]}); });
    return out;
  }
  function start(){
    var o=GAME[S.g.id].setup||{};
    if(!o.names && !(S.setup.solo && o.solo!==false) && S.setup.teams.filter(function(t){ return t.players.length; }).length<2){
      var b=$("play-card").querySelector("[data-pstart]"); if(b){ b.textContent="Add a player to two teams first"; }
      return;
    }
    S.party=party(); S.order=order(S.party); S.scores=S.party.teams.map(function(){ return 0; });
    GAME[S.g.id].start();
  }
  function turn(i){ return S.order[(i==null?S.i:i) % S.order.length]; }
  function tColour(){ return S.party.solo ? "#CDDF7B" : S.party.teams[turn().team].c; }

  /* pass the phone */
  function handoff(note){ S.phase="handoff"; S.note=note||""; render(); }
  function handoffHtml(){
    var t=turn(), tm=S.party.teams[t.team];
    return '<button type="button" class="handoff" data-pgo data-auto style="--team:'+tm.c+'"><span class="handoff__k">Pass the phone · Team '+esc(tm.name)+'</span><b>'+esc(t.player)+"</b>"+(S.note?'<span class="handoff__n">'+esc(S.note)+"</span>":"")+
      '<span class="handoff__c" id="h-count" aria-live="assertive">3</span><small>Tap to start now</small></button>'+boardHtml();
  }
  function runHandoff(){
    var n=3;
    if(T.iv) clearInterval(T.iv);
    T.iv=setInterval(function(){ n--; var e=$("h-count"); if(n<=0){ clearInterval(T.iv); T.iv=null; go(); } else { if(e) e.textContent=n; cue(); } },800);
  }
  function go(){ if(!S || S.phase!=="handoff") return; if(T.iv){ clearInterval(T.iv); T.iv=null; } cue("go"); GAME[S.g.id].turn(); }
  function boardHtml(){
    if(!S.party || S.party.solo) return "";
    var cur=S.phase==="team-end"?-1:turn().team;
    return '<div class="board" aria-label="Scores">'+S.party.teams.map(function(t,i){ return '<span class="board__t'+(i===cur?" is-on":"")+'" style="--team:'+t.c+'"><i></i>'+esc(t.name)+"<b>"+fmt(S.scores[i])+"</b></span>"; }).join("")+"</div>";
  }
  function fmt(n){ return Math.round(n*10)/10; }
  function barHtml(){ return '<div class="tbar" style="--team:'+tColour()+'"><i id="t-bar"></i><span id="t-sec"></span></div>'; }
  function setBar(left, secs){ var i=$("t-bar"), s=$("t-sec"); if(i) i.style.transform="scaleX("+Math.max(0,left/secs).toFixed(3)+")"; if(s) s.textContent=Math.ceil(left)+"s"; }

  /* the end */
  function teamEnd(unit){ stop(); S.phase="team-end"; S.unit=unit; render(); }
  function teamEndHtml(){
    var top=Math.max.apply(null,S.scores), win=S.party.teams.filter(function(t,i){ return S.scores[i]===top; });
    return '<div class="end"><p class="end__k">'+(win.length>1?"Sare, it’s a draw!":"Hapo sawa!")+'</p><p class="end__big">'+(win.length>1?win.map(function(t){ return esc(t.name); }).join(" and "):"Team "+esc(win[0].name))+'</p><p class="end__sub">'+(win.length>1?"share the top spot":"takes it")+"</p>"+
      '<ol class="final">'+S.party.teams.map(function(t,i){ return {t:t,s:S.scores[i]}; }).sort(function(a,b){ return b.s-a.s; }).map(function(r){ return '<li style="--team:'+r.t.c+'"><i></i>'+esc(r.t.name)+"<b>"+fmt(r.s)+" "+esc(S.unit)+"</b></li>"; }).join("")+"</ol>"+
      '<p class="st-note">Team games are for bragging rights. The code is for a solo score.</p>'+againHtml(false)+"</div>";
  }
  function soloEnd(score, of, unit){ stop(); S.phase="end"; S.res={score:score, of:of, unit:unit}; S.res.isBest=setBest(S.g.id, score); S.res.won=S.g.rewarded && score>=thr(); if(S.res.won) store.set("bc-code",{code:R.code, at:Date.now()}); render(); if(S.res.won) cue("good"); }
  function endHtml(){
    var r=S.res, x=S.g, b=best(x.id), h='<div class="end">';
    h+='<p class="end__k">'+(r.won?D.say.win:x.rewarded && r.score>=thr()*0.8?D.say.close:"Game imeisha")+'</p><p class="end__score"><b>'+r.score+"</b><span>/ "+r.of+" "+esc(r.unit)+"</span></p>";
    h+='<p class="end__sub">'+(r.isBest?"A new personal best.":b!=null?"Your best: "+b+".":"")+"</p>";
    if(r.won) h+='<div class="reward"><span class="reward__k">'+R.percent+'% off the food in your next order</span><button type="button" class="reward__code" data-pcopy>'+esc(R.code)+'<small id="p-copied">Tap to copy</small></button>'+
      '<span class="reward__t">Saved on this device: it comes off the kitchen part of your next order automatically. One code per order.</span></div>';
    else if(x.rewarded) h+='<p class="st-note">Score '+thr()+" or more to win "+R.percent+"% off the food. Rudia tu!</p>";
    return h+againHtml(r.won)+"</div>";
  }
  function againHtml(won){ return '<div class="end__go"><button type="button" class="sbtn" data-pagain data-auto>Play again</button><button type="button" class="sbtn sbtn--ghost" data-px>Other games</button>'+(won?'<button type="button" class="sbtn sbtn--ghost" data-pfood>Order food</button>':"")+"</div>"; }

  /* ===================== the games ===================== */
  var GAME = {};
  var LETTER = ["A","B","C","D"];

  /* ---- the quizzes ---- */
  function quiz(id, intro){
    return {
      intro:intro, setup:{secs:[15,20,30,45], def:20},
      start:function(){
        var pool=D.quiz[id], n=S.party.solo ? Math.min(10,pool.length) : Math.min(pool.length, S.order.length*2);
        S.qs=deal(id, pool, n, function(q){ return q[0]; }, id==="trivia" ? null : function(q){ return q[4]; });
        S.i=0; S.right=0;
        if(S.party.solo) this.turn(); else handoff();
      },
      turn:function(){ S.phase="ask"; S.chosen=null; render(); },
      html:function(){
        var q=S.qs[S.i], done=S.phase==="reveal", t=turn();
        var h='<div class="qhead"><span>Question '+(S.i+1)+" of "+S.qs.length+"</span><span>"+(S.party.solo?S.right+" right":esc(t.player)+" · Team "+esc(S.party.teams[t.team].name))+"</span></div>"+barHtml()+boardHtml();
        if(q[4]) h+='<p class="q__topic">'+esc(q[4])+(q[5]?" · "+esc(q[5]):"")+"</p>";
        h+='<p class="q" id="q-text">'+esc(q[0])+'</p><div class="opts" role="group" aria-labelledby="q-text">'+q[1].map(function(o,k){
          var cls=done ? (k===q[2]?" is-right":k===S.chosen?" is-wrong":" is-dim") : "";
          return '<button type="button" class="opt'+cls+'" data-pans="'+k+'"'+(done?" disabled":"")+(k===0&&!done?" data-auto":"")+"><i>"+LETTER[k]+"</i><span>"+esc(o)+"</span></button>"; }).join("")+"</div>";
        if(done) h+='<div class="said '+(S.chosen===q[2]?"is-good":"is-bad")+'" role="status"><b>'+esc(S.line)+'</b><p>'+esc(q[3])+"</p></div>"+
          '<button type="button" class="sbtn sbtn--go" data-pnext data-auto>'+(S.i+1>=S.qs.length?(S.party.solo?"See your score":"See who won"):(S.party.solo?"Next question":"Pass the phone"))+"</button>";
        return h;
      },
      after:function(){ if(S.phase!=="ask") return; var self=this, secs=S.party.secs; clock(secs, function(l){ setBar(l,secs); }, function(){ self.answer(-1); }); },
      answer:function(k){
        if(S.phase!=="ask") return; stop();
        var q=S.qs[S.i], ok=k===q[2];
        S.chosen=k; S.phase="reveal";
        S.line = k<0 ? D.say.timeUp : ok ? pick(D.say.right) : pick(D.say.wrong);
        if(ok){ S.right++; S.scores[turn().team]++; }
        cue(ok?"good":"bad"); render();
      },
      next:function(){
        S.i++;
        if(S.i>=S.qs.length){ if(S.party.solo) soloEnd(S.right, S.qs.length, "right"); else teamEnd("right"); return; }
        if(S.party.solo) this.turn(); else handoff();
      }
    };
  }
  GAME.history = quiz("history","The history Kenyans learnt at school, from Social Studies in primary to History and Government in Forms 1 to 4. Ten questions across the topics.");
  GAME.sheng = quiz("sheng","Keja, mbogi, nduthi, luku. Ten questions on the language of the mtaa. Uko fiti?");
  GAME.methali = quiz("methali","Finish the Swahili proverb before the clock does. Ten methali, from the ones everyone knows to the ones only shosho does.");
  GAME.kaunti = quiz("kaunti","All 47 counties: the towns, the landmarks, the food. Ten questions. Unajua Kenya?");
  GAME.trivia = quiz("trivia","Ten questions on Kenyan drinks, the bar and the bottle.");

  /* ---- guess the bottle ---- */
  function bottles(){
    var seen={}, out=[];
    BAR.forEach(function(id){ var it=ITEMS[id]; if(!it.sp || seen[it.name]) return; seen[it.name]=1; out.push(id); });
    return out;
  }
  GAME.guess = {
    intro:"A bottle from the Cask Room steps out of the dark. Name it from four before the light comes up: the sooner you call it, the more it is worth, up to 10 a bottle.",
    setup:{secs:[8,10,15], def:10},
    start:function(){
      var pool=bottles(), n=S.party.solo?8:Math.min(pool.length, S.order.length*2);
      var hand=deal("guess", pool, n, function(id){ return ITEMS[id].name; });
      S.rounds=hand.map(function(id){
        var it=ITEMS[id], same=pool.filter(function(x){ return x!==id && ITEMS[x].shelf===it.shelf; }), other=pool.filter(function(x){ return x!==id && ITEMS[x].shelf!==it.shelf; });
        var wrong=shuffle(same).slice(0,3); if(wrong.length<3) wrong=wrong.concat(shuffle(other).slice(0,3-wrong.length));
        return {id:id, opts:shuffle([id].concat(wrong))};
      });
      S.i=0; S.pts=0;
      if(S.party.solo) this.turn(); else handoff();
    },
    turn:function(){ S.phase="guess"; S.chosen=null; S.t=0; render(); },
    html:function(){
      var r=S.rounds[S.i], done=S.phase==="reveal", t=turn(), it=ITEMS[r.id];
      var h='<div class="qhead"><span>Bottle '+(S.i+1)+" of "+S.rounds.length+"</span><span>"+(S.party.solo?S.pts+" pts":esc(t.player)+" · Team "+esc(S.party.teams[t.team].name))+"</span></div>"+barHtml()+boardHtml();
      h+='<div class="gb'+(done?" is-out":"")+'"><div class="gb__shot" id="gb-shot">'+mediaHtml(r.id)+"</div></div>";
      h+='<div class="opts">'+r.opts.map(function(id,k){
        var cls=done ? (id===r.id?" is-right":id===S.chosen?" is-wrong":" is-dim") : "";
        return '<button type="button" class="opt'+cls+'" data-pbtl="'+id+'"'+(done?" disabled":"")+(k===0&&!done?" data-auto":"")+"><i>"+LETTER[k]+"</i><span>"+esc(ITEMS[id].name)+"</span></button>"; }).join("")+"</div>";
      if(done) h+='<div class="said '+(S.chosen===r.id?"is-good":"is-bad")+'" role="status"><b>'+esc(S.line)+"</b><p>"+esc(it.name)+(it.size&&it.name.indexOf(it.size)<0?", "+esc(it.size):"")+". On the shelf at "+KES(it.price)+".</p></div>"+
        '<button type="button" class="sbtn sbtn--go" data-pnext data-auto>'+(S.i+1>=S.rounds.length?(S.party.solo?"See your score":"See who won"):(S.party.solo?"Next bottle":"Pass the phone"))+"</button>";
      return h;
    },
    after:function(){
      if(S.phase!=="guess") return;
      var self=this, secs=S.party.secs, shot=$("gb-shot");
      clock(secs, function(l,el){ S.t=el; setBar(l,secs); if(shot){ var k=Math.max(0,1-el/secs); shot.style.filter="blur("+(k*20).toFixed(1)+"px) brightness("+(0.25+0.75*(1-k)).toFixed(2)+")"; } }, function(){ self.answer(null); });
    },
    answer:function(id){
      if(S.phase!=="guess") return; stop();
      var r=S.rounds[S.i], ok=id===r.id, pts=ok ? 5+Math.round(5*(1-Math.min(S.t,S.party.secs)/S.party.secs)) : 0;
      S.chosen=id; S.phase="reveal"; S.line=id==null?D.say.timeUp:ok?pick(D.say.right)+" +"+pts:pick(D.say.wrong);
      S.pts+=pts; S.scores[turn().team]+=pts; cue(ok?"good":"bad"); render();
      var shot=$("gb-shot"); if(shot) shot.style.filter="none";
    },
    next:function(){
      S.i++;
      if(S.i>=S.rounds.length){ if(S.party.solo) soloEnd(Math.round(S.pts/(S.rounds.length*10)*100), 100, "points"); else teamEnd("points"); return; }
      if(S.party.solo) this.turn(); else handoff();
    }
  };

  /* ---- perfect pour ---- */
  var MEAS=[{l:"One tot",ml:25},{l:"A double",ml:50},{l:"Three fingers",ml:75},{l:"Half the glass",ml:100},{l:"A long one",ml:150}];
  var CAP=200, RATE=42, GL={top:160, bot:376, xT:136, wT:128, xB:146, wB:108}, MOUTH={x:196,y:118};
  function yFor(ml){ return GL.bot-(ml/CAP)*(GL.bot-GL.top); }
  function xAt(y){ var k=(GL.bot-y)/(GL.bot-GL.top); return {l:GL.xB+(GL.xT-GL.xB)*k, w:GL.wB+(GL.wT-GL.wB)*k}; }
  GAME.pour = {
    intro:"Hold to pour, let go on the line. The millilitres are hidden while you pour: that’s the game. Overfill the glass and it spills, and the pour scores nothing.",
    setup:{secs:[10,15,20], def:15},
    start:function(){
      var spirits=BAR.filter(function(id){ var it=ITEMS[id]; return /whisky|rum|brandy|tequila|vodka|gin|liqueur/.test(it.shelf||"") && it.bottle && it.bottle.liquid && it.bottle.liquid!=="none"; });
      var n=S.party.solo?MEAS.length:S.order.length*2, ms=shuffle(MEAS), bt=shuffle(spirits);
      S.rounds=[]; for(var k=0;k<n;k++) S.rounds.push({m:ms[k%ms.length], id:bt[k%bt.length]});
      S.i=0; S.accs=[]; S.sum=S.party.teams.map(function(){ return 0; }); S.cnt=S.party.teams.map(function(){ return 0; });
      if(S.party.solo) this.turn(); else handoff();
    },
    turn:function(){ S.phase="pour"; S.ml=0; S.res=null; S.pouring=false; render(); },
    html:function(){
      var r=S.rounds[S.i], it=ITEMS[r.id], t=turn(), done=S.phase==="poured";
      var h='<div class="qhead"><span>Pour '+(S.i+1)+" of "+S.rounds.length+"</span><span>"+(S.party.solo?(S.accs.length?Math.round(avg(S.accs))+"% average":"First pour"):esc(t.player)+" · Team "+esc(S.party.teams[t.team].name))+"</span></div>"+barHtml()+boardHtml();
      h+='<p class="pour__ask"><b>'+esc(r.m.l)+"</b> of "+esc(it.name)+'<small>Target '+r.m.ml+" ml. The dashed line is your mark.</small></p>";
      h+='<div class="pour" id="pour" style="--liq:'+esc(it.bottle.liquid)+'">'+pourSvg(r, S.ml, false)+"</div>";
      if(done){ var res=S.res;
        h+='<div class="said '+(res.acc>=85?"is-good":"is-bad")+'" role="status"><b>'+(res.late?D.say.timeUp:res.spilt?"Imemwagika: spilt!":res.acc>=85?pick(D.say.right):res.acc>=60?D.say.close:pick(D.say.wrong))+"</b><p>"+Math.round(res.poured)+" ml poured, target "+r.m.ml+" ml: <b>"+res.acc+"%</b></p></div>"+
          '<button type="button" class="sbtn sbtn--go" data-pnext data-auto>'+(S.i+1>=S.rounds.length?(S.party.solo?"See your score":"See who won"):(S.party.solo?"Next pour":"Pass the phone"))+"</button>";
      } else h+='<button type="button" class="sbtn sbtn--go pour__btn" id="pour-btn" data-auto>Hold to pour</button><p class="st-note">Press and hold, or hold the space bar.</p>';
      return h;
    },
    after:function(){
      if(S.phase!=="pour") return;
      var self=this, secs=S.party.secs, btn=$("pour-btn"), stage=$("pour");
      clock(secs, function(l){ setBar(l,secs); }, function(){ if(S.pouring) self.settle(); else { S.res={poured:S.ml, acc:0, spilt:false, late:true}; self.record(0); } });
      var down=function(e){ if(e) e.preventDefault(); if(S.phase!=="pour" || S.pouring) return; S.pouring=true; var last=performance.now();
        var step=function(now){ if(!S || !S.pouring) return; S.ml+=RATE*(now-last)/1000; last=now; draw(); if(S.ml>=CAP){ S.ml=CAP; self.settle(); return; } T.raf=requestAnimationFrame(step); };
        T.raf=requestAnimationFrame(step); draw(); };
      var up=function(){ if(S && S.phase==="pour" && S.pouring) self.settle(); };
      function draw(){ if(stage) stage.innerHTML=pourSvg(S.rounds[S.i], S.ml, S.pouring); }
      [btn, stage].forEach(function(el){ if(!el) return; el.addEventListener("pointerdown", function(e){ try{ el.setPointerCapture(e.pointerId); }catch(x){} down(e); }); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("lostpointercapture", up); });
      S.key={down:down, up:up};
    },
    settle:function(){
      if(S.phase!=="pour") return; S.pouring=false; stop();
      var r=S.rounds[S.i], spilt=S.ml>=CAP, err=Math.abs(S.ml-r.m.ml), acc=spilt?0:Math.max(0,Math.round(100-(err/Math.max(r.m.ml,40))*100));
      S.res={poured:S.ml, acc:acc, spilt:spilt}; this.record(acc);
    },
    record:function(acc){ S.accs.push(acc); var tm=turn().team; S.sum[tm]+=acc; S.cnt[tm]++; S.scores=S.sum.map(function(s,k){ return S.cnt[k]?Math.round(s/S.cnt[k]):0; }); S.phase="poured"; S.key=null; cue(acc>=85?"good":"bad"); render(); },
    next:function(){
      S.i++;
      if(S.i>=S.rounds.length){ if(S.party.solo) soloEnd(Math.round(avg(S.accs)), 100, "% accurate"); else teamEnd("% average"); return; }
      if(S.party.solo) this.turn(); else handoff();
    }
  };
  function avg(xs){ return xs.reduce(function(a,b){ return a+b; },0)/Math.max(1,xs.length); }
  function pourSvg(r, ml, pouring){
    var lvl=Math.min(ml,CAP), y=yFor(lvl), a=xAt(y), ty=yFor(r.m.ml), b=xAt(ty), liq="var(--liq)";
    var h='<svg viewBox="0 0 400 420" role="img" aria-label="'+(S.phase==="poured"?Math.round(ml)+" ml in the glass":"A glass, filling")+'">';
    h+='<defs><linearGradient id="pg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient></defs>';
    h+='<ellipse cx="200" cy="392" rx="120" ry="12" fill="#000" opacity=".35"/>';
    /* the bottle, tipped over the glass */
    h+='<g transform="translate('+MOUTH.x+" "+MOUTH.y+") rotate("+(pouring?118:96)+')"><rect x="-9" y="-30" width="18" height="30" rx="3" fill="#1d2a20" stroke="#CDDF7B" stroke-opacity=".5"/><path d="M-9 -30 L-26 -62 L-26 -170 Q-26 -180 -16 -180 L16 -180 Q26 -180 26 -170 L26 -62 L9 -30 Z" fill="#1d2a20" stroke="#CDDF7B" stroke-opacity=".5"/><path d="M-22 -70 L-22 -165 L22 -165 L22 -70 Z" fill="'+liq+'" opacity=".85"/><rect x="-24" y="-140" width="48" height="40" rx="3" fill="#F1ECD7" opacity=".9"/></g>';
    if(pouring) h+='<rect x="'+(MOUTH.x-2.5)+'" y="'+(MOUTH.y+6)+'" width="5" height="'+Math.max(0,y-MOUTH.y-6)+'" rx="2.5" fill="'+liq+'"/>';
    if(lvl>0) h+='<path d="M'+a.l.toFixed(1)+" "+y.toFixed(1)+" L"+(a.l+a.w).toFixed(1)+" "+y.toFixed(1)+" L"+(GL.xB+GL.wB)+" "+GL.bot+" L"+GL.xB+" "+GL.bot+' Z" fill="'+liq+'" opacity=".92"/>';
    h+='<path d="M'+GL.xT+" "+GL.top+" L"+GL.xB+" "+GL.bot+" L"+(GL.xB+GL.wB)+" "+GL.bot+" L"+(GL.xT+GL.wT)+" "+GL.top+'" fill="url(#pg)" stroke="#F1ECD7" stroke-opacity=".7" stroke-width="3" stroke-linejoin="round"/>';
    h+='<line x1="'+(b.l-14).toFixed(1)+'" y1="'+ty.toFixed(1)+'" x2="'+(b.l+b.w+14).toFixed(1)+'" y2="'+ty.toFixed(1)+'" stroke="#CDDF7B" stroke-width="2.5" stroke-dasharray="7 6"/>';
    h+='<text x="'+(b.l+b.w+20).toFixed(1)+'" y="'+(ty+5).toFixed(1)+'" fill="#CDDF7B" font-size="15" font-weight="700" font-family="Figtree, sans-serif">'+r.m.ml+" ml</text>";
    if(S.phase==="poured") h+='<text x="'+(a.l-18).toFixed(1)+'" y="'+(y+5).toFixed(1)+'" text-anchor="end" fill="#F1ECD7" font-size="15" font-weight="700" font-family="Figtree, sans-serif">'+Math.round(ml)+" ml</text>";
    return h+"</svg>";
  }

  /* ---- bei gani ---- */
  var BEIMAX=25000;
  function beiPool(){
    var food=[];
    Object.keys(ITEMS).forEach(function(id){ var it=ITEMS[id]; if(FOODCAT[it.cat] && !BUNDLES[id] && it.price>=100 && it.price<=BEIMAX) food.push(id); });
    if(adult!==true) return {food:food, drink:[]};
    var seen={}, drink=[];
    BAR.forEach(function(id){ var it=ITEMS[id]; if(!it.sp || it.price<300 || it.price>BEIMAX || seen[it.name+it.size]) return; seen[it.name+it.size]=1; drink.push(id); });
    return {food:food, drink:drink};
  }
  function pts(guess, price){ var off=Math.abs(guess-price)/price; return off<=0.05?10:off<=0.1?8:off<=0.2?5:off<=0.35?2:0; }
  function itemMedia(id){ var it=ITEMS[id]; return it.cat==="bar"||it.cat==="soft" ? '<div class="gm gm--btl">'+mediaHtml(id)+"</div>" : '<div class="gm gm--dish">'+kMedia(id)+"</div>"; }
  GAME.bei = {
    intro:"A real price off the Bamboo Cask menu. Slide or type your number and lock it in before the clock does. Within 5% scores 10, within 10% scores 8, within 20% scores 5, within 35% scores 2.",
    setup:{secs:[15,20,30], def:20},
    start:function(){
      var p=beiPool(), n=S.party.solo?6:S.order.length*2, f=deal("bei-f", p.food, n, function(x){ return x; }), d=p.drink.length?deal("bei-d", p.drink, n, function(x){ return x; }):[];
      var hand=[], fi=0, di=0; for(var k=0;k<n;k++) hand.push(d.length && k%2===1 ? d[di++%d.length] : f[fi++%f.length]);
      S.rounds=hand; S.i=0; S.pts=0;
      if(S.party.solo) this.turn(); else handoff();
    },
    turn:function(){ S.phase="bei"; S.guess=null; render(); },
    html:function(){
      var id=S.rounds[S.i], it=ITEMS[id], t=turn(), done=S.phase==="reveal";
      var h='<div class="qhead"><span>'+(it.cat==="bar"?"Bottle":"Dish")+" "+(S.i+1)+" of "+S.rounds.length+"</span><span>"+(S.party.solo?S.pts+" pts":esc(t.player)+" · Team "+esc(S.party.teams[t.team].name))+"</span></div>"+barHtml()+boardHtml();
      h+='<div class="bei">'+itemMedia(id)+'<p class="bei__n">'+esc(it.name)+(it.cat==="bar"&&it.size&&it.name.indexOf(it.size)<0?"<small>"+esc(it.size)+"</small>":"")+"</p></div>";
      if(done){ var p=S.got;
        h+='<div class="said '+(p>=5?"is-good":"is-bad")+'" role="status"><b>'+(S.guess==null?D.say.timeUp:p>=8?pick(D.say.right):p>=2?D.say.close:pick(D.say.wrong))+(p?" +"+p:"")+"</b><p>It’s <b>"+KES(it.price)+"</b> on the menu."+(S.guess!=null?" You said "+KES(S.guess)+", "+Math.round(Math.abs(S.guess-it.price)/it.price*100)+"% off.":"")+"</p></div>"+
          '<button type="button" class="sbtn sbtn--go" data-pnext data-auto>'+(S.i+1>=S.rounds.length?(S.party.solo?"See your score":"See who won"):(S.party.solo?"Next one":"Pass the phone"))+"</button>";
      } else {
        h+='<div class="bei__in"><label class="bei__v"><span>KES</span><input id="bei-n" type="number" inputmode="numeric" min="50" max="'+BEIMAX+'" step="50" placeholder="Your guess" data-auto></label>'+
          '<input id="bei-r" class="bei__r" type="range" min="50" max="'+BEIMAX+'" step="50" value="50" aria-label="Your guess in shillings">'+
          '<div class="bei__st">'+[-500,-50,50,500].map(function(d){ return '<button type="button" class="spill" data-bstep="'+d+'">'+(d>0?"+":"−")+Math.abs(d)+"</button>"; }).join("")+"</div>"+
          '<button type="button" class="sbtn sbtn--go" data-block disabled>Lock it in</button></div>';
      }
      return h;
    },
    after:function(){
      if(S.phase!=="bei") return;
      var self=this, secs=S.party.secs, n=$("bei-n"), r=$("bei-r");
      clock(secs, function(l){ setBar(l,secs); }, function(){ self.lock(); });
      n.addEventListener("input", function(){ var v=parseInt(n.value,10); self.set(isNaN(v)?null:v, "n"); });
      r.addEventListener("input", function(){ self.set(parseInt(r.value,10), "r"); });
      n.addEventListener("keydown", function(e){ if(e.key==="Enter" && S.guess!=null){ e.preventDefault(); self.lock(); } });
    },
    set:function(v, from){
      if(v!=null) v=Math.max(50,Math.min(BEIMAX,v));
      S.guess=v; var n=$("bei-n"), r=$("bei-r"), b=$("play-card").querySelector("[data-block]");
      if(from!=="n" && n) n.value=v==null?"":v; if(from!=="r" && r && v!=null) r.value=v; if(b) b.disabled=v==null;
    },
    step:function(d){ this.set((S.guess==null?2000:S.guess)+d); },
    lock:function(){
      if(S.phase!=="bei") return; stop();
      var it=ITEMS[S.rounds[S.i]], p=S.guess==null?0:pts(S.guess,it.price);
      S.got=p; S.pts+=p; S.scores[turn().team]+=p; S.phase="reveal"; cue(p>=5?"good":"bad"); render();
    },
    next:function(){
      S.i++;
      if(S.i>=S.rounds.length){ if(S.party.solo) soloEnd(Math.round(S.pts/(S.rounds.length*10)*100), 100, "points"); else teamEnd("points"); return; }
      if(S.party.solo) this.turn(); else handoff();
    }
  };

  /* ---- kumbukumbu ---- */
  var PAIRS=6;
  GAME.memory = {
    intro:"Twelve cards, six pairs from the menu. Flip two: a match stays up. Solo, fewer moves score more, and six is perfect. In teams, a match keeps your turn.",
    setup:{secs:[10,15,20], def:15},
    start:function(){
      var dishes=["bf","wf","d1",L("kc"),L("hgp"),L("mvz"),L("pk"),"s1",L("mbc"),L("bfc"),"cf",L("kb")].filter(function(id){ return ITEMS[id]; });
      var ids = adult===true ? deal("mem-d", bottles(), 4, function(x){ return ITEMS[x].name; }).concat(shuffle(dishes).slice(0,2)) : shuffle(dishes).slice(0,PAIRS);
      S.cards=shuffle(ids.concat(ids)).map(function(id,k){ return {id:id, k:k, up:false, done:false}; });
      S.open=[]; S.moves=0; S.lock=false; S.i=0;
      if(S.party.solo){ S.phase="mem"; render(); } else handoff();
    },
    turn:function(){ S.phase="mem"; S.open=[]; render(); },
    html:function(){
      var t=turn(), left=S.cards.filter(function(c){ return !c.done; }).length/2;
      var h='<div class="qhead"><span>'+(S.party.solo?S.moves+(S.moves===1?" move":" moves"):esc(t.player)+" · Team "+esc(S.party.teams[t.team].name))+"</span><span>"+left+" pairs to find</span></div>"+(S.party.solo?"":barHtml())+boardHtml();
      h+='<div class="mem" role="group" aria-label="Cards">'+S.cards.map(function(c,k){
        var it=ITEMS[c.id], up=c.up||c.done;
        return '<button type="button" class="mcard'+(up?" is-up":"")+(c.done?" is-done":"")+'" data-mem="'+k+'" aria-label="'+(up?esc(it.name):"Card "+(k+1)+", face down")+'"'+(c.done?" disabled":"")+'><span class="mcard__b" aria-hidden="true"></span><span class="mcard__f">'+(up?itemMedia(c.id)+"<small>"+esc(shortName(it))+"</small>":"")+"</span></button>"; }).join("")+"</div>";
      return h;
    },
    after:function(){
      if(S.party.solo || S.phase!=="mem" || T.iv) return;
      var self=this, secs=S.party.secs;
      clock(secs, function(l){ setBar(l,secs); }, function(){ self.pass(); });
    },
    flip:function(k){
      var c=S.cards[k]; if(S.lock || c.up || c.done) return;
      c.up=true; S.open.push(k); cue();
      if(S.open.length<2){ render('[data-mem="'+k+'"]'); return; }
      S.moves++;
      var a=S.cards[S.open[0]], b=S.cards[S.open[1]], self=this;
      if(a.id===b.id){
        a.done=b.done=true; S.open=[]; S.scores[turn().team]++; cue("good"); if(!S.party.solo) stop();
        if(S.cards.every(function(c){ return c.done; })){ render(); later(function(){ if(S.party.solo) soloEnd(Math.max(0,Math.min(100,100-(S.moves-PAIRS)*6)), 100, "points · "+S.moves+" moves"); else teamEnd("pairs"); }, 700); return; }
        render('[data-mem="'+k+'"]');
      } else {
        S.lock=true; render('[data-mem="'+k+'"]');
        later(function(){ a.up=b.up=false; S.open=[]; S.lock=false; if(S.party.solo) render('[data-mem="'+k+'"]'); else self.pass(); }, 900);
      }
    },
    pass:function(){ stop(); S.cards.forEach(function(c){ if(!c.done) c.up=false; }); S.open=[]; S.lock=false; S.i=(S.i||0)+1; handoff(); }
  };
  function shortName(it){ return (it.fam ? FAM[it.fam].name : it.name).replace(/, (1 kg|whole|half|½ kg)$/,""); }

  /* ---- kichwa juu ---- */
  GAME.headsup = {
    intro:"Weka simu kwa kichwa, screen facing out. The table describes or acts it out: no saying the word! Tap the right half when you get it, the left half to pass.",
    setup:{secs:[30,45,60,90], def:60, deck:true, start:"Twende, anza!"},
    start:function(){
      var st=S.setup, words=st.deck==="mix" ? [].concat.apply([], Object.keys(D.decks).map(function(k){ return D.decks[k][1]; })) : D.decks[st.deck][1];
      S.words=deal("hu-"+st.deck, words, Math.min(words.length, 80), function(w){ return w; }); S.w=0; S.i=0;
      if(S.party.solo) this.turn(); else handoff();
    },
    turn:function(){ S.phase="hu"; S.got=0; S.log=[]; S.flash=""; render(); },
    html:function(){
      if(S.phase==="hu-end"){
        var t=turn(), last=S.i+1>=S.order.length;
        return '<div class="end"><p class="end__k">'+(S.got>=8?"Noma sana!":S.got>=4?"Hapo sawa!":"Aii, next time!")+'</p><p class="end__score"><b>'+S.got+"</b><span>"+(S.party.solo?"got it":"for "+esc(t.player)+" · Team "+esc(S.party.teams[t.team].name))+"</span></p>"+boardHtml()+
          '<div class="hu-log">'+S.log.map(function(l){ return '<span class="pchip'+(l.got?" is-got":"")+'">'+(l.got?"✓ ":"– ")+esc(l.w)+"</span>"; }).join("")+"</div>"+
          '<div class="end__go">'+(S.party.solo?'<button type="button" class="sbtn" data-pagain data-auto>Play again</button><button type="button" class="sbtn sbtn--ghost" data-px>Other games</button>':
            '<button type="button" class="sbtn sbtn--go" data-pnext data-auto>'+(last?"See who won":"Next turn")+"</button>")+"</div></div>";
      }
      var word=S.words[S.w % S.words.length];
      return barHtml()+'<div class="hu'+(S.flash?" is-"+S.flash:"")+'"><button type="button" class="hu__half hu__pass" data-hu="pass" aria-label="Pass">Pass</button><p class="hu__w" aria-live="polite">'+esc(word)+'</p><button type="button" class="hu__half hu__got" data-hu="got" aria-label="Got it" data-auto>Got it</button></div><p class="st-note">'+S.got+" got so far. Keys: ← pass, → got it.</p>";
    },
    after:function(){ if(S.phase!=="hu") return; var self=this, secs=S.party.secs; clock(secs, function(l){ setBar(l,secs); }, function(){ cue("bad"); S.phase="hu-end"; render(); }); },
    mark:function(got){
      if(S.phase!=="hu") return;
      var word=S.words[S.w % S.words.length]; S.log.push({w:word, got:got}); S.w++;
      if(got){ S.got++; S.scores[turn().team]++; }
      cue(got?"good":"bad"); S.flash=got?"got":"pass";
      var w=$("play-card").querySelector(".hu__w"), box=$("play-card").querySelector(".hu"), n=$("play-card").querySelector(".st-note");
      if(w) w.textContent=S.words[S.w % S.words.length]; if(n) n.textContent=S.got+" got so far. Keys: ← pass, → got it.";
      if(box){ box.classList.remove("is-got","is-pass"); void box.offsetWidth; box.classList.add("is-"+S.flash); }
    },
    next:function(){ S.i++; if(S.i>=S.order.length){ teamEnd("words"); return; } handoff(); }
  };

  /* ---- ungependa ---- */
  GAME.wyr = {
    intro:"Would you rather? Read it out, and everyone taps the side they’d choose. Then see how the table split.",
    setup:{noTeams:true, start:"Anza"},
    start:function(){ S.pairs=deal("wyr", D.wyr, 12, function(p){ return p[0]; }); S.i=0; this.turn(); },
    turn:function(){ S.phase="wyr"; S.v=[0,0]; S.shown=false; render(); },
    html:function(){
      var p=S.pairs[S.i], tot=S.v[0]+S.v[1];
      var h='<div class="qhead"><span>'+(S.i+1)+" of "+S.pairs.length+'</span><span>'+tot+(tot===1?" vote":" votes")+'</span></div><p class="q">Ungependa…</p><div class="wyr">';
      h+=p.map(function(o,k){ var pc=tot?Math.round(S.v[k]/tot*100):0; return '<button type="button" class="wyr__o wyr__o--'+k+(S.shown?" is-shown":"")+'" data-wyr="'+k+'"'+(k===0?" data-auto":"")+' style="--p:'+pc+'%"><span>'+esc(o)+"</span><b>"+(S.shown?pc+"%":S.v[k]?"+"+S.v[k]:"Tap")+"</b></button>"+(k===0?'<span class="wyr__or" aria-hidden="true">au</span>':""); }).join("");
      h+="</div>";
      h+=S.shown ? '<button type="button" class="sbtn sbtn--go" data-pnext>'+(S.i+1>=S.pairs.length?"That’s the deck":"Next one")+"</button>" : '<button type="button" class="sbtn sbtn--go" data-wshow'+(tot?"":" disabled")+">Show the split</button>";
      return h;
    },
    vote:function(k){ if(S.shown) return; S.v[k]++; cue(); render('[data-wyr="'+k+'"]'); },
    show:function(){ S.shown=true; render("[data-pnext]"); },
    next:function(){ S.i++; if(S.i>=S.pairs.length){ S.phase="wyr-end"; S.i=S.pairs.length-1; render(); return; } this.turn(); }
  };
  var wyrEnd='<div class="end"><p class="end__k">Hiyo ndio deck</p><p class="end__big">That’s the deck</p><p class="end__sub">Twelve choices, and a table that knows itself a little better.</p>';

  /* ---- chora ---- */
  GAME.chora = {
    intro:"Teams take turns. The drawer sees the word, draws it on the phone, and the team shouts guesses before time is up. No letters, no numbers.",
    setup:{solo:false, secs:[45,60,90], def:60, start:"Twende, chora!"},
    start:function(){ S.words=deal("chora", D.chora, D.chora.length, function(w){ return w; }); S.w=0; S.i=0; handoff(); },
    turn:function(){ S.phase="chora"; S.got=0; S.seen=false; S.ink="#F1ECD7"; S.strokes=null; S.left=null; render(); },
    html:function(){
      if(S.phase==="chora-end"){ var last=S.i+1>=S.order.length, t=turn();
        return '<div class="end"><p class="end__k">Time imeisha!</p><p class="end__score"><b>'+S.got+"</b><span>for "+esc(t.player)+" · Team "+esc(S.party.teams[t.team].name)+"</span></p>"+boardHtml()+'<div class="end__go"><button type="button" class="sbtn sbtn--go" data-pnext data-auto>'+(last?"See who won":"Next turn")+"</button></div></div>"; }
      var word=S.words[S.w % S.words.length];
      var h=barHtml()+boardHtml()+'<div class="chora__w">'+(S.seen?'<span>Draw: <b>'+esc(word)+'</b></span><button type="button" class="spill" data-cseen>Hide</button>':'<button type="button" class="sbtn sbtn--ghost" data-cseen data-auto>Tap to see your word</button>')+"</div>";
      h+='<div class="chora__pad"><canvas id="chora-c" aria-label="Drawing pad"></canvas></div>';
      h+='<div class="chora__tools"><div class="st-pills" role="group" aria-label="Colour">'+["#F1ECD7","#CDDF7B","#EE8A70","#8FC3E8"].map(function(c){ return '<button type="button" class="swatch'+(S.ink===c?" is-on":"")+'" data-cink="'+c+'" style="--c:'+c+'" aria-label="Colour" aria-pressed="'+(S.ink===c)+'"></button>'; }).join("")+'<button type="button" class="spill" data-cclear>Clear</button></div>'+
        '<div class="chora__go"><button type="button" class="sbtn sbtn--ghost" data-cskip>Skip</button><button type="button" class="sbtn sbtn--go" data-cgot>They got it</button></div></div>';
      return h;
    },
    after:function(){
      if(S.phase!=="chora") return;
      var self=this, secs=S.party.secs, cv=$("chora-c"), ctx=cv.getContext("2d"), dpr=Math.min(2,window.devicePixelRatio||1), w=cv.parentNode.clientWidth, hh=Math.round(w*0.7);
      cv.width=w*dpr; cv.height=hh*dpr; cv.style.height=hh+"px"; ctx.scale(dpr,dpr); ctx.lineCap="round"; ctx.lineJoin="round"; ctx.lineWidth=5;
      if(S.strokes) S.strokes.forEach(function(s){ line(s); });
      var cur=null;
      function pt(e){ var r=cv.getBoundingClientRect(); return [e.clientX-r.left, e.clientY-r.top]; }
      function line(s){ ctx.strokeStyle=s.c; ctx.beginPath(); s.p.forEach(function(p,k){ if(k) ctx.lineTo(p[0],p[1]); else ctx.moveTo(p[0],p[1]); }); if(s.p.length===1){ ctx.lineTo(s.p[0][0]+.1,s.p[0][1]); } ctx.stroke(); }
      cv.addEventListener("pointerdown", function(e){ e.preventDefault(); try{ cv.setPointerCapture(e.pointerId); }catch(x){} cur={c:S.ink, p:[pt(e)]}; (S.strokes=S.strokes||[]).push(cur); line(cur); });
      cv.addEventListener("pointermove", function(e){ if(!cur) return; cur.p.push(pt(e)); var n=cur.p.length; ctx.strokeStyle=cur.c; ctx.beginPath(); ctx.moveTo(cur.p[n-2][0],cur.p[n-2][1]); ctx.lineTo(cur.p[n-1][0],cur.p[n-1][1]); ctx.stroke(); });
      ["pointerup","pointercancel"].forEach(function(ev){ cv.addEventListener(ev, function(){ cur=null; }); });
      if(!T.iv) clock(S.left!=null?S.left:secs, function(l){ S.left=l; setBar(l,secs); }, function(){ cue("bad"); S.phase="chora-end"; S.left=null; S.strokes=null; render(); });
    },
    word:function(got){ if(got){ S.got++; S.scores[turn().team]++; cue("good"); } else cue(); S.w++; S.strokes=null; S.seen=false; render("[data-cseen]"); },
    next:function(){ S.i++; S.left=null; if(S.i>=S.order.length){ teamEnd("drawings"); return; } handoff(); }
  };

  /* ---- spin the bottle ---- */
  GAME.spin = {
    intro:"Names round the table, a bottle in the middle. Spin it, and whoever it points at takes the dare. Every dare is a laugh, never a drink.",
    setup:{names:true},
    start:function(){ store.set("bc-play-names", S.setup.names); S.names=S.setup.names.slice(); S.rot=0; S.dare=null; S.at=null; S.phase="spin"; render(); },
    html:function(){
      var n=S.names.length, r=150, h='<div class="spin"><div class="spin__ring">';
      S.names.forEach(function(nm,k){ var a=(k/n)*Math.PI*2-Math.PI/2; h+='<span class="spin__name'+(S.at===k?" is-on":"")+'" style="left:'+(50+Math.cos(a)*41).toFixed(2)+"%;top:"+(50+Math.sin(a)*41).toFixed(2)+'%">'+esc(nm)+"</span>"; });
      h+='<svg class="spin__btl" id="spin-btl" viewBox="0 0 60 200" style="transform:rotate('+S.rot+'deg)" aria-hidden="true"><path d="M24 8h12v26l8 14v130a10 10 0 0 1-10 10H26a10 10 0 0 1-10-10V48l8-14z" fill="#1d2a20" stroke="#CDDF7B" stroke-width="2"/><rect x="18" y="96" width="24" height="44" rx="3" fill="#E8AA45"/><rect x="23" y="4" width="14" height="10" rx="2" fill="#CDDF7B"/></svg></div></div>';
      h+='<div class="said'+(S.dare?" is-good":"")+'" role="status" id="spin-said">'+(S.dare?"<b>"+esc(S.names[S.at])+", your dare:</b><p>"+esc(S.dare)+"</p>":"<b>Ready?</b><p>Put the phone in the middle of the table.</p>")+"</div>";
      return h+'<div class="end__go"><button type="button" class="sbtn sbtn--go" data-sgo data-auto>'+(S.dare?"Spin again":"Spin the bottle")+'</button><button type="button" class="sbtn sbtn--ghost" data-pback>Change the names</button></div>';
    },
    spin:function(){
      if(S.spinning) return;
      var n=S.names.length, k=Math.floor(Math.random()*n), target=(k/n)*360, cur=((S.rot%360)+360)%360, turns=4+Math.floor(Math.random()*3);
      var to=S.rot+turns*360+((target-cur+360)%360), el=$("spin-btl"), self=this;
      S.spinning=true; S.at=null; S.dare=null; cue("go");
      var said=$("spin-said"); if(said){ said.className="said"; said.innerHTML="<b>Inazunguka…</b><p>Round and round it goes.</p>"; }
      var fin=function(){ S.spinning=false; S.rot=to; S.at=k; S.dare=deal("dares", D.dares, 1, function(d){ return d; })[0]; cue("good"); render("[data-sgo]"); };
      if(el && el.animate && !matchMedia("(prefers-reduced-motion: reduce)").matches){ var a=el.animate([{transform:"rotate("+S.rot+"deg)"},{transform:"rotate("+to+"deg)"}],{duration:2600,easing:"cubic-bezier(.12,.6,.14,1)",fill:"forwards"}); a.onfinish=fin; }
      else fin();
    }
  };

  /* ---------- clicks, keys, forms ---------- */
  function onClick(e){
    if(e.target===$("play")){ close(); return; }
    var t=e.target.closest("button"); if(!t || !S) return;
    var a=function(n){ return t.getAttribute(n); };
    if(t.hasAttribute("data-px")){ close(); return; }
    if(t.hasAttribute("data-psnd")){ store.set("bc-play-mute", !muted()); t.setAttribute("aria-pressed", String(!muted())); t.innerHTML=sndSvg(); return; }
    if(t.hasAttribute("data-pmode")){ S.setup.solo=a("data-pmode")==="solo"; render('[data-pmode="'+a("data-pmode")+'"]'); return; }
    if(t.hasAttribute("data-psecs")){ S.setup.secs=+a("data-psecs"); render('[data-psecs="'+a("data-psecs")+'"]'); return; }
    if(t.hasAttribute("data-pdeck")){ S.setup.deck=a("data-pdeck"); render('[data-pdeck="'+a("data-pdeck")+'"]'); return; }
    if(t.hasAttribute("data-pdel")){ var q=a("data-pdel").split(":"); S.setup.teams[+q[0]].players.splice(+q[1],1); render('[data-padd="'+q[0]+'"] input'); return; }
    if(t.hasAttribute("data-tdel")){ S.setup.teams.splice(+a("data-tdel"),1); render("[data-tnew],[data-pstart]"); return; }
    if(t.hasAttribute("data-tnew")){ var k=S.setup.teams.length; S.setup.teams.push({name:TEAMN[k], players:[]}); render('[data-padd="'+k+'"] input'); return; }
    if(t.hasAttribute("data-ndel")){ S.setup.names.splice(+a("data-ndel"),1); render("[data-nadd] input,[data-pstart]"); return; }
    if(t.hasAttribute("data-pstart")){ start(); return; }
    if(t.hasAttribute("data-pgo")){ go(); return; }
    if(t.hasAttribute("data-pagain")){ stop(); start(); return; }
    if(t.hasAttribute("data-pback")){ stop(); S.phase="setup"; render(); return; }
    if(t.hasAttribute("data-pnext")){ GAME[S.g.id].next(); return; }
    if(t.hasAttribute("data-pfood")){ close(); scrollToCat("today"); return; }
    if(t.hasAttribute("data-pcopy")){ var sm=$("p-copied"); try{ navigator.clipboard.writeText(R.code).then(function(){ if(sm) sm.textContent="Copied"; },function(){ if(sm) sm.textContent="Saved for your next order"; }); }catch(x){ if(sm) sm.textContent="Saved for your next order"; } return; }
    if(t.hasAttribute("data-pans")){ GAME[S.g.id].answer(+a("data-pans")); return; }
    if(t.hasAttribute("data-pbtl")){ GAME.guess.answer(a("data-pbtl")); return; }
    if(t.hasAttribute("data-bstep")){ GAME.bei.step(+a("data-bstep")); return; }
    if(t.hasAttribute("data-block")){ GAME.bei.lock(); return; }
    if(t.hasAttribute("data-mem")){ GAME.memory.flip(+a("data-mem")); return; }
    if(t.hasAttribute("data-hu")){ GAME.headsup.mark(a("data-hu")==="got"); return; }
    if(t.hasAttribute("data-wyr")){ GAME.wyr.vote(+a("data-wyr")); return; }
    if(t.hasAttribute("data-wshow")){ GAME.wyr.show(); return; }
    if(t.hasAttribute("data-cseen")){ S.seen=!S.seen; render("[data-cseen]"); return; }
    if(t.hasAttribute("data-cink")){ S.ink=a("data-cink"); render('[data-cink="'+S.ink+'"]'); return; }
    if(t.hasAttribute("data-cclear")){ S.strokes=null; render("[data-cclear]"); return; }
    if(t.hasAttribute("data-cgot")){ GAME.chora.word(true); return; }
    if(t.hasAttribute("data-cskip")){ GAME.chora.word(false); return; }
    if(t.hasAttribute("data-sgo")){ GAME.spin.spin(); return; }
  }
  function onSubmit(e){
    var f=e.target; e.preventDefault(); if(!S) return;
    var inp=f.querySelector("input"), v=(inp.value||"").trim().slice(0,16); if(!v) return;
    if(f.hasAttribute("data-padd")){ var i=+f.getAttribute("data-padd"); S.setup.teams[i].players.push(v); render('[data-padd="'+i+'"] input'); }
    else if(f.hasAttribute("data-nadd")){ if(S.setup.names.length<12) S.setup.names.push(v); render("[data-nadd] input,[data-pstart]"); }
  }
  function onInput(e){ var t=e.target; if(S && t.hasAttribute("data-tname")) S.setup.teams[+t.getAttribute("data-tname")].name=t.value.slice(0,14); }
  function onKey(e){
    if(!S || $("play").hidden) return false;
    if(e.key==="Escape"){ close(); return true; }
    var tag=(e.target.tagName||"").toLowerCase(); if(tag==="input" || tag==="textarea") return false;
    if(S.g.id==="headsup" && S.phase==="hu"){ if(e.key==="ArrowRight"){ e.preventDefault(); GAME.headsup.mark(true); return true; } if(e.key==="ArrowLeft"){ e.preventDefault(); GAME.headsup.mark(false); return true; } }
    if(S.g.id==="pour" && S.phase==="pour" && S.key && (e.key===" " || e.code==="Space")){ e.preventDefault(); if(e.type==="keydown"){ if(!e.repeat) S.key.down(); } else S.key.up(); return true; }
    return false;
  }
  /* the end of Ungependa has its own screen */
  var _html=GAME.wyr.html; GAME.wyr.html=function(){ return S.phase==="wyr-end" ? wyrEnd+againHtml(false)+"</div>" : _html.call(this); };

  return {open:open, close:close, hubHtml:hubHtml, refreshHub:refreshHub, setKind:setKind, onClick:onClick, onSubmit:onSubmit, onInput:onInput, onKey:onKey, isOpen:function(){ return !$("play").hidden; }, count:function(){ return D.games.filter(can).length; }};
})();
