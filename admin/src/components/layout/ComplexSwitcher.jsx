import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { sitesApi } from "@/lib/api";
import { getActiveSiteId, setActiveSiteId } from "@/lib/activeSite";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

// Super Admin: pick which complex the console works on ("All complexes" lists
// everything; screens that edit a site ask you to pick one). Everyone else: just see
// which complex they belong to.
export default function ComplexSwitcher() {
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: sites = [] } = useQuery({ queryKey: ["sites"], queryFn: sitesApi.list, enabled: isSuperAdmin });
  const { data: current } = useQuery({ queryKey: ["site-current"], queryFn: sitesApi.current, enabled: !isSuperAdmin });

  if (!isSuperAdmin) {
    return current?.name ? (
      <span className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="topbar-complex">
        <Building2 className="w-4 h-4" /> {current.name}
      </span>
    ) : null;
  }
  if (sites.length < 2) return null;

  const selected = sites.some((s) => s._id === getActiveSiteId()) ? getActiveSiteId() : ALL;

  const change = (value) => {
    setActiveSiteId(value === ALL ? null : value);
    // Everything on screen belongs to the previous selection.
    qc.removeQueries();
    window.location.reload();
  };

  return (
    <Select value={selected} onValueChange={change}>
      <SelectTrigger className="w-[210px] h-9" data-testid="topbar-complex-switcher" aria-label="Complex">
        <Building2 className="w-4 h-4 mr-1 shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All complexes</SelectItem>
        {sites.map((s) => (
          <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
