import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  BedDouble,
  Bath,
  Users as UsersIcon,
  Pencil,
  Trash2,
  CalendarDays,
  Loader2,
  ChevronLeft,
  BadgeDollarSign,
  Sparkles,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { itemsApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { vertical } from "@/config/vertical";
import { fmtCurrency, fmtDate } from "@/lib/formatters";
import { toast } from "sonner";
import { getEmbedUrl } from "../../lib/formatters";
import SeasonalPricing from "@/components/forms/SeasonalPricing";

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmDel, setConfirmDel] = useState(false);
  const [active, setActive] = useState(0);

  const { data: item, isLoading } = useQuery({
    queryKey: queryKeys.item(id),
    queryFn: () => itemsApi.get(id),
  });

  const bookedDates = useQuery({
    queryKey: queryKeys.bookedDates(id),
    queryFn: () => itemsApi.bookedDates(id),
    enabled: !!id,
  });

  const remove = useMutation({
    mutationFn: () => itemsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["dashboardAnalytics"] });
      toast.success(`${vertical.item.singular} deleted`);
      navigate(`/${vertical.item.slug}`);
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!item) {
    return (
      <div className="space-y-4">
        <PageHeader title="Not found" />
        <Button asChild>
          <Link to={`/${vertical.item.slug}`}>Back</Link>
        </Button>
      </div>
    );
  }

  const gallery = [
    item.images?.thumbnail,
    ...(item.images?.gallery || []),
  ].filter(Boolean);
  const cap = vertical.item.capacityIcons;

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.title}
        subtitle={`${item.location.city}, ${item.location.country}`}
        breadcrumb={
          <Link
            to={`/${vertical.item.slug}`}
            className="hover:text-foreground flex items-center "
          >
            <span>
              <ChevronLeft className="w-4 h-4" />
            </span>{" "}
            Back to {vertical.item.plural}
          </Link>
        }
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/${vertical.item.slug}/${id}/edit`)}
            >
              <Pencil className="w-4 h-4" /> Edit
            </Button>
            <Button
              data-testid="item-detail-delete"
              variant="destructive"
              onClick={() => setConfirmDel(true)}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="rounded-xl overflow-hidden">
            <div className="aspect-[16/9] bg-muted flex items-center justify-center">
              <img
                src={gallery[active]}
                alt={item.title}
                className="w-full h-full object-contain"
              />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto scrollbar-thin">
                {gallery.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${active === i ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <img
                      src={src}
                      alt={`thumb-${i}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview" data-testid="tab-overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="pricing" data-testid="tab-pricing">
                {vertical.copy.pricingRules}
              </TabsTrigger>
              <TabsTrigger value="calendar" data-testid="tab-calendar">
                Booked dates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-5 mt-4">
              <Card className="p-6 rounded-xl">
                <span className="overline">Description</span>
                <p className="mt-2 text-sm leading-relaxed ">
                  {item.description}
                </p>
              </Card>

              <Card className="p-6 rounded-xl">
                <span className="overline">Amenities</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(item.amenities || []).map((a) => (
                    <Badge
                      key={a}
                      variant="outline"
                      className="text-xs font-medium"
                    >
                      {a}
                    </Badge>
                  ))}
                  {(item.amenities || []).length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No amenities listed.
                    </span>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="mt-4">
              <SeasonalPricing propertyId={id} readOnly editHref={`/${vertical.item.slug}/${id}/edit#seasonal-pricing`} />
            </TabsContent>
            <TabsContent value="calendar" className="mt-4">
              <Card className="p-6 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span className="overline">Booked dates</span>
                </div>
                {(bookedDates.data?.blockedRanges || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No upcoming bookings on this {vertical.item.singular.toLowerCase()}.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(bookedDates.data?.blockedRanges || []).map((d, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          <span className="font-mono">
                            {fmtDate(d.startDate)} → {fmtDate(d.endDate)}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {d.nights} night{d.nights === 1 ? "" : "s"} · {d.guestName}
                            <span className="font-mono text-xs"> ({d.bookingId})</span>
                          </span>
                        </span>
                        <StatusBadge status={d.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-5">
          <Card className="p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={item.status} />
              <Badge variant="outline" className="text-[10px] font-mono">
                {item.minNights}–{item.maxNights} nights
              </Badge>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">
                {fmtCurrency(item.price?.nightly, item.price?.currency)}
              </div>
              <div className="text-xs text-muted-foreground">per night</div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center pt-3 border-t border-border">
              <div>
                <UsersIcon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-semibold">{item.guests}</div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  {cap.guests.label}
                </div>
              </div>
              <div>
                <BedDouble className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-semibold">{item.bedrooms}</div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  {cap.bedrooms.label}
                </div>
              </div>
              <div>
                <Bath className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-semibold">{item.bathrooms}</div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  {cap.bathrooms.label}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center pt-3 border-t border-border">
              <div>
                <Sparkles className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-semibold">
                  {fmtCurrency(item.price.cleaningFee)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  Cleaning Fee
                </div>
              </div>
              <div>
                <BadgeDollarSign className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-semibold">
                  {fmtCurrency(item.price.serviceFee)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  Service Fee
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 rounded-xl space-y-3">
            <span className="overline">Location on Map</span>

            <div className="w-full h-64 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {item.location?.url ? (
                <iframe
                  className="w-full h-full"
                  loading="lazy"
                  allowFullScreen
                  src={getEmbedUrl(item.location.url)}
                />
              ) : (
                <div className="text-center text-muted-foreground space-y-2">
                  <MapPin className="mx-auto w-6 h-6" />
                  <p className="text-sm">Map location will appear here</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 rounded-xl space-y-3">
            <span className="overline">
              {vertical.copy.detailLocationLabel}
            </span>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm font-mono">
                {item.location.address}
                <br />
                {item.location.city}, {item.location.country}
                <br />
                {item.location.zipCode}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title={`Delete this ${vertical.item.singular.toLowerCase()}?`}
        description={`"${item.title}" will be permanently removed.`}
        destructive
        confirmLabel="Delete"
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
