import { Phone, Mail, MapPin } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";
import { getSiteContent, getBrand, pageTitle, telHref } from "@/lib/getSiteContent";

const DEFAULTS = {
  heading: "Get in touch",
  intro: "",
  backgroundColor: "#0b7c83",
  textColor: "#ffffff",
  locationLabel: "",
  mapQuery: "",
  successMessage: "",
  metaDescription: "",
};

export async function generateMetadata() {
  const [content, brand] = await Promise.all([getSiteContent(), getBrand()]);
  const page = { ...DEFAULTS, ...(content?.contactPage ?? {}) };
  return { title: pageTitle(page.heading, brand), description: page.metaDescription || undefined };
}

export default async function ContactPage() {
  const [content, brand] = await Promise.all([getSiteContent(), getBrand()]);
  const page = { ...DEFAULTS, ...(content?.contactPage ?? {}) };
  const hasDetails = brand.phone || brand.email || page.locationLabel || page.mapQuery;

  return (
    <div>
      <section style={{ backgroundColor: page.backgroundColor, color: page.textColor }}>
        <div className="mx-auto max-w-7xl px-5 py-14 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold">{page.heading}</h1>
          {page.intro && <p className="mt-3 max-w-2xl mx-auto opacity-90">{page.intro}</p>}
        </div>
      </section>

      <div className={`mx-auto max-w-6xl px-5 py-16 grid gap-10 ${hasDetails ? "lg:grid-cols-[1fr_1.2fr]" : "max-w-2xl"}`}>
        {hasDetails && (
          <div className="space-y-6" data-testid="contact-details">
            {brand.phone && <InfoBlock Icon={Phone} title="Phone" value={brand.phone} href={telHref(brand.phone)} />}
            {brand.email && <InfoBlock Icon={Mail} title="Email" value={brand.email} href={`mailto:${brand.email}`} />}
            {page.locationLabel && <InfoBlock Icon={MapPin} title="Location" value={page.locationLabel} />}
            {page.mapQuery && (
              <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] h-64">
                <iframe
                  title="Map"
                  className="w-full h-full border-0"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(page.mapQuery)}&output=embed`}
                  loading="lazy"
                />
              </div>
            )}
          </div>
        )}

        <ContactForm successMessage={page.successMessage} />
      </div>
    </div>
  );
}

function InfoBlock({ Icon, title, value, href }) {
  const inner = (
    <div className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-sm text-[var(--color-muted-foreground)]">{title}</div>
        <div className="text-[var(--color-foreground)] font-semibold mt-0.5">{value}</div>
      </div>
    </div>
  );
  if (href) return <a href={href} className="block">{inner}</a>;
  return inner;
}
