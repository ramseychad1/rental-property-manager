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

export const fmtDate = (d, pattern = "MMM d, yyyy") => {
  if (!d) return "—";
  const v = typeof d === "string" ? new Date(d) : d;
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
