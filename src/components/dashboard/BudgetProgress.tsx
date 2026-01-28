import { cn } from "@/lib/utils";

interface BudgetProgressProps {
  category: string;
  spent: number;
  budget: number;
  color?: string;
}

export function BudgetProgress({
  category,
  spent,
  budget,
  color = "accent",
}: BudgetProgressProps) {
  const percentage = Math.min((spent / budget) * 100, 100);
  const isWarning = percentage >= 80 && percentage < 100;
  const isDanger = percentage >= 100;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{category}</span>
        <span className="text-muted-foreground tabular-nums">
          {formatCurrency(spent)} / {formatCurrency(budget)}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className={cn(
            "progress-bar-fill",
            isWarning && "budget-warning",
            isDanger && "budget-danger"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isDanger && (
        <p className="text-xs text-destructive font-medium">
          Over budget by {formatCurrency(spent - budget)}
        </p>
      )}
      {isWarning && !isDanger && (
        <p className="text-xs text-warning font-medium">
          {formatCurrency(budget - spent)} remaining
        </p>
      )}
    </div>
  );
}
