import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Check, Save, X } from "lucide-react";
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
import { itemsApi } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { vertical } from "@/config/vertical";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const schema = z
  .object({
    title: z.string().min(2, "Title required"),
    description: z.string().min(10, "At least 10 characters"),
    location: z.object({
      url: z.string().url('Must be a valid URL'),
      country: z.string().min(1, "Country required"),
      city: z.string().min(1, "City required"),
      address: z.string().min(3, "Address required"),
      zipCode: z.string().optional(),
    }),
    price: z.object({
      nightly: z.coerce.number().min(1, "Must be > 0"),
      currency: z.string().min(1).default("USD"),
      cleaningFee: z.coerce.number().min(0).default(0),
      serviceFee: z.coerce.number().min(0).default(0),
    }),
    minNights: z.coerce.number().int().min(1),
    maxNights: z.coerce.number().int().min(1),
    guests: z.coerce.number().int().min(1),
    bedrooms: z.coerce.number().int().min(0),
    bathrooms: z.coerce.number().int().min(0),
    status: z.enum(["active", "inactive"]),
  })
  .refine((d) => d.maxNights >= d.minNights, {
    message: "Max nights must be ≥ min nights",
    path: ["maxNights"],
  });

const COUNTRIES = [
  "United States", "France", "Italy", "Spain", "Greece",
  "Japan", "Mexico", "Indonesia", "Portugal", "United Kingdom",
];

export default function ItemFormPage({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: existing, isLoading } = useQuery({
    queryKey: queryKeys.item(id),
    queryFn: () => itemsApi.get(id),
    enabled: !!id,
  });

  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [galleryUrls, setGalleryUrls] = useState([]);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [amenities, setAmenities] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    // ✅ FIX 2: defaultValues bhi nested hone chahiye
    defaultValues: {
      title: "",
      description: "",
      location: {
        country: "United States",
        city: "",
        address: "",
        zipCode: "",
      },
      price: {
        nightly: 200,
        currency: "USD",
      },
      minNights: 1,
      maxNights: 100,
      guests: 4,
      bedrooms: 2,
      bathrooms: 1,
      status: "active",
    },
  });

  // ✅ FIX 3: reset bhi nested structure ke saath
  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        description: existing.description,
        location: {
          country: existing.location?.country || "United States",
          url: existing.location?.url || "",
          city: existing.location?.city || "",
          address: existing.location?.address || "",
          zipCode: existing.location?.zipCode || "",
        },
        price: {
          nightly: existing.price?.nightly || 0,
          cleaningFee: existing.price?.cleaningFee || 0,
          serviceFee: existing.price?.serviceFee || 0,
          currency: existing.price?.currency || "USD",
        },
        minNights: existing.minNights,
        maxNights: existing.maxNights,
        guests: existing.guests,
        bedrooms: existing.bedrooms,
        bathrooms: existing.bathrooms,
        status: existing.status,
      });
      setThumbnailUrl(existing.images?.thumbnail || "");
      setGalleryUrls(existing.images?.gallery || []);
      setAmenities(existing.amenities || []);
    }
  }, [existing, reset]);

  const create = useMutation({
    mutationFn: (fd) => itemsApi.create(fd),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["items"] });
      toast.success(`${vertical.item.singular} created`);
      navigate(`/${vertical.item.slug}/${created._id}`);
    },
    onError: (e) => toast.error(e?.normalizedMessage || "Failed to save"),
  });

  const update = useMutation({
    mutationFn: ({ id, fd }) => itemsApi.update(id, fd),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: queryKeys.item(id) });
      toast.success(`${vertical.item.singular} updated`);
      navigate(`/${vertical.item.slug}/${saved._id || id}`);
    },
    onError: (e) => toast.error(e?.normalizedMessage || "Failed to save"),
  });

  // ✅ FIX 4: FormData mein nested objects ko properly serialize karo
  // Backend ko location[city], location[country] format milega
  // Ya agar backend JSON accept karta hai toh JSON.stringify use karo
  const onSubmit = (values) => {
 
    const fd = new FormData();

    // Flat fields
    fd.append("title", values.title);
    fd.append("description", values.description);
    fd.append("minNights", String(values.minNights));
    fd.append("maxNights", String(values.maxNights));
    fd.append("guests", String(values.guests));
    fd.append("bedrooms", String(values.bedrooms));
    fd.append("bathrooms", String(values.bathrooms));
    fd.append("status", values.status);

    // ✅ Nested location object — bracket notation se backend ko object milega
    fd.append("location[url]", values.location.url);
    fd.append("location[country]", values.location.country);
    fd.append("location[city]", values.location.city);
    fd.append("location[address]", values.location.address);
    if (values.location.zipCode) {
      fd.append("location[zipCode]", values.location.zipCode);
    }

    // ✅ Nested price object
    fd.append("price[nightly]", String(values.price.nightly));
    fd.append("price[currency]", values.price.currency);
    fd.append("price[cleaningFee]", String(values.price.cleaningFee));
    fd.append("price[serviceFee]", String(values.price.serviceFee));

    // Amenities
    amenities.forEach((a) => fd.append("amenities", a));

    // Files
    if (thumbnailFile) fd.append("thumbnail", thumbnailFile);
    galleryFiles.forEach((f) => fd.append("gallery", f));

    if (mode === "edit") {
      const keepUrls = galleryUrls.filter((u) => !u.startsWith("data:"));
      fd.append("existingGallery", JSON.stringify(keepUrls));
      update.mutate({ id, fd });
    } else {
      create.mutate(fd);
    }
  };

  const toggleAmenity = (a) =>
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );

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
        title={
          mode === "edit"
            ? `Edit ${vertical.item.singular}`
            : `New ${vertical.item.singular}`
        }
        subtitle="Capture the essentials — you can refine later."
        breadcrumb={
          <Link to={`/${vertical.item.slug}`} className="hover:text-foreground">
            ← Back to {vertical.item.plural}
          </Link>
        }
        actions={
          <Button variant="outline" asChild>
            <Link to={`/${vertical.item.slug}/${id}`}>
              <ArrowLeft className="w-4 h-4" /> Cancel
            </Link>
          </Button>
        }
      />

      <form
        data-testid="item-form"
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Core details */}
          <Card className="p-6 rounded-xl space-y-5">
            <div>
              <span className="overline">Basics</span>
              <h3 className="font-display text-lg font-semibold">Core details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="title">{vertical.item.singular} title</Label>
                <Input id="title" data-testid="form-title" {...register("title")} />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="form-description"
                  rows={4}
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                {/* ✅ FIX 5: register path nested */}
                <Input data-testid="form-currency" {...register("price.currency")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price per night</Label>
                <Input
                  id="price"
                  data-testid="form-price"
                  type="number"
                  {...register("price.nightly")}
                />
                {/* ✅ FIX 6: errors nested access */}
                {errors.price?.nightly && (
                  <p className="text-xs text-destructive">{errors.price.nightly.message}</p>
                )}
              </div>

              {/* cleaning fee */}
              <div className="space-y-2">
                <Label htmlFor="price">Cleaning fee</Label>
                <Input
                  id="price"
                  data-testid="form-price"
                  type="number"
                  {...register("price.cleaningFee")}
                />
                {/* ✅ FIX 6: errors nested access */}
                {errors.price?.cleaningFee && (
                  <p className="text-xs text-destructive">{errors.price.cleaningFee.message}</p>
                )}
              </div>

              {/* service fee */}
              <div className="space-y-2">
                <Label htmlFor="price">Service fee</Label>
                <Input
                  id="price"
                  data-testid="form-price"
                  type="number"
                  {...register("price.serviceFee")}
                />
                {/* ✅ FIX 6: errors nested access */}
                {errors.price?.serviceFee && (
                  <p className="text-xs text-destructive">{errors.price.serviceFee.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Min nights</Label>
                <Input
                  data-testid="form-min-nights"
                  type="number"
                  {...register("minNights")}
                />
                {errors.minNights && (
                  <p className="text-xs text-destructive">{errors.minNights.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Max nights</Label>
                <Input
                  data-testid="form-max-nights"
                  type="number"
                  {...register("maxNights")}
                />
                {errors.maxNights && (
                  <p className="text-xs text-destructive">{errors.maxNights.message}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Location */}
          <Card className="p-6 rounded-xl space-y-5">
            <div>
              <span className="overline">Location</span>
              <h3 className="font-display text-lg font-semibold">Where is it?</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={watch("location.country")}
                  onValueChange={(v) => setValue("location.country", v, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="form-country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.location?.country && (
                  <p className="text-xs text-destructive">{errors.location.country.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>City</Label>
                <Input data-testid="form-city" {...register("location.city")} />
                {errors.location?.city && (
                  <p className="text-xs text-destructive">{errors.location.city.message}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Url</Label>
                <Input data-testid="form-url" {...register("location.url")} />
                {errors.location?.url && (
                  <p className="text-xs text-destructive">{errors.location.url.message}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Address</Label>
                <Input data-testid="form-address" {...register("location.address")} />
                {errors.location?.address && (
                  <p className="text-xs text-destructive">{errors.location.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Zip code</Label>
                <Input data-testid="form-zip" {...register("location.zipCode")} />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="form-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vertical.item.statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Capacity */}
          <Card className="p-6 rounded-xl space-y-5">
            <div>
              <span className="overline">Capacity</span>
              <h3 className="font-display text-lg font-semibold">Rooms & capacity</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{vertical.item.capacityIcons.guests.label}</Label>
                <Input data-testid="form-guests" type="number" {...register("guests")} />
                {errors.guests && (
                  <p className="text-xs text-destructive">{errors.guests.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{vertical.item.capacityIcons.bedrooms.label}</Label>
                <Input data-testid="form-bedrooms" type="number" {...register("bedrooms")} />
                {errors.bedrooms && (
                  <p className="text-xs text-destructive">{errors.bedrooms.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{vertical.item.capacityIcons.bathrooms.label}</Label>
                <Input data-testid="form-bathrooms" type="number" {...register("bathrooms")} />
                {errors.bathrooms && (
                  <p className="text-xs text-destructive">{errors.bathrooms.message}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Amenities */}
          <Card className="p-6 rounded-xl space-y-4">
            <div>
              <span className="overline">Amenities</span>
              <h3 className="font-display text-lg font-semibold">
                Included with this {vertical.item.singular.toLowerCase()}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {amenities.length}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {vertical.amenities.map((a) => {
                const on = amenities.includes(a);
                return (
                  <button
                    type="button"
                    key={a}
                    data-testid={`amenity-${a.replace(/\s+/g, "-").toLowerCase()}`}
                    onClick={() => toggleAmenity(a)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                      on
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background hover:bg-accent border-border"
                    )}
                  >
                    {on && <Check className="w-3 h-3" />} {a}
                  </button>
                );
              })}
            </div>

            {/* Amenities saved on this record that aren't in the standard
                catalog above (e.g. imported/legacy data) - shown separately
                so they're visible and removable instead of being silently
                re-saved on every edit with no way to uncheck them. */}
            {amenities.filter((a) => !vertical.amenities.includes(a)).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Other amenities on this record (not in the standard list):
                </p>
                <div className="flex flex-wrap gap-2">
                  {amenities
                    .filter((a) => !vertical.amenities.includes(a))
                    .map((a) => (
                      <button
                        type="button"
                        key={a}
                        data-testid={`amenity-custom-${a.replace(/\s+/g, "-").toLowerCase()}`}
                        onClick={() => toggleAmenity(a)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all bg-foreground text-background border-foreground"
                      >
                        {a} <X className="w-3 h-3" />
                      </button>
                    ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">
          <Card className="p-6 rounded-xl space-y-3">
            <div>
              <span className="overline">Media</span>
              <h3 className="font-display text-lg font-semibold">Thumbnail</h3>
            </div>
            <ImageDropzone
              testid="form-thumbnail-upload"
              value={thumbnailUrl}
              onChange={setThumbnailUrl}
              onFilesChange={setThumbnailFile}
              hint="Hero image for this listing"
            />
          </Card>

          <Card className="p-6 rounded-xl space-y-3">
            <div>
              <span className="overline">Gallery</span>
              <h3 className="font-display text-lg font-semibold">Additional images</h3>
            </div>
            <ImageDropzone
              testid="form-gallery-upload"
              multiple
              value={galleryUrls}
              onChange={setGalleryUrls}
              files={galleryFiles}
              onFilesChange={setGalleryFiles}
              hint="Up to 10 images"
            />
          </Card>

          <Card className="p-6 rounded-xl space-y-2">
            <Button
              type="submit"
              data-testid="form-submit"
              disabled={submitting}
              className="w-full h-11"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {mode === "edit"
                    ? "Save changes"
                    : `Create ${vertical.item.singular.toLowerCase()}`}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              onClick={() => navigate(`/${vertical.item.slug}`)}
            >
              Cancel
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}