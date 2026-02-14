import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Download, ArrowUp, ArrowDown, ShoppingCart, Utensils, Car, Zap, Film, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const transactions = [
  { id: "1", date: "2025-02-12", merchant: "AMZN Mktp", description: "AMZN Mktp US*AB1CD2EF3", category: "Shopping", amount: 67.99, direction: "debit" },
  { id: "2", date: "2025-02-11", merchant: "Uber Eats", description: "UBER EATS ORDER #4821", category: "Dining", amount: 34.50, direction: "debit" },
  { id: "3", date: "2025-02-10", merchant: "Whole Foods", description: "WHOLE FOODS #10234", category: "Groceries", amount: 142.30, direction: "debit" },
  { id: "4", date: "2025-02-10", merchant: "Shell Gas", description: "SHELL OIL 57442116203", category: "Transportation", amount: 52.00, direction: "debit" },
  { id: "5", date: "2025-02-09", merchant: "Netflix", description: "NETFLIX.COM", category: "Entertainment", amount: 15.99, direction: "debit" },
  { id: "6", date: "2025-02-08", merchant: "Employer Inc", description: "DIRECT DEP EMPLOYER INC PAYROLL", category: "Income", amount: 2700.00, direction: "credit" },
  { id: "7", date: "2025-02-07", merchant: "Con Edison", description: "CON EDISON CO UTIL PMT", category: "Utilities", amount: 89.50, direction: "debit" },
  { id: "8", date: "2025-02-06", merchant: "Target", description: "TARGET T-1842", category: "Shopping", amount: 53.20, direction: "debit" },
  { id: "9", date: "2025-02-05", merchant: "Chipotle", description: "CHIPOTLE ONLINE 2341", category: "Dining", amount: 12.85, direction: "debit" },
  { id: "10", date: "2025-02-04", merchant: "Trader Joe's", description: "TRADER JOE'S #567", category: "Groceries", amount: 87.60, direction: "debit" },
];

const categoryIcons: Record<string, React.ReactNode> = {
  Shopping: <ShoppingCart size={14} />,
  Dining: <Utensils size={14} />,
  Groceries: <ShoppingCart size={14} />,
  Transportation: <Car size={14} />,
  Utilities: <Zap size={14} />,
  Entertainment: <Film size={14} />,
  Income: <DollarSign size={14} />,
};

const categoryColors: Record<string, string> = {
  Shopping: "bg-purple-100 text-purple-700",
  Dining: "bg-amber-100 text-amber-700",
  Groceries: "bg-emerald-100 text-emerald-700",
  Transportation: "bg-sky-100 text-sky-700",
  Utilities: "bg-slate-100 text-slate-700",
  Entertainment: "bg-pink-100 text-pink-700",
  Income: "bg-teal-100 text-teal-700",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n));

export function DemoTransactions() {
  return (
    <>
      <PageHeader
        title="Transactions"
        description="View and manage all your transactions"
        action={
          <div className="flex gap-2">
            <Button disabled><Plus size={18} className="mr-2" />Add</Button>
            <Button variant="outline" disabled><Download size={18} className="mr-2" />Export</Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input placeholder="Search transactions..." className="pl-10" disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-semibold">{transactions.length} Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date <ArrowDown size={14} className="inline ml-1 opacity-50" /></th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="text-muted-foreground tabular-nums">{t.date}</td>
                    <td>
                      <p className="font-medium text-foreground">{t.merchant}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{t.description}</p>
                    </td>
                    <td>
                      <Badge variant="secondary" className={cn("gap-1", categoryColors[t.category])}>
                        {categoryIcons[t.category]}
                        {t.category}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground text-sm">chase_checking_jan2025.csv</td>
                    <td className={cn("text-right font-medium tabular-nums", t.direction === "credit" ? "text-success" : "text-foreground")}>
                      {t.direction === "credit" ? "+" : "-"}{fmt(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
