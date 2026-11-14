// One-time export, like export-menu.mjs: the old static page's photo tables, written to
// src/db/seed-data/photos.json for src/lib/pictures.ts, and the image files copied into public/.
//   lounge  the lounge's own photos (BC_PH and PH_ALT): the hero, kienyeji, tilapia, the bar…
//   food    free-licensed photos for dishes the lounge hasn't photographed yet (BC_FOODPH), each
//           with its credit; dishes maps an item or family id to one of them
// The bottle sprite sheets (drinks/*.webp|avif) are copied as they are; items.sprite points into them.
// usage: node scripts/export-photos.mjs ../bamboo-cask.html
import fs from "node:fs";
import path from "node:path";

const [src] = process.argv.slice(2);
const root = path.dirname(path.resolve(src));
const html = fs.readFileSync(src, "utf8");

const ph = new Function("return " + html.match(/window\.BC_PH=(\{[^}]*\})/)[1])();
const alt = new Function("return " + html.match(/var PH_ALT = (\{[\s\S]*?\n\})/)[1])();
const food = JSON.parse(html.match(/window\.BC_FOODPH=(\{.*?\});?<\/script>/)[1]);

const clean = (s) => s.replace(/\?v=\d+$/, "");
const out = {
  lounge: Object.fromEntries(Object.entries(ph).map(([k, s]) => [k, { src: "/" + clean(s), alt: alt[k] ?? "" }])),
  food: Object.fromEntries(Object.entries(food.photos).map(([k, p]) => [k, { src: "/" + clean(p.src), alt: p.alt, credit: p.credit ?? null }])),
  dishes: food.dishes,
};

const pub = path.resolve("public");
const files = new Set([...Object.values(out.lounge), ...Object.values(out.food)].map((p) => p.src.slice(1)));
for (const f of fs.readdirSync(path.join(root, "drinks"))) files.add(`drinks/${f}`);
let copied = 0;
for (const f of files) {
  const from = path.join(root, f);
  if (!fs.existsSync(from)) { console.warn("missing", f); continue; }
  fs.mkdirSync(path.dirname(path.join(pub, f)), { recursive: true });
  fs.copyFileSync(from, path.join(pub, f));
  copied++;
}
fs.writeFileSync("src/db/seed-data/photos.json", JSON.stringify(out, null, 1));
console.log(`${Object.keys(out.lounge).length} lounge photos, ${Object.keys(out.food).length} food photos for ${Object.keys(out.dishes).length} dishes; ${copied} files copied to public/`);
