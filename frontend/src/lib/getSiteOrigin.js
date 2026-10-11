import { cache } from "react";
import { api } from "@/services/api";

const FALLBACK_ORIGIN = "https://rentalpropertymanager.com";

// The complex being served: { name, origin, preview }. One fetch per request.
export const getCurrentSite = cache(async () => {
  try {
    const response = await api.getCurrentSite();
    return response?.data ?? null;
  } catch (error) {
    console.error("Failed to load current site", error);
    return null;
  }
});

// The public origin of the complex being served (its primary domain), used for
// canonical URLs, the sitemap and robots.txt. Falls back to NEXT_PUBLIC_SITE_URL
// (a single-site setting) when the API has no domain on record.
export const getSiteOrigin = cache(async () => {
  const site = await getCurrentSite();
  if (site?.origin) return site.origin;
  return (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_ORIGIN).replace(/\/+$/, "");
});
