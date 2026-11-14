/* Three themes. Bamboo is what every first visit gets, whatever the phone's own setting; a pick of
   Dark or Light is kept on that device. The same "bc-theme" key as the static site, so a returning
   visitor keeps their choice. */
export const THEMES = ["bamboo", "dark", "light"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_KEY = "bc-theme";

/* Runs in <head> before first paint, so the page never flashes the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  try {
    if (t === "bamboo") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {
    /* private mode: the pick lasts for this page only */
  }
}
