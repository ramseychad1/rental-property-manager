import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pricingApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { vertical } from "@/config/vertical";
import { fmtCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import WeekdaySelect, { weekdayRule } from "@/components/forms/WeekdaySelect";
import MonthDayPicker from "@/components/forms/MonthDayPicker";
import { formatMonthDay, normalizeMD } from "@/lib/seasonRange";

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
      minNights: "",
      maxNights: "",
      checkInDay: null,
      checkOutDay: null,
      dateRanges: [{ startDate: "", endDate: "" }],
    },
  );
  const [overlapConflicts, setOverlapConflicts] = useState(null); // { conflictingSeasons: [...] }

  // Seasons repeat yearly, so compare month/day only. Day-of-year on a leap
  // year (2000) gives each "MM-DD" a stable number; a range whose end is
  // before its start wraps over New Year and is split in two.
  const dayOfYear = (md) => {
    const [m, d] = normalizeMD(md).split("-").map(Number);
    return Math.round((Date.UTC(2000, m - 1, d) - Date.UTC(2000, 0, 1)) / 86_400_000) + 1;
  };
  const spans = (start, end) => {
    const s = dayOfYear(start);
    const e = dayOfYear(end);
    return s <= e ? [[s, e]] : [[s, 366], [1, e]];
  };
  const datesOverlap = (startA, endA, startB, endB) =>
    spans(startA, endA).some(([a1, a2]) =>
      spans(startB, endB).some(([b1, b2]) => a1 <= b2 && a2 >= b1),
    );

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
    // This dialog renders inside the property form's React tree (via a portal);
    // without this its submit would also submit the property form.
    e.stopPropagation();
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
      // Blank = no season-specific limit (falls back to the property's minimum).
      minNights: form.minNights === "" || form.minNights == null ? null : Number(form.minNights),
      maxNights: form.maxNights === "" || form.maxNights == null ? null : Number(form.maxNights),
      checkInDay: form.checkInDay ?? null,
      checkOutDay: form.checkOutDay ?? null,
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
                <Label>Starts</Label>
                <MonthDayPicker
                  testid="pricing-form-start"
                  value={form.dateRanges[0].startDate}
                  onChange={(v) =>
                    setForm({ ...form, dateRanges: [{ ...form.dateRanges[0], startDate: v }] })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Ends (inclusive)</Label>
                <MonthDayPicker
                  testid="pricing-form-end"
                  value={form.dateRanges[0].endDate}
                  onChange={(v) =>
                    setForm({ ...form, dateRanges: [{ ...form.dateRanges[0], endDate: v }] })
                  }
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                Repeats every year. To cover New Year, set the end before the start
                (e.g. Dec 15 to Jan 5).
              </p>
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
                  min={1}
                  placeholder="Property default"
                  value={form.minNights ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, minNights: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max nights</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="No limit"
                  value={form.maxNights ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, maxNights: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Check-in day</Label>
                <WeekdaySelect
                  testid="pricing-form-checkin-day"
                  value={form.checkInDay}
                  onChange={(v) => setForm({ ...form, checkInDay: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out day</Label>
                <WeekdaySelect
                  testid="pricing-form-checkout-day"
                  value={form.checkOutDay}
                  onChange={(v) => setForm({ ...form, checkOutDay: v })}
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                Optional. Choose Saturday for both to require Saturday-to-Saturday
                stays. Applies to stays that start in this {vertical.copy.pricingRule.toLowerCase()}.
              </p>
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
                          `${formatMonthDay(r.startDate)} → ${formatMonthDay(r.endDate)}`,
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

// A property's seasonal pricing: yearly windows that override the base rate.
// Every change here saves straight away (each season is its own record), apart
// from the property form's Save. `readOnly` shows the list with a link to edit.
export default function SeasonalPricing({ propertyId, readOnly = false, editHref }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [pendingDel, setPendingDel] = useState(null);

  const seasons = useQuery({
    queryKey: queryKeys.pricing(propertyId),
    queryFn: () => pricingApi.list(propertyId),
    enabled: !!propertyId,
  });
  const rows = seasons.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Per-night pricing windows that override the base rate.
          {!readOnly && " Changes here are saved as you go."}
        </p>
        {readOnly ? (
          editHref && (
            <Button asChild size="sm" variant="outline" data-testid="pricing-edit-link">
              <Link to={editHref}>
                <Pencil className="w-4 h-4" /> Edit {vertical.copy.pricingRules.toLowerCase()}
              </Link>
            </Button>
          )
        ) : (
          <Button
            data-testid="pricing-add-btn"
            type="button"
            size="sm"
            onClick={() => {
              setEditingRule(null);
              setDialog(true);
            }}
          >
            <Plus className="w-4 h-4" /> Add {vertical.copy.pricingRule}
          </Button>
        )}
      </div>

      <Card className="rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="overline">Name</TableHead>
              <TableHead className="overline">Window</TableHead>
              <TableHead className="overline">Price</TableHead>
              <TableHead className="overline">Nights</TableHead>
              {!readOnly && <TableHead className="overline text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s._id} data-testid={`pricing-row-${s._id}`}>
                <TableCell className="font-semibold">{s.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {s.dateRanges?.map((range, i) => (
                    <div key={i} className="mt-2">
                      {formatMonthDay(range.startDate)} → {formatMonthDay(range.endDate)}
                      <span className="text-muted-foreground/70"> · every year</span>
                    </div>
                  ))}
                </TableCell>
                <TableCell className="font-mono font-semibold">{fmtCurrency(s.pricePerNight)}</TableCell>
                <TableCell className="font-mono text-xs">
                  {s.minNights ?? "default"} – {s.maxNights ?? "no limit"}
                  {weekdayRule(s) && <div className="text-muted-foreground mt-1">{weekdayRule(s)}</div>}
                </TableCell>
                {!readOnly && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        data-testid={`pricing-edit-${s._id}`}
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingRule(s);
                          setDialog(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        data-testid={`pricing-delete-${s._id}`}
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setPendingDel(s)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={readOnly ? 4 : 5} className="py-12 text-center text-sm text-muted-foreground">
                  No {vertical.copy.pricingRules.toLowerCase()} configured.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {dialog && (
        <PricingDialog
          key={editingRule?._id || "new"}
          open={dialog}
          onOpenChange={setDialog}
          propertyId={propertyId}
          initial={editingRule}
          existingSeasons={rows}
          onSaved={() => qc.invalidateQueries({ queryKey: queryKeys.pricing(propertyId) })}
        />
      )}

      <ConfirmDialog
        open={!!pendingDel}
        onOpenChange={(v) => !v && setPendingDel(null)}
        title={`Delete ${vertical.copy.pricingRule.toLowerCase()}?`}
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (pendingDel) {
            await pricingApi.remove(pendingDel._id, propertyId);
            qc.invalidateQueries({ queryKey: queryKeys.pricing(propertyId) });
            toast.success(`${vertical.copy.pricingRule} deleted`);
            setPendingDel(null);
          }
        }}
      />
    </div>
  );
}
