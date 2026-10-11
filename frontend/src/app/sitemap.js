import { getSiteOrigin } from "@/lib/getSiteOrigin";

export default async function sitemap() {
  const baseUrl = await getSiteOrigin();
  const lastModified = new Date();

  return [
    "",
    "/properties",
    "/things-to-do",
    "/services",
    "/contact",
    "/privacy-policy",
    "/refund-policy",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
}
