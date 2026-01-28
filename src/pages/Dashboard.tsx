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
  CreditCard, 
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data for demo
const spendingData = [
  { name: "Groceries", value: 450, color: "hsl(158, 64%, 42%)" },
  { name: "Dining", value: 280, color: "hsl(38, 92%, 50%)" },
  { name: "Transportation", value: 320, color: "hsl(199, 89%, 48%)" },
  { name: "Shopping", value: 520, color: "hsl(262, 83%, 58%)" },
  { name: "Utilities", value: 180, color: "hsl(210, 40%, 50%)" },
  { name: "Entertainment", value: 150, color: "hsl(328, 73%, 52%)" },
];

const trendData = [
  { month: "Jan", spending: 3200, income: 5500 },
  { month: "Feb", spending: 2800, income: 5500 },
  { month: "Mar", spending: 3500, income: 5800 },
  { month: "Apr", spending: 3100, income: 5500 },
  { month: "May", spending: 2900, income: 6000 },
  { month: "Jun", spending: 3400, income: 5500 },
];

const budgets = [
  { category: "Groceries", spent: 450, budget: 500 },
  { category: "Dining", spent: 280, budget: 200 },
  { category: "Transportation", spent: 320, budget: 400 },
  { category: "Shopping", spent: 420, budget: 300 },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Track your spending and financial health"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Balance"
          value="$12,450"
          icon={<Wallet size={24} />}
          trend={{ value: 8.2, label: "vs last month" }}
        />
        <StatCard
          title="Monthly Spending"
          value="$3,420"
          icon={<TrendingDown size={24} />}
          trend={{ value: -12.5, label: "vs last month" }}
        />
        <StatCard
          title="Active Accounts"
          value="4"
          icon={<CreditCard size={24} />}
        />
        <StatCard
          title="Savings Rate"
          value="32%"
          icon={<PiggyBank size={24} />}
          trend={{ value: 5.3, label: "vs last month" }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingChart data={spendingData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Income vs Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trendData} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Budget Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {budgets.map((budget) => (
              <BudgetProgress key={budget.category} {...budget} />
            ))}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Smart Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InsightCard
              icon={<TrendingUp size={20} />}
              title="Dining spending up 40%"
              description="You've spent $280 on dining this month, compared to $200 last month."
              type="warning"
            />
            <InsightCard
              icon={<AlertTriangle size={20} />}
              title="Shopping budget exceeded"
              description="You're $120 over your monthly shopping budget."
              type="warning"
            />
            <InsightCard
              icon={<Lightbulb size={20} />}
              title="Great savings rate!"
              description="You're saving 32% of your income, above the recommended 20%."
              type="success"
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
