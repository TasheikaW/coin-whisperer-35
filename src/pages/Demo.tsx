import { useState } from "react";
import { Link } from "react-router-dom";
import { DemoLayout, type DemoPage } from "@/components/demo/DemoLayout";
import { DemoDashboard } from "@/components/demo/DemoDashboard";
import { DemoUploads } from "@/components/demo/DemoUploads";
import { DemoTransactions } from "@/components/demo/DemoTransactions";
import { DemoBudgets } from "@/components/demo/DemoBudgets";
import { DemoReports } from "@/components/demo/DemoReports";
import { DemoSubscription } from "@/components/demo/DemoSubscription";
import { DemoSettings } from "@/components/demo/DemoSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const pageComponents: Record<DemoPage, React.ComponentType> = {
  dashboard: DemoDashboard,
  uploads: DemoUploads,
  transactions: DemoTransactions,
  budgets: DemoBudgets,
  reports: DemoReports,
  subscription: DemoSubscription,
  settings: DemoSettings,
};

export default function Demo() {
  const [activePage, setActivePage] = useState<DemoPage>("dashboard");
  const ActiveComponent = pageComponents[activePage];

  return (
    <DemoLayout activePage={activePage} onPageChange={setActivePage}>
      <ActiveComponent />

      {/* CTA at the bottom of every page */}
      <Card className="bg-accent/5 border-accent/20 mt-8">
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
    </DemoLayout>
  );
}
