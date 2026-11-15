import type { MetadataRoute } from "next";

/* Add to home screen: the menu as an app, in the lounge's colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bamboo Cask Lounge",
    short_name: "Bamboo Cask",
    description: "Order food and drinks from Bamboo Cask Lounge, Keiyo Road, Ngara.",
    start_url: "/",
    display: "standalone",
    background_color: "#EEE7D2",
    theme_color: "#14291C",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
