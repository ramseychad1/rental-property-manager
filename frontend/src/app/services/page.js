import ServicesList from "@/components/services/ServicesList";
import { getSiteContent, getBrand, pageTitle } from "@/lib/getSiteContent";

const DEFAULTS = {
  heading: "Services We Offer",
  intro: "",
  backgroundColor: "#0b7c83",
  textColor: "#ffffff",
  metaDescription: "",
  services: [],
};

export async function generateMetadata() {
  const [content, brand] = await Promise.all([getSiteContent(), getBrand()]);
  const page = { ...DEFAULTS, ...(content?.servicesPage ?? {}) };
  return { title: pageTitle(page.heading, brand), description: page.metaDescription || undefined };
}

export default async function ServicesPage() {
  const content = await getSiteContent();
  const page = { ...DEFAULTS, ...(content?.servicesPage ?? {}) };

  return (
    <div>
      <section style={{ backgroundColor: page.backgroundColor, color: page.textColor }}>
        <div className="mx-auto max-w-7xl px-5 py-14 text-center">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">{page.heading}</h1>
          {page.intro && <p className="mt-3 mx-auto max-w-2xl opacity-90">{page.intro}</p>}
        </div>
      </section>

      <ServicesList services={page.services} />
    </div>
  );
}
