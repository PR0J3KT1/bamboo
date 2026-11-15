/* The site's public address and whether search engines may list it. The lounge hasn't approved
   the new site yet, so it stays out of search until SITE_INDEX=1 is set on the server. */
export const SITE_URL = process.env.SITE_URL || process.env.BETTER_AUTH_URL || "https://bamboo-cask-app.vercel.app";
export const SITE_INDEX = process.env.SITE_INDEX === "1";
/* Pages that are someone's own (an order, a booking) or staff-only never go in search. */
export const PRIVATE_PATHS = ["/admin", "/orders/", "/bookings/", "/checkout", "/sign-in", "/api/", "/design"];
