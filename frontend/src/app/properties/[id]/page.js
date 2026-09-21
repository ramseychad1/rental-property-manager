import { api } from "@/services/api";
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
  const { property } = await getPropertyPayload(id);

  if (!property) {
    return {
      title: "Property | Rental Property Manager",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${property.title} | Rental Property Manager`,
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

  const mapEmbedUrl = await resolveEmbedUrl(
    property.location?.url,
    property.location?.address,
  );

  return (
    <PropertyDetailClient
      propertyId={id}
      initialProperty={property}
      initialSeasons={seasons}
      mapEmbedUrl={mapEmbedUrl}
    />
  );
}
