import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Transaction = Tables<'transactions'> & {
  categories?: { name: string; color: string | null } | null;
};

interface SpendingByCategory {
  name: string;
  value: number;
  color: string;
}

interface MonthlyTrend {
  month: string;
  spending: number;
  income: number;
}

interface BudgetProgress {
  category: string;
  spent: number;
  budget: number;
}

export function useDashboardData(dateFilter?: { start: Date | null; end: Date | null }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    let query = supabase
      .from('transactions')
      .select(`
        *,
        categories (name, color)
      `)
      .order('transaction_date', { ascending: false })
      .limit(1000);

    if (dateFilter?.start) {
      query = query.gte('transaction_date', dateFilter.start.toISOString().split('T')[0]);
    }
    if (dateFilter?.end) {
      query = query.lte('transaction_date', dateFilter.end.toISOString().split('T')[0]);
    }

    const { data } = await query;

    setTransactions(data || []);
    setIsLoading(false);
  }, [dateFilter?.start?.getTime(), dateFilter?.end?.getTime()]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Calculate stats
  const stats = {
    totalSpending: transactions
      .filter(t => t.direction === 'debit' && !t.is_transfer)
      .reduce((sum, t) => sum + t.amount, 0),
    totalIncome: transactions
      .filter(t => t.direction === 'credit' && !t.is_transfer)
      .reduce((sum, t) => sum + t.amount, 0),
    transactionCount: transactions.length,
  };

  const savingsRate = stats.totalIncome > 0 
    ? Math.round(((stats.totalIncome - stats.totalSpending) / stats.totalIncome) * 100)
    : 0;

  // Spending by category
  const spendingByCategory: SpendingByCategory[] = transactions
    .filter(t => t.direction === 'debit' && !t.is_transfer)
    .reduce((acc, t) => {
      const categoryName = t.categories?.name || 'Uncategorized';
      const existing = acc.find(c => c.name === categoryName);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({
          name: categoryName,
          value: t.amount,
          color: t.categories?.color || '#94a3b8',
        });
      }
      return acc;
    }, [] as SpendingByCategory[])
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Monthly trends
  const monthlyTrends: MonthlyTrend[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = monthNames[date.getMonth()];
    
    const monthTransactions = transactions.filter(t => 
      t.transaction_date.startsWith(monthKey)
    );
    
    monthlyTrends.push({
      month: monthName,
      spending: monthTransactions
        .filter(t => t.direction === 'debit' && !t.is_transfer)
        .reduce((sum, t) => sum + t.amount, 0),
      income: monthTransactions
        .filter(t => t.direction === 'credit' && !t.is_transfer)
        .reduce((sum, t) => sum + t.amount, 0),
    });
  }

  return {
    isLoading,
    stats,
    savingsRate,
    spendingByCategory,
    monthlyTrends,
    transactionCount: transactions.length,
    refetch: fetchTransactions,
  };
}
