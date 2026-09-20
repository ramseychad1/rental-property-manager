import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Stay dates are calendar dates ("2027-07-03", or that date at midnight UTC),
// not moments in time. new Date() would read them as UTC and shift them back a
// day in US time zones, so build them as local dates instead.
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/;
function parseDate(date) {
  const m = typeof date === "string" ? CALENDAR_DATE.exec(date) : null;
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(date);
}

export function formatDate(date) {
  if (!date) return "";
  const d = typeof date === "string" ? parseDate(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(date) {
  if (!date) return "";
  const d = typeof date === "string" ? parseDate(date) : date;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function diffInNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export const getEmbedUrl = (url) => {
  if (!url) return "";

  // Google's "Share > Embed a map" URLs (/maps/embed?pb=...) are already
  // iframe-ready as-is, unlike the /maps/place/<name> share-link format below.
  if (url.includes("/maps/embed")) return url;

  const match = url.match(/place\/([^/]+)/);

  if (match) {
    const place = match[1].replaceAll("+", " ");
    return `https://www.google.com/maps?q=${encodeURIComponent(
      place,
    )}&output=embed`;
  }

  // Fallback: treat anything else (e.g. a plain address) as a search query.
  return `https://www.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
};
