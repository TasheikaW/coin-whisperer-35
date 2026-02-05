import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useReportsData } from "@/hooks/useReportsData";
import { ReportSummaryCards } from "@/components/reports/ReportSummaryCards";
import { MonthlySpendingChart } from "@/components/reports/MonthlySpendingChart";
import { IncomeVsSpendingChart } from "@/components/reports/IncomeVsSpendingChart";
import { CategoryBreakdownTable } from "@/components/reports/CategoryBreakdownTable";
import { SmartInsightsPanel } from "@/components/reports/SmartInsightsPanel";
import { PeriodFilter } from "@/components/reports/PeriodFilter";
import { toast } from "sonner";

export default function Reports() {
  const {
    isLoading,
    periodType,
    setPeriodType,
    chartType,
    setChartType,
    customRange,
    setCustomRange,
    dateRanges,
    currentPeriodData,
    previousPeriodData,
    spendingChange,
    incomeChange,
    categoryComparisons,
    insights,
    monthlyChartData,
    chartCategories,
  } = useReportsData();

  // Find top growth category
  const topGrowthCategory = categoryComparisons.length > 0
    ? categoryComparisons.reduce((max, cat) => 
        Math.abs(cat.percentChange) > Math.abs(max.percentChange) ? cat : max
      )
    : undefined;

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      // Generate CSV
      const headers = ['Category', 'Current Spend', 'Previous Spend', 'Change %', 'Budget', 'Over Budget'];
      const rows = categoryComparisons.map(cat => [
        cat.name,
        cat.currentSpend.toFixed(2),
        cat.previousSpend.toFixed(2),
        cat.percentChange.toFixed(1) + '%',
        cat.budgetAmount?.toFixed(2) || 'N/A',
        cat.isOverBudget ? 'Yes' : 'No'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `spending-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Report exported as CSV');
    } else {
      // For PDF, we'd need a library like jspdf
      toast.info('PDF export coming soon');
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Reports"
          description="Analyze your spending patterns over time"
        />
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        description="Analyze your spending patterns and track your financial health"
      />

      {/* Period Filter & Export */}
      <div className="mb-6">
        <PeriodFilter
          periodType={periodType}
          onPeriodChange={setPeriodType}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          dateRanges={dateRanges}
          onExport={handleExport}
        />
      </div>

      {/* Summary Cards */}
      <div className="mb-8">
        <ReportSummaryCards
          totalSpending={currentPeriodData.totalSpending}
          totalIncome={currentPeriodData.totalIncome}
          netCashFlow={currentPeriodData.netCashFlow}
          spendingChange={spendingChange}
          incomeChange={incomeChange}
          monthCount={currentPeriodData.byMonth.length}
          topGrowthCategory={topGrowthCategory && Math.abs(topGrowthCategory.percentChange) > 10 
            ? { name: topGrowthCategory.name, percentChange: topGrowthCategory.percentChange }
            : undefined
          }
        />
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="mb-8">
          <SmartInsightsPanel insights={insights} />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-8 lg:grid-cols-2 mb-8">
        <div className="lg:col-span-2">
          <MonthlySpendingChart
            data={monthlyChartData}
            categories={chartCategories}
            chartType={chartType}
            onChartTypeChange={setChartType}
          />
        </div>
        <div className="lg:col-span-2">
          <IncomeVsSpendingChart data={currentPeriodData.byMonth} />
        </div>
      </div>

      {/* Category Breakdown */}
      <CategoryBreakdownTable categories={categoryComparisons} />
    </AppLayout>
  );
}
