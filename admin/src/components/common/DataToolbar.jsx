import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({ value, onChange, placeholder = "Search…", testid, className }) {
  return (
    <div className={cn("relative flex-1", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        data-testid={testid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 h-10"
      />
    </div>
  );
}

export default function DataToolbar({ children, className }) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row gap-3 md:items-center p-4 rounded-xl border border-border bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}
