import { cache } from "react";
import { api } from "@/services/api";

// Editable site content (see admin > Site Content). React's cache() makes the
// layout, header, footer and page share one fetch per request. Returns null if
// the API is unreachable, and every reader falls back to sensible defaults.
export const getSiteContent = cache(async () => {
  try {
    const response = await api.getSiteContent();
    return response?.data ?? null;
  } catch (error) {
    console.error("Failed to load site content", error);
    return null;
  }
});

// Used when a section is missing (API down, or an older backend during a deploy).
export const FALLBACK_BRAND = {
  siteName: "Rental Property Manager",
  tagline: "",
  phone: "",
  email: "",
  address: "",
  facebook: "",
  instagram: "",
  tiktok: "",
  x: "",
};

export async function getBrand() {
  const content = await getSiteContent();
  return { ...FALLBACK_BRAND, ...(content?.brand ?? {}) };
}

// Page title helper: "Page | Site name"
export const pageTitle = (title, brand) => `${title} | ${brand.siteName}`;

// "+1 (305) 555-1212" -> "tel:+13055551212"
export const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, "")}`;
