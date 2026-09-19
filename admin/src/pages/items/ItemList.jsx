import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  MapPin,
  BedDouble,
  Bath,
  Users as UsersIcon,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import DataToolbar, { SearchInput } from "@/components/common/DataToolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { itemsApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { vertical } from "@/config/vertical";
import { fmtCurrency } from "@/lib/formatters";
import { motion } from "motion/react";
import { toast } from "sonner";

export default function ItemListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState("grid");
  const [pending, setPending] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.items({ search, status }),
    queryFn: () => itemsApi.list({ search, status }),
    keepPreviousData: true,
  });

  const remove = useMutation({
    mutationFn: (id) => itemsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      toast.success(`${vertical.item.singular} deleted`);
    },
  });

  const Icon = vertical.item.icon;
  const items = data || [];
  const cap = vertical.item.capacityIcons;

  const cards = useMemo(
    () =>
      items.map((p) => (
        <motion.div
          key={p._id}
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card
            data-testid={`item-card-${p._id}`}
            className="group rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/30"
          >
            <Link to={`/${vertical.item.slug}/${p._id}`} className="block relative aspect-[4/3] overflow-hidden bg-muted">
              <img
                src={p.images.thumbnail}
                alt={p.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute top-3 left-3"><StatusBadge className="bg-black/90" status={p.status} /></div>
              <div className="absolute top-3 right-3" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-testid={`item-menu-${p._id}`}
                      className="grid place-items-center w-8 h-8 rounded-lg bg-background/95 backdrop-blur border border-border hover:bg-background"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      data-testid={`item-view-${p._id}`}
                      onClick={() => navigate(`/${vertical.item.slug}/${p._id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-testid={`item-edit-${p._id}`}
                      onClick={() => navigate(`/${vertical.item.slug}/${p._id}/edit`)}
                    >
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-testid={`item-delete-${p._id}`}
                      onClick={() => setPending(p)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="px-2.5 py-1 rounded-md bg-background/95 backdrop-blur border border-border text-xs font-mono font-semibold">
                  {fmtCurrency(p.price?.nightly, p.price?.currency)} <span className="text-muted-foreground font-sans font-normal">/night</span>
                </div>
              </div>
            </Link>
            <div className="p-4">
              <Link to={`/${vertical.item.slug}/${p._id}`} className="block">
                <h3 className="font-display font-semibold text-base leading-tight truncate">{p.title}</h3>
              </Link>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" /> {p.location.city}, {p.location.country}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <UsersIcon className="w-3.5 h-3.5" /> {p.guests}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5" /> {p.bedrooms}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5" /> {p.bathrooms}
                </span>
                <Badge variant="outline" className="ml-auto text-[10px] font-mono">
                  {p.minNights}–{p.maxNights}n
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>
      )),
    [items, navigate, cap],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={vertical.item.plural}
        subtitle={vertical.copy.listSubtitle}
        actions={
          <Button asChild data-testid="items-add-btn">
            <Link to={`/${vertical.item.slug}/new`}>
              <Plus className="w-4 h-4" /> Add {vertical.item.singular}
            </Link>
          </Button>
        }
      />

      <DataToolbar>
        <SearchInput
          testid="items-search"
          value={search}
          onChange={setSearch}
          placeholder={`Search ${vertical.item.plural.toLowerCase()} by name, city, country…`}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="items-status-filter" className="w-full md:w-44 h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {vertical.item.statusOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden md:flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button
            data-testid="items-view-grid"
            onClick={() => setView("grid")}
            className={`grid place-items-center w-9 h-9 rounded-md transition-colors ${view === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            data-testid="items-view-list"
            onClick={() => setView("list")}
            className={`grid place-items-center w-9 h-9 rounded-md transition-colors ${view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </DataToolbar>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-xl overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="rounded-xl">
          <EmptyState
            icon={Icon}
            title={`No ${vertical.item.plural.toLowerCase()} found`}
            description={`Try clearing filters, or add your first ${vertical.item.singular.toLowerCase()}.`}
            action={
              <Button asChild>
                <Link to={`/${vertical.item.slug}/new`}>
                  <Plus className="w-4 h-4" /> Add {vertical.item.singular}
                </Link>
              </Button>
            }
          />
        </Card>
      ) : view === "grid" ? (
        <div data-testid="items-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {cards}
        </div>
      ) : (
        <Card className="rounded-xl divide-y divide-border" data-testid="items-list">
          {items.map((p) => (
            <Link
              key={p._id}
              to={`/${vertical.item.slug}/${p._id}`}
              className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors"
            >
              <img src={p.images.thumbnail} alt={p.title} className="w-16 h-16 rounded-lg object-cover border border-border" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold truncate">{p.title}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {p.location.city}, {p.location.country}
                </div>
              </div>
              <div className="font-mono font-semibold">{fmtCurrency(p.price?.nightly)}</div>
            </Link>
          ))}
        </Card>
      )}

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(v) => !v && setPending(null)}
        title={`Delete this ${vertical.item.singular.toLowerCase()}?`}
        description={pending ? `"${pending.title}" will be permanently removed.` : ""}
        destructive
        confirmLabel="Delete"
        onConfirm={() => {
          if (pending) {
            remove.mutate(pending._id);
            setPending(null);
          }
        }}
      />
    </div>
  );
}
