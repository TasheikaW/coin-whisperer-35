import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { InsightCard } from "@/components/dashboard/InsightCard";
import {
  Wallet,
  TrendingDown,
  ArrowLeftRight,
  TrendingUp,
  Loader2,
  Plus,
  Target,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { DateRangeFilter, type DatePreset } from "@/components/shared/DateRangeFilter";

export default function Dashboard() {
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const { isLoading, stats, savingsRate, spendingByCategory, monthlyTrends, transactionCount } = useDashboardData(dateRange);
  const navigate = useNavigate();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your spending and financial health</p>
        </div>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-muted-foreground" size={48} />
        </div>
      </AppLayout>
    );
  }

  if (transactionCount === 0) {
    return (
      <AppLayout>
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your spending and financial health</p>
        </div>
        <Card className="py-12">
          <CardContent className="text-center">
            <Wallet className="mx-auto mb-4 text-muted-foreground" size={48} />
            <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first bank statement to see your financial insights.
            </p>
            <Button onClick={() => navigate('/uploads')}>
              Go to Uploads
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const netCashFlow = stats.totalIncome - stats.totalSpending;

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your spending and financial health</p>
        </div>
        <DateRangeFilter
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          preset={datePreset}
          onPresetChange={setDatePreset}
        />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total Income"
          value={formatCurrency(stats.totalIncome)}
          icon={<Wallet size={20} />}
          iconVariant="green"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.totalSpending)}
          icon={<TrendingDown size={20} />}
          iconVariant="red"
        />
        <StatCard
          title="Net Cash Flow"
          value={`${netCashFlow >= 0 ? '+' : ''}${formatCurrency(netCashFlow)}`}
          icon={<ArrowLeftRight size={20} />}
          iconVariant="blue"
          valueColor={netCashFlow >= 0 ? "positive" : "negative"}
        />
        <StatCard
          title="Savings Rate"
          value={`${savingsRate}%`}
          icon={<TrendingUp size={20} />}
          iconVariant="purple"
        />
      </div>

      {/* Charts Grid - matching uploaded layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {spendingByCategory.length > 0 ? (
              <SpendingChart data={spendingByCategory} />
            ) : (
              <p className="text-center text-muted-foreground py-8">No spending data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Income vs Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={monthlyTrends} />
          </CardContent>
        </Card>
      </div>

      {/* Smart Insights */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Smart Insights</h2>
        <div className="space-y-3">
          {savingsRate >= 20 ? (
            <InsightCard
              icon={<span>💡</span>}
              title="Great savings rate!"
              description={`You're saving ${savingsRate}% of your income, above the recommended 20%.`}
              type="success"
            />
          ) : savingsRate >= 0 ? (
            <InsightCard
              icon={<span>⚠️</span>}
              title="Savings could improve"
              description={`You're saving ${savingsRate}% of your income. Aim for at least 20%.`}
              type="warning"
              actionLabel="Review Budget"
              onAction={() => navigate('/budgets')}
            />
          ) : (
            <InsightCard
              icon={<span>⚠️</span>}
              title="Spending exceeds income"
              description="Your expenses are higher than your income this period. Consider reducing discretionary spending."
              type="alert"
              actionLabel="Review Budget"
              onAction={() => navigate('/budgets')}
            />
          )}
          {spendingByCategory.length > 0 && (
            <InsightCard
              icon={<span>📋</span>}
              title={`Top spending: ${spendingByCategory[0]?.name}`}
              description={`Your highest spending category is ${spendingByCategory[0]?.name} at ${formatCurrency(spendingByCategory[0]?.value || 0)}.`}
              type="info"
              actionLabel="View Details"
              onAction={() => navigate('/reports')}
            />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/transactions')} className="gap-2">
          <Plus size={16} />
          Add Transaction
        </Button>
        <Button variant="outline" onClick={() => navigate('/budgets')} className="gap-2 border-border/50 hover:border-info/40 hover:bg-info/5">
          <Target size={16} />
          Set Budget
        </Button>
        <Button variant="outline" onClick={() => navigate('/reports')} className="gap-2 border-border/50 hover:border-info/40 hover:bg-info/5">
          <Download size={16} />
          Export Report
        </Button>
      </div>
    </AppLayout>
  );
}
