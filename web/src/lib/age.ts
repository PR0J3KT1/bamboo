/* Kenyan law sells alcohol only to people aged 18 and over. Dates of birth are "YYYY-MM-DD"
   strings, compared as calendar dates in Nairobi time, so no time zone can shift the birthday.
   29 February rolls on to 1 March. */

export function eighteenthBirthday(dob: string): string {
  const [y, m, d] = dob.split("-").map(Number);
  const dt = new Date(Date.UTC(y + 18, m - 1, d)); // Date.UTC rolls 29 Feb on to 1 Mar
  return dt.toISOString().slice(0, 10);
}

export function todayInNairobi(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(now); // YYYY-MM-DD
}

export function isAdult(dob: string | null | undefined, now = new Date()): boolean {
  return !!dob && todayInNairobi(now) >= eighteenthBirthday(dob);
}

export function isValidDob(dob: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const [y, m, d] = dob.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  return y >= 1900 && dob <= todayInNairobi(now);
}
