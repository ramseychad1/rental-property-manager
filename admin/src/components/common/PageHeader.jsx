import { cn } from "@/lib/utils";

export default function PageHeader({ title, subtitle, actions, breadcrumb, className }) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6", className)}>
      <div className="space-y-1.5">
        {breadcrumb && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 font-medium">{breadcrumb}</div>
        )}
        <h1 className="text-2xl sm:text-[28px] font-display font-bold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
