import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportInsight } from "@/hooks/useReportsData";

interface SmartInsightsPanelProps {
  insights: ReportInsight[];
}

export function SmartInsightsPanel({ insights }: SmartInsightsPanelProps) {
  const getIcon = (type: ReportInsight['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <Info className="h-5 w-5 text-info" />;
    }
  };

  const getStyles = (type: ReportInsight['type']) => {
    switch (type) {
      case 'success':
        return "bg-success/10 border-success/20";
      case 'warning':
        return "bg-warning/10 border-warning/20";
      default:
        return "bg-info/10 border-info/20";
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-warning" />
          Smart Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-sm",
                getStyles(insight.type)
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(insight.type)}
              </div>
              <div className="space-y-1 min-w-0">
                <p className="font-medium text-foreground leading-tight">
                  {insight.title}
                </p>
                <p className="text-sm text-muted-foreground leading-snug">
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
