import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { CategoryComparison } from "@/hooks/useReportsData";

interface CategoryBreakdownTableProps {
  categories: CategoryComparison[];
}

export function CategoryBreakdownTable({ categories }: CategoryBreakdownTableProps) {
  const navigate = useNavigate();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/transactions?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No spending data for this period
              </p>
            ) : (
              categories.map((category) => {
                const budgetPercent = category.budgetAmount 
                  ? Math.min((category.currentSpend / category.budgetAmount) * 100, 100)
                  : null;
                const overBudgetAmount = category.budgetAmount && category.currentSpend > category.budgetAmount
                  ? category.currentSpend - category.budgetAmount
                  : 0;

                return (
                  <div
                    key={category.name}
                    className="group flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Color indicator */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />

                    {/* Category info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{category.name}</span>
                        
                        {/* Status indicators */}
                        {category.isOverBudget && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Over budget by {formatCurrency(overBudgetAmount)}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {category.budgetAmount && !category.isOverBudget && (
                          <Tooltip>
                            <TooltipTrigger>
                              <CheckCircle className="h-4 w-4 text-success" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Within budget
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      {/* Budget progress bar */}
                      {category.budgetAmount && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                category.isOverBudget ? "bg-destructive" : 
                                budgetPercent && budgetPercent >= 80 ? "bg-warning" : "bg-success"
                              )}
                              style={{ width: `${budgetPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {budgetPercent?.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Spending amounts */}
                    <div className="text-right space-y-1">
                      <p className="font-semibold tabular-nums">
                        {formatCurrency(category.currentSpend)}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-sm">
                        {category.percentChange !== 0 ? (
                          <>
                            {category.percentChange > 0 ? (
                              <TrendingUp className="h-3 w-3 text-destructive" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-success" />
                            )}
                            <span className={cn(
                              "tabular-nums",
                              category.percentChange > 0 ? "text-destructive" : "text-success"
                            )}>
                              {category.percentChange > 0 ? '+' : ''}
                              {category.percentChange.toFixed(0)}%
                            </span>
                          </>
                        ) : (
                          <>
                            <Minus className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">0%</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Previous period comparison */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-right text-sm text-muted-foreground w-24">
                          <p className="text-xs">Previous</p>
                          <p className="tabular-nums">{formatCurrency(category.previousSpend)}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Spending in the previous period
                      </TooltipContent>
                    </Tooltip>

                    {/* Budget indicator */}
                    {category.budgetAmount && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-right text-sm w-24">
                            <p className="text-xs text-muted-foreground">Budget</p>
                            <p className={cn(
                              "tabular-nums",
                              category.isOverBudget ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {formatCurrency(category.budgetAmount)}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {category.isOverBudget 
                            ? `Over by ${formatCurrency(overBudgetAmount)}`
                            : `${formatCurrency(category.budgetAmount - category.currentSpend)} remaining`
                          }
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Drill down button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCategoryClick(category.name)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
