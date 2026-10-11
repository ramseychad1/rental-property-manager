import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, CheckCircle2, ExternalLink, Globe, Loader2, Pencil, Plus, Star, Trash2, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sitesApi } from "@/lib/api";

const KEY = ["sites"];
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

function DomainRow({ site, domain, onChanged }) {
  const [check, setCheck] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const run = useMutation({
    mutationFn: ({ kind }) => {
      if (kind === "check") return sitesApi.checkDomain(site._id, domain._id);
      if (kind === "primary") return sitesApi.makePrimary(site._id, domain._id);
      return sitesApi.removeDomain(site._id, domain._id);
    },
    onSuccess: (result, { kind }) => {
      if (kind === "check") setCheck(result);
      else {
        toast.success(kind === "primary" ? "Primary domain updated" : "Domain removed");
        onChanged();
      }
    },
    onError: (err) => toast.error(err.normalizedMessage || "Something went wrong"),
  });

  const working = (kind) => run.isPending && run.variables?.kind === kind;

  return (
    <div className="py-2.5 border-t first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="font-mono text-sm">{domain.hostname}</span>
        {domain.isPrimary && (
          <Badge variant="secondary" className="gap-1">
            <Star className="w-3 h-3" /> Primary
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => run.mutate({ kind: "check" })}>
            {working("check") && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Check
          </Button>
          {!domain.isPrimary && (
            <Button size="sm" variant="ghost" disabled={run.isPending} onClick={() => run.mutate({ kind: "primary" })}>
              {working("primary") && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Make primary
            </Button>
          )}
          <Button size="icon" variant="ghost" aria-label={`Remove ${domain.hostname}`} disabled={run.isPending} onClick={() => setConfirmRemove(true)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {check && (
        <ul className="mt-2 ml-6 text-sm space-y-1">
          <li className="flex items-center gap-1.5">
            {check.dns.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-destructive" />}
            DNS {check.dns.ok ? `resolves (${check.dns.records.join(", ")})` : "doesn't resolve yet. Add the CNAME record at the registrar."}
          </li>
          {check.dns.ok && (
            <li className="flex items-center gap-1.5">
              {check.https.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-destructive" />}
              HTTPS {check.https.ok ? `answers (HTTP ${check.https.status})` : `isn't reachable (${check.https.error}). The certificate may still be issuing.`}
            </li>
          )}
          {check.https.ok && (
            <li className="flex items-center gap-1.5">
              {check.servesThisApp ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-destructive" />}
              {check.servesThisApp ? "Serves this app" : "Answers, but not this app. Check that the domain is attached to the frontend service."}
            </li>
          )}
        </ul>
      )}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove ${domain.hostname}?`}
        description="Visitors using this address will no longer see this complex's site. You can add it back later."
        confirmLabel="Remove domain"
        destructive
        onConfirm={() => run.mutate({ kind: "remove" })}
      />
    </div>
  );
}

function SiteCard({ site, onChanged }) {
  const [hostname, setHostname] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(site.name);
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: () => sitesApi.addDomain(site._id, { hostname }),
    onSuccess: () => {
      setHostname("");
      toast.success("Domain added");
      onChanged();
    },
    onError: (err) => toast.error(err.normalizedMessage || "Could not add domain"),
  });

  const rename = useMutation({
    mutationFn: () => sitesApi.update(site._id, { name: name.trim() }),
    onSuccess: () => {
      setRenaming(false);
      toast.success("Complex renamed");
      onChanged();
      qc.invalidateQueries({ queryKey: ["site-current"] });
    },
    onError: (err) => toast.error(err.normalizedMessage || "Could not rename"),
  });

  const toggle = useMutation({
    mutationFn: () => sitesApi.update(site._id, { isActive: !site.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(site.isActive ? "Complex deactivated" : "Complex activated");
    },
    onError: (err) => toast.error(err.normalizedMessage || "Could not update"),
  });

  return (
    <Card className="p-5 space-y-4" data-testid={`site-${site.slug}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            {renaming ? (
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim() && name.trim() !== site.name) rename.mutate();
                  else setRenaming(false);
                }}
              >
                <Input autoFocus className="h-8 w-64" value={name} onChange={(e) => setName(e.target.value)} aria-label="Complex name" />
                <Button type="submit" size="icon" variant="ghost" aria-label="Save name" disabled={rename.isPending || !name.trim()}>
                  {rename.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Cancel" onClick={() => { setRenaming(false); setName(site.name); }}>
                  <X className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <>
                <h2 className="font-semibold text-lg">{site.name}</h2>
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Rename ${site.name}`} onClick={() => setRenaming(true)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            {!site.isActive && <Badge variant="outline">Inactive</Badge>}
          </div>
          <p className="text-xs text-muted-foreground font-mono">{site.slug}</p>
          <p className="text-sm flex flex-wrap gap-x-3">
            {site.previewUrl && (
              <a href={site.previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Preview site <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {site.siteUrl && (
              <a href={site.siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Live site <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span>{site.counts.properties} properties</span>
          <span>{site.counts.members} members</span>
          {site.slug !== "default" && (
            <Button size="sm" variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate()}>
              {site.isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        </div>
      </div>

      <div className="text-sm">
        <span className="text-muted-foreground">Site admin: </span>
        {site.siteAdmins.length
          ? site.siteAdmins.map((a) => `${a.name} (${a.email})`).join(", ")
          : <span className="text-muted-foreground">none yet. Create a user with the Site Admin role.</span>}
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Domains</Label>
        {site.domains.length ? (
          <div className="mt-1">
            {site.domains.map((d) => (
              <DomainRow key={d._id} site={site} domain={d} onChanged={onChanged} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">No domain yet, so this complex's site can't be reached.</p>
        )}
        <form
          className="flex flex-wrap gap-2 mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (hostname.trim()) add.mutate();
          }}
        >
          <Input
            className="max-w-xs font-mono"
            placeholder="stay.example.com"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            aria-label={`Add a domain to ${site.name}`}
          />
          <Button type="submit" variant="outline" disabled={add.isPending || !hostname.trim()}>
            {add.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add domain
          </Button>
        </form>
      </div>
    </Card>
  );
}

function NewSiteDialog({ open, onOpenChange, onCreated }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const create = useMutation({
    mutationFn: () => sitesApi.create({ name: name.trim(), slug }),
    onSuccess: () => {
      toast.success("Complex created");
      setName("");
      setSlug("");
      setSlugTouched(false);
      onCreated();
    },
    onError: (err) => toast.error(err.normalizedMessage || "Could not create complex"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>New complex</DialogTitle>
            <DialogDescription>Add its domain next, then create its Site Admin from the Users page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="site-name">Name</Label>
            <Input
              id="site-name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="site-slug">Short name</Label>
            <Input
              id="site-slug"
              required
              className="font-mono"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !name.trim() || slug.length < 2}>
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Create complex
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SiteListPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const { data: sites, isLoading } = useQuery({ queryKey: KEY, queryFn: sitesApi.list });
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });

  return (
    <div>
      <PageHeader
        title="Complexes"
        subtitle="Each complex has its own public site, content, properties and custom domain."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" /> New complex
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : sites?.length ? (
        <div className="space-y-4">
          {sites.map((s) => (
            <SiteCard key={s._id} site={s} onChanged={refresh} />
          ))}
        </div>
      ) : (
        <EmptyState title="No complexes" description="Create the first one to get started." />
      )}

      <NewSiteDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={() => {
          setCreating(false);
          refresh();
        }}
      />
    </div>
  );
}
