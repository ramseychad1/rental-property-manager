"use client";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { US_STATES } from "@/lib/usContact";

// Mobile phone + US mailing address. `value` is {phone, street, city, state, zip};
// `onChange` receives the updated object. US-only by design.
export default function UsContactFields({ value, onChange, inputClassName = "", idPrefix = "contact" }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v });
  const text = (k) => (e) => set(k)(e.target.value);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`}>Mobile Phone</Label>
        <div className="border rounded-2xl px-4 py-3 bg-white">
          <PhoneInput
            id={`${idPrefix}-phone`}
            country="US"
            countries={["US"]}
            international={false}
            withCountryCallingCode={false}
            addInternationalOption={false}
            value={value.phone || undefined}
            onChange={(v) => set("phone")(v || "")}
            placeholder="(555) 555-5555"
            data-testid={`${idPrefix}-phone`}
          />
        </div>
      </div>

      <div className="md:col-span-2 space-y-2">
        <Label htmlFor={`${idPrefix}-street`}>Street Address</Label>
        <Input
          id={`${idPrefix}-street`}
          value={value.street}
          onChange={text("street")}
          autoComplete="street-address"
          className={inputClassName}
          data-testid={`${idPrefix}-street`}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-city`}>City</Label>
        <Input
          id={`${idPrefix}-city`}
          value={value.city}
          onChange={text("city")}
          autoComplete="address-level2"
          className={inputClassName}
          data-testid={`${idPrefix}-city`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-state`}>State</Label>
          <select
            id={`${idPrefix}-state`}
            value={value.state}
            onChange={text("state")}
            autoComplete="address-level1"
            className={`flex w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm h-9 ${inputClassName}`}
            data-testid={`${idPrefix}-state`}
          >
            <option value="">Select</option>
            {US_STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-zip`}>ZIP Code</Label>
          <Input
            id={`${idPrefix}-zip`}
            value={value.zip}
            onChange={text("zip")}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={10}
            className={inputClassName}
            data-testid={`${idPrefix}-zip`}
          />
        </div>
      </div>
    </>
  );
}
