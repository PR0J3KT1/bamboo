// One-time export: reads the menu out of the static page (../bamboo-cask.html) and writes
// src/db/seed-data/menu.json, which `pnpm db:seed` loads into Postgres.
// usage: node scripts/export-menu.mjs ../bamboo-cask.html src/db/seed-data/menu.json
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const [src, dst] = process.argv.slice(2);
const html = fs.readFileSync(src, "utf8");

const drinks = html.match(/<!--DRINKS:start--><script>([\s\S]*?)<\/script><!--DRINKS:end-->/)[1];
const start = html.indexOf("var ITEMS = {");
const placesEnd = html.indexOf("/* =====", html.indexOf("/* ===================== delivery places") + 10);
let menu = html.slice(start, placesEnd);
// helpers the menu code calls that are defined elsewhere in the page
const prelude = `
var window = this;
function fold(s){ return String(s).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9%]+/g," ").trim(); }
function esc(s){ return String(s); }
function $(){ return null; }
var document = { getElementById: function(){ return null; }, querySelector: function(){ return null; } };
var store = { get: function(k,d){ return d; }, set: function(){} };
`;
const ctx = {};
vm.createContext(ctx);
vm.runInContext(prelude + drinks + "\n" + menu +
  "\n;this.__out={ITEMS:ITEMS,FAM:FAM,BUNDLES:BUNDLES,WHO:WHO,CATS:CATS,GOES:GOES,SHELVES:SHELVES,PLACES:typeof PLACES!=='undefined'?PLACES:[],POPULAR:typeof POPULAR!=='undefined'?POPULAR:[],LOUNGE:typeof LOUNGE!=='undefined'?LOUNGE:null};", ctx);
const o = ctx.__out;

const items = Object.entries(o.ITEMS).map(([id, it]) => ({
  id,
  name: it.name,
  description: it.desc ?? null,
  price: it.price,
  category: it.cat,
  alcohol: !!it.alcohol,
  family: it.fam ?? null,
  portion: it.por ?? null,
  tag: it.tag ?? null,
  options: it.options ?? null,
  optionLabel: it.optLabel ?? null,
  brand: it.brand ?? null,
  kind: it.kind ?? null,
  shelf: it.shelf ?? null,
  size: it.size ?? null,
  abv: it.abv ?? null,
  origin: it.origin ?? null,
  notes: it.notes || null,
  serve: it.serve ?? null,
  sprite: it.sp || null,
  photo: it.ph ?? null,
  credit: it.credit ?? null,
}));
const families = Object.entries(o.FAM).map(([id, f]) => ({ id, name: f.name, label: f.label, lead: f.lead }));
const bundles = Object.entries(o.BUNDLES).map(([id, b]) => ({ id, name: b.name, who: b.who, photo: b.ph ?? null, parts: b.parts }));
const categories = o.CATS.map((c, i) => ({ id: c.id, name: c.name, note: c.note ?? null, kind: c.kind ?? "items", adult: !!c.adult, sort: i }));
const shelves = o.SHELVES.map((s, i) => ({ id: s.id, name: s.name, sort: i }));
// the page keeps each place's coordinates only in the raw list, before .map(); read them from there
const rawPlaces = new Function("return " + html.match(/var PLACES = (\[[\s\S]*?\n\])\.map\(/)[1])();
const coords = new Map(rawPlaces.map((r) => [r[0], [r[3], r[4]]]));
const places = o.PLACES.map((p) => ({ id: p.id, name: p.name, detail: p.sub, km: p.km, lat: coords.get(p.id)?.[0] ?? null, lng: coords.get(p.id)?.[1] ?? null, keywords: p.hay }));
const out = { lounge: o.LOUNGE, popularPlaces: o.POPULAR, categories, shelves, families, items, bundles, pairings: o.GOES, places };
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.writeFileSync(dst, JSON.stringify(out, null, 1));
console.log(`${items.length} items (${items.filter(i => i.alcohol).length} alcohol), ${families.length} families, ${bundles.length} bundles, ${categories.length} categories, ${shelves.length} shelves, ${places.length} places`);
