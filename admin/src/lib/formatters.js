import { format, formatDistanceToNow, isValid } from "date-fns";

export const fmtCurrency = (n, currency = "USD") => {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(n));
};

export const fmtNumber = (n) =>
  n == null ? "—" : Number(n).toLocaleString("en-US");

// Stay dates are calendar dates ("2027-07-03", or that date at midnight UTC),
// not moments in time. new Date() would read them as UTC and shift them back
// a day in US time zones, so build them as local dates instead.
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/;
const parseDate = (d) => {
  const m = typeof d === "string" ? CALENDAR_DATE.exec(d) : null;
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
};

export const fmtDate = (d, pattern = "MMM d, yyyy") => {
  if (!d) return "—";
  const v = typeof d === "string" ? parseDate(d) : d;
  return isValid(v) ? format(v, pattern) : "—";
};

export const fmtRelative = (d) => {
  if (!d) return "—";
  const v = typeof d === "string" ? new Date(d) : d;
  return isValid(v) ? formatDistanceToNow(v, { addSuffix: true }) : "—";
};

export const fmtNights = (n) => `${n} ${n === 1 ? "night" : "nights"}`;

export const getEmbedUrl = (url) => {
  const match = url.match(/place\/([^/]+)/);

  if (!match) return "";

  const place = match[1].replaceAll("+", " ");

  return `https://www.google.com/maps?q=${encodeURIComponent(
    place,
  )}&output=embed`;
};
