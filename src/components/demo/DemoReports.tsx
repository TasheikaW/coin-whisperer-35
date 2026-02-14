import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportSummaryCards } from "@/components/reports/ReportSummaryCards";
import { MonthlySpendingChart } from "@/components/reports/MonthlySpendingChart";
import { IncomeVsSpendingChart } from "@/components/reports/IncomeVsSpendingChart";
import { SmartInsightsPanel } from "@/components/reports/SmartInsightsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ChartType } from "@/hooks/useReportsData";

const byMonth = [
  { month: "Sep 2024", spending: 3800, income: 5200, netFlow: 1400 },
  { month: "Oct 2024", spending: 4100, income: 5200, netFlow: 1100 },
  { month: "Nov 2024", spending: 3600, income: 5400, netFlow: 1800 },
  { month: "Dec 2024", spending: 4500, income: 5800, netFlow: 1300 },
  { month: "Jan 2025", spending: 3900, income: 5200, netFlow: 1300 },
  { month: "Feb 2025", spending: 2060, income: 5400, netFlow: 3340 },
];

const chartCategories = [
  { name: "Groceries", color: "hsl(158, 64%, 42%)" },
  { name: "Shopping", color: "hsl(262, 83%, 58%)" },
  { name: "Dining", color: "hsl(38, 92%, 50%)" },
  { name: "Transport", color: "hsl(199, 89%, 48%)" },
  { name: "Utilities", color: "hsl(217, 50%, 50%)" },
  { name: "Entertainment", color: "hsl(328, 73%, 52%)" },
];

const monthlyChartData = byMonth.map((m) => ({
  month: m.month.split(" ")[0],
  Groceries: Math.round(m.spending * 0.30),
  Shopping: Math.round(m.spending * 0.22),
  Dining: Math.round(m.spending * 0.16),
  Transport: Math.round(m.spending * 0.14),
  Utilities: Math.round(m.spending * 0.10),
  Entertainment: Math.round(m.spending * 0.08),
  momChange: 0,
}));

// Calculate MoM changes
monthlyChartData.forEach((m, i) => {
  if (i > 0) {
    const prevData = monthlyChartData[i - 1];
    const prev = (prevData.Groceries + prevData.Shopping + prevData.Dining + prevData.Transport + prevData.Utilities + prevData.Entertainment);
    const curr = (m.Groceries + m.Shopping + m.Dining + m.Transport + m.Utilities + m.Entertainment);
    m.momChange = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  }
});

const insights = [
  { type: "success" as const, title: "Strong savings month", description: "February shows your highest savings rate at 62% — well above the 20% target." },
  { type: "warning" as const, title: "Dining trend", description: "Dining spending increased 15% compared to last month. Consider setting a stricter budget." },
  { type: "info" as const, title: "Groceries stable", description: "Grocery spending has remained consistent over the past 3 months, averaging $580/mo." },
];

const categories = [
  { name: "Groceries", color: "hsl(158, 64%, 42%)", currentSpend: 620, previousSpend: 580, budgetAmount: 700, percentChange: 6.9, isOverBudget: false },
  { name: "Shopping", color: "hsl(262, 83%, 58%)", currentSpend: 450, previousSpend: 520, budgetAmount: null, percentChange: -13.5, isOverBudget: false },
  { name: "Dining", color: "hsl(38, 92%, 50%)", currentSpend: 340, previousSpend: 300, budgetAmount: 300, percentChange: 13.3, isOverBudget: true },
  { name: "Transport", color: "hsl(199, 89%, 48%)", currentSpend: 280, previousSpend: 310, budgetAmount: 350, percentChange: -9.7, isOverBudget: false },
  { name: "Utilities", color: "hsl(217, 50%, 50%)", currentSpend: 195, previousSpend: 190, budgetAmount: null, percentChange: 2.6, isOverBudget: false },
  { name: "Entertainment", color: "hsl(328, 73%, 52%)", currentSpend: 175, previousSpend: 200, budgetAmount: 200, percentChange: -12.5, isOverBudget: false },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

export function DemoReports() {
  const [chartType, setChartType] = useState<ChartType>("grouped");

  return (
    <>
      <PageHeader title="Reports" description="Analyze your spending patterns and track your financial health" />

      <div className="mb-8">
        <ReportSummaryCards
          totalSpending={2060}
          totalIncome={5400}
          netCashFlow={3340}
          spendingChange={-47.2}
          incomeChange={3.8}
          monthCount={6}
          topGrowthCategory={{ name: "Dining", percentChange: 13.3 }}
        />
      </div>

      <div className="mb-8">
        <SmartInsightsPanel insights={insights} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2 mb-8">
        <div className="lg:col-span-2">
          <MonthlySpendingChart data={monthlyChartData} categories={chartCategories} chartType={chartType} onChartTypeChange={setChartType} />
        </div>
        <div className="lg:col-span-2">
          <IncomeVsSpendingChart data={byMonth} />
        </div>
      </div>

      {/* Simple category breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-lg font-semibold">Category Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{cat.name}</span>
                  {cat.budgetAmount && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", cat.isOverBudget ? "bg-destructive" : "bg-success")}
                          style={{ width: `${Math.min((cat.currentSpend / cat.budgetAmount) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{((cat.currentSpend / cat.budgetAmount) * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{fmt(cat.currentSpend)}</p>
                  <p className={cn("text-sm tabular-nums", cat.percentChange > 0 ? "text-destructive" : "text-success")}>
                    {cat.percentChange > 0 ? "+" : ""}{cat.percentChange.toFixed(1)}%
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground w-20">
                  <p className="text-xs">Previous</p>
                  <p className="tabular-nums">{fmt(cat.previousSpend)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
