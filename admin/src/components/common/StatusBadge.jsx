import { cn } from "@/lib/utils";

const MAP = {
  pending:    { dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  accepted:   { dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  booked:     { dot: "bg-emerald-600", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  rejected:   { dot: "bg-rose-500",   chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  cancelled:  { dot: "bg-rose-500",   chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  active:     { dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  inactive:   { dot: "bg-zinc-500",   chip: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30" },
  paid:       { dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  refunded:   { dot: "bg-sky-500",    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30" },
};

export default function StatusBadge({ status, className }) {
  const cfg = MAP[status] || MAP.inactive;
  return (
    <span
      data-testid={`status-${status}`}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border",
        cfg.chip,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status}
    </span>
  );
}
