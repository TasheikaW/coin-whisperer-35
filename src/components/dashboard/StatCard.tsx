import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  className?: string;
}

export function StatCard({ title, value, icon, tooltip, valueColor = "default", trend, className }: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  const valueColorClass = {
    default: "text-foreground",
    positive: "text-success",
    negative: "text-destructive",
  }[valueColor];

  return (
    <div
      className={cn(
        "stat-card group animate-fade-in",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={14} className="text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className={cn("text-2xl lg:text-3xl font-bold tabular-nums", valueColorClass)}>
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp size={14} className="text-success" />
              ) : (
                <TrendingDown size={14} className="text-destructive" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  isPositive ? "text-success" : "text-destructive"
                )}
              >
                {isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-sm text-muted-foreground">
                {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
          {icon}
        </div>
      </div>
    </div>
  );
}
