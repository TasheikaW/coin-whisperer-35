import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

export type Budget = Tables<'budgets'> & {
  categories: { name: string; icon: string | null; color: string | null } | null;
};

export interface BudgetWithSpending extends Budget {
  spent: number;
  percentUsed: number;
  remaining: number;
  isOverBudget: boolean;
  expectedSpend: number;
  expectedPercent: number;
  status: 'on-track' | 'at-risk' | 'over-budget';
  projectedSpend: number;
  projectedOverage: number;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  netRemaining: number;
  overBudgetAmount: number;
  categoriesOverBudget: number;
  daysRemaining: number;
  daysElapsed: number;
  daysInMonth: number;
  percentMonthElapsed: number;
}

export interface BudgetInsight {
  id: string;
  type: 'warning' | 'info' | 'success';
  category?: string;
  message: string;
  action?: string;
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getDaysElapsed(date: Date): number {
  return date.getDate();
}

export function useBudgets(dateFilter?: { start: Date | null; end: Date | null }) {
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Use date filter or default to current month
  const now = new Date();
  const filterStart = dateFilter?.start ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const filterEnd = dateFilter?.end ?? new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const daysInRange = Math.max(1, Math.round((filterEnd.getTime() - filterStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const daysElapsed = Math.max(0, Math.min(daysInRange, Math.round((now.getTime() - filterStart.getTime()) / (1000 * 60 * 60 * 24)) + 1));
  const daysRemaining = Math.max(0, daysInRange - daysElapsed);
  const percentMonthElapsed = (daysElapsed / daysInRange) * 100;

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Use filter dates
    const startDate = filterStart.toISOString().split('T')[0];
    const endDate = filterEnd.toISOString().split('T')[0];

    // Fetch budgets with categories
    const { data: budgetsData, error: budgetsError } = await supabase
      .from('budgets')
      .select(`
        *,
        categories (name, icon, color)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (budgetsError) {
      toast({
        title: 'Error fetching budgets',
        description: budgetsError.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Fetch spending per category for current month (only debits, excluding transfers)
    const { data: spendingData, error: spendingError } = await supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('direction', 'debit')
      .eq('is_transfer', false)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (spendingError) {
      toast({
        title: 'Error fetching spending data',
        description: spendingError.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Calculate spending per category
    const spendingByCategory: Record<string, number> = {};
    spendingData?.forEach(t => {
      if (t.category_id) {
        spendingByCategory[t.category_id] = (spendingByCategory[t.category_id] || 0) + Number(t.amount);
      }
    });

    // Combine budgets with spending data
    const budgetsWithSpending: BudgetWithSpending[] = (budgetsData || []).map(budget => {
      const spent = spendingByCategory[budget.category_id] || 0;
      const budgetAmount = Number(budget.amount);
      const percentUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
      const remaining = budgetAmount - spent;
      const isOverBudget = spent > budgetAmount;
      
      // Expected spend based on time elapsed
      const expectedSpend = (budgetAmount * daysElapsed) / daysInRange;
      const expectedPercent = (daysElapsed / daysInRange) * 100;
      
      // Projected spend at month end based on current rate
      const dailySpendRate = daysElapsed > 0 ? spent / daysElapsed : 0;
      const projectedSpend = dailySpendRate * daysInRange;
      const projectedOverage = Math.max(0, projectedSpend - budgetAmount);
      
      // Determine status
      let status: 'on-track' | 'at-risk' | 'over-budget' = 'on-track';
      if (isOverBudget) {
        status = 'over-budget';
      } else if (percentUsed >= 80 || projectedSpend > budgetAmount) {
        status = 'at-risk';
      }

      return {
        ...budget,
        spent,
        percentUsed,
        remaining,
        isOverBudget,
        expectedSpend,
        expectedPercent,
        status,
        projectedSpend,
        projectedOverage,
      };
    });

    setBudgets(budgetsWithSpending);
    setIsLoading(false);
  }, [toast, daysElapsed, daysInRange, filterStart.getTime(), filterEnd.getTime()]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const summary: BudgetSummary = useMemo(() => {
    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const netRemaining = totalBudget - totalSpent;
    const overBudgetAmount = budgets
      .filter(b => b.isOverBudget)
      .reduce((sum, b) => sum + (b.spent - Number(b.amount)), 0);
    const categoriesOverBudget = budgets.filter(b => b.isOverBudget).length;

    return {
      totalBudget,
      totalSpent,
      netRemaining,
      overBudgetAmount,
      categoriesOverBudget,
      daysRemaining,
      daysElapsed,
      daysInMonth: daysInRange,
      percentMonthElapsed,
    };
  }, [budgets, daysRemaining, daysElapsed, daysInRange, percentMonthElapsed]);

  const insights: BudgetInsight[] = useMemo(() => {
    const result: BudgetInsight[] = [];

    // Over budget warnings
    budgets.filter(b => b.isOverBudget).forEach(b => {
      const overage = b.spent - Number(b.amount);
      result.push({
        id: `over-${b.id}`,
        type: 'warning',
        category: b.categories?.name,
        message: `${b.categories?.name || 'Unknown'} is over budget by $${overage.toFixed(0)}`,
        action: 'Review transactions',
      });
    });

    // At risk projections
    budgets.filter(b => b.status === 'at-risk' && !b.isOverBudget).forEach(b => {
      const projectedOver = b.projectedSpend - Number(b.amount);
      if (projectedOver > 0) {
        result.push({
          id: `risk-${b.id}`,
          type: 'warning',
          category: b.categories?.name,
          message: `You're likely to exceed ${b.categories?.name || 'budget'} by $${projectedOver.toFixed(0)} this month`,
          action: `Reduce daily spending by $${(projectedOver / daysRemaining).toFixed(0)}`,
        });
      }
    });

    // On track success
    const onTrackCount = budgets.filter(b => b.status === 'on-track').length;
    if (onTrackCount > 0 && budgets.length > 0) {
      result.push({
        id: 'on-track-summary',
        type: 'success',
        message: `${onTrackCount} of ${budgets.length} budgets are on track for this month`,
      });
    }

    // Low spending encouragement
    budgets.filter(b => b.percentUsed < 50 && percentMonthElapsed > 50).forEach(b => {
      result.push({
        id: `saving-${b.id}`,
        type: 'info',
        category: b.categories?.name,
        message: `${b.categories?.name || 'Category'} spending is ${(b.expectedPercent - b.percentUsed).toFixed(0)}% below expected`,
      });
    });

    return result.slice(0, 6); // Limit to 6 insights
  }, [budgets, daysRemaining, percentMonthElapsed]);

  const createBudget = useCallback(async (categoryId: string, amount: number, period: string = 'monthly') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('budgets')
      .insert({
        user_id: user.id,
        category_id: categoryId,
        amount,
        period,
      });

    if (error) {
      toast({
        title: 'Error creating budget',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    await fetchBudgets();
    return true;
  }, [toast, fetchBudgets]);

  const updateBudget = useCallback(async (id: string, amount: number) => {
    const { error } = await supabase
      .from('budgets')
      .update({ amount })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error updating budget',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    setBudgets(prev => 
      prev.map(b => b.id === id ? { ...b, amount } : b)
    );
    await fetchBudgets();
    return true;
  }, [toast, fetchBudgets]);

  const deleteBudget = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting budget',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    setBudgets(prev => prev.filter(b => b.id !== id));
    return true;
  }, [toast]);

  return {
    budgets,
    summary,
    insights,
    isLoading,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
  };
}
