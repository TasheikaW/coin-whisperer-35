import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { startOfMonth, endOfMonth, subMonths, format, differenceInMonths } from 'date-fns';

type Transaction = Tables<'transactions'> & {
  categories?: { name: string; color: string | null } | null;
};

type Budget = Tables<'budgets'> & {
  categories?: { name: string; color: string | null } | null;
};

export interface PeriodData {
  totalSpending: number;
  totalIncome: number;
  netCashFlow: number;
  transactionCount: number;
  byCategory: { name: string; amount: number; color: string }[];
  byMonth: { month: string; spending: number; income: number; netFlow: number }[];
}

export interface CategoryComparison {
  name: string;
  color: string;
  currentSpend: number;
  previousSpend: number;
  budgetAmount: number | null;
  percentChange: number;
  isOverBudget: boolean;
}

export interface ReportInsight {
  type: 'info' | 'warning' | 'success';
  title: string;
  description: string;
}

export type PeriodType = 'month' | 'quarter' | 'ytd' | 'custom';
export type ChartType = 'grouped' | 'stacked';

export function useReportsData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodType, setPeriodType] = useState<PeriodType>('quarter');
  const [chartType, setChartType] = useState<ChartType>('grouped');
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    const [transactionsRes, budgetsRes] = await Promise.all([
      supabase
        .from('transactions')
        .select(`*, categories (name, color)`)
        .order('transaction_date', { ascending: false })
        .limit(2000),
      supabase
        .from('budgets')
        .select(`*, categories (name, color)`)
        .eq('is_active', true)
    ]);

    setTransactions(transactionsRes.data || []);
    setBudgets(budgetsRes.data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate date ranges based on period type
  const dateRanges = useMemo(() => {
    const now = new Date();
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

    switch (periodType) {
      case 'month':
        currentStart = startOfMonth(now);
        currentEnd = endOfMonth(now);
        previousStart = startOfMonth(subMonths(now, 1));
        previousEnd = endOfMonth(subMonths(now, 1));
        break;
      case 'quarter':
        currentStart = startOfMonth(subMonths(now, 2));
        currentEnd = endOfMonth(now);
        previousStart = startOfMonth(subMonths(now, 5));
        previousEnd = endOfMonth(subMonths(now, 3));
        break;
      case 'ytd':
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = now;
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'custom':
        if (customRange) {
          currentStart = customRange.start;
          currentEnd = customRange.end;
          const duration = differenceInMonths(currentEnd, currentStart) + 1;
          previousStart = subMonths(currentStart, duration);
          previousEnd = subMonths(currentEnd, duration);
        } else {
          currentStart = startOfMonth(subMonths(now, 2));
          currentEnd = endOfMonth(now);
          previousStart = startOfMonth(subMonths(now, 5));
          previousEnd = endOfMonth(subMonths(now, 3));
        }
        break;
      default:
        currentStart = startOfMonth(subMonths(now, 2));
        currentEnd = endOfMonth(now);
        previousStart = startOfMonth(subMonths(now, 5));
        previousEnd = endOfMonth(subMonths(now, 3));
    }

    return { currentStart, currentEnd, previousStart, previousEnd };
  }, [periodType, customRange]);

  // Filter transactions for current and previous periods
  const filterTransactions = useCallback((start: Date, end: Date) => {
    return transactions.filter(t => {
      const date = new Date(t.transaction_date);
      return date >= start && date <= end;
    });
  }, [transactions]);

  // Calculate period data
  const calculatePeriodData = useCallback((txns: Transaction[]): PeriodData => {
    const spending = txns
      .filter(t => t.direction === 'debit' && !t.is_transfer)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const income = txns
      .filter(t => t.direction === 'credit' && !t.is_transfer)
      .reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const categoryMap = new Map<string, { amount: number; color: string }>();
    txns
      .filter(t => t.direction === 'debit' && !t.is_transfer)
      .forEach(t => {
        const name = t.categories?.name || 'Uncategorized';
        const existing = categoryMap.get(name);
        if (existing) {
          existing.amount += t.amount;
        } else {
          categoryMap.set(name, {
            amount: t.amount,
            color: t.categories?.color || '#94a3b8'
          });
        }
      });

    const byCategory = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);

    // Group by month
    const monthMap = new Map<string, { spending: number; income: number }>();
    txns.forEach(t => {
      const monthKey = format(new Date(t.transaction_date), 'MMM yyyy');
      const existing = monthMap.get(monthKey) || { spending: 0, income: 0 };
      
      if (t.direction === 'debit' && !t.is_transfer) {
        existing.spending += t.amount;
      } else if (t.direction === 'credit' && !t.is_transfer) {
        existing.income += t.amount;
      }
      monthMap.set(monthKey, existing);
    });

    const byMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        spending: data.spending,
        income: data.income,
        netFlow: data.income - data.spending
      }))
      .reverse();

    return {
      totalSpending: spending,
      totalIncome: income,
      netCashFlow: income - spending,
      transactionCount: txns.length,
      byCategory,
      byMonth
    };
  }, []);

  // Current and previous period data
  const currentPeriodData = useMemo(() => {
    const txns = filterTransactions(dateRanges.currentStart, dateRanges.currentEnd);
    return calculatePeriodData(txns);
  }, [filterTransactions, dateRanges, calculatePeriodData]);

  const previousPeriodData = useMemo(() => {
    const txns = filterTransactions(dateRanges.previousStart, dateRanges.previousEnd);
    return calculatePeriodData(txns);
  }, [filterTransactions, dateRanges, calculatePeriodData]);

  // Calculate percentage changes
  const spendingChange = useMemo(() => {
    if (previousPeriodData.totalSpending === 0) return 0;
    return ((currentPeriodData.totalSpending - previousPeriodData.totalSpending) / previousPeriodData.totalSpending) * 100;
  }, [currentPeriodData.totalSpending, previousPeriodData.totalSpending]);

  const incomeChange = useMemo(() => {
    if (previousPeriodData.totalIncome === 0) return 0;
    return ((currentPeriodData.totalIncome - previousPeriodData.totalIncome) / previousPeriodData.totalIncome) * 100;
  }, [currentPeriodData.totalIncome, previousPeriodData.totalIncome]);

  // Category comparisons with budget info
  const categoryComparisons = useMemo((): CategoryComparison[] => {
    const currentCategories = currentPeriodData.byCategory;
    const previousMap = new Map(previousPeriodData.byCategory.map(c => [c.name, c.amount]));
    const budgetMap = new Map(
      budgets.map(b => [b.categories?.name || '', b.amount])
    );

    return currentCategories.map(cat => {
      const previousSpend = previousMap.get(cat.name) || 0;
      const budgetAmount = budgetMap.get(cat.name) || null;
      const percentChange = previousSpend > 0 
        ? ((cat.amount - previousSpend) / previousSpend) * 100 
        : 0;

      return {
        name: cat.name,
        color: cat.color,
        currentSpend: cat.amount,
        previousSpend,
        budgetAmount,
        percentChange,
        isOverBudget: budgetAmount !== null && cat.amount > budgetAmount
      };
    });
  }, [currentPeriodData.byCategory, previousPeriodData.byCategory, budgets]);

  // Generate smart insights
  const insights = useMemo((): ReportInsight[] => {
    const result: ReportInsight[] = [];
    const monthCount = currentPeriodData.byMonth.length;
    const avgMonthlySpend = monthCount > 0 ? currentPeriodData.totalSpending / monthCount : 0;

    // Overall spending change
    if (Math.abs(spendingChange) > 10) {
      const direction = spendingChange > 0 ? 'increased' : 'decreased';
      const type = spendingChange > 0 ? 'warning' : 'success';
      
      // Find biggest category contributor
      const biggestCategory = categoryComparisons.reduce((max, cat) => 
        Math.abs(cat.percentChange) > Math.abs(max?.percentChange || 0) ? cat : max
      , categoryComparisons[0]);
      
      result.push({
        type,
        title: `Spending ${direction} ${Math.abs(spendingChange).toFixed(0)}%`,
        description: biggestCategory 
          ? `Driven primarily by ${biggestCategory.name} (${biggestCategory.percentChange > 0 ? '+' : ''}${biggestCategory.percentChange.toFixed(0)}%)`
          : `Compared to the previous period`
      });
    }

    // Over budget categories
    const overBudgetCats = categoryComparisons.filter(c => c.isOverBudget);
    if (overBudgetCats.length > 0) {
      result.push({
        type: 'warning',
        title: `${overBudgetCats.length} ${overBudgetCats.length === 1 ? 'category' : 'categories'} over budget`,
        description: overBudgetCats.map(c => c.name).join(', ')
      });
    }

    // Consecutive increase detection
    const monthlySpending = currentPeriodData.byMonth.map(m => m.spending);
    let consecutiveIncreases = 0;
    for (let i = 1; i < monthlySpending.length; i++) {
      if (monthlySpending[i] > monthlySpending[i - 1]) {
        consecutiveIncreases++;
      } else {
        consecutiveIncreases = 0;
      }
    }
    if (consecutiveIncreases >= 2) {
      result.push({
        type: 'info',
        title: `Spending rising for ${consecutiveIncreases + 1} consecutive months`,
        description: 'Consider reviewing your recent expenses'
      });
    }

    // Cash flow insight
    if (currentPeriodData.netCashFlow < 0) {
      result.push({
        type: 'warning',
        title: 'Negative cash flow this period',
        description: `Spending exceeded income by ${formatCurrency(Math.abs(currentPeriodData.netCashFlow))}`
      });
    } else if (currentPeriodData.netCashFlow > 0) {
      const savingsRate = (currentPeriodData.netCashFlow / currentPeriodData.totalIncome) * 100;
      result.push({
        type: 'success',
        title: `Positive cash flow: ${formatCurrency(currentPeriodData.netCashFlow)}`,
        description: `You're saving ${savingsRate.toFixed(0)}% of your income`
      });
    }

    // Stable category insight
    const stableCategories = categoryComparisons.filter(c => 
      Math.abs(c.percentChange) < 5 && c.currentSpend > 100
    );
    if (stableCategories.length > 0) {
      result.push({
        type: 'info',
        title: 'Stable spending categories',
        description: `${stableCategories.map(c => c.name).slice(0, 3).join(', ')} remained consistent`
      });
    }

    return result.slice(0, 5);
  }, [currentPeriodData, spendingChange, categoryComparisons]);

  // Monthly chart data with MoM changes
  const monthlyChartData = useMemo(() => {
    return currentPeriodData.byMonth.map((month, idx, arr) => {
      const previousMonth = idx > 0 ? arr[idx - 1].spending : 0;
      const momChange = previousMonth > 0 
        ? ((month.spending - previousMonth) / previousMonth) * 100 
        : 0;

      // Get category breakdown for this month
      const monthTransactions = transactions.filter(t => {
        const txnMonth = format(new Date(t.transaction_date), 'MMM yyyy');
        return txnMonth === month.month && t.direction === 'debit' && !t.is_transfer;
      });

      const categoryBreakdown: Record<string, number> = {};
      monthTransactions.forEach(t => {
        const name = t.categories?.name || 'Uncategorized';
        categoryBreakdown[name] = (categoryBreakdown[name] || 0) + t.amount;
      });

      return {
        ...month,
        momChange,
        ...categoryBreakdown
      };
    });
  }, [currentPeriodData.byMonth, transactions]);

  // Get unique categories for chart
  const chartCategories = useMemo(() => {
    return currentPeriodData.byCategory.slice(0, 6).map(c => ({
      name: c.name,
      color: c.color
    }));
  }, [currentPeriodData.byCategory]);

  return {
    isLoading,
    periodType,
    setPeriodType,
    chartType,
    setChartType,
    customRange,
    setCustomRange,
    dateRanges,
    currentPeriodData,
    previousPeriodData,
    spendingChange,
    incomeChange,
    categoryComparisons,
    insights,
    monthlyChartData,
    chartCategories,
    refetch: fetchData
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}
