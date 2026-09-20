import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const pad = (n) => String(n).padStart(2, "0");
// Year 2000 is a leap year, so February offers 29 days.
const daysIn = (month) => new Date(2000, month, 0).getDate();

/** Month + day picker for dates that repeat every year. value/onChange use "MM-DD". */
export default function MonthDayPicker({ value, onChange, testid }) {
  const [mm, dd] = String(value || "").slice(-5).split("-");
  const month = Number(mm) || "";
  const day = Number(dd) || "";

  const setMonth = (m) => {
    const clamped = Math.min(Number(day) || 1, daysIn(Number(m)));
    onChange(`${pad(m)}-${pad(clamped)}`);
  };
  const setDay = (d) => onChange(`${pad(month || 1)}-${pad(d)}`);

  return (
    <div className="grid grid-cols-[1fr_5rem] gap-2" data-testid={testid}>
      <Select value={month ? String(month) : ""} onValueChange={setMonth}>
        <SelectTrigger aria-label="Month"><SelectValue placeholder="Month" /></SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, i) => <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={day ? String(day) : ""} onValueChange={setDay} disabled={!month}>
        <SelectTrigger aria-label="Day"><SelectValue placeholder="Day" /></SelectTrigger>
        <SelectContent>
          {Array.from({ length: daysIn(month || 1) }, (_, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
