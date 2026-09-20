import { Archivo, Manrope, Caveat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getBrand, getSiteContent } from "@/lib/getSiteContent";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"]
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"]
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
  weight: ["400", "500", "600", "700"]
});

// Every page shows admin-edited content (header, footer, metadata), so render on
// demand instead of freezing it at build time. Admin edits show up immediately.
export const dynamic = "force-dynamic";

// Title, description, keywords and share image come from admin > Site Content
// (Site-wide > Search & sharing); the site name from Contact & branding.
export async function generateMetadata() {
  const [content, brand] = await Promise.all([getSiteContent(), getBrand()]);
  const seo = { title: brand.siteName, description: "", keywords: "", shareImage: "", ...(content?.seo ?? {}) };
  const shareImage = seo.shareImage || content?.hero?.bgImage || "";
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://rentalpropertymanager.com"),
    title: { default: seo.title, template: "%s" },
    description: seo.description || undefined,
    keywords: seo.keywords ? seo.keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    openGraph: {
      type: "website",
      siteName: brand.siteName,
      title: seo.title,
      description: seo.description || undefined,
      images: shareImage ? [shareImage] : undefined,
    },
    icons: { icon: "/favicon.svg" },
  };
}

export default async function RootLayout({ children }) {
  const brand = await getBrand();
  return (
    <html lang="en" className={`${archivo.variable} ${manrope.variable} ${caveat.variable}`}>
      <body className="min-h-screen bg-white antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header brand={brand} />
            <main className="flex-1">{children}</main>
            <Footer brand={brand} />
          </div>
        </Providers>
      </body>
    </html>
  );
}
