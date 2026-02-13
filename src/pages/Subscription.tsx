import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Sparkles, Settings, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "@/components/ui/sonner";

const freeFeatures = [
  "5 uploads per month",
  "100 transactions",
  "Basic categorization",
  "Monthly summary report",
];

const proFeatures = [
  "Unlimited uploads",
  "Unlimited transactions",
  "AI-powered categorization",
  "Smart insights",
  "Advanced reports",
  "Priority support",
  "Custom categories",
  "Multiple currencies",
];

export default function Subscription() {
  const { currentPlan, subscribed, subscriptionEnd, isLoading, startCheckout, openPortal, checkSubscription } = useSubscription();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated! Refreshing status...");
      checkSubscription();
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Checkout canceled.");
    }
  }, [searchParams, checkSubscription]);

  return (
    <AppLayout>
      <PageHeader
        title="Subscription"
        description="Unlock the full power of Fundza"
      />

      {/* Current Status */}
      <Card className="mb-8 border-accent/30 bg-accent/5">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/20">
                <Zap className="text-accent" size={24} />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {isLoading ? "Loading..." : subscribed ? "Pro Plan" : "No active subscription"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscriptionEnd
                    ? `Renews on ${new Date(subscriptionEnd).toLocaleDateString()}`
                    : "Subscribe to get started"}
                </p>
              </div>
            </div>
            {subscribed && (
              <Button variant="outline" size="sm" onClick={openPortal}>
                <Settings size={16} className="mr-2" />
                Manage Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Free Plan */}
        <Card className={`relative overflow-hidden ${currentPlan === "free" ? "border-accent shadow-glow" : ""}`}>
          {currentPlan === "free" && (
            <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground">Current Plan</Badge>
          )}
          <CardHeader>
            <CardTitle className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground font-normal">/month</span>
            </CardTitle>
            <CardDescription>
              <span className="text-lg font-semibold text-foreground">Free</span>
              <br />
              Get started with the basics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check size={18} className="text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            {currentPlan === "free" ? (
              <Badge variant="secondary" className="w-full justify-center py-2 text-sm">
                ✓ Your current plan
              </Badge>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Downgrade via Manage Subscription
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={`relative overflow-hidden ${currentPlan === "pro" ? "border-accent shadow-glow" : "border-accent/50"}`}>
          {currentPlan === "pro" && (
            <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground">Current Plan</Badge>
          )}
          <CardHeader>
            <CardTitle className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">$9.99</span>
              <span className="text-muted-foreground font-normal">/month</span>
            </CardTitle>
            <CardDescription>
              <span className="text-lg font-semibold text-foreground">Fundza Pro</span>
              <br />
              Everything you need to manage your finances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check size={18} className="text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            {currentPlan === "pro" ? (
              <Badge variant="secondary" className="w-full justify-center py-2 text-sm">
                ✓ You're subscribed
              </Badge>
            ) : (
              <Button
                className="w-full"
                disabled={isLoading}
                onClick={() => startCheckout("pro")}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Sparkles size={16} className="mr-2" />
                )}
                Subscribe Now
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="font-medium text-foreground">Can I cancel anytime?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">What payment methods do you accept?</p>
            <p className="text-sm text-muted-foreground mt-1">
              We accept all major credit cards, debit cards, and PayPal.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Is my data secure?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Absolutely. We use bank-level encryption to protect your data and never share it with third parties.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
