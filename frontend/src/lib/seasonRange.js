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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const weekdayName = (d) => DAYS[d];

// "Sat → Sat" / "Check-in Sat" / "Check-out Sat" for a season, or "" if unrestricted.
export function weekdayRule({ checkInDay, checkOutDay }) {
  const short = (d) => DAYS[d].slice(0, 3);
  if (checkInDay != null && checkOutDay != null) return `${short(checkInDay)} → ${short(checkOutDay)}`;
  if (checkInDay != null) return `Check-in ${short(checkInDay)}`;
  if (checkOutDay != null) return `Check-out ${short(checkOutDay)}`;
  return "";
}

const localDate = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Checks a saved/selected stay against the season it starts in (min/max nights
 * and check-in/check-out weekday). Returns a guest-facing message, or null if
 * the stay is fine. checkOut may be null to validate a lone check-in date.
 */
export function stayRuleProblem({ checkIn, checkOut, seasons, defaultMinNights = 1 }) {
  if (!checkIn) return null;
  const start = localDate(checkIn);
  const md = monthDayOf(start);
  const season = (seasons || []).find((s) =>
    (s.dateRanges || []).some((r) => inSeasonRange(md, r.startDate, r.endDate)),
  );
  if (!season) return null;

  if (season.checkInDay != null && start.getDay() !== season.checkInDay) {
    return `${season.name} stays must check in on a ${DAYS[season.checkInDay]}.`;
  }
  if (!checkOut) return null;

  const end = localDate(checkOut);
  if (season.checkOutDay != null && end.getDay() !== season.checkOutDay) {
    return `${season.name} stays must check out on a ${DAYS[season.checkOutDay]}.`;
  }
  const nights = Math.round((end - start) / 86_400_000);
  const min = season.minNights ?? defaultMinNights;
  if (nights < min) return `${season.name} stays require at least ${min} nights.`;
  if (season.maxNights && nights > season.maxNights) {
    return `${season.name} stays allow at most ${season.maxNights} nights.`;
  }
  return null;
}
