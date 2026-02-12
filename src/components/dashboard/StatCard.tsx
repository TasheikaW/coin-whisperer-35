import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  tooltip?: string;
  valueColor?: "default" | "positive" | "negative";
  trend?: {
    value: number;
    label: string;
  };
  iconVariant?: "green" | "red" | "blue" | "purple";
  className?: string;
}

const iconVariantStyles = {
  green: "bg-success/15 text-success",
  red: "bg-destructive/15 text-destructive",
  blue: "bg-info/15 text-info",
  purple: "bg-[hsl(262,83%,58%)]/15 text-[hsl(262,83%,58%)]",
};

export function StatCard({
  title,
  value,
  icon,
  valueColor = "default",
  trend,
  iconVariant = "blue",
  className,
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  const valueColorClass = {
    default: "text-foreground",
    positive: "text-success",
    negative: "text-destructive",
  }[valueColor];

  return (
    <div
      className={cn(
        "bg-card rounded-2xl p-6 border border-border/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-info/40 hover:shadow-[0_8px_24px_hsl(199,89%,48%,0.12)]",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div className={cn("p-2.5 rounded-[10px]", iconVariantStyles[iconVariant])}>
          {icon}
        </div>
      </div>
      <p className={cn("text-3xl lg:text-4xl font-bold tabular-nums mb-2", valueColorClass)}>
        {value}
      </p>
      {trend && (
        <div className="flex items-center gap-1.5 text-sm">
          {isPositive ? (
            <TrendingUp size={14} className="text-success" />
          ) : (
            <TrendingDown size={14} className="text-destructive" />
          )}
          <span className={cn("font-medium", isPositive ? "text-success" : "text-destructive")}>
            {isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
          <span className="text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
