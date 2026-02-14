import { Link } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import {
  Wallet,
  TrendingDown,
  ArrowLeftRight,
  TrendingUp,
  ArrowLeft,
  Store,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const demoSpendingByCategory = [
  { name: "Groceries", value: 620, color: "hsl(158, 64%, 42%)" },
  { name: "Dining", value: 340, color: "hsl(38, 92%, 50%)" },
  { name: "Transport", value: 280, color: "hsl(199, 89%, 48%)" },
  { name: "Shopping", value: 450, color: "hsl(262, 83%, 58%)" },
  { name: "Utilities", value: 195, color: "hsl(217, 50%, 50%)" },
  { name: "Entertainment", value: 175, color: "hsl(328, 73%, 52%)" },
];

const demoMonthlyTrends = [
  { month: "Sep", income: 5200, spending: 3800 },
  { month: "Oct", income: 5200, spending: 4100 },
  { month: "Nov", income: 5400, spending: 3600 },
  { month: "Dec", income: 5800, spending: 4500 },
  { month: "Jan", income: 5200, spending: 3900 },
  { month: "Feb", income: 5400, spending: 3400 },
];

const demoMerchants = [
  { name: "AMZN Mktp", count: 12, total: 487.32 },
  { name: "Uber Eats", count: 8, total: 312.50 },
  { name: "Spotify", count: 6, total: 59.94 },
];

const merchantColors = ["bg-accent/20 text-accent", "bg-warning/20 text-warning", "bg-info/20 text-info"];

export default function Demo() {
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
        {/* Simplified sidebar for demo */}
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
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-primary font-medium">
              <Wallet size={20} />
              <span>Dashboard</span>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Here's how your finances look — sample data</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Income"
              value={formatCurrency(5400)}
              icon={<TrendingUp size={20} />}
              trend={{ value: 3.8, label: "vs last month" }}
            />
            <StatCard
              title="Total Spending"
              value={formatCurrency(2060)}
              icon={<TrendingDown size={20} />}
              trend={{ value: -8.2, label: "vs last month" }}
            />
            <StatCard
              title="Net Savings"
              value={formatCurrency(3340)}
              icon={<Wallet size={20} />}
              trend={{ value: 12.5, label: "vs last month" }}
            />
            <StatCard
              title="Transactions"
              value="47"
              icon={<ArrowLeftRight size={20} />}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SpendingChart data={demoSpendingByCategory} />
            <TrendChart data={demoMonthlyTrends} />
          </div>

          {/* Top Merchants */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Top Merchants</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {demoMerchants.map((merchant, index) => (
                <Card key={merchant.name} className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${merchantColors[index]}`}>
                        <Store size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{merchant.name}</p>
                        <p className="text-sm text-muted-foreground">{merchant.count} transactions</p>
                        <p className="text-lg font-semibold text-foreground mt-1">
                          {formatCurrency(merchant.total)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
