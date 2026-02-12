import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface InsightCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  type?: "info" | "warning" | "success" | "alert";
  actionLabel?: string;
  onAction?: () => void;
}

export function InsightCard({
  icon,
  title,
  description,
  type = "info",
  actionLabel,
  onAction,
}: InsightCardProps) {
  const borderColor = {
    info: "border-l-info",
    warning: "border-l-warning",
    success: "border-l-success",
    alert: "border-l-destructive",
  }[type];

  const bgColor = {
    info: "bg-info/5",
    warning: "bg-warning/5",
    success: "bg-success/5",
    alert: "bg-destructive/5",
  }[type];

  return (
    <div
      className={cn(
        "flex gap-4 p-5 rounded-xl border border-border/50 border-l-[3px] transition-all duration-300 hover:border-info/40 hover:translate-x-1",
        borderColor,
        bgColor
      )}
    >
      <div className="flex-shrink-0 text-2xl mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground mb-1">{title}</p>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        {actionLabel && (
          <Button
            variant="outline"
            size="sm"
            className="border-info/40 text-info hover:bg-info hover:text-white transition-colors"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
