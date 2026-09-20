import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Sat → Sat" / "Check-in Sat" / "Check-out Sat" for a season, or "" if unrestricted. */
export function weekdayRule({ checkInDay, checkOutDay }) {
  const short = (d) => DAYS[d].slice(0, 3);
  if (checkInDay != null && checkOutDay != null) return `${short(checkInDay)} → ${short(checkOutDay)}`;
  if (checkInDay != null) return `Check-in ${short(checkInDay)}`;
  if (checkOutDay != null) return `Check-out ${short(checkOutDay)}`;
  return "";
}

/** Optional weekday picker. value/onChange use 0 (Sunday) - 6 (Saturday), or null for any day. */
export default function WeekdaySelect({ value, onChange, testid }) {
  return (
    <Select
      value={value == null ? "any" : String(value)}
      onValueChange={(v) => onChange(v === "any" ? null : Number(v))}
    >
      <SelectTrigger data-testid={testid}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="any">Any day</SelectItem>
        {DAYS.map((name, i) => <SelectItem key={name} value={String(i)}>{name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
