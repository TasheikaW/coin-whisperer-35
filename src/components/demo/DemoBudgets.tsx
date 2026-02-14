import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetSummaryCards } from "@/components/budgets/BudgetSummaryCards";
import { BudgetInsightsPanel } from "@/components/budgets/BudgetInsightsPanel";
import { cn } from "@/lib/utils";
import type { BudgetSummary, BudgetInsight } from "@/hooks/useBudgets";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const summary: BudgetSummary = {
  totalBudget: 1550,
  totalSpent: 1415,
  netRemaining: 135,
  overBudgetAmount: 40,
  categoriesOverBudget: 1,
  daysRemaining: 14,
  daysElapsed: 14,
  daysInMonth: 28,
  percentMonthElapsed: 50,
};

const budgets = [
  { name: "Groceries", icon: "🛒", spent: 620, amount: 700, status: "at-risk" as const },
  { name: "Dining", icon: "🍽️", spent: 340, amount: 300, status: "over-budget" as const },
  { name: "Transport", icon: "🚗", spent: 280, amount: 350, status: "on-track" as const },
  { name: "Entertainment", icon: "🎬", spent: 175, amount: 200, status: "on-track" as const },
];

const insights: BudgetInsight[] = [
  { id: "1", type: "warning", category: "Dining", message: "Dining is $40 over budget. Consider cooking more at home.", action: "Review dining transactions" },
  { id: "2", type: "warning", category: "Groceries", message: "Groceries is at 89% — you may exceed by month end at current pace.", action: "Track remaining grocery spending" },
  { id: "3", type: "success", category: "Transport", message: "Transport spending is on track at 80% with 14 days remaining." },
];

const statusConfig = {
  "on-track": { label: "On track", className: "bg-success/10 text-success border-success/20" },
  "at-risk": { label: "At risk", className: "bg-warning/10 text-warning border-warning/20" },
  "over-budget": { label: "Over budget", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export function DemoBudgets() {
  return (
    <>
      <PageHeader title="Budgets" description="Track your spending against monthly limits" />

      <div className="mb-8">
        <BudgetSummaryCards summary={summary} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-lg font-semibold">Monthly Budgets</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgets.map((b) => {
                  const pct = Math.min((b.spent / b.amount) * 100, 100);
                  const over = b.spent > b.amount;
                  return (
                    <div key={b.name} className="group p-4 rounded-xl border border-border/50 bg-card">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{b.icon}</span>
                          <div>
                            <h3 className="font-medium text-foreground">{b.name}</h3>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full border", statusConfig[b.status].className)}>
                              {statusConfig[b.status].label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Spent: <span className="font-medium text-foreground">{fmt(b.spent)}</span></span>
                        <span className="text-muted-foreground">Budget: <span className="font-medium text-foreground">{fmt(b.amount)}</span></span>
                      </div>
                      <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
                        <div
                          className={cn(
                            "h-full rounded-l-full transition-all",
                            b.status === "on-track" && "bg-success",
                            b.status === "at-risk" && "bg-warning",
                            b.status === "over-budget" && "bg-destructive"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>{pct.toFixed(0)}% used</span>
                        <span>{over ? <span className="text-destructive font-medium">{fmt(b.spent - b.amount)} over</span> : `${fmt(b.amount - b.spent)} remaining`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <BudgetInsightsPanel insights={insights} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
