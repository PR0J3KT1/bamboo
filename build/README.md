# Build scripts for bamboo-cask.html

The first set of scripts built the original Cask Room from the catalogue crawl; its photos, strengths and notes are still reused. Run them in order, with Python 3 and Pillow 11.3 or newer (Pillow needs AVIF support). Use `-I` so Python doesn't load modules from the data folders.

| Step | Command | What it does |
|---|---|---|
| 1 | `python -I bs_crawl.py data` | Reads every shelf of the catalogue and writes `data/listing.json`. Skip this step to use the saved copy. |
| 2 | `python -I bs_img.py data/listing.json img` | Downloads each product photo once, into `img/`. |
| 3 | `python -I bs_build.py data/listing.json data/beyond-drinks.json data/drinks.json` | Fixes names and sizes, drops repeats and non-drinks, sets each drink's type and usual strength (ABV). |
| 4 | `python -I bs_sprites.py data/drinks.json img ../drinks photo_fixes.json [--review review]` | Cuts the bottles out of their backgrounds and packs them into sheets, `../drinks/<shelf>-<n>.avif` and `.webp`. `--review` also writes labelled pages for checking the photos by eye. |
| 5 | `python -I bs_embed.py data/drinks.json ../bamboo-cask.html` | Writes the list into the page, between the `DRINKS` markers. |

`photo_fixes.json` lists the photo decisions made by hand:

- **alias:** a drink with no photo borrows the photo of the same bottle in another size. A can, a box or a flavour never borrows.
- **drop:** the catalogue photo shows the wrong product (or a can where the drink is a bottle), a promo graphic, or a background the cut-out can't remove. These drinks get a drawn bottle instead.
- **cut:** a gentler background cut, for a photo shot on light grey.
- **commons:** a free-licensed photo from Wikimedia Commons, for a bottle the catalogue has no usable photo of. The cut-out lives in `<image dir>/commons/<slug>.png`, and the entry keeps the author, the licence and the file page. `bs_embed.py` writes these into `window.BC_CREDITS`, and the drink sheet shows the credit under the bottle. A drink that borrows another size's photo also borrows its credit. Only use files whose licence allows reuse with credit (CC BY, CC BY-SA, CC0, public domain). Never use another shop's photos.

A dropped photo can still borrow another size's photo through **alias**.

The page asks for the AVIF sheets when the browser can show them, and the WebP sheets otherwise. Publish both sets, along with `photos/*.webp`, next to the page.

## The menu from the lounge's stock list (since version 24)

The drinks and food now come from the lounge's own stock list, `BAMBOO CASK COST PRICE AGAINST SELLING PRICE 2026.xlsx`, at its selling prices. Anything not on the list was taken off the page. The sheet's buying prices are the lounge's private figures: they are never copied out of the spreadsheet, and `data/stock-sell.json` holds only names and selling prices.

| Step | Command | What it does |
|---|---|---|
| 1 | `python -I stock_build.py data/stock-sell.json data/drinks.json photo_fixes.json data/stock-drinks.json stock_fixes.json` | Turns each stock-list row into a drink with `stock_rows.py`, and reuses the photo, strength and notes of the matching catalogue bottle. Every price comes from the stock list. |
| 2 | `python -I bs_sprites.py data/stock-drinks.json <image dir> ../drinks stock_fixes.json` | Packs the bottles into 14 sheets. The image dir is wherever `bs_img.py` saved the photos (for version 24 it was a copy in the scratchpad, `bs-img`) (`../drinks/<shelf>-<n>.avif` and `.webp`). |
| 3 | `python -I bs_embed.py data/stock-drinks.json ../bamboo-cask.html` | Writes the drinks into the page. |

`stock_rows.py` maps every sheet name. A row marked `X` is left off with a reason (tobacco, vapes, medicines, lighters, containers, and one unknown item), `FOOD` moves to the kitchen, and `HOUSE` is one of the house bottles. The food list (breakfast, grill, stews, soups, sides, with every portion size as its own price) was patched into the page by hand; `ITEMS` in the page is its source now.

## More drink photos from Commons (since version 28)

Version 28 gave 18 more drinks a photo: 13 new Commons cut-outs, their other sizes through **alias**, and Orange water through a catalogue alias. 240 of the 331 drinks now have a photo. These photos are on busy backgrounds, so each bottle is cut out along a traced outline instead of by the colour cut.

| Step | Command | What it does |
|---|---|---|
| 1 | `python -P drink_prep.py . data/drink-search.json drink_choices.json <image dir> <cache dir> <review.jpg>` | Fetches each chosen photo (960 wide) into the cache dir, cuts the bottle out, and saves `<image dir>/commons/<slug>.png`. Writes the credit into `stock_fixes.json` under **commons**, with `"ready": true`, and adds an **alias** for each `also` slug. Then draws a review sheet. |
| 2 | steps 2 and 3 above (`bs_sprites.py`, then `bs_embed.py`) | Packs and embeds as usual. A `ready` cut-out goes onto the sheet as it is; the older Commons photos still go through the colour cut. |

Each entry in `drink_choices.json` names a candidate in `data/drink-search.json` (`from` and `pick`). It can also crop, and then give one outline, as fractions of the crop:
- `profile`: `[centre x, [[y, half width], ...]]`, for a bottle seen square on.
- `edges`: `[[y, left x, right x], ...]`, for a bottle seen a little off-square.
- `poly`: any polygon. `extra` polygons are added to the outline, and `holes` are cut out of it (the mug handle).
- `cut`: `["grow", local, lo, hi]` grows the background in from the edges. With an outline as well, everything outside the outline is first painted the wall colour (`pad`), so the outline only clears clutter (Budweiser's counter top) and the cut finds the edge.

Three helper scripts:
- `outline_check.py` draws an outline over its photo, large, on a 2.5% grid.
- `edge_scan.py` reads a bottle's edges row by row against a plain background.
- `cut_zoom.py` shows cut-outs on a two-colour ground, so stray background shows up.

A stand-in photo (a plain mug, a glass of white wine, an unbranded water bottle) carries a `note` in its **commons** entry. The drink sheet shows the note before the credit, for example "A photo for illustration; the lounge's mug may look different."

Version 29 added Johnnie Walker White (both sizes) with the White Walker edition photo, once the user confirmed that is the lounge's bottle. 242 of the 331 drinks now have a photo.

Version 30 added Tusker Draught by the jug. The photo is a plain glass jug of lager, not the lounge's own jug, so the drink sheet says "A photo for illustration". 243 of the 331 drinks now have a photo.

`build/commons/` keeps a copy of every Commons cut-out (21 files). Copy them into `<image dir>/commons/` before running `bs_sprites.py`. `drink_prep.py` can also remake the 15 newer ones from Commons, but not the six older ones.

Left drawn on purpose:
- **Heineken 0.0:** the only photo is an empty, open bottle against a window.
- **The rest (87 drinks):** Commons has no free photo of these bottles, or none that matches the brand, flavour and pack. This covers most Kenyan brands, flavoured premixes and generic mixers.

## Dish photos (since version 27)

Dishes the lounge hasn't photographed show a free-licensed photo instead of a drawn plate or a name tile.

| Step | Command | What it does |
|---|---|---|
| 1 | `python -P food_photos.py <search.json> <lounge photo dir> <cache dir> ../bamboo-cask.html` | Fetches each chosen Commons photo once (at 960 wide, or 1920 for a tight crop) into the cache dir, cuts it to 4:3 and saves `../photos/food/<key>.webp` (640 x 480). Then writes the `FOODPH` block into the page. The first run also makes the one-time page edits; later runs skip them. Publish `photos/food/*.webp` next to the page. |

- **`food_photos.json`:** `subjects` gives each photo a candidate number in the search results (`pick`, or `from` another search's list), a crop centre (`x`, `y`), a `zoom` and the alt text. `{"own": "<file>"}` uses one of the lounge's own photos instead. `dishes` says which photo each dish, family or bundle id uses.
- **`search.json`:** a Wikimedia Commons search, one list of candidates per subject, with the size, licence, author and file page of each. For version 27 it was made by a scratch script that searched Commons and laid the candidates out on contact sheets; any search that keeps those fields will do. Only CC BY, CC BY-SA, CC0 and public-domain files pass, and the script checks again.
- **Credit:** the dish sheet says "A photo for illustration; the lounge's plate may look different", then the author, the licence and a link to the file page. The footer says so too. The author field sometimes carries a note after the name; only the first line is kept, but read the note first. The first bacon photo was dropped because its note asks to be emailed before any reuse.
- **Under-18s see the food menu.** Check each photo's edges for glasses and bottles, and crop them out (`zoom`, `x`, `y`). The ribs, T-bone, goat stew and masala chips needed this.
- **Left drawn on purpose:** Anti-theft, a house special no photo could show honestly.
- **The lounge's own photos win:** a dish with `ph:` set (a key in `PH`) keeps that photo, so a new photo from the lounge replaces the stock one without touching `food_photos.json`.

## Games and party packages

The games and the party planner live in `src/` and go into the page between markers, so running the embed again replaces them.

| Step | Command | What it does |
|---|---|---|
| 1 | `python -I play_data.py <dump dir with games.json> src/play-data.json` | Builds the question banks, word decks and the game list. Only needed when the banks change. |
| 2 | `python -I play_embed.py ../bamboo-cask.html` | Puts `src/play.css`, `src/play.js`, `src/party.js` and the data into the page. The first run also wires in the two menu sections, the two dialogs and the reward line on the order totals; later runs skip those edits. |
| 3 | `python -P game_art.py <scene dir> <lounge photo dir> .. [card ids]` | Cuts the card photos to 16:9 and saves `../games/` and `../party/<id>.webp` (up to 800 wide), plus `<id>-sm.webp` (480 wide) when the crop is wider than that. The scene dir holds `games/` and `party/` (for version 25 and 26: the earlier games site's `public/`). Name card ids to redo only those. Only needed when a card photo changes. Use `-P`, not `-I`: Pillow is in the user site-packages, which `-I` skips. Publish `games/*.webp` and `party/*.webp` next to the page. |

**Party package pictures (since version 26).**
- **Photos:** each occasion card shows its Pexels photo, with the occasion's colour rising from the foot behind the icon and guest count. The planner's first step shows the same photos as tiles. The page numbers are in `PEX` in `party.js`, and a credit line sits under the grid.
- **Drinks out of shot:** under-18s see this section too.
  - New Year and Match Night are cropped so that the glass of bubbly and the beer on the table stay out, for everyone.
  - Office Party (a bottle in hand) and Sundowner (a toast with bottles) show under-18s the lounge's own events room and garden instead (`-u18` files, `U18` in `party.js`).
  - The garden crop starts below the beer-brand neon sign.
- **Class names:** the page already has a `.ph` class for kitchen photos, so the party photos use `.pkph`.

**Card pictures (since version 25).**
- **Photos that fill the card:**
  - The seven quiz and party scenes (Historia Yetu, Unasema Sheng?, Methali, Kaunti Gani?, Kichwa Juu, Ungependa?, Chora!) are Pexels photos, which are free to use. Their page numbers are in `PEXELS` in `play.js`, and the credit line under the games links each one. The site footer says so as well.
  - Bar Trivia (the Macallan on bamboo), Bei Gani (nyama choma) and the under-18 Kumbukumbu (fish with kachumbari) use the lounge's own photos, in their larger site originals.
- **A bottle from the menu, cut out, on the dark stage** (`STAGE` in `play.js`, matched by name and size):
  - **Guess the Bottle:** Tanqueray London Dry, as a silhouette until pointed at. A square bottle like Johnnie Walker reads as a box.
  - **Perfect Pour:** Courvoisier VS beside a drawn glass that fills to the line.
  - **Spin the Bottle:** Gilbey's Gin on its side, which spins when pointed at.
  - **Kumbukumbu:** a pair of Hennessy VS cards.
  - If a bottle leaves the menu, the card falls back to its drawn icon.
- **Size matching:** sizes in `ITEMS` go through `sizeLabel` ("750 ml"), so the lookup does the same. Each card also carries its icon in a small round badge.

- **Reward:** a solo score at or above the game's mark saves `BAMBOO5` on the device, and the next order takes 5% off its food lines only, never the drinks. One code per order. The code is a placeholder until the lounge approves one: change `reward` in `play_data.py`.
- **Adults only:** Guess the Bottle, Perfect Pour, Bar Trivia and Spin the Bottle are hidden for under-18s. Bei Gani and Kumbukumbu use food only for them, and the planner builds food, sodas and water.
- **Planner sums:** about 47 ml a spirit drink, 150 ml a glass of wine, 125 ml a glass of bubbles, about 30 ml a shot, 0.3 to 0.4 kg of meat a head, and a large water for every four guests.
- Code comments in `src/` end up in the page, so don't name other sites in them.

## Sign-in for the bar, the shelf wall and the game stack (since version 31)

These three live in `bamboo-cask.html` itself, not in a build script.

- **Sign-in:** the old "Are you 18 or older?" button is gone. The Cask Room opens only for a signed-in account aged 18 or over. Signing in has three steps:
  - a Kenyan mobile number, confirmed with a 6-digit code (valid 10 minutes, 5 tries, a new code after 30 seconds);
  - for a new number, a name and a date of birth, set once;
  - a tick that the date of birth is real.

  Guests and accounts under 18 get food, soft drinks and the non-drinks games, and alcohol is taken out of their order. An account under 18 is told the date of its 18th birthday. The rider still checks ID at handover, and that is the real age check.
- **Demo only:** no text message is sent. The code appears on screen as a pretend message, and accounts are kept in the browser (`bc-accounts`, `bc-me`, `bc-seen`). A live version needs a real SMS sender and a server that keeps the accounts.
- **The shelf wall:** the overview of every shelf is now a curved wall, one row per shelf.
  - Only bottles with a photo go on it, at most 24 a row. A short shelf repeats its bottles.
  - Rows drift one way, then the other, and burst out from the middle the first time they come into view.
  - Hover or keyboard focus holds a row, a drag slides it, and Pause stops them all. Reduced motion turns off the burst and the drift.
  - Tapping a bottle opens its sheet, and "See the shelf" opens the full shelf with its filters. The lounge's own bottles follow as before.
- **The game stack:** the games are a stack of cards. The top card is tossed off with a twirl and slides in at the back.
  - It runs on the timing the user gave: a 14-second loop for the whole deck (slowed in version 32 to at least 2.2 seconds a card), a 46° twirl, a toss 1.3 card widths out, and the overshoot curve `cubic-bezier(.34,1.56,.64,1)`. The settings are `SK` in the page.
  - The details and the Play button follow the front card.
  - Arrows, a swipe, the game names and Pause control it. Hover or keyboard focus holds it.
  - Both motions are written in the page's own code. No outside motion script is loaded.
