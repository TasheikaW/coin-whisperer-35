import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  type?: "info" | "warning" | "success";
}

export function InsightCard({
  icon,
  title,
  description,
  type = "info",
}: InsightCardProps) {
  const typeStyles = {
    info: "bg-info/10 border-info/20 text-info",
    warning: "bg-warning/10 border-warning/20 text-warning",
    success: "bg-success/10 border-success/20 text-success",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl border",
        typeStyles[type]
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
