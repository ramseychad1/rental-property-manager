import { useQuery } from "@tanstack/react-query";
import { Building2, ExternalLink } from "lucide-react";
import { sitesApi } from "@/lib/api";

// Shown above screens whose edits land on one complex's public site, so it's
// always clear which one (RequireComplex stops "All complexes" from reaching them).
export default function ActiveComplexNotice() {
  const { data } = useQuery({ queryKey: ["site-current"], queryFn: sitesApi.current });
  if (!data?.name) return null;
  return (
    <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="active-complex-notice">
      <Building2 className="w-4 h-4" /> Editing <span className="font-medium text-foreground">{data.name}</span>
      {data.previewUrl && (
        <a href={data.previewUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary hover:underline" data-testid="view-preview">
          Preview site <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
      {data.siteUrl && (
        <a href={data.siteUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary hover:underline" data-testid="view-live">
          Live site <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </p>
  );
}
