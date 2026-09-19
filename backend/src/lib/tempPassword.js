import crypto from "node:crypto";

// Readable temporary password: no look-alike characters (0/O, 1/l/I), and at
// least one of each class so it also passes the admin panel's password rules.
const CLASSES = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%*?"];

export function generateTempPassword(length = 14) {
  const all = CLASSES.join("");
  const chars = CLASSES.map((set) => set[crypto.randomInt(set.length)]);
  while (chars.length < length) chars.push(all[crypto.randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
