// Season date ranges repeat every year and are stored as "MM-DD". A range whose
// end is before its start wraps over New Year (e.g. 12-15 to 01-05). Legacy
// values may still be "YYYY-MM-DD"; normalizeMD drops the year.

const pad = (n) => String(n).padStart(2, "0");

export const normalizeMD = (v) => String(v ?? "").slice(-5);

export const monthDayOf = (date) => `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function inSeasonRange(md, start, end) {
  const s = normalizeMD(start);
  const e = normalizeMD(end);
  return s <= e ? md >= s && md <= e : md >= s || md <= e;
}

// "06-01" -> "Jun 1"
export function formatMonthDay(v) {
  const [m, d] = normalizeMD(v).split("-").map(Number);
  if (!m || !d) return "";
  return new Date(2000, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
