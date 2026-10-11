import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { sitesApi } from "@/lib/api";
import { getActiveSiteId, setActiveSiteId } from "@/lib/activeSite";
import { Button } from "@/components/ui/button";

// Wraps screens that edit one complex's public site. A Super Admin on "All
// complexes" gets a picker instead of the screen, so edits never land on a
// complex by accident. (With a single complex there's nothing to pick.)
export default function RequireComplex({ children }) {
  const { isSuperAdmin } = useAuth();
  const { data: sites, isLoading } = useQuery({ queryKey: ["sites"], queryFn: sitesApi.list, enabled: isSuperAdmin });

  if (!isSuperAdmin) return children;
  if (isLoading || !sites) return null;
  if (sites.length < 2 || sites.some((s) => s._id === getActiveSiteId())) return children;

  const pick = (id) => {
    setActiveSiteId(id);
    window.location.reload();
  };

  return (
    <div className="p-5 md:p-8" data-testid="require-complex">
      <div className="mx-auto max-w-md rounded-xl border p-6 text-center space-y-4">
        <Building2 className="mx-auto w-8 h-8 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">Pick a complex to edit</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This screen changes one complex's public website. Choose which one to work on (you can also use the switcher in the top bar).
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {sites.map((s) => (
            <Button key={s._id} variant="outline" onClick={() => pick(s._id)} data-testid={`pick-complex-${s.slug}`}>
              {s.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
