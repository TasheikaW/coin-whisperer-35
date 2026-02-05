import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from "recharts";
import type { ChartType } from "@/hooks/useReportsData";

interface MonthlySpendingChartProps {
  data: Array<Record<string, any>>;
  categories: Array<{ name: string; color: string }>;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
}

// Color-blind friendly palette
const ACCESSIBLE_COLORS = [
  "hsl(200, 70%, 45%)",   // Blue
  "hsl(35, 85%, 55%)",    // Orange
  "hsl(150, 60%, 40%)",   // Green
  "hsl(280, 60%, 55%)",   // Purple
  "hsl(350, 70%, 55%)",   // Red
  "hsl(180, 50%, 45%)",   // Teal
  "hsl(55, 75%, 50%)",    // Yellow
  "hsl(320, 60%, 50%)",   // Pink
];

export function MonthlySpendingChart({
  data,
  categories,
  chartType,
  onChartTypeChange
}: MonthlySpendingChartProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const totalSpending = payload.reduce((sum: number, item: any) => 
        item.dataKey !== 'momChange' ? sum + (item.value || 0) : sum, 0
      );
      const momChange = payload[0]?.payload?.momChange;

      return (
        <div className="bg-popover border border-border rounded-lg p-4 shadow-lg min-w-[200px]">
          <div className="flex justify-between items-baseline mb-2">
            <p className="font-semibold text-foreground">{label}</p>
            {momChange !== undefined && momChange !== 0 && (
              <span className={`text-sm ${momChange > 0 ? 'text-destructive' : 'text-success'}`}>
                {momChange > 0 ? '↑' : '↓'} {Math.abs(momChange).toFixed(1)}% MoM
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-foreground mb-3">
            Total: {formatCurrency(totalSpending)}
          </p>
          <div className="space-y-1">
            {payload
              .filter((item: any) => item.dataKey !== 'momChange' && item.value > 0)
              .sort((a: any, b: any) => b.value - a.value)
              .map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm" 
                      style={{ backgroundColor: item.fill || item.color }}
                    />
                    <span className="text-muted-foreground">{item.name || item.dataKey}</span>
                  </div>
                  <span className="font-medium tabular-nums">{formatCurrency(item.value)}</span>
                </div>
              ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // For stacked chart, we need the total spending
  const dataWithTotals = data.map(d => ({
    ...d,
    total: categories.reduce((sum, cat) => sum + (d[cat.name] || 0), 0)
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Monthly Spending Comparison</CardTitle>
        <ToggleGroup
          type="single"
          value={chartType}
          onValueChange={(value) => value && onChartTypeChange(value as ChartType)}
          className="bg-muted rounded-lg p-1"
        >
          <ToggleGroupItem value="grouped" className="text-xs px-3 data-[state=on]:bg-background">
            Grouped
          </ToggleGroupItem>
          <ToggleGroupItem value="stacked" className="text-xs px-3 data-[state=on]:bg-background">
            Stacked
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dataWithTotals}
              margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
            >
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
              <Legend 
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
              />
              {categories.map((category, index) => (
                <Bar
                  key={category.name}
                  dataKey={category.name}
                  name={category.name}
                  stackId={chartType === 'stacked' ? 'stack' : undefined}
                  fill={ACCESSIBLE_COLORS[index % ACCESSIBLE_COLORS.length]}
                  radius={chartType === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                >
                  {/* Show total on top bar for stacked */}
                  {chartType === 'stacked' && index === categories.length - 1 && (
                    <LabelList
                      dataKey="total"
                      position="top"
                      formatter={(value: number) => value > 0 ? formatCurrency(value) : ''}
                      className="fill-foreground text-xs"
                    />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Month-over-month indicators */}
        <div className="flex justify-around mt-4 pt-4 border-t border-border">
          {data.map((month, idx) => (
            <div key={month.month} className="text-center">
              <p className="text-xs text-muted-foreground">{month.month}</p>
              {month.momChange !== 0 && idx > 0 && (
                <p className={`text-sm font-medium ${
                  month.momChange > 0 ? 'text-destructive' : 'text-success'
                }`}>
                  {month.momChange > 0 ? '↑' : '↓'} {Math.abs(month.momChange).toFixed(0)}%
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
