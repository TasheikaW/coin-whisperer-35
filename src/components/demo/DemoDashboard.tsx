import { StatCard } from "@/components/dashboard/StatCard";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
import {
  Wallet, TrendingDown, ArrowLeftRight, TrendingUp, Store, Plus, Target, Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const spendingByCategory = [
  { name: "Shopping", value: 450, color: "hsl(262, 83%, 58%)" },
  { name: "Groceries", value: 620, color: "hsl(158, 64%, 42%)" },
  { name: "Dining", value: 340, color: "hsl(38, 92%, 50%)" },
  { name: "Transport", value: 280, color: "hsl(199, 89%, 48%)" },
  { name: "Utilities", value: 195, color: "hsl(217, 50%, 50%)" },
  { name: "Entertainment", value: 175, color: "hsl(328, 73%, 52%)" },
];

const monthlyTrends = [
  { month: "Sep", income: 5200, spending: 3800 },
  { month: "Oct", income: 5200, spending: 4100 },
  { month: "Nov", income: 5400, spending: 3600 },
  { month: "Dec", income: 5800, spending: 4500 },
  { month: "Jan", income: 5200, spending: 3900 },
  { month: "Feb", income: 5400, spending: 2060 },
];

const merchants = [
  { name: "AMZN Mktp", count: 12, total: 487 },
  { name: "Uber Eats", count: 8, total: 312 },
  { name: "Walmart", count: 6, total: 245 },
];

const budgets = [
  { category: "Groceries", spent: 620, budget: 700 },
  { category: "Dining", spent: 340, budget: 300 },
  { category: "Transport", spent: 280, budget: 350 },
  { category: "Entertainment", spent: 175, budget: 200 },
];

const merchantColors = [
  "bg-destructive/10 text-destructive",
  "bg-warning/10 text-warning",
  "bg-muted text-muted-foreground",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function DemoDashboard() {
  const totalIncome = 5400;
  const totalSpending = 2060;
  const netCashFlow = totalIncome - totalSpending;
  const savingsRate = Math.round((netCashFlow / totalIncome) * 100);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Track your spending and financial health</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Total Income" value={fmt(totalIncome)} icon={<Wallet size={20} />} iconVariant="green" />
        <StatCard title="Total Expenses" value={fmt(totalSpending)} icon={<TrendingDown size={20} />} iconVariant="red" />
        <StatCard title="Net Cash Flow" value={`+${fmt(netCashFlow)}`} icon={<ArrowLeftRight size={20} />} iconVariant="blue" valueColor="positive" />
        <StatCard title="Savings Rate" value={`${savingsRate}%`} icon={<TrendingUp size={20} />} iconVariant="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader><CardTitle className="text-xl font-semibold">Spending by Category</CardTitle></CardHeader>
          <CardContent><SpendingChart data={spendingByCategory} /></CardContent>
        </Card>
        <Card className="lg:col-span-3 border-border/50">
          <CardHeader><CardTitle className="text-xl font-semibold">Income vs Spending</CardTitle></CardHeader>
          <CardContent><TrendChart data={monthlyTrends} /></CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Top Merchants</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {merchants.map((m, i) => (
            <Card key={m.name} className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${merchantColors[i]}`}><Store size={18} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">#{i + 1}</p>
                    <p className="font-semibold text-foreground truncate">{m.name}</p>
                    <p className="text-lg font-bold text-foreground mt-1">{fmt(m.total)}</p>
                    <p className="text-xs text-muted-foreground">{m.count} transactions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Budget Progress</h2>
        <Card className="border-border/50">
          <CardContent className="pt-6 space-y-5">
            {budgets.map((b) => (
              <BudgetProgress key={b.category} category={b.category} spent={b.spent} budget={b.budget} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Smart Insights</h2>
        <div className="space-y-3">
          <InsightCard icon={<span>💡</span>} title="Great savings rate!" description={`You're saving ${savingsRate}% of your income, above the recommended 20%.`} type="success" />
          <InsightCard icon={<span>⚠️</span>} title="Dining over budget" description="Your dining spending ($340) has exceeded the $300 budget." type="warning" />
          <InsightCard icon={<span>📋</span>} title="Top spending: Groceries" description={`Your highest spending category is Groceries at ${fmt(620)}.`} type="info" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button className="gap-2" disabled><Plus size={16} />Add Transaction</Button>
        <Button variant="outline" className="gap-2 border-border/50" disabled><Target size={16} />Set Budget</Button>
        <Button variant="outline" className="gap-2 border-border/50" disabled><Download size={16} />Export Report</Button>
      </div>
    </>
  );
}
