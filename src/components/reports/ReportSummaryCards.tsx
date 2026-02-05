import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, DollarSign, ArrowUpDown, PiggyBank, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportSummaryCardsProps {
  totalSpending: number;
  totalIncome: number;
  netCashFlow: number;
  spendingChange: number;
  incomeChange: number;
  monthCount: number;
  topGrowthCategory?: { name: string; percentChange: number };
}

export function ReportSummaryCards({
  totalSpending,
  totalIncome,
  netCashFlow,
  spendingChange,
  incomeChange,
  monthCount,
  topGrowthCategory
}: ReportSummaryCardsProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);

  const avgMonthlySpend = monthCount > 0 ? totalSpending / monthCount : 0;

  const cards = [
    {
      title: "Total Spending",
      value: formatCurrency(totalSpending),
      change: spendingChange,
      changeLabel: "vs previous period",
      icon: Wallet,
      tooltip: "Sum of all expense transactions (excluding transfers) in the selected period",
      inverseChange: true // For spending, decrease is good
    },
    {
      title: "Total Income",
      value: formatCurrency(totalIncome),
      change: incomeChange,
      changeLabel: "vs previous period",
      icon: DollarSign,
      tooltip: "Sum of all income transactions (excluding transfers) in the selected period",
      inverseChange: false
    },
    {
      title: "Net Cash Flow",
      value: formatCurrency(netCashFlow),
      change: null,
      changeLabel: netCashFlow >= 0 ? "Surplus" : "Deficit",
      icon: ArrowUpDown,
      tooltip: "Income minus expenses. Positive means you saved money.",
      valueColor: netCashFlow >= 0 ? "text-success" : "text-destructive"
    },
    {
      title: "Avg Monthly Spend",
      value: formatCurrency(avgMonthlySpend),
      change: null,
      changeLabel: `Over ${monthCount} month${monthCount !== 1 ? 's' : ''}`,
      icon: PiggyBank,
      tooltip: "Average spending per month in the selected period"
    }
  ];

  const TrendIcon = ({ change, inverse }: { change: number; inverse?: boolean }) => {
    if (Math.abs(change) < 1) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    const isPositive = change > 0;
    const isGood = inverse ? !isPositive : isPositive;
    
    if (isPositive) {
      return <TrendingUp className={cn("h-4 w-4", isGood ? "text-success" : "text-destructive")} />;
    }
    return <TrendingDown className={cn("h-4 w-4", isGood ? "text-success" : "text-destructive")} />;
  };

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Tooltip key={card.title}>
            <TooltipTrigger asChild>
              <Card className="hover:shadow-md transition-shadow cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </p>
                      <p className={cn("text-2xl font-bold", card.valueColor)}>
                        {card.value}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        {card.change !== null ? (
                          <>
                            <TrendIcon change={card.change} inverse={card.inverseChange} />
                            <span className={cn(
                              Math.abs(card.change) < 1 ? "text-muted-foreground" :
                              (card.inverseChange ? card.change < 0 : card.change > 0) 
                                ? "text-success" 
                                : "text-destructive"
                            )}>
                              {card.change > 0 ? "+" : ""}{card.change.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground">{card.changeLabel}</span>
                          </>
                        ) : (
                          <span className={cn(
                            "text-muted-foreground",
                            card.changeLabel === "Surplus" && "text-success",
                            card.changeLabel === "Deficit" && "text-destructive"
                          )}>
                            {card.changeLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-full bg-muted p-3">
                      <card.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>{card.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {topGrowthCategory && Math.abs(topGrowthCategory.percentChange) > 10 && (
          <Card className="md:col-span-2 lg:col-span-4 bg-accent/30 border-accent">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                {topGrowthCategory.percentChange > 0 ? (
                  <TrendingUp className="h-5 w-5 text-warning" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-success" />
                )}
                <p className="text-sm">
                  <span className="font-medium">{topGrowthCategory.name}</span>
                  {" "}had the highest spending change at{" "}
                  <span className={cn(
                    "font-semibold",
                    topGrowthCategory.percentChange > 0 ? "text-warning" : "text-success"
                  )}>
                    {topGrowthCategory.percentChange > 0 ? "+" : ""}
                    {topGrowthCategory.percentChange.toFixed(0)}%
                  </span>
                  {" "}compared to the previous period.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
