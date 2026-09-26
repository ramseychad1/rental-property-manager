import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function newAddOn() {
  return { id: crypto.randomUUID(), label: "", price: "" };
}

export { newAddOn };

export default function AddOnsFields({ addOns, setAddOns }) {
  const updateAddOn = (index, next) => {
    setAddOns((prev) => prev.map((a, i) => (i === index ? next : a)));
  };
  const removeAddOn = (index) => {
    setAddOns((prev) => prev.filter((_, i) => i !== index));
  };
  const addAddOn = () => {
    setAddOns((prev) => [...prev, newAddOn()]);
  };

  return (
    <Card className="p-6 rounded-xl space-y-5">
      <div>
        <span className="overline">Extras</span>
        <h3 className="font-display text-lg font-semibold">Add-ons</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Optional paid extras a guest can pick when requesting a stay - a linen package, a bike rental, anything
          else. Each is a flat one-time fee and isn&apos;t taxed. Selected add-ons are folded into the total and
          split across the payment schedule like everything else.
        </p>
      </div>

      <div className="space-y-3">
        {addOns.map((addOn, index) => (
          <div
            key={addOn.id}
            className="grid grid-cols-1 md:grid-cols-[1fr_0.6fr_auto] gap-3 items-start rounded-lg border p-3"
            data-testid={`addon-row-${index}`}
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Label</Label>
              <Input
                value={addOn.label}
                onChange={(e) => updateAddOn(index, { ...addOn, label: e.target.value })}
                placeholder="e.g. Linen Package"
                data-testid={`addon-label-${index}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="pl-6"
                  value={addOn.price}
                  onChange={(e) => updateAddOn(index, { ...addOn, price: e.target.value })}
                  data-testid={`addon-price-${index}`}
                />
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeAddOn(index)}
              aria-label="Remove add-on"
              data-testid={`addon-remove-${index}`}
              className="mt-6"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {addOns.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No add-ons configured.</p>
        )}

        <Button type="button" variant="outline" size="sm" onClick={addAddOn} data-testid="addon-add">
          <Plus className="w-4 h-4" /> Add extra
        </Button>
      </div>
    </Card>
  );
}
