import { getCurrentSite } from "@/lib/getSiteOrigin";

// Shown only in preview mode (/c/<slug> on a shared host), so it's obvious
// which complex you're looking at and how to leave.
export default async function PreviewBanner() {
  const site = await getCurrentSite();
  if (!site?.preview) return null;
  return (
    <div className="bg-amber-100 text-amber-950 text-sm px-4 py-2 text-center" data-testid="preview-banner">
      Previewing <strong>{site.name}</strong>.{" "}
      <a href="/c/_exit" className="underline font-medium">
        Exit preview
      </a>
    </div>
  );
}
