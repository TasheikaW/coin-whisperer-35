import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Wallet, TrendingDown, AlertTriangle, Calendar, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BudgetSummary } from "@/hooks/useBudgets";

interface BudgetSummaryCardsProps {
  summary: BudgetSummary;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

interface SummaryCardProps {
  title: string;
  value: string;
  tooltip: string;
  icon: React.ReactNode;
  valueColor?: "default" | "positive" | "negative" | "warning";
  subtitle?: string;
}

function SummaryCard({ title, value, tooltip, icon, valueColor = "default", subtitle }: SummaryCardProps) {
  const valueColorClass = {
    default: "text-foreground",
    positive: "text-success",
    negative: "text-destructive",
    warning: "text-warning",
  }[valueColor];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
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
            </div>
            <p className={cn("text-2xl font-bold tabular-nums", valueColorClass)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="p-2.5 rounded-lg bg-muted">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BudgetSummaryCards({ summary }: BudgetSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Total Budget"
        value={formatCurrency(summary.totalBudget)}
        tooltip="Sum of all monthly budget limits you've set"
        icon={<Wallet size={20} className="text-muted-foreground" />}
      />
      <SummaryCard
        title="Total Spent"
        value={formatCurrency(summary.totalSpent)}
        tooltip="Total expenses across all budget categories this month"
        icon={<TrendingDown size={20} className="text-muted-foreground" />}
        subtitle={`${summary.percentMonthElapsed.toFixed(0)}% of month elapsed`}
      />
      <SummaryCard
        title="Net Remaining"
        value={formatCurrency(summary.netRemaining)}
        tooltip="How much you can still spend within your budgets"
        icon={<Calendar size={20} className="text-muted-foreground" />}
        valueColor={summary.netRemaining >= 0 ? "positive" : "negative"}
        subtitle={`${summary.daysRemaining} days remaining`}
      />
      {summary.overBudgetAmount > 0 ? (
        <SummaryCard
          title="Over Budget"
          value={formatCurrency(summary.overBudgetAmount)}
          tooltip="Total amount you've exceeded across all over-budget categories"
          icon={<AlertTriangle size={20} className="text-destructive" />}
          valueColor="negative"
          subtitle={`${summary.categoriesOverBudget} ${summary.categoriesOverBudget === 1 ? 'category' : 'categories'} over`}
        />
      ) : (
        <SummaryCard
          title="Categories On Track"
          value={`${summary.categoriesOverBudget === 0 ? 'All' : summary.categoriesOverBudget}`}
          tooltip="Number of categories within budget"
          icon={<AlertTriangle size={20} className="text-success" />}
          valueColor="positive"
          subtitle="No categories over budget"
        />
      )}
    </div>
  );
}
