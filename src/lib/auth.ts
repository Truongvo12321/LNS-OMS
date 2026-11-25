import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Password: scrypt, stored as "salt:hash" (hex). Same format is produced in prisma/seed.mjs.
export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex"), b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

// JWT HS256 with node:crypto — tiny enough not to need a library.
const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET missing or shorter than 32 chars");
  return s;
};
const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");
export const TOKEN_TTL = 8 * 3600; // seconds

export function signJwt(payload: { sub: number }) {
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64(JSON.stringify({ ...payload, iat: now, exp: now + TOKEN_TTL }))}`;
  return `${data}.${sign(data)}`;
}
export function verifyJwt(token: string): { sub: number; exp: number } | null {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  const expected = Buffer.from(sign(`${h}.${p}`)), got = Buffer.from(s);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const body = JSON.parse(Buffer.from(p, "base64url").toString());
    return typeof body.exp === "number" && body.exp > Date.now() / 1000 ? body : null;
  } catch { return null; }
}
