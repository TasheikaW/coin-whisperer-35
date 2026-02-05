import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { 
  Wallet, 
  TrendingDown, 
  ArrowLeftRight,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { isLoading, stats, savingsRate, spendingByCategory, monthlyTrends, transactionCount } = useDashboardData();
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
        <PageHeader title="Dashboard" description="Track your spending and financial health" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-muted-foreground" size={48} />
        </div>
      </AppLayout>
    );
  }

  if (transactionCount === 0) {
    return (
      <AppLayout>
        <PageHeader title="Dashboard" description="Track your spending and financial health" />
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

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Track your spending and financial health"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Income"
          value={formatCurrency(stats.totalIncome)}
          icon={<Wallet size={24} />}
          tooltip="Sum of all credit transactions excluding transfers"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.totalSpending)}
          icon={<TrendingDown size={24} />}
          tooltip="Sum of all debit transactions in selected date range"
        />
        <StatCard
          title="Net Cash Flow"
          value={formatCurrency(stats.totalIncome - stats.totalSpending)}
          icon={<ArrowLeftRight size={24} />}
          tooltip="Income minus Expenses"
          valueColor={stats.totalIncome - stats.totalSpending >= 0 ? "positive" : "negative"}
        />
        <StatCard
          title="Savings Rate"
          value={`${savingsRate}%`}
          icon={<TrendingUp size={24} />}
          tooltip="Percentage of income saved after expenses"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {spendingByCategory.length > 0 ? (
              <SpendingChart data={spendingByCategory} />
            ) : (
              <p className="text-center text-muted-foreground py-8">No spending data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Income vs Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={monthlyTrends} />
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Smart Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {savingsRate >= 20 ? (
            <InsightCard
              icon={<Lightbulb size={20} />}
              title="Great savings rate!"
              description={`You're saving ${savingsRate}% of your income, above the recommended 20%.`}
              type="success"
            />
          ) : savingsRate >= 0 ? (
            <InsightCard
              icon={<AlertTriangle size={20} />}
              title="Savings could improve"
              description={`You're saving ${savingsRate}% of your income. Aim for at least 20%.`}
              type="warning"
            />
          ) : (
            <InsightCard
              icon={<TrendingUp size={20} />}
              title="Spending exceeds income"
              description="Your expenses are higher than your income this period. Review your spending."
              type="warning"
            />
          )}
          {spendingByCategory.length > 0 && (
            <InsightCard
              icon={<TrendingUp size={20} />}
              title={`Top spending: ${spendingByCategory[0]?.name}`}
              description={`Your highest spending category is ${spendingByCategory[0]?.name} at ${formatCurrency(spendingByCategory[0]?.value || 0)}.`}
              type="info"
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
