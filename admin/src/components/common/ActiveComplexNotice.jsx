import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { sitesApi } from "@/lib/api";

// Shown above screens whose edits land on one complex's public site, so it's
// always clear which one (a Super Admin on "All complexes" edits the default).
export default function ActiveComplexNotice() {
  const { data } = useQuery({ queryKey: ["site-current"], queryFn: sitesApi.current });
  if (!data?.name) return null;
  return (
    <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="active-complex-notice">
      <Building2 className="w-4 h-4" /> Editing <span className="font-medium text-foreground">{data.name}</span>
    </p>
  );
}
