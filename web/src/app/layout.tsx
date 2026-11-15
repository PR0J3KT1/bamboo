import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Big_Shoulders_Stencil, Figtree, IM_Fell_English } from "next/font/google";
import { cn } from "@/lib/utils";
import { THEME_SCRIPT } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/toast";
import { SITE_INDEX, SITE_URL } from "@/lib/site";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const bigShoulders = Big_Shoulders({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-big-shoulders", adjustFontFallback: false });
const bigShouldersStencil = Big_Shoulders_Stencil({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--font-big-shoulders-stencil",
  adjustFontFallback: false, // next/font has no metrics for these two; the fallback is "Arial Narrow"
});
const imFell = IM_Fell_English({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-im-fell" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Bamboo Cask Lounge, Ngara: choma, drinks and rooms", template: "%s · Bamboo Cask" },
  description: "Order nyama choma, kienyeji and drinks from Bamboo Cask Lounge on Keiyo Road, Ngara: delivered by a rider or ready at the counter. Rooms upstairs, tables for the match, games for the table.",
  applicationName: "Bamboo Cask",
  /* out of search until the lounge approves the site (SITE_INDEX=1) */
  robots: SITE_INDEX ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: { type: "website", siteName: "Bamboo Cask Lounge", locale: "en_KE" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14291c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="bamboo"
      // the theme script may switch data-theme before React hydrates
      suppressHydrationWarning
      className={cn("h-full antialiased", figtree.variable, bigShoulders.variable, bigShouldersStencil.variable, imFell.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only z-[100] rounded-full bg-lime px-5 py-3 font-bold text-on-lime focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to the content</a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
