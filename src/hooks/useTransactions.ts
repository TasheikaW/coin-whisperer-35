import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

export type Transaction = Tables<'transactions'> & {
  categories?: { name: string; icon: string | null; color: string | null } | null;
  accounts?: { name: string } | null;
  uploads?: { filename: string } | null;
};

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const uploadFilter = searchParams.get('upload');

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
        categories (name, icon, color),
        accounts (name),
        uploads (filename)
      `)
      .order('transaction_date', { ascending: false })
      .limit(500);

    if (uploadFilter) {
      query = query.eq('upload_id', uploadFilter);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: 'Error fetching transactions',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setTransactions(data || []);
    }
    setIsLoading(false);
  }, [toast, uploadFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Tables<'transactions'>>) => {
    const { error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error updating transaction',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    setTransactions(prev => 
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    );
    return true;
  }, [toast]);

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting transaction',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
    return true;
  }, [toast]);

  return {
    transactions,
    isLoading,
    uploadFilter,
    fetchTransactions,
    updateTransaction,
    deleteTransaction,
  };
}
