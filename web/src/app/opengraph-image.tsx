import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Bamboo Cask Lounge, Keiyo Road, Ngara: charcoal, cask, company";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Fonts from Google Fonts as TrueType (the image renderer needs it): Big Shoulders Stencil for the
   headline, Figtree for the line under it. A plain font stands in if they can't be fetched. */
async function googleFont(family: string, weight: number) {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`, { headers: { "User-Agent": "Mozilla/5.0 (compatible)" } }).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/* What a shared link shows: the coals, the barrel and the line from the menu. Built once. */
export default async function OpenGraphImage() {
  const photo = await readFile(join(process.cwd(), "src/app/og-hero.jpg"));
  const [font, body] = await Promise.all([googleFont("Big+Shoulders+Stencil", 900), googleFont("Figtree", 600)]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        <img src={`data:image/jpeg;base64,${photo.toString("base64")}`} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex", backgroundImage: "linear-gradient(90deg, rgba(14,28,19,0.95) 0%, rgba(14,28,19,0.78) 55%, rgba(14,28,19,0.3) 100%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px", gap: 18, color: "#EEE7D2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="64" height="64" viewBox="0 0 40 40">
              <path d="M11 7.5c-2.2 3.6-3.2 8-3.2 12.5s1 8.9 3.2 12.5h18c2.2-3.6 3.2-8 3.2-12.5S31.2 11.1 29 7.5z" fill="#C9862A" />
              <path d="M9.4 13h21.2M8.2 20h23.6M9.4 27h21.2" stroke="#3A230C" strokeWidth="2.2" />
              <path d="M27.5 4.2c4.6.4 7.2 3.6 7 8-4.4-.5-7-3.5-7-8z" fill="#8DB36A" />
            </svg>
            <span style={{ fontSize: 40, fontFamily: font ? "Stencil" : "sans-serif", letterSpacing: 1 }}>BAMBOO CASK</span>
          </div>
          <span style={{ fontSize: 112, lineHeight: 0.92, fontFamily: font ? "Stencil" : "sans-serif", display: "flex", flexDirection: "column" }}>
            <span>CHARCOAL.</span>
            <span>CASK. COMPANY.</span>
          </span>
          <span style={{ fontSize: 32, color: "#CDDF7B", fontFamily: body ? "Figtree" : "sans-serif" }}>Keiyo Road, Ngara. Choma, drinks and rooms.</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [...(font ? [{ name: "Stencil", data: font, weight: 900 as const }] : []), ...(body ? [{ name: "Figtree", data: body, weight: 600 as const }] : [])],
    },
  );
}
