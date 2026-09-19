// Google Maps location URLs come in from the admin panel in several shapes:
//   - "Share > Embed a map" URLs (/maps/embed?pb=...) - already iframe-ready.
//   - "Share > Copy link" short links (maps.app.goo.gl/xxxx or goo.gl/maps/xxxx)
//     - what most people actually paste - which 302-redirect to a full URL
//     containing coordinates. Browsers can't follow that redirect themselves
//     (no CORS headers on the response), so it has to be resolved server-side.
//   - Full "place" share URLs (/maps/place/<name>/@lat,lng,zoom).
// This must only run in server components (it calls fetch server-side to
// follow redirects); client code should never import it.

const SHORT_LINK_HOSTS = ["maps.app.goo.gl", "goo.gl"];

function extractLatLng(url) {
  const decoded = decodeURIComponent(url).replace(/\+/g, " ");
  const match = decoded.match(/(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
  if (!match) return null;
  return { lat: match[1], lng: match[2] };
}

async function resolveShortLink(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    return res.url || url;
  } catch {
    return url;
  }
}

export async function resolveEmbedUrl(url, fallbackAddress = "") {
  if (!url) {
    return fallbackAddress
      ? `https://www.google.com/maps?q=${encodeURIComponent(fallbackAddress)}&output=embed`
      : "";
  }

  if (url.includes("/maps/embed")) return url;

  let resolved = url;
  try {
    const host = new URL(url).hostname;
    if (SHORT_LINK_HOSTS.includes(host)) {
      resolved = await resolveShortLink(url);
    }
  } catch {
    // Not a valid absolute URL - fall through and treat it as search text below.
  }

  const coords = extractLatLng(resolved);
  if (coords) {
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}&output=embed`;
  }

  const placeMatch = resolved.match(/place\/([^/]+)/);
  if (placeMatch) {
    const place = placeMatch[1].replaceAll("+", " ");
    return `https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;
  }

  // Resolution didn't yield a usable location - search by the property's
  // plain-text address instead of the URL itself (which Maps can't parse).
  const query = fallbackAddress || resolved;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}
