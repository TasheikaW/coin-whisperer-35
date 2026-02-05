import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useCategoryRules() {
  const { toast } = useToast();

  const countMatchingTransactions = useCallback(async (merchantPattern: string, excludeTransactionId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !merchantPattern) return 0;

    let query = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .ilike('merchant_normalized', `%${merchantPattern}%`);

    if (excludeTransactionId) {
      query = query.neq('id', excludeTransactionId);
    }

    const { count } = await query;
    return count || 0;
  }, []);

  const saveRuleAndApplyToAll = useCallback(async (
    merchantPattern: string,
    categoryId: string,
    categoryName: string
  ): Promise<{ success: boolean; updatedCount: number }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, updatedCount: 0 };
    }

    try {
      // Check if rule already exists for this pattern
      const { data: existingRule } = await supabase
        .from('category_rules')
        .select('id')
        .eq('user_id', user.id)
        .ilike('pattern', merchantPattern.toLowerCase())
        .single();

      if (existingRule) {
        // Update existing rule
        const { error: updateError } = await supabase
          .from('category_rules')
          .update({ category_id: categoryId })
          .eq('id', existingRule.id);

        if (updateError) throw updateError;
      } else {
        // Insert new rule
        const { error: insertError } = await supabase
          .from('category_rules')
          .insert({
            user_id: user.id,
            category_id: categoryId,
            pattern: merchantPattern.toLowerCase(),
            pattern_type: 'merchant',
            priority: 10,
          });

        if (insertError) throw insertError;
      }

      // Update all matching transactions
      const { data: updatedTransactions, error: updateError } = await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .eq('user_id', user.id)
        .ilike('merchant_normalized', `%${merchantPattern}%`)
        .select('id');

      if (updateError) throw updateError;

      const updatedCount = updatedTransactions?.length || 0;

      toast({
        title: 'Rule saved',
        description: `Updated ${updatedCount} transaction${updatedCount !== 1 ? 's' : ''} to "${categoryName}"`,
      });

      return { success: true, updatedCount };
    } catch (error) {
      toast({
        title: 'Error saving rule',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return { success: false, updatedCount: 0 };
    }
  }, [toast]);

  return {
    countMatchingTransactions,
    saveRuleAndApplyToAll,
  };
}
