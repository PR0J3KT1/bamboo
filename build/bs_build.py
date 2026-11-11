"""Turn the beyondsweetness.ke listing into the Bamboo Cask drinks list.

usage: python -I bs_build.py <listing.json> <old beyond-drinks.json> <out drinks.json>

Each drink: name, brand, shelf, type, price, size, abv, origin, notes, slug, img (bool).
- Drops tobacco, essentials and the non-drinks on the mixers shelf.
- Fixes brand spellings, pulls the size out of the name, drops exact repeats.
- Leaves out the six bottles Bamboo Cask already sells at its own prices.
- Alcohol strength: the site's ABV field is blank for most products ("Alcohol free" on
  Jameson and Tusker), so strength is the bottle's usual published figure, by brand rule,
  then by style. It is labelled "typical strength" on the page.
"""
import sys, re, json, collections, unicodedata

rows = json.load(open(sys.argv[1], encoding="utf-8"))
old = json.load(open(sys.argv[2], encoding="utf-8"))
OUT = sys.argv[3]

def fold(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower().replace("'", "")).strip()

# ---------- spelling ----------
FIX = [
    (r"\bJohnie Walker\b|\bJohnwalker\b|\bJohn Walker\b", "Johnnie Walker"),
    (r"\bJack Daniels?\b", "Jack Daniel's"), (r"\bJeam Beam\b", "Jim Beam"), (r"\bJim Beamblack\b", "Jim Beam Black"),
    (r"\bBallentines?\b|\bBallantines?\b", "Ballantine's"), (r"\bTullarmore\b", "Tullamore"), (r"\bLaphroig\b", "Laphroaig"),
    (r"\bMacalan\b", "Macallan"), (r"\bThe Famouse\b", "The Famous"), (r"\bGrants\b", "Grant's"), (r"\bTeachers\b", "Teacher's"),
    (r"\bWilliam Lawsons?\b", "William Lawson's"), (r"\bMr Dowels\b", "Mr Dowell's"), (r"\bO Driscolls\b", "O'Driscoll's"),
    (r"\bSir Edwards\b", "Sir Edward's"), (r"\bChivas (\d+)\s*Yrs\b", r"Chivas Regal \1"),
    (r"\bTanquery\b", "Tanqueray"), (r"\bBombay Saphire\b", "Bombay Sapphire"), (r"\bGordons\b", "Gordon's"),
    (r"\bGilbeys\b", "Gilbey's"), (r"\bHendricks\b", "Hendrick's"), (r"\bGibsons\b", "Gibson's"), (r"\bWhitley Neil\b", "Whitley Neill"),
    (r"\bBarcadi\b", "Bacardi"), (r"\bCatra\b", "Carta"), (r"\bMyers\b", "Myers's"), (r"\bRum1L\b", "Rum 1L"),
    (r"\bDonjulio\b", "Don Julio"), (r"\bRepasado\b", "Reposado"), (r"\bOlmec\b", "Olmeca"), (r"\bPatron\b", "Patrón"),
    (r"\bHennesy\b", "Hennessy"), (r"\bGrandmarnier\b|\bGranmarnir\b|\bGrand Marnier\b", "Grand Marnier"), (r"\bMartel\b", "Martell"),
    (r"\bTripple Sec\b", "Triple Sec"), (r"\bHarpsburg\b", "Hapsburg"), (r"\bJagermister\b|\bJagermeister\b", "Jägermeister"),
    (r"\bLiquer\b", "Liqueur"), (r"\bKahlua\b", "Kahlúa"), (r"\bSheridans\b", "Sheridan's"), (r"\bCampari 1I\b", "Campari 1L"),
    (r"\bAbsolute\b", "Absolut"), (r"\bCiroc\b", "Cîroc"),
    (r"\bPiper Heidsiek\b", "Piper-Heidsieck"), (r"\bJ Charpenteir\b|\bJ Charpwentier\b", "J. Charpentier"),
    (r"\bMoet\s*&\s*Chandon\b|\bMoet\b", "Moët & Chandon"), (r"Moët & Chandon & Chandon", "Moët & Chandon"),
    (r"\bGuiness\b", "Guinness"), (r"\bKing Fisher\b", "Kingfisher"), (r"\bOrginal\b", "Original"), (r"\bDesparados\b", "Desperados"),
    (r"\bSavana\b", "Savanna"), (r"\bHunters\b", "Hunter's"), (r"\bSingapole\b", "Singapore"),
    (r"\bDelmonte\b", "Del Monte"), (r"\bMexed\b", "Mixed"), (r"\bPinnaple\b|\bPineaple\b", "Pineapple"), (r"\bFrui\b", "Fruit"),
    (r"\bBlack ?Current\b|\bBlackcurrent\b", "Blackcurrant"), (r"\bNector\b", "Nectar"), (r"\bRasberry\b", "Raspberry"),
    (r"\b4Th Streeth?\b|\b4th Streeth\b", "4th Street"), (r"\bFour Cousin\b", "Four Cousins"), (r"\bJacobs Creeks?\b", "Jacob's Creek"),
    (r"\bJacobs Creekcab\b", "Jacob's Creek Cabernet"), (r"\bJacobs\b", "Jacob's"), (r"\bDrostdyhof\b|\bDrostyhof\b|\bDrostdy Hof\b", "Drostdy-Hof"),
    (r"\bDoughlas\b", "Douglas"), (r"\bChardonay\b|\bChardonny\b", "Chardonnay"), (r"\bCinsualt\b", "Cinsault"), (r"\bSagria\b", "Sangria"),
    (r"\bMurvierdro\b", "Murviedro"), (r"\bZappallares\b", "Zapallares"), (r"\bCarmener\b", "Carmenère"), (r"\bMuscato\b", "Moscato"),
    (r"\bCab Sav\b", "Cabernet Sauvignon"), (r"\bSav Blanc\b", "Sauvignon Blanc"),
    (r"\bGoats Do Roam\b", "Goats do Roam"), (r"\bRupert\s*&\s*Rothschild\b", "Rupert & Rothschild"), (r"\bBirds&Bees\b", "Birds & Bees"),
    (r"\bBlack&\s*White\b|\bBlack & White\b", "Black & White"), (r"\bKhor Black&Gold\b", "Khor Black & Gold"),
    (r"\bGin&Tonic\b", "Gin & Tonic"), (r"\b(\d+)\s*Yrs?\b", r"\1 Years"), (r"\b(\d+)Years\b", r"\1 Years"), (r"\b(\d+)Yr\b", r"\1 Years"),
    (r"\bScouth\b", "Scotch"), (r"\bJohnnie Walker & Sons\b", "John Walker & Sons"), (r"\bKing George V\.(?=\s|$)", "King George V"), (r"\b(\d+(?:\.\d+)?)\s*Ltrs\b", r"\1L"),
    (r"(\w)\"(\w)", r"\1'\2"), (r"\bRose D'anjou\b", "Rosé d'Anjou"), (r"\bCabernet Sauv\.(?=\s|$)", "Cabernet Sauvignon"),
    (r"\b(\d+) %", r"\1%"), (r"\b(\d+)\s*lit\b", r"\1L"), (r"\b(\d+)mml\b", r"\1ml"), (r"^(Mucho Mas \w+) 00$", r"\1 0.0"),
    (r"\bTHE\b", "The"), (r"\b75oml\b", "750ml"), (r"\b(750|700|375|350|250|500)$", r"\1ml"), (r"\bST Remy\b", "St Rémy"), (r"\bRemy Martin\b", "Rémy Martin"), (r"\bEL\b", "El"), (r"\bDE\b", "de"), (r"\bDOR\b", "d'Or"), (r"\bCRU\b", "Cru"), (r"\bCAB\b", "Cab"), (r"\bSAV\b", "Sav"), (r"\bLTR\b", "L"),
]
ACR = {"XO", "VS", "VSOP", "IPA", "PX", "KWV", "USA", "UK", "DOC", "POA", "OJ", "GH", "JP", "NV", "XR", "XII", "VSO", "CDM"}
def clean(n):
    n = re.sub(r"\s+", " ", n).strip()
    for rx, rep in FIX:
        n = re.sub(rx, rep, n, flags=re.I)
    n = " ".join(w.capitalize() if re.fullmatch(r"[A-Z]{3,}", w) and w not in ACR else w for w in n.split(" "))
    n = re.sub(r"8pm", "8PM", n, flags=re.I)
    return n

SIZE_RX = re.compile(r"\b(\d+(?:\.\d+)?)\s*(ml|l|ltr|litres?|cl)\b", re.I)
def norm_size(s):
    s = (s or "").strip()
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(ml|l)", s, re.I)
    if not m:
        return s
    v, u = float(m.group(1)), m.group(2).lower()
    if u == "l" and v >= 50:          # "750L" on the site is 750 ml
        v, u = v, "ml"
    ml = v if u == "ml" else v * 1000
    if ml in (7000, 7500):            # "7000ml" and "7500ml" on the site are 700 ml and 750 ml bottles
        ml = ml / 10
    if ml >= 1000:
        l = ml / 1000
        return ("%g" % l) + "L"
    return "%gml" % ml

def split_size(name, size):
    m = None
    for m in SIZE_RX.finditer(name):
        pass
    if m:
        found = m.group(1) + ("ml" if m.group(2).lower() == "ml" else "L" if m.group(2).lower().startswith("l") else "0ml")
        if m.group(2).lower() == "cl":
            found = "%gml" % (float(m.group(1)) * 10)
        bare = (name[:m.start()] + name[m.end():]).strip(" -,")
        bare = re.sub(r"\s+", " ", bare)
        if not size:
            size = found
        if bare:
            name = bare
    return name, norm_size(size)

# ---------- what is not a drink ----------
NOT_DRINK = r"cadbury|\bcdm\b|dairy milk|dream with biscuit|^honey|juicy fruit|^nuts$|^orbit|^test$"
HOUSE = [(r"^chivas regal 12", "1L", "k6"), (r"^absolut vodka$|^absolut$|^absolut blue$", "1L", "k5"), (r"^smirnoff (red|vodka)", "750ml", "k3"),
         (r"^bacardi carta blanca", "750ml", "k4"), (r"^4th street (sweet )?white", "750ml", "k1"), (r"^asconi kiss me now", "750ml", "k2")]
house_done = set()

# ---------- style ----------
def whisky_type(n):
    f = fold(n)
    if re.search(r"glenlivet|glenfiddich|glenmorangie|macallan|singleton|talisker|lagavulin|laphroaig|cardhu|dalmore|\bglen", f): return "Single Malt", "Scotland"
    if re.search(r"monkey shoulder", f): return "Blended Malt", "Scotland"
    if re.search(r"jack daniel|gentleman jack", f): return "Tennessee Whiskey", "USA"
    if re.search(r"jim beam|bulleit|buffalo trace|wild turkey|knob creek|early times|kentucky gentleman|bourbon", f): return "Bourbon", "USA"
    if re.search(r"jameson|bushmills|tullamore|proper twelve|roe co|odriscoll|irish", f): return "Irish Whiskey", "Ireland"
    if re.search(r"\b8pm\b|imperial blue|bond 7|mr dowell|all seasons?|royal circle|officer", f): return "Indian Whisky", "India"
    if re.search(r"best whisky|crazy cock|hunting lodge|kibao|chrome|hunter", f): return "Kenyan Whisky", "Kenya"
    return "Blended Scotch", "Scotland"

FLAV = r"\b(?:citron|citrus|mango|peach|berry|berries|coconut|apple|orange|lemon|lime|pineapple|passion|raspberr|strawberr|pink|blueberr|summer|spicy|vanilla|mixed|cherry|grape|watermelon|honey|rose\b|rosso|caramel)"
def style(shelf, n):
    f = fold(n)
    if shelf in ("wine", "champagne") and re.search(r"\b0 0$", f):
        # the catalogue writes "00" for its alcohol-free bottles (Savanna 00, Bavaria 00)
        return ("Alcohol-free Sparkling" if shelf == "champagne" or "sparkling" in f else "Alcohol-free Wine"), ("Spain" if "mucho mas" in f else "")
    if shelf == "whisky": return whisky_type(n)
    if shelf == "vodka":
        k = "Kenya" if re.search(r"kibao|chrome|best vodka|kvant|k vant|triple ace|flirt|liberty|blue ice|people", f) else ""
        if re.search(FLAV, f): return "Flavoured Vodka", k
        if re.search(r"grey goose|belvedere|beluga|ketel one|ciroc|cîroc", f): return "Premium Vodka", ""
        return ("Kenyan Vodka" if k else "Vodka"), k
    if shelf == "gin":
        if re.search(r"inverroche", f): return "African Craft Gin", "South Africa"
        if re.search(FLAV + r"|sicilian|sevilla|rangpur|malacca|green|bramble|lunar|blackcurrant", f): return "Flavoured Gin", ""
        if re.search(r"konyagi", f): return "Cane Gin", "Tanzania"
        if re.search(r"hendrick|botanist|tanqueray|bombay|bulldog|whitley|malfy|beefeater 24|58|antidote|berkeley|kensington", f): return "Premium Gin", ""
        return "London Dry", ""
    if shelf == "rum":
        if re.search(r"\bcan\b", f): return "Premix", ""
        if re.search(r"kenya cane|caribia cane", f): return ("Flavoured Cane" if re.search(FLAV, f) else "Cane Spirit"), "Kenya"
        if re.search(r"spiced", f) or re.search(r"captain morgan( spiced| gold)?$|captain spiced", f): return "Spiced Rum", ""
        if re.search(r"malibu|coconut", f): return "Coconut Rum", "Barbados"
        if re.search(r"limon|razz|" + FLAV, f): return "Flavoured Rum", ""
        if re.search(r"dark|myers|old monk|bumbu", f): return "Dark Rum", ""
        if re.search(r"appleton|havana|8 years|7 years", f): return "Aged Rum", ""
        if re.search(r"carta blanca|silver|white|caribia", f): return "White Rum", ""
        return "Gold Rum", ""
    if shelf == "tequila":
        if re.search(r"tequila rose", f): return "Cream Liqueur", "Mexico"
        if re.search(r"chocolate", f): return "Tequila Liqueur", "Mexico"
        if re.search(r"anejo|1942|extra|clase azul", f): return "Añejo", "Mexico"
        if re.search(r"reposado|gold", f): return "Reposado", "Mexico"
        return "Blanco", "Mexico"
    if shelf == "brandy":
        if re.search(r"grand marnier", f): return "Cognac Liqueur", "France"
        if re.search(r"hennessy|martell|remy|courvoisier|camus|meukow|dusse|lamborghini", f):
            return ("Cognac XO" if re.search(r"\bxo\b|blue swift|cordon", f) else "Cognac VSOP" if "vsop" in f else "Cognac VS"), "France"
        if re.search(r"kwv|richot|viceroy|three barrels|st remy|musketeer", f): return "Brandy", ("France" if "st remy" in f else "South Africa")
        return "Brandy", ""
    if shelf == "liqueur":
        if re.search(r"baileys|amarula|best cream|sheridan|strawberry lips|marsii|crema nobile|cream", f): return "Cream Liqueur", ""
        if re.search(r"kahlua|tia maria|coffee", f): return "Coffee Liqueur", ""
        if re.search(r"jagermeister|jägermeister|fernet|branca|origin|ember", f): return "Herbal Liqueur", ""
        if re.search(r"hapsburg|pernod|zappa", f): return "Anise and Absinthe", ""
        if re.search(r"angostura", f): return "Bitters", "Trinidad"
        if re.search(r"campari|aperol", f): return "Aperitif", "Italy"
        if re.search(r"martini", f): return ("Alcohol-free Aperitif" if re.search(r"martini 0|non alc|alcohol free", f) else "Vermouth"), "Italy"
        if re.search(r"cointreau|triple sec", f): return "Triple Sec", ""
        if re.search(r"disaronno", f): return "Amaretto", "Italy"
        if re.search(r"frangelico", f): return "Hazelnut Liqueur", "Italy"
        if re.search(r"southern comfort", f): return "Whiskey Liqueur", "USA"
        if re.search(r"jinro", f): return "Soju", "South Korea"
        if re.search(r"chamdor", f): return "Alcohol-free Sparkling", "South Africa"
        if re.search(r"nobile|mikado|choco|chocolate", f): return "Wine Aperitif", ""
        if re.search(r"kane extra|general meakins|v a\b|v&a", f): return "Cane Spirit", "Kenya"
        return "Liqueur", ""
    if shelf == "wine":
        if re.search(r"sandeman|port\b|tawny|cape ruby|sherry|fino|altar|taylors", f): return "Port and Sherry", ""
        if re.search(r"sangria|mimosa", f): return "Wine Cocktail", "Spain"
        if re.search(r"fragolino|bollicine|sparkling|spumante", f): return "Sparkling Wine", "Italy"
        sweet = re.search(r"sweet|4th street|late harvest|ice wine|candy floss|nectar|moscato|muscat|casa buena|cellar cask|delush|mosoret|leleshwa|balance sweet|after dark|chocolate|grapefruit|peach|strawberry|passion|kiss", f)
        red = re.search(r"cabernet|\bcab\b|merlot|shiraz|syrah|pinotage|malbec|tempranillo|carmen|pinot noir|\bred\b|rosso|claret|ruby|cinsault|barbera|cahors|sangiovese|zinfandel|chianti|rioja|amarone|primitivo|montepulciano|tinto|noir", f)
        col = ("Rosé" if re.search(r"\brose\b|blush|pink|rosado", f) else "Red" if red else
               "White" if re.search(r"white|blanc|blanco|chardonnay|sauvignon|sav\b|chenin|riesling|torrontes|chablis|pinot grigio|moscato|muscat|bianco|viognier", f) else "Red")
        if sweet: return "Sweet " + col.lower() if col != "Rosé" else "Sweet rosé", ""
        return ("Rosé Wine" if col == "Rosé" else col + " Wine"), ""
    if shelf == "champagne":
        if re.search(r"moet|veuve|dom perignon|bollinger|mumm|piper|taittinger", f): return ("Rosé Champagne" if re.search(r"\brose\b", f) else "Champagne"), "France"
        if re.search(r"prosecco", f): return "Prosecco", "Italy"
        if re.search(r"moscato|sweet|spumate|spumante|buono amici|festa|signore|asti|sandara", f): return "Sweet Sparkling", ""
        if re.search(r"\brose\b", f): return "Sparkling Rosé", ""
        return "Sparkling Wine", ""
    if shelf == "beer":
        if re.search(r"jameson stout", f): return "Irish Whiskey", "Ireland"
        if re.search(r"heineken alcohol|bavaria 00|0 0", f): return "Alcohol-free Beer", ""
        if re.search(r"guinness|stout", f): return "Stout", ""
        if re.search(r"atlas|oj \d|royal dutch|8 6|typhon|strong|faxe", f): return "Strong Lager", ""
        if re.search(r"tusker malt", f): return "Malt Lager", "Kenya"
        if re.search(r"ndimu", f): return "Flavoured Beer", "Kenya"
        if re.search(r"tusker|white cap|balozi|pilsner|sierra|striped horse|brothers", f): return "Lager", "Kenya"
        return "Lager", ""
    if shelf == "rtd":
        if re.search(r"savanna 00|0 0", f): return "Alcohol-free Cider", "South Africa"
        if re.search(r"cider|savanna|hunter|snapp|manyatta|1430|sikera|roller|ko\b|tusker cider", f): return "Cider", ""
        if re.search(r"gin tonic|gordon|jameson|royal circle|cocktail|can\b|desperados|58", f): return "Premix", ""
        return "Cooler", ""
    if shelf == "mixers":
        if re.search(r"water|keringet|dasani", f): return "Water", "Kenya"
        if re.search(r"monster|red bull|predator", f): return "Energy Drink", ""
        if re.search(r"tonic|soda water|schweppes", f): return "Tonic and Soda", ""
        if re.search(r"juice|del monte|minute maid|pick peel|nectar|jaba|handas|fruit ville|appletiser|lime juice|grape", f): return "Juice", ""
        return "Soft Drink", ""
    return "", ""

# ---------- strength ----------
ABV_RULES = [
    # whisky
    (r"jack daniel.*(honey|fire|apple)", 35, "spirit"), (r"jack daniel.*(single barrel|rye|bonded)", 45, "spirit"), (r"johnnie walker.*green", 43, "spirit"),
    (r"jim beam.*black", 43, "spirit"), (r"jim beam.*(honey|apple|red stag|vanilla)", 32.5, "spirit"), (r"bulleit|buffalo trace", 45, "spirit"), (r"knob creek", 50, "spirit"),
    (r"wild turkey.*101", 50.5, "spirit"), (r"wild turkey", 40.5, "spirit"), (r"laphroaig.*(quarter|1815|px|10 years cask)", 48, "spirit"), (r"lagavulin", 43, "spirit"),
    (r"talisker", 45.8, "spirit"), (r"macallan.*(15|18)", 43, "spirit"), (r"glenmorangie.*(lasanta|quinta)", 43, "spirit"), (r"glenmorangie.*nectar", 46, "spirit"),
    (r"glenfiddich.*fire", 43, "spirit"), (r"roe co", 45, "spirit"), (r"\b8pm\b|imperial blue|mr dowell|all seasons?|bond 7", 42.8, "spirit"), (r"jameson stout", 40, "spirit"),
    # vodka / gin
    (r"smirnoff (red|vodka)", 37.5, "spirit"), (r"ciroc|cîroc", 40, "spirit"), (r"gordon.*(pink|sicilian|orange|green|lemon)", 37.5, "spirit"), (r"gordon", 37.5, "spirit"),
    (r"tanqueray.*(10|ten)", 47.3, "spirit"), (r"tanqueray.*(rangpur|sevilla|blackcurrant)", 41.3, "spirit"), (r"tanqueray.*malacca", 40, "spirit"), (r"tanqueray", 43.1, "spirit"),
    (r"hendrick.*lunar", 43.4, "spirit"), (r"hendrick", 41.4, "spirit"), (r"botanist", 46, "spirit"), (r"malfy", 41, "spirit"), (r"whitley neill", 43, "spirit"), (r"inverroche", 43, "spirit"),
    (r"beefeater 24", 45, "spirit"), (r"beefeater.*pink", 37.5, "spirit"), (r"bombay.*bramble", 37.5, "spirit"), (r"konyagi", 35, "spirit"), (r"\b58\b.*gin|^58 ", 43, "spirit"),
    # rum
    (r"captain morgan.*dark", 40, "spirit"), (r"captain", 35, "spirit"), (r"malibu", 21, "spirit"), (r"bacardi.*(limon|razz)", 32, "spirit"), (r"bacardi.*spiced", 35, "spirit"),
    (r"bacardi", 37.5, "spirit"), (r"old monk", 42.8, "spirit"), (r"bumbu", 35, "spirit"), (r"kenya cane.*(coconut|pineapple|passion|lime|citrus)", 30, "spirit"),
    # tequila
    (r"tequila rose", 15, "spirit"), (r"olmeca.*chocolate", 20, "spirit"), (r"patron|casamigos|cincoro|clase azul|astral", 40, "spirit"), (r"don julio|jose cuervo|olmeca|1800|camino|sierra", 38, "spirit"),
    # brandy
    (r"grand marnier", 40, "spirit"), (r"viceroy|richot", 43, "spirit"), (r"kwv", 38, "spirit"), (r"st remy", 36, "spirit"), (r"three barrels", 38, "spirit"), (r"jp chenet", 36, "spirit"),
    # liqueur
    (r"baileys.*(delight|light)", 16.1, "spirit"), (r"baileys|amarula", 17, "spirit"), (r"sheridan", 15.5, "spirit"), (r"best cream", 15, "spirit"), (r"strawberry lips", 15, "spirit"),
    (r"marsii", 15, "spirit"), (r"crema nobile", 15, "spirit"), (r"rosso nobile|bianco nobile|choco toffee|rosso chocolate", 10, "spirit"), (r"mikado", 10, "spirit"),
    (r"jagermeister.*manifest|jägermeister.*manifest", 38, "spirit"), (r"jagermeister|jägermeister", 35, "spirit"), (r"kahlua|kahlúa|tia maria", 20, "spirit"),
    (r"cointreau", 40, "spirit"), (r"triple sec", 30, "spirit"), (r"disaronno", 28, "spirit"), (r"frangelico", 20, "spirit"), (r"fernet", 39, "spirit"), (r"branca menta", 28, "spirit"),
    (r"campari", 25, "spirit"), (r"aperol", 11, "spirit"), (r"angostura", 44.7, "spirit"), (r"southern comfort", 35, "spirit"), (r"pernod", 40, "spirit"), (r"zappa", 40, "spirit"),
    (r"hapsburg", 72.5, "spirit"), (r"martini 0|martini.*(alcohol free|non alc)", 0, "spirit"), (r"martini.*extra dry", 18, "spirit"), (r"martini", 15, "spirit"),
    (r"jinro.*(is back|chamisul|fresh|original)", 16.5, "spirit"), (r"jinro", 13, "spirit"), (r"chamdor", 0, "spirit"), (r"kane extra", 40, "spirit"),
    (r"general meakins|origin|ember pine|v a\b|v&a", 35, "spirit"),
    # wine and sparkling
    (r"asconi.*kiss", 11, "wine"), (r"asconi.*pastoral", 16, "wine"),
    (r"4th street|robertson.*sweet|four cousins.*sweet|namaqua.*sweet|drostdy.*extra light|candy floss|sweet lips", 8, "wine"),
    (r"cellar cask", 10.5, "wine"), (r"sandara", 5.5, "wine"), (r"fragolino", 7, "wine"), (r"asti|moscato|spumate|festa|buono amici|signore giuseppe", 7.5, "wine"),
    (r"sangria", 7, "wine"), (r"mimosa", 5.5, "wine"), (r"sandeman.*fino", 15, "wine"), (r"sandeman|taylor|port\b|cape ruby|tawny", 19.5, "wine"), (r"amarone", 15, "wine"),
    (r"chocolate block", 14.5, "wine"), (r"catena|rutini|alamos|argento|malbec", 13.5, "wine"),
    # beer and rtd
    (r"tusker lite", 4.0, "drink"), (r"tusker malt", 5.0, "drink"), (r"tusker cider", 4.5, "drink"), (r"tusker", 4.2, "drink"), (r"white cap|balozi", 4.2, "drink"),
    (r"pilsner", 4.7, "drink"), (r"guinness.*smooth", 5.0, "drink"), (r"guinness", 6.5, "drink"), (r"heineken.*(alcohol|0 0)|bavaria 00", 0, "drink"), (r"heineken|budweiser", 5, "drink"),
    (r"corona", 4.5, "drink"), (r"hop house", 5, "drink"), (r"kingfisher", 4.8, "drink"), (r"windhoek", 4, "drink"), (r"8 6", 8.6, "drink"), (r"desperados", 5.9, "drink"),
    (r"savanna 00|savanna 0", 0, "drink"), (r"savanna", 6, "drink"), (r"hunter.*gold", 4.5, "drink"), (r"hunter.*dry", 5.5, "drink"), (r"hunter", 5, "drink"), (r"snapp", 5, "drink"),
    (r"smirnoff.*black", 7, "drink"), (r"smirnoff ice|smirnoff.*(guarana|pineapple|cocktail)", 4.5, "drink"), (r"breezer", 4, "drink"), (r"ko\b", 4.5, "drink"),
]
SHELF_ABV = {"whisky": 40, "vodka": 40, "gin": 40, "rum": 40, "tequila": 38, "brandy": 40, "liqueur": 20,
             "wine": 13, "champagne": 12, "beer": 4.5, "rtd": 5, "mixers": 0}
TYPE_ABV = {"Flavoured Vodka": 37.5, "Flavoured Gin": 37.5, "Cane Spirit": 40, "Flavoured Cane": 30, "Premix": 5, "Cream Liqueur": 17,
            "Red Wine": 13.5, "White Wine": 12.5, "Rosé Wine": 12, "Sweet red": 8, "Sweet white": 8, "Sweet rosé": 8,
            "Sparkling Wine": 11.5, "Prosecco": 11, "Champagne": 12, "Rosé Champagne": 12, "Sweet Sparkling": 7.5, "Sparkling Rosé": 11.5,
            "Port and Sherry": 19.5, "Strong Lager": 8, "Stout": 6.5, "Cider": 4.5, "Alcohol-free Beer": 0, "Alcohol-free Cider": 0,
            "Alcohol-free Aperitif": 0, "Alcohol-free Sparkling": 0, "Irish Whiskey": 40, "Tequila Liqueur": 20, "Wine Aperitif": 10,
            "Soju": 16.5, "Kenyan Vodka": 37.5}

def abv_for(shelf, typ, n):
    f = fold(n)
    if typ.startswith("Alcohol-free"):
        return 0.0
    m = re.search(r"\b(\d{1,2}(?:\.\d)?)\s*%", n)
    if m and shelf in ("beer", "rtd"):
        return float(m.group(1))
    m = re.search(r"\batlas (\d{2})\b|\boj (\d{2})\b|royal dutch (\d{2})", f)
    if m:
        return float(next(g for g in m.groups() if g))
    grp = "drink" if shelf in ("beer", "rtd") else "wine" if shelf in ("wine", "champagne") else "spirit"
    if typ == "Premix":
        return 5.0
    for rx, v, g in ABV_RULES:
        if g == grp and (re.search(rx, f) or re.search(rx, n.lower())):
            return float(v)
    if typ in TYPE_ABV:
        return float(TYPE_ABV[typ])
    return float(SHELF_ABV.get(shelf, 0))

def brand_of(n):
    f = n.split()
    two = " ".join(f[:2])
    for b in ["Johnnie Walker", "Jack Daniel's", "Jim Beam", "Chivas Regal", "The Glenlivet", "Grey Goose", "Kenya Cane", "Captain Morgan",
              "Jose Cuervo", "Don Julio", "Remy Martin", "Grand Marnier", "Southern Comfort", "Four Cousins", "Casillero del Diablo", "Tall Horse",
              "Gato Negro", "Jacob's Creek", "Mucho Mas", "Pearly Bay", "Cellar Cask", "Pierre Marcel", "Douglas Green", "4th Street", "Del Monte",
              "Minute Maid", "Pick & Peel", "Royal Circle", "Monkey Shoulder", "Famous Grouse", "The Famous Grouse", "Rosso Nobile", "Moët & Chandon",
              "Veuve Clicquot", "Piper-Heidsieck", "Smirnoff Ice", "Hunter's", "White Cap", "Royal Dutch", "Striped Horse", "Whitley Neill",
              "Bombay Sapphire", "The Botanist", "Martini", "Robertson", "Namaqua", "Nederburg", "Drostdy-Hof", "Graham Beck", "Durbanville Hills"]:
        if n.lower().startswith(b.lower()):
            return b
    if len(f) > 1 and (len(f[0]) <= 3 or f[0].lower() in ("the", "baron", "chateau", "saint", "santa", "casa", "don", "grand", "jp")):
        return " ".join(f[:2])
    return f[0] if f else n

# ---------- old Beyond data, for notes and origin where the bottle matches ----------
OLD = {}
for p in old:
    k = fold(split_size(clean(p["name"]), p.get("size", ""))[0])
    OLD[k] = p

out, dropped, seen = [], collections.Counter(), {}
for r in rows:
    shelf = r["shelf"]
    if shelf in ("tobacco", "essentials", "snacks", "gifts"):
        dropped[shelf] += 1; continue
    raw = clean(r["name"])
    if shelf == "mixers" and re.search(NOT_DRINK, fold(raw)):
        dropped["not a drink"] += 1; continue
    name, size = split_size(raw, r["size"])
    f = fold(name)
    # wrong shelf on the site
    if shelf == "mixers" and re.search(r"jagermeister|jägermeister", f): shelf = "liqueur"; name = name.replace("With Coke", "with a Coke")
    if shelf == "mixers" and re.search(r"choco toffee|rosso chocolate", f): shelf = "liqueur"
    if shelf == "liqueur" and re.search(r"zapallares", f): shelf = "wine"
    if shelf == "liqueur" and re.search(r"chamdor", f): shelf = "mixers"
    if shelf == "beer" and re.search(r"jameson stout", f): shelf = "whisky"
    if shelf == "rum" and re.search(r"\bcan\b", f): shelf = "rtd"; name = "Captain Morgan & Cola Can" if f == "captain can" else name
    if shelf == "champagne" and re.search(r"duchessalia barbera|duchessa lia", f): shelf = "wine"
    if shelf == "champagne" and re.search(r"\bvodka\b", f): shelf = "vodka"
    if shelf == "rtd" and re.search(r"hunters? choice|ko classic gin", f): shelf = "gin" if "gin" in f else "whisky"
    if not size and re.search(r"\bcan\b", f): size = "Can"
    hk = next((k for rx, sz, k in HOUSE if re.search(rx, f) and size == sz), None)
    if hk:
        # Bamboo Cask sells this bottle itself: keep only its photo and strength, for the house card
        dropped["on the Bamboo Cask menu"] += 1
        if hk not in house_done and r["img"]:
            house_done.add(hk)
            typ, origin = style(shelf, name)
            out.append({"name": name, "brand": brand_of(name), "shelf": "house", "type": typ, "price": 0, "size": size,
                        "abv": abv_for(shelf, typ, name), "origin": origin, "notes": "", "slug": r["slug"], "img": True, "house": hk})
        continue
    key = (f, size)
    if key in seen:
        prev = out[seen[key]]
        if not prev["img"] and r["img"]:
            prev.update(slug=r["slug"], img=True)
        dropped["repeat"] += 1; continue
    typ, origin = style(shelf, name)
    if shelf == "whisky" and f.startswith("jameson stout"): typ, origin = "Irish Whiskey", "Ireland"
    o = OLD.get(f)
    notes = ", ".join(o["notes"]) if o else ""
    if o and o["origin"] and not origin: origin = o["origin"]
    abv = abv_for(shelf, typ, name)
    if o and o["abv"] and abs(o["abv"] - abv) > 0.05 and shelf not in ("mixers",):
        abv = float(o["abv"])
    seen[key] = len(out)
    out.append({"name": name, "brand": brand_of(name), "shelf": shelf, "type": typ, "price": r["price"], "size": size,
                "abv": abv, "origin": origin, "notes": notes, "slug": r["slug"], "img": bool(r["img"])})

json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
sys.stdout.reconfigure(encoding="utf-8")
print(len(out), "drinks;", sum(1 for d in out if d["img"]), "with photos")
print("left out:", dict(dropped))
print(collections.Counter(d["shelf"] for d in out))
for s in ["whisky", "vodka", "gin", "rum", "tequila", "brandy", "liqueur", "wine", "champagne", "beer", "rtd", "mixers"]:
    c = collections.Counter(d["type"] for d in out if d["shelf"] == s)
    a = collections.Counter(d["abv"] for d in out if d["shelf"] == s)
    print(s, dict(c), "| abv", dict(sorted(a.items())))
sizes = collections.Counter(d["size"] for d in out)
print("sizes", sizes.most_common())
