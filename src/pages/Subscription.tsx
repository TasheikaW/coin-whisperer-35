import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Sparkles, Settings, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription, PlanKey } from "@/hooks/useSubscription";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "@/components/ui/sonner";

const plans: {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  limitations?: string[];
  popular?: boolean;
}[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for getting started",
    features: [
      "5 uploads per month",
      "100 transactions stored",
      "Basic categorization",
      "Monthly dashboard",
      "CSV export",
    ],
    limitations: [
      "No AI insights",
      "No advanced reports",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$9.99",
    period: "/month",
    description: "For power users who want it all",
    features: [
      "Unlimited uploads",
      "Unlimited transactions",
      "AI-powered categorization",
      "Smart insights",
      "Advanced reports",
      "Priority support",
      "Custom categories",
      "Multiple currencies",
    ],
    popular: true,
  },
  {
    key: "family",
    name: "Family",
    price: "$19.99",
    period: "/month",
    description: "Share with up to 5 family members",
    features: [
      "Everything in Pro",
      "5 user accounts",
      "Shared budgets",
      "Family dashboard",
      "Parental controls",
      "Premium support",
    ],
  },
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

  const getButtonProps = (planKey: PlanKey) => {
    const isCurrent = currentPlan === planKey;

    if (isCurrent) {
      return {
        text: "Current Plan",
        variant: "secondary" as const,
        disabled: true,
        onClick: () => {},
      };
    }

    if (planKey === "free") {
      return {
        text: subscribed ? "Manage Subscription" : "Current Plan",
        variant: "outline" as const,
        disabled: !subscribed,
        onClick: openPortal,
      };
    }

    return {
      text: `Upgrade to ${planKey === "pro" ? "Pro" : "Family"}`,
      variant: "default" as const,
      disabled: false,
      onClick: () => startCheckout(planKey as "pro" | "family"),
    };
  };

  return (
    <AppLayout>
      <PageHeader
        title="Subscription"
        description="Choose the plan that works best for you"
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
                  {isLoading ? "Loading..." : `${plans.find(p => p.key === currentPlan)?.name} Plan`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscriptionEnd
                    ? `Renews on ${new Date(subscriptionEnd).toLocaleDateString()}`
                    : "Free tier"}
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

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          const btnProps = getButtonProps(plan.key);

          return (
            <Card
              key={plan.name}
              className={cn(
                "relative overflow-hidden transition-all",
                plan.popular && "border-accent shadow-glow",
                isCurrent && "border-accent/50 ring-2 ring-accent/20"
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                  <div className="flex items-center gap-1">
                    <Crown size={12} />
                    Most Popular
                  </div>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-0 left-0 bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-br-lg">
                  Your Plan
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground font-normal">{plan.period}</span>
                </CardTitle>
                <CardDescription>
                  <span className="text-lg font-semibold text-foreground">{plan.name}</span>
                  <br />
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check size={18} className="text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations?.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-3 opacity-50">
                      <span className="w-[18px] text-center text-muted-foreground">—</span>
                      <span className="text-sm text-muted-foreground line-through">{limitation}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={btnProps.variant}
                  disabled={btnProps.disabled || isLoading}
                  onClick={btnProps.onClick}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : plan.popular && !isCurrent ? (
                    <Sparkles size={16} className="mr-2" />
                  ) : null}
                  {btnProps.text}
                </Button>
              </CardContent>
            </Card>
          );
        })}
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
