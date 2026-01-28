import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Calendar } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const monthlyData = [
  { category: "Groceries", jan: 480, feb: 520, mar: 450 },
  { category: "Dining", jan: 180, feb: 220, mar: 280 },
  { category: "Transportation", jan: 350, feb: 300, mar: 320 },
  { category: "Shopping", jan: 420, feb: 380, mar: 520 },
  { category: "Utilities", jan: 150, feb: 160, mar: 180 },
  { category: "Entertainment", jan: 120, feb: 95, mar: 150 },
];

const categoryTotals = [
  { category: "Groceries", total: 1450, percentage: 28 },
  { category: "Shopping", total: 1320, percentage: 25 },
  { category: "Transportation", total: 970, percentage: 19 },
  { category: "Dining", total: 680, percentage: 13 },
  { category: "Utilities", total: 490, percentage: 9 },
  { category: "Entertainment", total: 365, percentage: 7 },
];

export default function Reports() {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {item.name}: {formatCurrency(item.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        description="Analyze your spending patterns over time"
        action={
          <Button variant="outline">
            <Download size={18} className="mr-2" />
            Export Report
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Select defaultValue="q1-2024">
          <SelectTrigger className="w-[180px]">
            <Calendar size={16} className="mr-2" />
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="q1-2024">Q1 2024</SelectItem>
            <SelectItem value="q4-2023">Q4 2023</SelectItem>
            <SelectItem value="2023">Full Year 2023</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Monthly Comparison Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Monthly Spending Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="jan" name="January" fill="hsl(168, 76%, 42%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="feb" name="February" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mar" name="March" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Category Breakdown (Q1 2024)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryTotals.map((item) => (
              <div key={item.category} className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <span className="font-medium text-foreground w-32">{item.category}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {item.percentage}%
                  </span>
                  <span className="font-medium tabular-nums w-20 text-right">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
