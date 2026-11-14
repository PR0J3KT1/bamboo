import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Big_Shoulders_Stencil, Figtree, IM_Fell_English } from "next/font/google";
import { cn } from "@/lib/utils";
import { THEME_SCRIPT } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/toast";
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
  title: { default: "Bamboo Cask", template: "%s · Bamboo Cask" },
  description: "Order food and drinks from Bamboo Cask Lounge, Keiyo Road, Ngara.",
  robots: { index: false, follow: false }, // until the lounge approves the site
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
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
