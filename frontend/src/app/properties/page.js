import PropertyCard from "@/components/property/PropertyCard";
import { api } from "@/services/api";
import { getIcon } from "@/lib/homeIcons";
import { getSiteContent, getBrand, pageTitle } from "@/lib/getSiteContent";

const DEFAULTS = {
  headline: "Find your perfect stay",
  backgroundColor: "#0b7c83",
  textColor: "#ffffff",
  features: [],
  emptyMessage: "No properties available right now. Check back soon.",
  metaDescription: "",
};

export async function generateMetadata() {
  const [content, brand] = await Promise.all([getSiteContent(), getBrand()]);
  const page = { ...DEFAULTS, ...(content?.propertiesPage ?? {}) };
  return { title: pageTitle("Properties", brand), description: page.metaDescription || undefined };
}

async function getProperties() {
  try {
    const response = await api.listProperties();
    return { properties: response.data || [], error: "" };
  } catch (error) {
    console.error("Failed to load properties", error);
    return {
      properties: [],
      error: "Properties are temporarily unavailable. Please check back soon.",
    };
  }
}

export default async function PropertiesPage() {
  const [{ properties, error }, content] = await Promise.all([getProperties(), getSiteContent()]);
  const page = { ...DEFAULTS, ...(content?.propertiesPage ?? {}) };

  return (
    <div>
      <section
        style={{ backgroundColor: page.backgroundColor, color: page.textColor }}
        data-testid="properties-banner"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 lg:grid-cols-[1.2fr_1fr]">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {page.headline}
          </h1>
          {page.features.length > 0 && (
            <ul className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-3">
              {page.features.map((f, i) => (
                <Feat key={i} Icon={getIcon(f.icon)} title={f.title} sub={f.subtitle} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-14"
        data-testid="properties-list"
      >
        {error && <div className="mb-4 text-sm text-red-700">{error}</div>}

        {properties.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-[var(--color-muted-foreground)]">
              {page.emptyMessage}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {properties.map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Feat({ Icon, title, sub }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="opacity-85">{sub}</div>
      </div>
    </li>
  );
}
