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
  Plus,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { itemsApi, pricingApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { vertical } from "@/config/vertical";
import { fmtCurrency, fmtDate } from "@/lib/formatters";
import { toast } from "sonner";
import { getEmbedUrl } from "../../lib/formatters";

function PricingDialog({
  open,
  onOpenChange,
  propertyId,
  initial,
  onSaved,
  existingSeasons = [],
}) {
  const [form, setForm] = useState(
    initial || {
      name: "",
      pricePerNight: 100,
      minNights: 1,
      maxNights: 14,
      dateRanges: [{ startDate: "", endDate: "" }],
    },
  );
  const [overlapConflicts, setOverlapConflicts] = useState(null); // { conflictingSeasons: [...] }

  // Check if two date ranges overlap
  const datesOverlap = (startA, endA, startB, endB) => {
    return (
      new Date(startA) <= new Date(endB) && new Date(endA) >= new Date(startB)
    );
  };

  // Find all existing seasons that overlap with the form's date range
  const findConflicts = () => {
    const { startDate, endDate } = form.dateRanges[0];
    if (!startDate || !endDate) return [];

    return existingSeasons.filter((season) => {
      // Skip the season being edited
      if (initial?._id && season._id === initial._id) return false;

      return (season.dateRanges || []).some((range) =>
        datesOverlap(startDate, endDate, range.startDate, range.endDate),
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.name ||
      !form.dateRanges[0].startDate ||
      !form.dateRanges[0].endDate
    ) {
      toast.error("Name and at least one date range are required");
      return;
    }

    // Check for overlapping seasons
    const conflicts = findConflicts();
    if (conflicts.length > 0) {
      setOverlapConflicts(conflicts);
      return; // Stop here — wait for user confirmation
    }

    await doSave();
  };

  const doSave = async () => {
    const payload = {
      ...form,
      pricePerNight: Number(form.pricePerNight),
      minNights: Number(form.minNights),
      maxNights: Number(form.maxNights),
    };
    try {
      if (initial?._id) {
        await pricingApi.update(initial._id, propertyId, payload);
        toast.success(`${vertical.copy.pricingRule} updated`);
      } else {
        await pricingApi.create(propertyId, payload);
        toast.success(`${vertical.copy.pricingRule} created`);
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err?.normalizedMessage || "Failed to save");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="pricing-dialog" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {initial
                ? `Edit ${vertical.copy.pricingRule}`
                : `Add ${vertical.copy.pricingRule}`}
            </DialogTitle>
            <DialogDescription>
              Define a date window and per-night price for this{" "}
              {vertical.item.singular.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                data-testid="pricing-form-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Summer High"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  data-testid="pricing-form-start"
                  type="date"
                  value={form.dateRanges[0].startDate?.slice(0, 10) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dateRanges: [
                        { ...form.dateRanges[0], startDate: e.target.value },
                      ],
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  data-testid="pricing-form-end"
                  type="date"
                  value={form.dateRanges[0].endDate?.slice(0, 10) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dateRanges: [
                        { ...form.dateRanges[0], endDate: e.target.value },
                      ],
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Price / night</Label>
                <Input
                  data-testid="pricing-form-price"
                  type="number"
                  value={form.pricePerNight}
                  onChange={(e) =>
                    setForm({ ...form, pricePerNight: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min nights</Label>
                <Input
                  type="number"
                  value={form.minNights}
                  onChange={(e) =>
                    setForm({ ...form, minNights: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max nights</Label>
                <Input
                  type="number"
                  value={form.maxNights}
                  onChange={(e) =>
                    setForm({ ...form, maxNights: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="pricing-form-submit">
                {initial ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Overlap Conflict Confirmation Dialog */}
      <ConfirmDialog
        open={!!overlapConflicts}
        onOpenChange={(v) => !v && setOverlapConflicts(null)}
        title="Date overlap detected"
        description={
          overlapConflicts
            ? `The selected dates overlap with the following existing ${vertical.copy.pricingRules.toLowerCase()}:\n\n${overlapConflicts
                .map(
                  (s) =>
                    `• "${s.name}" (${s.dateRanges
                      ?.map(
                        (r) =>
                          `${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}`,
                      )
                      .join(", ")})`,
                )
                .join("\n")}\n\nDo you want to proceed anyway?`
            : ""
        }
        confirmLabel="Yes, proceed"
        onConfirm={async () => {
          setOverlapConflicts(null);
          await doSave();
        }}
      />
    </>
  );
}

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmDel, setConfirmDel] = useState(false);
  const [active, setActive] = useState(0);
  const [pricingDialog, setPricingDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [pendingRuleDel, setPendingRuleDel] = useState(null);

  const { data: item, isLoading } = useQuery({
    queryKey: queryKeys.item(id),
    queryFn: () => itemsApi.get(id),
  });

  const seasons = useQuery({
    queryKey: queryKeys.pricing(id),
    queryFn: () => pricingApi.list(id),
    enabled: !!id,
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

            <TabsContent value="pricing" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Per-night pricing windows that override the base rate.
                </p>
                <Button
                  data-testid="pricing-add-btn"
                  size="sm"
                  onClick={() => {
                    setEditingRule(null);
                    setPricingDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> Add {vertical.copy.pricingRule}
                </Button>
              </div>
              <Card className="rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="overline">Name</TableHead>
                      <TableHead className="overline">Window</TableHead>
                      <TableHead className="overline">Price</TableHead>
                      <TableHead className="overline">Nights</TableHead>
                      <TableHead className="overline text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(seasons.data || []).map((s) => (
                      <TableRow
                        key={s._id}
                        data-testid={`pricing-row-${s._id}`}
                      >
                        <TableCell className="font-semibold">
                          {s.name}
                        </TableCell>
                        {/* <TableCell className="font-mono text-xs text-muted-foreground">
                          {fmtDate(s.dateRanges?.[0]?.startDate)} → {fmtDate(s.dateRanges?.[0]?.endDate)}
                        </TableCell> */}

                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {s.dateRanges?.map((range, i) => (
                            <div key={i} className="mt-2">
                              {fmtDate(range.startDate)} →{" "}
                              {fmtDate(range.endDate)}
                            </div>
                          ))}
                        </TableCell>

                        <TableCell className="font-mono font-semibold">
                          {fmtCurrency(s.pricePerNight)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.minNights}–{s.maxNights}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              data-testid={`pricing-edit-${s._id}`}
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingRule(s);
                                setPricingDialog(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              data-testid={`pricing-delete-${s._id}`}
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setPendingRuleDel(s)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(seasons.data || []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-12 text-center text-sm text-muted-foreground"
                        >
                          No {vertical.copy.pricingRules.toLowerCase()}{" "}
                          configured.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
            <TabsContent value="calendar" className="mt-4">
              <Card className="p-6 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span className="overline">Booked dates</span>
                </div>
                {(bookedDates.data?.blockedRanges || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No bookings on this {vertical.item.singular.toLowerCase()}{" "}
                    yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(bookedDates.data?.blockedRanges || []).map((d, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-mono">
                          {fmtDate(d.startDate)} → {fmtDate(d.endDate)}
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

      {pricingDialog && (
        <PricingDialog
          key={editingRule?._id || "new"}
          open={pricingDialog}
          onOpenChange={setPricingDialog}
          propertyId={id}
          initial={editingRule}
          existingSeasons={seasons.data || []}
          onSaved={() =>
            qc.invalidateQueries({ queryKey: queryKeys.pricing(id) })
          }
        />
      )}

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title={`Delete this ${vertical.item.singular.toLowerCase()}?`}
        description={`"${item.title}" will be permanently removed.`}
        destructive
        confirmLabel="Delete"
        onConfirm={() => remove.mutate()}
      />

      <ConfirmDialog
        open={!!pendingRuleDel}
        onOpenChange={(v) => !v && setPendingRuleDel(null)}
        title={`Delete ${vertical.copy.pricingRule.toLowerCase()}?`}
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (pendingRuleDel) {
            await pricingApi.remove(pendingRuleDel._id, id);
            qc.invalidateQueries({ queryKey: queryKeys.pricing(id) });
            toast.success(`${vertical.copy.pricingRule} deleted`);
            setPendingRuleDel(null);
          }
        }}
      />
    </div>
  );
}
