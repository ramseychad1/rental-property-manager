import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function KpiCard({ label, value, delta, hint, icon: Icon, accent = false, testid }) {
  const positive = typeof delta === "number" ? delta >= 0 : true;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        data-testid={testid}
        className={cn(
          "p-5 rounded-xl border transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-sm",
          accent && "bg-foreground text-background border-foreground",
        )}
      >
        <div className="flex items-start justify-between">
          <span className={cn("overline", accent && "!text-background/60")}>{label}</span>
          {Icon && (
            <span
              className={cn(
                "grid place-items-center w-9 h-9 rounded-lg",
                accent ? "bg-background/10 text-background" : "bg-secondary text-foreground",
              )}
            >
              <Icon className="w-4 h-4" />
            </span>
          )}
        </div>
        <div className="mt-4 flex items-end justify-between gap-2">
          <div className="font-display text-3xl md:text-[36px] font-bold tracking-tight leading-none">
            {value}
          </div>
          {delta !== undefined && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md",
                accent
                  ? "bg-background/10 text-background"
                  : positive
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
              )}
            >
              {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(delta)}%
            </div>
          )}
        </div>
        {hint && (
          <div className={cn("mt-3 text-[11px]", accent ? "text-background/60" : "text-muted-foreground")}>
            {hint}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
