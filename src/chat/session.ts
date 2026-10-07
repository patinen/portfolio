import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
export const cookieName = "personacore_session";
const identity = /^[A-Za-z0-9_-]{43}$/;
export class InvalidSession extends Error {}
function sign(value: string, secret: string) { return createHmac("sha256", secret).update(value).digest("base64url"); }
export function visitorSession(cookie: string | null, secret: string, lifetime: number, now: number, production: boolean) {
  const matches = (cookie ?? "").split(";").map(v => v.trim()).filter(v => v.startsWith(cookieName + "="));
  if (matches.length > 1) throw new InvalidSession();
  const token = matches[0]?.slice(cookieName.length + 1);
  if (token) {
    const parts = token.split(".");
    if (parts.length !== 4 || parts[0] !== "v1" || !identity.test(parts[1]) || !/^\d{10}$/.test(parts[2]) || !identity.test(parts[3])) throw new InvalidSession();
    const value = parts.slice(0, 3).join(".");
    if (!timingSafeEqual(Buffer.from(sign(value, secret)), Buffer.from(parts[3]))) throw new InvalidSession();
    const expires = Number(parts[2]);
    if (expires > now + lifetime) throw new InvalidSession();
    if (expires > now) return { id: parts[1], setCookie: undefined };
    // Valid but expired sessions rotate; invalid signatures never gain a fresh session.
  } else if (matches.length) throw new InvalidSession();
  const id = randomBytes(32).toString("base64url");
  const value = "v1." + id + "." + (now + lifetime);
  return { id, setCookie: cookieName + "=" + value + "." + sign(value, secret) + "; Path=/; Max-Age=" + lifetime + "; HttpOnly; SameSite=Strict" + (production ? "; Secure" : "") };
}
