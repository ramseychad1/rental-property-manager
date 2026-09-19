import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Pencil,
  Trash2,
  Loader2,
  CalendarDays,
  Tags,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import StatusBadge from "@/components/common/StatusBadge";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { blogsApi } from "@/lib/api";
import { useState } from "react";

const formatDate = (date) => {
  if (!date) return "Not published";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const stripHtml = (value = "") => {
  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .trim();
};

export default function BlogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [confirmDel, setConfirmDel] = useState(false);

  const { data: blog, isLoading } = useQuery({
    queryKey: ["blog", id],
    queryFn: () => blogsApi.get(id),
    enabled: !!id,
  });

  const remove = useMutation({
    mutationFn: () => blogsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blogs"] });
      toast.success("Blog deleted successfully");
      navigate("/blogs");
    },
    onError: (e) => {
      toast.error(e?.normalizedMessage || "Failed to delete blog");
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="space-y-4">
        <PageHeader title="Blog not found" />
        <Button asChild>
          <Link to="/blogs">Back to Blogs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={blog.title}
        breadcrumb={
          <Link to="/blogs" className="hover:text-foreground flex items-center">
            <ChevronLeft className="w-4 h-4" />
            Back to Blogs
          </Link>
        }
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/blogs/${id}/edit`)}
            >
              <Pencil className="w-4 h-4" /> Edit
            </Button>

            <Button variant="destructive" onClick={() => setConfirmDel(true)}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="rounded-xl overflow-hidden">
            <div className="aspect-[16/9] bg-muted">
              <img
                src={blog.thumbnail}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>

          <Card className="p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="overline">Description</span>
            </div>

            <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-line">
              {blog.shortDescription}
            </div>
          </Card>
          <Card className="p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="overline">Content</span>
            </div>

            <div className="prose-editor max-w-none whitespace-pre-line text-sm leading-relaxed">
              {stripHtml(blog.content)}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="overline">Status</span>
              <StatusBadge status={blog.status} />
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">
                  Published at
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  {formatDate(blog.publishedAt)}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Created at</div>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  {formatDate(blog.createdAt)}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Tags className="w-4 h-4 text-muted-foreground" />
              <span className="overline">Tags</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {(blog.tags || []).length > 0 ? (
                blog.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs font-mono"
                  >
                    {tag}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags added.</p>
              )}
            </div>
          </Card>

          <Card className="p-6 rounded-xl space-y-3">
            <span className="overline">SEO / URL</span>

            <div>
              <div className="text-xs text-muted-foreground">Slug</div>
              <div className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm font-mono break-all">
                {blog.slug}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Delete this blog?"
        description={`"${blog.title}" will be permanently removed.`}
        destructive
        confirmLabel="Delete"
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
