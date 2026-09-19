import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, Loader2, Save } from "lucide-react";
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

import { thingsToDoApi } from "@/lib/api";

const CATEGORY_OPTIONS = [
  { label: "Restaurants", value: "Restaurants" },
  { label: "Deep sea Fishing", value: "Deep sea Fishing" },
  { label: "Backcountry fishing", value: "Backcountry fishing" },
  { label: "Bird watching", value: "Bird watching" },
];

const schema = z.object({
  name: z.string().min(2, "Name required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category required"),
  area: z.string().min(2, "Area required"),
  location: z.object({
    address: z.string().min(5, "Address required"),
    url: z.string().url("Must be a valid Google Maps URL"),
  }),
  status: z.enum(["active", "inactive"]),
});

export default function ThingsToDoForm({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [categoryKey, setCategoryKey] = useState("init");

  const { data: existing, isLoading } = useQuery({
    queryKey: ["things-to-do", id],
    queryFn: () => thingsToDoApi.get(id),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      area: "",
      location: {
        address: "",
        url: "",
      },
      status: "active",
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name || "",
        description: existing.description || "",
        category: existing.category || "",
        area: existing.area || "",
        location: {
          address: existing.location?.address || "",
          url: existing.location?.url || "",
        },
        status: existing.status || "active",
      });

      setCategoryKey(existing._id);
      setImageUrl(existing.image || "");
    }
  }, [existing, reset]);

  const create = useMutation({
    mutationFn: (fd) => thingsToDoApi.create(fd),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["things-to-do"] });
      toast.success("Thing to do created successfully");
      navigate(`/things-to-do/${created._id}`);
    },
    onError: (e) => {
      toast.error(e?.normalizedMessage || "Failed to create");
    },
  });

  const update = useMutation({
    mutationFn: ({ id, fd }) => thingsToDoApi.update(id, fd),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["things-to-do"] });
      qc.invalidateQueries({ queryKey: ["things-to-do", id] });
      toast.success("Thing to do updated successfully");
      navigate(`/things-to-do/${saved._id || id}`);
    },
    onError: (e) => {
      toast.error(e?.normalizedMessage || "Failed to update");
    },
  });

  const onSubmit = (values) => {
    if (mode === "create" && !imageFile) {
      toast.error("Image is required");
      return;
    }

    const fd = new FormData();

    fd.append("name", values.name);
    fd.append("description", values.description);
    fd.append("category", values.category);
    fd.append("area", values.area);
    fd.append("status", values.status);

    fd.append("location[address]", values.location.address);
    fd.append("location[url]", values.location.url);

    if (imageFile) {
      fd.append("image", imageFile);
    }

    if (mode === "edit") {
      update.mutate({ id, fd });
    } else {
      create.mutate(fd);
    }
  };

  const submitting = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "edit" ? "Edit Thing To Do" : "New Thing To Do"}
        subtitle="Create and manage local recommendations."
        breadcrumb={
          <Link
            to="/things-to-do"
            className="hover:text-foreground flex items-center"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Things To Do
          </Link>
        }
        actions={
          <Button variant="outline" asChild>
            <Link
              to={mode === "edit" ? `/things-to-do/${id}` : "/things-to-do"}
            >
              <ArrowLeft className="w-4 h-4" /> Cancel
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid place-items-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        >
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-6 rounded-xl space-y-5">
              <div>
                <span className="overline">Basics</span>
                <h3 className="font-display text-lg font-semibold">
                  Core details
                </h3>
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  {...register("name")}
                  placeholder="Miami Offshore Fishing Charter"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={5}
                  {...register("description")}
                  placeholder="Write a short description..."
                />
                {errors.description && (
                  <p className="text-xs text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    key={categoryKey}
                    value={watch("category")}
                    onValueChange={(v) =>
                      setValue("category", v, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="select category" />
                    </SelectTrigger>

                    <SelectContent>
                      {CATEGORY_OPTIONS.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {errors.category && (
                    <p className="text-xs text-destructive">
                      {errors.category.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Area</Label>
                  <Input
                    {...register("area")}
                    placeholder="Miami, Key Largo, Everglades"
                  />
                  {errors.area && (
                    <p className="text-xs text-destructive">
                      {errors.area.message}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6 rounded-xl space-y-5">
              <div>
                <span className="overline">Location</span>
                <h3 className="font-display text-lg font-semibold">
                  Address & map
                </h3>
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  {...register("location.address")}
                  placeholder="401 Biscayne Blvd, Miami, FL"
                />
                {errors.location?.address && (
                  <p className="text-xs text-destructive">
                    {errors.location.address.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Google Maps URL</Label>
                <Input
                  {...register("location.url")}
                  placeholder="https://www.google.com/maps/place/..."
                />
                {errors.location?.url && (
                  <p className="text-xs text-destructive">
                    {errors.location.url.message}
                  </p>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="p-6 rounded-xl space-y-3">
              <div>
                <span className="overline">Media</span>
                <h3 className="font-display text-lg font-semibold">Image</h3>
              </div>

              <ImageDropzone
                value={imageUrl}
                onChange={setImageUrl}
                onFilesChange={setImageFile}
                hint="Main image for this thing to do"
              />

              {mode === "create" && !imageFile && (
                <p className="text-xs text-muted-foreground">
                  Image is required for new item.
                </p>
              )}
            </Card>

            <Card className="p-6 rounded-xl space-y-3">
              <div>
                <span className="overline">Status</span>
                <h3 className="font-display text-lg font-semibold">
                  Visibility
                </h3>
              </div>

              <Select
                value={watch("status")}
                onValueChange={(v) =>
                  setValue("status", v, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-6 rounded-xl space-y-2">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {mode === "edit" ? "Save changes" : "Create Thing"}
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={() => navigate("/things-to-do")}
              >
                Cancel
              </Button>
            </Card>
          </div>
        </form>
      )}
    </div>
  );
}
