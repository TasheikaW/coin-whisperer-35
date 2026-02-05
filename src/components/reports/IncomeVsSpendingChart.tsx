import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface IncomeVsSpendingChartProps {
  data: Array<{
    month: string;
    spending: number;
    income: number;
    netFlow: number;
  }>;
}

export function IncomeVsSpendingChart({ data }: IncomeVsSpendingChartProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
      const spending = payload.find((p: any) => p.dataKey === 'spending')?.value || 0;
      const netFlow = income - spending;

      return (
        <div className="bg-popover border border-border rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-foreground mb-3">{label}</p>
          <div className="space-y-2">
            <div className="flex justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-success" />
                <span className="text-muted-foreground">Income</span>
              </div>
              <span className="font-medium tabular-nums">{formatCurrency(income)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-destructive" />
                <span className="text-muted-foreground">Spending</span>
              </div>
              <span className="font-medium tabular-nums">{formatCurrency(spending)}</span>
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between gap-8">
                <span className="font-medium">Net Flow</span>
                <span className={cn(
                  "font-bold tabular-nums",
                  netFlow >= 0 ? "text-success" : "text-destructive"
                )}>
                  {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Summary stats
  const surplusMonths = data.filter(d => d.netFlow > 0).length;
  const deficitMonths = data.filter(d => d.netFlow < 0).length;
  const avgNetFlow = data.length > 0 
    ? data.reduce((sum, d) => sum + d.netFlow, 0) / data.length 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Income vs Spending</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                className="fill-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#incomeGradient)"
              />
              <Area
                type="monotone"
                dataKey="spending"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                fill="url(#spendingGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Net flow summary */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-2xl font-bold">{surplusMonths}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Surplus months</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-destructive">
              <TrendingDown className="h-4 w-4" />
              <span className="text-2xl font-bold">{deficitMonths}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Deficit months</p>
          </div>
          <div className="text-center">
            <div className={cn(
              "flex items-center justify-center gap-1",
              avgNetFlow >= 0 ? "text-success" : "text-destructive"
            )}>
              {avgNetFlow >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-lg font-bold">{formatCurrency(Math.abs(avgNetFlow))}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg monthly net</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
