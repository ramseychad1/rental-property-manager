import { Plus, Shield, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Quick-select due-date presets. "custom" keeps whatever dueType/offset the
// term already has and just reveals the raw controls.
const PRESETS = [
  { key: "immediate", label: "Upon booking", dueType: "immediate", offset: 0 },
  { key: "6mo", label: "6 months before check-in", dueType: "months_before_checkin", offset: 6 },
  { key: "3mo", label: "3 months before check-in", dueType: "months_before_checkin", offset: 3 },
  { key: "1wk", label: "1 week before check-in", dueType: "days_before_checkin", offset: 7 },
  { key: "custom", label: "Custom" },
];

function presetKeyFor(term) {
  const match = PRESETS.find((p) => p.key !== "custom" && p.dueType === term.dueType && p.offset === term.offset);
  return match?.key || "custom";
}

function newTerm() {
  return { id: crypto.randomUUID(), label: "", percent: "", dueType: "immediate", offset: 0 };
}

export { newTerm };

function TermRow({ term, index, onChange, onRemove }) {
  const presetKey = presetKeyFor(term);

  const applyPreset = (key) => {
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset || key === "custom") {
      // Switching to Custom keeps the current values - just exposes the raw controls.
      onChange({ ...term });
      return;
    }
    onChange({ ...term, dueType: preset.dueType, offset: preset.offset });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.7fr_1.3fr_auto] gap-3 items-start rounded-lg border p-3" data-testid={`payment-term-row-${index}`}>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Label</Label>
        <Input
          value={term.label}
          onChange={(e) => onChange({ ...term, label: e.target.value })}
          placeholder={`Payment ${index + 1}`}
          data-testid={`payment-term-label-${index}`}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Percent</Label>
        <div className="relative">
          <Input
            type="number"
            min="0.01"
            max="100"
            step="0.1"
            value={term.percent}
            onChange={(e) => onChange({ ...term, percent: e.target.value })}
            data-testid={`payment-term-percent-${index}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Due</Label>
        <Select value={presetKey} onValueChange={applyPreset}>
          <SelectTrigger data-testid={`payment-term-due-${index}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {presetKey === "custom" && (
          <div className="flex items-center gap-2 pt-1">
            <Select
              value={term.dueType === "immediate" ? "days_before_checkin" : term.dueType}
              onValueChange={(v) => onChange({ ...term, dueType: v, offset: term.offset || 1 })}
            >
              <SelectTrigger className="w-36" data-testid={`payment-term-custom-type-${index}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days_before_checkin">Days before</SelectItem>
                <SelectItem value="months_before_checkin">Months before</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              className="w-20"
              value={term.offset}
              onChange={(e) => onChange({ ...term, offset: Number(e.target.value) })}
              data-testid={`payment-term-custom-offset-${index}`}
            />
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Remove payment"
        data-testid={`payment-term-remove-${index}`}
        className="mt-6"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function PaymentScheduleFields({
  terms,
  setTerms,
  depositEnabled,
  setDepositEnabled,
  depositAmount,
  setDepositAmount,
}) {
  const sum = terms.reduce((s, t) => s + (Number(t.percent) || 0), 0);
  const sumOk = terms.length === 0 || Math.abs(sum - 100) < 0.05;

  const updateTerm = (index, next) => {
    setTerms((prev) => prev.map((t, i) => (i === index ? next : t)));
  };
  const removeTerm = (index) => {
    setTerms((prev) => prev.filter((_, i) => i !== index));
  };
  const addTerm = () => {
    setTerms((prev) => [...prev, newTerm()]);
  };

  return (
    <Card className="p-6 rounded-xl space-y-5">
      <div>
        <span className="overline">Payments</span>
        <h3 className="font-display text-lg font-semibold">Payment schedule</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Split the total into a deposit and balance (or any number of payments) instead of collecting it all at
          once. Leave this empty to collect the full amount in one payment, as before. Percentages must add up to
          100%. The schedule is generated when you accept a booking request, using whatever notice the guest gave -
          any payment already past its due date is bundled into a single &quot;due now&quot; request.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <Label htmlFor="deposit-enabled">Security deposit</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              A flat amount added to the first payment due, called out separately.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {depositEnabled && (
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                className="pl-6"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                data-testid="deposit-amount"
              />
            </div>
          )}
          <Switch id="deposit-enabled" checked={depositEnabled} onCheckedChange={setDepositEnabled} data-testid="deposit-enabled" />
        </div>
      </div>

      <div className="space-y-3">
        {terms.map((term, index) => (
          <TermRow key={term.id} term={term} index={index} onChange={(t) => updateTerm(index, t)} onRemove={() => removeTerm(index)} />
        ))}

        {terms.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No schedule configured - the full amount is due in one payment.</p>
        )}

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addTerm} data-testid="payment-term-add">
            <Plus className="w-4 h-4" /> Add payment
          </Button>
          {terms.length > 0 && (
            <span
              className={cn("text-sm font-medium", sumOk ? "text-emerald-600" : "text-destructive")}
              data-testid="payment-terms-sum"
            >
              Total: {sum.toFixed(sum % 1 === 0 ? 0 : 1)}% {!sumOk && "(must equal 100%)"}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
