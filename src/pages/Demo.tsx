import { Link } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
import {
  Wallet,
  TrendingDown,
  ArrowLeftRight,
  TrendingUp,
  ArrowLeft,
  Store,
  Plus,
  Target,
  Download,
  LayoutDashboard,
  Upload,
  Receipt,
  PiggyBank,
  BarChart3,
  Settings,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const demoSpendingByCategory = [
  { name: "Shopping", value: 450, color: "hsl(262, 83%, 58%)" },
  { name: "Groceries", value: 620, color: "hsl(158, 64%, 42%)" },
  { name: "Dining", value: 340, color: "hsl(38, 92%, 50%)" },
  { name: "Transport", value: 280, color: "hsl(199, 89%, 48%)" },
  { name: "Utilities", value: 195, color: "hsl(217, 50%, 50%)" },
  { name: "Entertainment", value: 175, color: "hsl(328, 73%, 52%)" },
];

const demoMonthlyTrends = [
  { month: "Sep", income: 5200, spending: 3800 },
  { month: "Oct", income: 5200, spending: 4100 },
  { month: "Nov", income: 5400, spending: 3600 },
  { month: "Dec", income: 5800, spending: 4500 },
  { month: "Jan", income: 5200, spending: 3900 },
  { month: "Feb", income: 5400, spending: 2060 },
];

const demoMerchants = [
  { name: "AMZN Mktp", count: 12, total: 487 },
  { name: "Uber Eats", count: 8, total: 312 },
  { name: "Walmart", count: 6, total: 245 },
];

const demoBudgets = [
  { category: "Groceries", spent: 620, budget: 700 },
  { category: "Dining", spent: 340, budget: 300 },
  { category: "Transport", spent: 280, budget: 350 },
  { category: "Entertainment", spent: 175, budget: 200 },
];

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Upload, label: "Uploads" },
  { icon: Receipt, label: "Transactions" },
  { icon: PiggyBank, label: "Budgets" },
  { icon: BarChart3, label: "Reports" },
  { icon: CreditCard, label: "Subscription" },
  { icon: Settings, label: "Settings" },
];

const merchantColors = [
  "bg-destructive/10 text-destructive",
  "bg-warning/10 text-warning",
  "bg-muted text-muted-foreground",
];

export default function Demo() {
  const totalIncome = 5400;
  const totalSpending = 2060;
  const netCashFlow = totalIncome - totalSpending;
  const savingsRate = Math.round((netCashFlow / totalIncome) * 100);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Banner */}
      <div className="sticky top-0 z-50 bg-accent text-accent-foreground px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-white/20 text-white border-0">DEMO</Badge>
          <span className="text-sm font-medium">You're viewing sample data</span>
        </div>
        <Link to="/">
          <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
            <ArrowLeft size={16} className="mr-2" />
            Exit Demo
          </Button>
        </Link>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex h-[calc(100vh-40px)] sticky top-10 w-64 flex-col bg-sidebar border-r border-sidebar-border">
          <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-info flex items-center justify-center shadow-glow">
                <Wallet size={20} className="text-white" />
              </div>
              <span className="text-lg font-semibold text-sidebar-foreground">Coin Whisperer</span>
            </div>
          </div>
          <nav className="flex-1 py-4 px-3 space-y-1">
            {navItems.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  item.active
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/70"
                )}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your spending and financial health</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Income"
              value={formatCurrency(totalIncome)}
              icon={<Wallet size={20} />}
              iconVariant="green"
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(totalSpending)}
              icon={<TrendingDown size={20} />}
              iconVariant="red"
            />
            <StatCard
              title="Net Cash Flow"
              value={`+${formatCurrency(netCashFlow)}`}
              icon={<ArrowLeftRight size={20} />}
              iconVariant="blue"
              valueColor="positive"
            />
            <StatCard
              title="Savings Rate"
              value={`${savingsRate}%`}
              icon={<TrendingUp size={20} />}
              iconVariant="purple"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            <Card className="lg:col-span-2 border-border/50">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <SpendingChart data={demoSpendingByCategory} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 border-border/50">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Income vs Spending</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart data={demoMonthlyTrends} />
              </CardContent>
            </Card>
          </div>

          {/* Top 3 Merchants */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Top Merchants</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {demoMerchants.map((merchant, index) => (
                <Card key={merchant.name} className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${merchantColors[index]}`}>
                        <Store size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">#{index + 1}</p>
                        <p className="font-semibold text-foreground truncate">{merchant.name}</p>
                        <p className="text-lg font-bold text-foreground mt-1">
                          {formatCurrency(merchant.total)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {merchant.count} transaction{merchant.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Budget Progress */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Budget Progress</h2>
            <Card className="border-border/50">
              <CardContent className="pt-6 space-y-5">
                {demoBudgets.map((b) => (
                  <BudgetProgress
                    key={b.category}
                    category={b.category}
                    spent={b.spent}
                    budget={b.budget}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Smart Insights */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Smart Insights</h2>
            <div className="space-y-3">
              <InsightCard
                icon={<span>💡</span>}
                title="Great savings rate!"
                description={`You're saving ${savingsRate}% of your income, above the recommended 20%.`}
                type="success"
              />
              <InsightCard
                icon={<span>⚠️</span>}
                title="Dining over budget"
                description="Your dining spending ($340) has exceeded the $300 budget. Consider reducing dining out."
                type="warning"
              />
              <InsightCard
                icon={<span>📋</span>}
                title="Top spending: Groceries"
                description={`Your highest spending category is Groceries at ${formatCurrency(620)}.`}
                type="info"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Button className="gap-2" disabled>
              <Plus size={16} />
              Add Transaction
            </Button>
            <Button variant="outline" className="gap-2 border-border/50" disabled>
              <Target size={16} />
              Set Budget
            </Button>
            <Button variant="outline" className="gap-2 border-border/50" disabled>
              <Download size={16} />
              Export Report
            </Button>
          </div>

          {/* CTA */}
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">Like what you see?</h3>
              <p className="text-muted-foreground mb-4">Sign up for free to start tracking your own finances</p>
              <Link to="/auth">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  Get Started Free
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
