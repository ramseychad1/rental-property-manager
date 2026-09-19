import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
  MapPin,
  Tags,
  Compass,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import DataToolbar, { SearchInput } from "@/components/common/DataToolbar";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

import { thingsToDoApi } from "@/lib/api";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const CATEGORY_OPTIONS = [
  "Restaurants",
  "Deep sea Fishing",
  "Backcountry fishing",
  "Bird watching",
];

export default function ThingsToDoList() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState("grid");
  const [pending, setPending] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["things-to-do", { search, status, category }],
    queryFn: () =>
      thingsToDoApi.list({
        search,
        status: status === "all" ? "" : status,
        category: category === "all" ? "" : category,
      }),
    keepPreviousData: true,
  });

  const remove = useMutation({
    mutationFn: (id) => thingsToDoApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["things-to-do"] });
      toast.success("Thing to do deleted successfully");
    },
    onError: (e) => {
      toast.error(e?.normalizedMessage || "Failed to delete");
    },
  });

  const items = data || [];

  const cards = useMemo(
    () =>
      items.map((item) => (
        <motion.div
          key={item._id}
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="group rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/30">
            <Link
              to={`/things-to-do/${item._id}`}
              className="block relative aspect-[4/3] overflow-hidden bg-muted"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />

              <div className="absolute top-3 left-3">
                <StatusBadge className="bg-black/90" status={item.status} />
              </div>

              <div
                className="absolute top-3 right-3"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="grid place-items-center w-8 h-8 rounded-lg bg-background/95 backdrop-blur border border-border hover:bg-background">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => navigate(`/things-to-do/${item._id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" /> View
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() =>
                        navigate(`/things-to-do/${item._id}/edit`)
                      }
                    >
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setPending(item)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Link>

            <div className="p-4">
              <Link to={`/things-to-do/${item._id}`} className="block">
                <h3 className="font-display font-semibold text-base leading-tight line-clamp-1">
                  {item.name}
                </h3>
              </Link>

              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {item.description}
              </p>

              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {item.area}
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                <Tags className="w-3.5 h-3.5 text-muted-foreground" />
                <Badge variant="outline" className="text-[10px] font-mono">
                  {item.category}
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>
      )),
    [items, navigate],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Things To Do"
        subtitle="Manage activities, restaurants, tours, and local recommendations."
        actions={
          <Button asChild>
            <Link to="/things-to-do/new">
              <Plus className="w-4 h-4" /> Add Thing
            </Link>
          </Button>
        }
      />

      <DataToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, description, area..."
        />

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-52 h-10">
            <SelectValue placeholder="Category" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>

            {CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full md:w-44 h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>

            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="hidden md:flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button
            onClick={() => setView("grid")}
            className={`grid place-items-center w-9 h-9 rounded-md transition-colors ${
              view === "grid"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            onClick={() => setView("list")}
            className={`grid place-items-center w-9 h-9 rounded-md transition-colors ${
              view === "list"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </DataToolbar>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="rounded-xl overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="rounded-xl">
          <EmptyState
            icon={Compass}
            title="No things to do found"
            description="Try clearing filters, or add your first recommendation."
            action={
              <Button asChild>
                <Link to="/things-to-do/new">
                  <Plus className="w-4 h-4" /> Add Thing
                </Link>
              </Button>
            }
          />
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {cards}
        </div>
      ) : (
        <Card className="rounded-xl divide-y divide-border">
          {items.map((item) => (
            <Link
              key={item._id}
              to={`/things-to-do/${item._id}`}
              className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover border border-border"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold truncate">
                    {item.name}
                  </span>
                  <StatusBadge status={item.status} />
                </div>

                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                  {item.description}
                </p>

                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {item.area}
                </div>
              </div>

              <Badge
                variant="outline"
                className="hidden md:inline-flex text-[10px] font-mono"
              >
                {item.category}
              </Badge>
            </Link>
          ))}
        </Card>
      )}

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(v) => !v && setPending(null)}
        title="Delete this thing to do?"
        description={pending ? `"${pending.name}" will be permanently removed.` : ""}
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