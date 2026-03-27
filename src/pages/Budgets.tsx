import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgets } from "@/hooks/useBudgets";
import { BudgetSummaryCards } from "@/components/budgets/BudgetSummaryCards";
import { BudgetProgressCard } from "@/components/budgets/BudgetProgressCard";
import { BudgetInsightsPanel } from "@/components/budgets/BudgetInsightsPanel";
import { AddBudgetDialog } from "@/components/budgets/AddBudgetDialog";
import { DateRangeFilter, type DatePreset } from "@/components/shared/DateRangeFilter";
import { startOfMonth, endOfMonth } from "date-fns";
import { useRequireAuth } from "@/hooks/useAuth";

export default function Budgets() {
  useRequireAuth();
  const now = new Date();
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: startOfMonth(now),
    end: endOfMonth(now),
  });
  const [preset, setPreset] = useState<DatePreset>("this-month");

  const {
    budgets,
    summary,
    insights,
    isLoading,
    createBudget,
    updateBudget,
    deleteBudget,
  } = useBudgets(dateRange);

  const existingCategoryIds = budgets.map(b => b.category_id);

  return (
    <AppLayout>
      <PageHeader
        title="Budgets"
        description="Track your spending against monthly limits"
        action={
          <AddBudgetDialog
            existingCategoryIds={existingCategoryIds}
            onAdd={createBudget}
          />
        }
      />

      {/* Date Filter */}
      <div className="mb-6">
        <DateRangeFilter
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          preset={preset}
          onPresetChange={setPreset}
        />
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mb-8">
          <BudgetSummaryCards summary={summary} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Monthly Budgets</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border/50">
                      <Skeleton className="h-5 w-32 mb-3" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  ))}
                </div>
              ) : budgets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium">No budgets yet</p>
                  <p className="text-sm mt-1">Create your first budget to start tracking spending</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {budgets.map((budget) => (
                    <BudgetProgressCard
                      key={budget.id}
                      budget={budget}
                      onUpdate={updateBudget}
                      onDelete={deleteBudget}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Insights Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32 mb-4" />
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : insights.length > 0 ? (
                <BudgetInsightsPanel insights={insights} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Add budgets to see insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
