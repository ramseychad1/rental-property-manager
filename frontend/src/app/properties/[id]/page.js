import { api } from "@/services/api";
import { getBrand, pageTitle } from "@/lib/getSiteContent";
import { resolveEmbedUrl } from "@/lib/mapEmbed";
import PropertyDetailClient from "@/components/property/PropertyDetailClient";

async function getPropertyPayload(id) {
  try {
    const [propertyRes, seasonsRes] = await Promise.all([
      api.getProperty(id),
      api.getSeasonsData(id).catch(() => ({ data: [] })),
    ]);

    return {
      property: propertyRes.data,
      seasons: seasonsRes.data || [],
    };
  } catch (error) {
    // A 404 may just mean "private and the Next server has no session cookie"
    // (it lives on a different domain than the API), so the client component
    // retries from the browser and shows a friendly page if that fails too.
    if (error.status !== 404) console.error("Failed to load property", error);
    return { property: null, seasons: [] };
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const [{ property }, brand] = await Promise.all([getPropertyPayload(id), getBrand()]);

  if (!property) {
    return {
      title: pageTitle("Property", brand),
      robots: { index: false, follow: false },
    };
  }

  return {
    title: pageTitle(property.title, brand),
    ...(property.isPrivate && { robots: { index: false, follow: false } }),
    description: property.description,
    openGraph: {
      title: property.title,
      description: property.description,
      images: property.images?.thumbnail ? [property.images.thumbnail] : [],
    },
  };
}

export default async function PropertyDetailPage({ params }) {
  const { id } = await params;
  const { property, seasons } = await getPropertyPayload(id);

  if (!property) {
    return <PropertyDetailClient propertyId={id} initialProperty={null} initialSeasons={[]} />;
  }

  // Search with the whole address: a bare street ("123 South Ocean Blvd") matches
  // the same street name in other states.
  const { address, city, zipCode, country } = property.location ?? {};
  const fullAddress = [address, city, zipCode, country].filter(Boolean).join(", ");
  const mapEmbedUrl = await resolveEmbedUrl(property.location?.url, fullAddress);

  return (
    <PropertyDetailClient
      propertyId={id}
      initialProperty={property}
      initialSeasons={seasons}
      mapEmbedUrl={mapEmbedUrl}
    />
  );
}
