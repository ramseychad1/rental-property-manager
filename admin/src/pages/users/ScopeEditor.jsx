import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sitesApi, usersApi } from "@/lib/api";

// Super Admin only: change a staff member's role and complex.
export default function ScopeEditor({ user, onChanged }) {
  const { data: sites = [] } = useQuery({ queryKey: ["sites"], queryFn: sitesApi.list });
  const [role, setRole] = useState(user.role);
  const [siteId, setSiteId] = useState(user.siteId || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRole(user.role);
    setSiteId(user.siteId || "");
  }, [user.id, user.role, user.siteId]);

  const needsComplex = role !== "SuperAdmin";
  const effectiveSite = siteId || sites[0]?._id || "";
  const dirty = role !== user.role || (needsComplex && effectiveSite !== (user.siteId || ""));

  const save = async () => {
    setBusy(true);
    try {
      const updated = await usersApi.setScope(user.id, { role, ...(needsComplex && { siteId: effectiveSite }) });
      toast.success("Role updated");
      onChanged(updated);
    } catch (err) {
      toast.error(err.normalizedMessage || "Could not update role");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-3 p-5 rounded-xl space-y-3" data-testid="scope-editor">
      <div className="overline">Role and complex</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Owner">Owner</SelectItem>
              <SelectItem value="SiteAdmin">Site Admin</SelectItem>
              <SelectItem value="SuperAdmin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {needsComplex && (
          <div className="space-y-1.5">
            <Label>Complex</Label>
            <Select value={effectiveSite} onValueChange={setSiteId}>
              <SelectTrigger><SelectValue placeholder="Choose a complex" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {role === "SuperAdmin"
          ? "Super Admins work across every complex."
          : role === "SiteAdmin"
            ? "Runs this complex: its site content, Things To Do and owners."
            : "Manages only their own properties in this complex."}
      </p>
      <Button size="sm" disabled={!dirty || busy || (needsComplex && !effectiveSite)} onClick={save}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
      </Button>
    </Card>
  );
}
