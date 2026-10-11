import { getSiteOrigin } from "@/lib/getSiteOrigin";

export default async function robots() {
  const baseUrl = await getSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
