import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractVendorName } from '@/lib/vendorExtractor';
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

const QUERY_LIMIT = 5000;

export function useDashboardData(dateFilter?: { start: Date | null; end: Date | null }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hitLimit, setHitLimit] = useState(false);

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
      .limit(QUERY_LIMIT);

    if (dateFilter?.start) {
      query = query.gte('transaction_date', dateFilter.start.toISOString().split('T')[0]);
    }
    if (dateFilter?.end) {
      query = query.lte('transaction_date', dateFilter.end.toISOString().split('T')[0]);
    }

    const { data } = await query;

    const results = data || [];
    setTransactions(results);
    setHitLimit(results.length >= QUERY_LIMIT);
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

  // Clamp savings rate between -100 and 100, show "N/A" when income < $50
  const savingsRate: number | 'N/A' = stats.totalIncome < 50
    ? 'N/A'
    : Math.max(-100, Math.min(100, Math.round(((stats.totalIncome - stats.totalSpending) / stats.totalIncome) * 100)));

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

  // Top merchants by total spend
  const topMerchants = transactions
    .filter(t => t.direction === 'debit' && !t.is_transfer)
    .reduce((acc, t) => {
      const merchant = extractVendorName(t.merchant_normalized || t.description_raw || 'Unknown');
      const existing = acc.find(m => m.name === merchant);
      if (existing) {
        existing.total += t.amount;
        existing.count += 1;
      } else {
        acc.push({ name: merchant, total: t.amount, count: 1 });
      }
      return acc;
    }, [] as { name: string; total: number; count: number }[])
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // Monthly trends — respect date filter
  const monthlyTrends: MonthlyTrend[] = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trends: MonthlyTrend[] = [];

    if (dateFilter?.start && dateFilter?.end) {
      // Generate months within the filtered date range
      const start = new Date(dateFilter.start.getFullYear(), dateFilter.start.getMonth(), 1);
      const end = new Date(dateFilter.end.getFullYear(), dateFilter.end.getMonth(), 1);
      
      const current = new Date(start);
      while (current <= end) {
        const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        const monthName = monthNames[current.getMonth()];
        
        const monthTransactions = transactions.filter(t => 
          t.transaction_date.startsWith(monthKey)
        );
        
        trends.push({
          month: monthName,
          spending: monthTransactions
            .filter(t => t.direction === 'debit' && !t.is_transfer)
            .reduce((sum, t) => sum + t.amount, 0),
          income: monthTransactions
            .filter(t => t.direction === 'credit' && !t.is_transfer)
            .reduce((sum, t) => sum + t.amount, 0),
        });
        
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // Default: last 6 calendar months
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = monthNames[date.getMonth()];
        
        const monthTransactions = transactions.filter(t => 
          t.transaction_date.startsWith(monthKey)
        );
        
        trends.push({
          month: monthName,
          spending: monthTransactions
            .filter(t => t.direction === 'debit' && !t.is_transfer)
            .reduce((sum, t) => sum + t.amount, 0),
          income: monthTransactions
            .filter(t => t.direction === 'credit' && !t.is_transfer)
            .reduce((sum, t) => sum + t.amount, 0),
        });
      }
    }

    return trends;
  }, [transactions, dateFilter?.start?.getTime(), dateFilter?.end?.getTime()]);

  return {
    isLoading,
    stats,
    savingsRate,
    spendingByCategory,
    monthlyTrends,
    topMerchants,
    transactionCount: transactions.length,
    hitLimit,
    refetch: fetchTransactions,
  };
}
