import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Save,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/common/PageHeader";
import ImageDropzone from "@/components/forms/ImageDropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { blogsApi } from "@/lib/api";

const schema = z.object({
  title: z.string().min(3, "Title required"),
  slug: z.string().min(3, "Slug required"),
  shortDescription: z.string().min(10, "Short description required"),
  content: z.string().min(50, "Content must be at least 50 characters"),
  tags: z.string().optional(),
  status: z.enum(["draft", "published"]),
});

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editorProps: {
      attributes: {
        class: "min-h-[320px] p-4 outline-none prose-editor",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [editor, value]);

  if (!editor) return null;

  const btn = (active) =>
    `h-9 px-3 rounded-md border text-sm transition ${
      active ? "bg-foreground text-background" : "bg-background hover:bg-accent"
    }`;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      <div className="flex flex-wrap gap-2 border-b border-border p-2 bg-muted/40">
        <button
          type="button"
          className={btn(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          className={btn(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          className={btn(editor.isActive("heading", { level: 1 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          H1
        </button>

        <button
          type="button"
          className={btn(editor.isActive("heading", { level: 2 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </button>

        <button
          type="button"
          className={btn(editor.isActive("heading", { level: 3 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </button>

        <button
          type="button"
          className={btn(editor.isActive("heading", { level: 4 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 4 }).run()
          }
        >
          H4
        </button>

        <button
          type="button"
          className={btn(editor.isActive("heading", { level: 5 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 5 }).run()
          }
        >
          H5
        </button>

        <button
          type="button"
          className={btn(editor.isActive("heading", { level: 6 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 6 }).run()
          }
        >
          H6
        </button>

        <button
          type="button"
          className={btn(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          className={btn(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

export default function BlogFormPage({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [statusKey, setStatusKey] = useState('init');

  const { data: existing, isLoading } = useQuery({
    queryKey: ["blog", id],
    queryFn: () => blogsApi.get(id),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      slug: "",
      shortDescription: "",
      content: "",
      tags: "",
      status: "draft",
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title || "",
        slug: existing.slug || "",
        shortDescription: existing.shortDescription || "",
        content: existing.content || "",
        tags: (existing.tags || []).join(", "),
        status: existing.status || "draft",
      });

      setStatusKey(existing?._id)
      setThumbnailUrl(existing.thumbnail || "");
    }
  }, [existing, reset]);

  const create = useMutation({
    mutationFn: (fd) => blogsApi.create(fd),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["blogs"] });
      toast.success("Blog created successfully");
      navigate(`/blogs/${created._id}`);
    },
    onError: (e) =>
      toast.error(e?.normalizedMessage || "Failed to create blog"),
  });

  const update = useMutation({
    mutationFn: ({ id, fd }) => blogsApi.update(id, fd),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["blogs"] });
      qc.invalidateQueries({ queryKey: ["blog", id] });
      toast.success("Blog updated successfully");
      navigate(`/blogs/${saved._id || id}`);
    },
    onError: (e) =>
      toast.error(e?.normalizedMessage || "Failed to update blog"),
  });

  const title = watch("title");

  const isPublishedBlog = mode === "edit" && existing?.status === "published";

  useEffect(() => {
    if (title) {
      setValue("slug", slugify(title), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [title, setValue]);

  const onSubmit = (values) => {
    const fd = new FormData();

    fd.append("title", values.title);
    fd.append("slug", values.slug);
    fd.append("shortDescription", values.shortDescription);
    fd.append("content", values.content);
    fd.append("status", isPublishedBlog ? existing.status : values.status);

    if (values.tags) {
      fd.append("tags", values.tags);
    }

    if (thumbnailFile) {
      fd.append("thumbnail", thumbnailFile);
    }

    if (mode === "edit") {
      update.mutate({ id, fd });
    } else {
      create.mutate(fd);
    }
  };

  const submitting = create.isPending || update.isPending;

  if (isLoading) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "edit" ? "Edit Blog" : "New Blog"}
        subtitle="Create and manage website blog content."
        breadcrumb={
          <Link to="/blogs" className="hover:text-foreground flex items-center">
            <ChevronLeft className="w-4 h-4" />
            Back to Blogs
          </Link>
        }
        actions={
          <Button variant="outline" asChild>
            <Link to={mode === "edit" ? `/blogs/${id}` : "/blogs"}>
              <ArrowLeft className="w-4 h-4" /> Cancel
            </Link>
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6 rounded-xl space-y-5">
            <div>
              <span className="overline">Basics</span>
              <h3 className="font-display text-lg font-semibold">
                Blog details
              </h3>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...register("title")} />
              {errors.title && (
                <p className="text-xs text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input {...register("slug")} />
              {errors.slug && (
                <p className="text-xs text-destructive">
                  {errors.slug.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Short Description</Label>
              <Textarea rows={3} {...register("shortDescription")} />
              {errors.shortDescription && (
                <p className="text-xs text-destructive">
                  {errors.shortDescription.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                placeholder="miami, travel, vacation"
                {...register("tags")}
              />
              <p className="text-xs text-muted-foreground">
                Tags are comma separated.
              </p>
            </div>
          </Card>

          <Card className="p-6 rounded-xl space-y-5">
            <div>
              <span className="overline">Content</span>
              <h3 className="font-display text-lg font-semibold">
                Blog content
              </h3>
            </div>

            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <RichTextEditor value={field.value} onChange={field.onChange} />
              )}
            />

            {errors.content && (
              <p className="text-xs text-destructive">
                {errors.content.message}
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-6 rounded-xl space-y-3">
            <div>
              <span className="overline">Media</span>
              <h3 className="font-display text-lg font-semibold">Thumbnail</h3>
            </div>

            <ImageDropzone
              value={thumbnailUrl}
              onChange={setThumbnailUrl}
              onFilesChange={setThumbnailFile}
              hint="Main blog image"
            />
          </Card>

          {!isPublishedBlog && (
            <Card className="p-6 rounded-xl space-y-3">
              <div>
                <span className="overline">Publish</span>
                <h3 className="font-display text-lg font-semibold">Status</h3>
              </div>

              <Select
                key={statusKey}
                value={watch("status")}
                disabled={isPublishedBlog}
                onValueChange={(v) =>
                  setValue("status", v, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          )}

          <Card className="p-6 rounded-xl space-y-2">
            <Button type="submit" disabled={submitting} className="w-full h-11">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {mode === "edit" ? "Save changes" : "Create Blog"}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              onClick={() => navigate("/blogs")}
            >
              Cancel
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
