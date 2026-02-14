import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Sparkles } from "lucide-react";

const freeFeatures = ["5 uploads per month", "100 transactions", "Basic categorization", "Monthly summary report"];
const proFeatures = ["Unlimited uploads", "Unlimited transactions", "AI-powered categorization", "Smart insights", "Advanced reports", "Priority support", "Custom categories", "Multiple currencies"];

export function DemoSubscription() {
  return (
    <>
      <PageHeader title="Subscription" description="Unlock the full power of Coin Whisperer" />

      <Card className="mb-8 border-accent/30 bg-accent/5">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/20"><Zap className="text-accent" size={24} /></div>
            <div>
              <p className="font-semibold text-foreground">Free Plan</p>
              <p className="text-sm text-muted-foreground">Subscribe to unlock all features</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <Card className="border-accent shadow-glow relative overflow-hidden">
          <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground">Current Plan</Badge>
          <CardHeader>
            <CardTitle className="flex items-baseline gap-1"><span className="text-3xl font-bold">$0</span><span className="text-muted-foreground font-normal">/month</span></CardTitle>
            <CardDescription><span className="text-lg font-semibold text-foreground">Free</span><br />Get started with the basics</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {freeFeatures.map((f) => (<li key={f} className="flex items-start gap-3"><Check size={18} className="text-success flex-shrink-0 mt-0.5" /><span className="text-sm">{f}</span></li>))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-accent/50 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-baseline gap-1"><span className="text-3xl font-bold">$9.99</span><span className="text-muted-foreground font-normal">/month</span></CardTitle>
            <CardDescription><span className="text-lg font-semibold text-foreground">Coin Whisperer Pro</span><br />Everything you need to manage your finances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {proFeatures.map((f) => (<li key={f} className="flex items-start gap-3"><Check size={18} className="text-success flex-shrink-0 mt-0.5" /><span className="text-sm">{f}</span></li>))}
            </ul>
            <Button className="w-full" disabled><Sparkles size={16} className="mr-2" />Subscribe Now</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
