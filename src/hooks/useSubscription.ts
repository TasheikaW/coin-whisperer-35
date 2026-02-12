import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Stripe product/price mapping
export const PLANS = {
  pro: {
    product_id: "prod_Ty5fxfgLjECkGC",
    price_id: "price_1T09TtBfGbdtOF5aFRBPb7zm",
    name: "Pro",
    price: "$9.99",
  },
  family: {
    product_id: "prod_Ty5fyWcEakvgfA",
    price_id: "price_1T09UKBfGbdtOF5aeMgJAz19",
    name: "Family",
    price: "$19.99",
  },
} as const;

export type PlanKey = keyof typeof PLANS | "free";

interface SubscriptionState {
  subscribed: boolean;
  currentPlan: PlanKey;
  subscriptionEnd: string | null;
  isLoading: boolean;
}

export function useSubscription() {
  const { session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    currentPlan: "free",
    subscriptionEnd: null,
    isLoading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setState({ subscribed: false, currentPlan: "free", subscriptionEnd: null, isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      let currentPlan: PlanKey = "free";
      if (data?.subscribed && data?.product_id) {
        if (data.product_id === PLANS.pro.product_id) currentPlan = "pro";
        else if (data.product_id === PLANS.family.product_id) currentPlan = "family";
      }

      setState({
        subscribed: data?.subscribed ?? false,
        currentPlan,
        subscriptionEnd: data?.subscription_end ?? null,
        isLoading: false,
      });
    } catch (err) {
      console.error("Error checking subscription:", err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [session?.access_token]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const startCheckout = async (planKey: "pro" | "family") => {
    if (!session?.access_token) return;
    const plan = PLANS[planKey];

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { priceId: plan.price_id },
    });

    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  };

  const openPortal = async () => {
    if (!session?.access_token) return;

    const { data, error } = await supabase.functions.invoke("customer-portal", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  };

  return {
    ...state,
    checkSubscription,
    startCheckout,
    openPortal,
  };
}
