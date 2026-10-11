import { cache } from "react";
import { api } from "@/services/api";

const FALLBACK_ORIGIN = "https://rentalpropertymanager.com";

// The public origin of the complex being served (its primary domain), used for
// canonical URLs, the sitemap and robots.txt. Falls back to NEXT_PUBLIC_SITE_URL
// (a single-site setting) when the API has no domain on record.
export const getSiteOrigin = cache(async () => {
  try {
    const response = await api.getCurrentSite();
    if (response?.data?.origin) return response.data.origin;
  } catch (error) {
    console.error("Failed to load site origin", error);
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_ORIGIN).replace(/\/+$/, "");
});
