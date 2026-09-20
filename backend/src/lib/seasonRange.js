// Season date ranges repeat every year, so they're stored as "MM-DD" only.
// A range whose end is before its start wraps over New Year (e.g. 12-15 to
// 01-05). Legacy rows may still hold full "YYYY-MM-DD" dates; normalizeMD
// drops the year so they keep working.

export const normalizeMD = (v) => String(v ?? "").slice(-5);

// "MM-DD" for a "YYYY-MM-DD" date key.
export const monthDayOfKey = (key) => String(key).slice(5, 10);

export function inSeasonRange(md, start, end) {
  const s = normalizeMD(start);
  const e = normalizeMD(end);
  return s <= e ? md >= s && md <= e : md >= s || md <= e;
}

export function seasonForKey(seasons, key) {
  const md = monthDayOfKey(key);
  return seasons.find((s) => (s.dateRanges || []).some((r) => inSeasonRange(md, r.startDate, r.endDate)));
}

// True for a real calendar month/day (02-29 allowed - it's valid in leap years).
export function isValidMD(v) {
  const m = /^(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const month = Number(m[1]);
  const day = Number(m[2]);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(2000, month, 0).getDate();
}
