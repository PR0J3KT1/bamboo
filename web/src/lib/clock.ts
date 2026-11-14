/** The time, for pages rendered per request (after connection() or a cookie read), where reading
    the clock is what we want. Kept in one place so it's clear it's deliberate. */
export function requestTime(): number {
  return Date.now();
}
