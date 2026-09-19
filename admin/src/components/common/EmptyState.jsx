import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 px-6 text-center",
        className,
      )}
    >
      <div className="grid place-items-center w-12 h-12 rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="font-display text-lg font-semibold">{title}</div>
        {description && <p className="text-sm text-muted-foreground max-w-md mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
