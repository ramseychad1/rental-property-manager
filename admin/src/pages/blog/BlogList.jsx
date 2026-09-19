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
  FileText,
  CalendarDays,
  Tags,
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

import { blogsApi } from "@/lib/api";

const BLOG_STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
];

const formatDate = (date) => {
  if (!date) return "Not published";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function BlogListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState("grid");
  const [pending, setPending] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["blogs", { search, status }],
    queryFn: () =>
      blogsApi.list({
        search,
        status: status === "all" ? "" : status,
      }),
    keepPreviousData: true,
  });

  const remove = useMutation({
    mutationFn: (id) => blogsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blogs"] });
      toast.success("Blog deleted successfully");
    },
    onError: (e) => {
      toast.error(e?.normalizedMessage || "Failed to delete blog");
    },
  });

  const blogs = data || [];

  const cards = useMemo(
    () =>
      blogs.map((blog) => (
        <motion.div
          key={blog._id}
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="group rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/30">
            <Link
              to={`/blogs/${blog._id}`}
              className="block relative aspect-[4/3] overflow-hidden bg-muted"
            >
              <img
                src={blog.thumbnail}
                alt={blog.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />

              <div className="absolute  top-3 left-3">
                <StatusBadge className="bg-black/90" status={blog.status} />
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
                      onClick={() => navigate(`/blogs/${blog._id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" /> View
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => navigate(`/blogs/${blog._id}/edit`)}
                    >
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setPending(blog)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Link>

            <div className="p-4">
              <Link to={`/blogs/${blog._id}`} className="block">
                <h3 className="font-display font-semibold text-base leading-tight line-clamp-1">
                  {blog.title}
                </h3>
              </Link>

              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {blog.shortDescription}
              </p>

              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                {formatDate(blog.publishedAt || blog.createdAt)}
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                <Tags className="w-3.5 h-3.5 text-muted-foreground" />

                <div className="flex flex-wrap gap-1">
                  {(blog.tags || []).slice(0, 2).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px] font-mono"
                    >
                      {tag}
                    </Badge>
                  ))}

                  {(blog.tags || []).length > 2 && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      +{blog.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )),
    [blogs, navigate],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blogs"
        subtitle="Create, manage, and publish website blogs."
        actions={
          <Button asChild>
            <Link to="/blogs/new">
              <Plus className="w-4 h-4" /> Add Blog
            </Link>
          </Button>
        }
      />

      <DataToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search blogs by title, description, content..."
        />

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full md:w-44 h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>

            {BLOG_STATUS_OPTIONS.map((s) => (
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
      ) : blogs.length === 0 ? (
        <Card className="rounded-xl">
          <EmptyState
            icon={FileText}
            title="No blogs found"
            description="Try clearing filters, or add your first blog."
            action={
              <Button asChild>
                <Link to="/blogs/new">
                  <Plus className="w-4 h-4" /> Add Blog
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
          {blogs.map((blog) => (
            <Link
              key={blog._id}
              to={`/blogs/${blog._id}`}
              className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors"
            >
              <img
                src={blog.thumbnail}
                alt={blog.title}
                className="w-16 h-16 rounded-lg object-cover border border-border"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold truncate">
                    {blog.title}
                  </span>
                  <StatusBadge status={blog.status} />
                </div>

                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                  {blog.shortDescription}
                </p>
              </div>

              <div className="hidden md:block text-xs text-muted-foreground">
                {formatDate(blog.publishedAt || blog.createdAt)}
              </div>
            </Link>
          ))}
        </Card>
      )}

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(v) => !v && setPending(null)}
        title="Delete this blog?"
        description={
          pending ? `"${pending.title}" will be permanently removed.` : ""
        }
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
