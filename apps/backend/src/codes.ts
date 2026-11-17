import { createHash, randomInt, timingSafeEqual } from 'crypto';

// Short one-time codes people can read out or type: password reset and family invites.
// 8 characters from an alphabet without 0/O/1/I, so they are hard to mix up (about 10^12 combinations).
// Only a SHA-256 hash is stored; the plain code is shown once (and emailed).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const makeCode = (length = 8) =>
  Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

/** "abcd-2345" and "ABCD 2345" both mean ABCD2345. */
export const normalizeCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** ABCD2345 -> "ABCD-2345" for display. */
export const formatCode = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;

export const hashCode = (c: string) => createHash('sha256').update(normalizeCode(c)).digest('hex');

/** Constant-time check of a typed code against a stored hash. */
export function codeMatches(typed: string, storedHash: string): boolean {
  const given = Buffer.from(hashCode(typed));
  const stored = Buffer.from(storedHash);
  return given.length === stored.length && timingSafeEqual(given, stored);
}
