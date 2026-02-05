import { cn } from "@/lib/utils";
import { TrendingUp, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import type { BudgetInsight } from "@/hooks/useBudgets";

interface BudgetInsightsPanelProps {
  insights: BudgetInsight[];
}

export function BudgetInsightsPanel({ insights }: BudgetInsightsPanelProps) {
  if (insights.length === 0) {
    return null;
  }

  const getIcon = (type: BudgetInsight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={16} />;
      case 'success':
        return <CheckCircle size={16} />;
      case 'info':
        return <Lightbulb size={16} />;
      default:
        return <TrendingUp size={16} />;
    }
  };

  const getStyles = (type: BudgetInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'success':
        return 'bg-success/10 border-success/20 text-success';
      case 'info':
        return 'bg-info/10 border-info/20 text-info';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb size={18} className="text-accent" />
        <h3 className="font-semibold text-foreground">Smart Insights</h3>
      </div>
      
      <div className="grid gap-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border",
              getStyles(insight.type)
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(insight.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{insight.message}</p>
              {insight.action && (
                <p className="text-xs mt-1 opacity-80">
                  💡 {insight.action}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
