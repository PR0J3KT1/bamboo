// One-time export, like export-menu.mjs: the old site's games content (PLAYD: the quiz banks, the
// Kichwa Juu decks, Ungependa, Chora words, dares, starting names and the reward thresholds) to
// src/db/seed-data/games.json, read by src/lib/games. Also copies the game card photos.
// usage: node scripts/export-games.mjs ../bamboo-cask.html
import fs from "node:fs";
import path from "node:path";

const [src] = process.argv.slice(2);
const root = path.dirname(path.resolve(src));
const html = fs.readFileSync(src, "utf8");
const data = JSON.parse(html.match(/var PLAYD = (\{[\s\S]*?\});\n/)[1]);
fs.writeFileSync("src/db/seed-data/games.json", JSON.stringify(data));
let n = 0;
for (const f of fs.readdirSync(path.join(root, "games"))) {
  fs.mkdirSync("public/games", { recursive: true });
  fs.copyFileSync(path.join(root, "games", f), path.join("public/games", f));
  n++;
}
console.log(`${data.games.length} games, ${Object.values(data.quiz).reduce((s, q) => s + q.length, 0)} quiz questions; ${n} photos copied`);
