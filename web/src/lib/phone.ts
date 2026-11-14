/* Kenyan mobile numbers, stored as E.164: "+2547XXXXXXXX" or "+2541XXXXXXXX".
   Shared by the browser (sign-in form) and the server (Better Auth's validator). */
const E164 = /^\+254[17]\d{8}$/;

export function normalizeKenyanPhone(input: string): string | null {
  const t = String(input).replace(/[\s\-().]/g, "");
  if (/^\+?254[17]\d{8}$/.test(t)) return t.startsWith("+") ? t : `+${t}`;
  if (/^0[17]\d{8}$/.test(t)) return `+254${t.slice(1)}`;
  return null;
}

export function isKenyanMobile(e164: string): boolean {
  return E164.test(e164);
}

/** "+254712345678" → "0712 345 678" */
export function displayPhone(e164: string): string {
  const local = `0${e164.slice(4)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}
