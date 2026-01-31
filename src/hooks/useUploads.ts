import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseFile } from '@/lib/fileParser';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Upload = Tables<'uploads'>;

interface StagedFile {
  file: File;
  id: string;
  name: string;
  type: 'csv' | 'xlsx' | 'pdf';
  size: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileType = (file: File): 'csv' | 'xlsx' | 'pdf' => {
  if (file.name.endsWith('.csv') || file.type === 'text/csv') return 'csv';
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return 'xlsx';
  return 'pdf';
};

export function useUploads() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchUploads = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .order('upload_date', { ascending: false });

    if (error) {
      toast({
        title: 'Error fetching uploads',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setUploads(data || []);
    }
    setIsLoading(false);
  }, [toast]);

  const addStagedFiles = useCallback((files: File[]) => {
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/pdf'];
    const validFiles = files.filter(file => 
      validTypes.includes(file.type) || 
      file.name.endsWith('.csv') || 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.pdf')
    );

    if (validFiles.length === 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload CSV, XLSX, or PDF files only.',
        variant: 'destructive',
      });
      return;
    }

    const newStagedFiles: StagedFile[] = validFiles.map(file => ({
      file,
      id: `staged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: getFileType(file),
      size: formatFileSize(file.size),
    }));

    setStagedFiles(prev => [...prev, ...newStagedFiles]);
    
    toast({
      title: 'Files added',
      description: `${validFiles.length} file(s) ready for upload. Click "Upload Files" to proceed.`,
    });
  }, [toast]);

  const removeStagedFile = useCallback((id: string) => {
    setStagedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const processUpload = useCallback(async () => {
    if (stagedFiles.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to upload files.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    // Fetch categories and rules for auto-categorization
    const [categoriesResult, rulesResult] = await Promise.all([
      supabase.from('categories').select('id, name').or(`user_id.is.null,user_id.eq.${user.id}`),
      supabase.from('category_rules').select('category_id, pattern, pattern_type').eq('user_id', user.id),
    ]);

    const categories = categoriesResult.data || [];
    const rules = rulesResult.data || [];

    // Build category lookup by name (lowercase)
    const categoryByName: Record<string, string> = {};
    categories.forEach(c => {
      categoryByName[c.name.toLowerCase()] = c.id;
    });

    // Keyword mappings for auto-categorization
    const keywordMappings: Record<string, string[]> = {
      groceries: ['grocery', 'supermarket', 'walmart', 'target', 'costco', 'kroger', 'safeway', 'trader joe', 'whole foods', 'aldi', 'publix', 'food lion'],
      dining: ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonalds', 'burger', 'pizza', 'chipotle', 'subway', 'wendys', 'taco bell', 'dunkin', 'grubhub', 'doordash', 'uber eats'],
      transportation: ['uber', 'lyft', 'gas', 'fuel', 'shell', 'exxon', 'chevron', 'bp', 'parking', 'toll', 'transit', 'metro', 'bus'],
      utilities: ['electric', 'power', 'water', 'gas bill', 'internet', 'comcast', 'verizon', 'att', 't-mobile', 'spectrum'],
      entertainment: ['netflix', 'spotify', 'hulu', 'disney', 'amazon prime', 'movie', 'theater', 'concert', 'ticket', 'gaming', 'steam', 'playstation', 'xbox'],
      shopping: ['amazon', 'ebay', 'etsy', 'best buy', 'apple store', 'mall', 'clothing', 'shoes', 'nike', 'adidas'],
      health: ['pharmacy', 'cvs', 'walgreens', 'doctor', 'hospital', 'medical', 'dental', 'vision', 'gym', 'fitness'],
      subscriptions: ['subscription', 'membership', 'monthly', 'annual fee', 'renewal'],
      travel: ['airline', 'hotel', 'airbnb', 'booking', 'expedia', 'flight', 'travel', 'vacation'],
      'rent/mortgage': ['rent', 'mortgage', 'lease', 'property'],
      income: ['payroll', 'salary', 'direct deposit', 'wage', 'bonus', 'commission'],
      transfer: ['transfer', 'xfer', 'tfr', 'zelle', 'venmo', 'paypal', 'cash app'],
    };

    // Auto-categorize function
    const autoCategorize = (description: string, direction: string): string | null => {
      const descLower = description.toLowerCase();

      // 1. Check user's saved rules first (highest priority)
      for (const rule of rules) {
        if (rule.pattern_type === 'merchant' && descLower.includes(rule.pattern.toLowerCase())) {
          return rule.category_id;
        }
      }

      // 2. Keyword matching
      for (const [categoryName, keywords] of Object.entries(keywordMappings)) {
        for (const keyword of keywords) {
          if (descLower.includes(keyword)) {
            return categoryByName[categoryName] || null;
          }
        }
      }

      // 3. Income detection based on direction
      if (direction === 'credit' && categoryByName['income']) {
        return categoryByName['income'];
      }

      return null; // Uncategorized
    };

    for (const staged of stagedFiles) {
      try {
        // 1. Parse the file
        const parseResult = await parseFile(staged.file);
        
        if (!parseResult.success) {
          toast({
            title: `Failed to parse ${staged.name}`,
            description: parseResult.error,
            variant: 'destructive',
          });
          continue;
        }

        if (parseResult.transactions.length === 0) {
          toast({
            title: `No transactions found`,
            description: `Could not find any transactions in ${staged.name}`,
            variant: 'destructive',
          });
          continue;
        }

        // 2. Upload file to storage
        const filePath = `${user.id}/${Date.now()}-${staged.name}`;
        const { error: storageError } = await supabase.storage
          .from('statement-uploads')
          .upload(filePath, staged.file);

        if (storageError) {
          console.error('Storage error:', storageError);
        }

        // 3. Create upload record
        const uploadInsert: TablesInsert<'uploads'> = {
          user_id: user.id,
          filename: staged.name,
          file_type: staged.type,
          file_size: staged.file.size,
          status: 'completed',
          transactions_count: parseResult.transactions.length,
          processed_at: new Date().toISOString(),
        };

        const { data: uploadData, error: uploadError } = await supabase
          .from('uploads')
          .insert(uploadInsert)
          .select()
          .single();

        if (uploadError) {
          toast({
            title: `Failed to save upload record`,
            description: uploadError.message,
            variant: 'destructive',
          });
          continue;
        }

        // 4. Insert transactions with auto-categorization
        const transactionsToInsert: TablesInsert<'transactions'>[] = parseResult.transactions.map(t => ({
          user_id: user.id,
          upload_id: uploadData.id,
          transaction_date: t.date,
          description_raw: t.description,
          merchant_normalized: t.description.split(/\s+/).slice(0, 3).join(' ').substring(0, 50),
          amount: Math.abs(t.amount),
          direction: t.direction,
          category_id: autoCategorize(t.description, t.direction),
          is_transfer: /transfer|xfer|tfr|move|payment to|payment from|zelle|venmo|paypal/i.test(t.description),
          currency: 'USD',
        }));

        // Insert in batches of 50
        const batchSize = 50;
        let insertedCount = 0;
        
        for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
          const batch = transactionsToInsert.slice(i, i + batchSize);
          const { data: insertedData, error: transactionError } = await supabase
            .from('transactions')
            .insert(batch)
            .select();

          if (transactionError) {
            console.error('Transaction insert error:', transactionError);
            toast({
              title: `Failed to save transactions`,
              description: transactionError.message,
              variant: 'destructive',
            });
            break;
          }
          
          insertedCount += insertedData?.length || 0;
        }
        
        if (insertedCount === 0) {
          await supabase
            .from('uploads')
            .update({ status: 'error', error_message: 'No transactions were saved' })
            .eq('id', uploadData.id);
          continue;
        }

        toast({
          title: 'Upload complete',
          description: `${parseResult.transactions.length} transactions imported and categorized from ${staged.name}`,
        });

      } catch (error) {
        toast({
          title: `Error processing ${staged.name}`,
          description: String(error),
          variant: 'destructive',
        });
      }
    }

    setStagedFiles([]);
    await fetchUploads();
    setIsUploading(false);
  }, [stagedFiles, toast, fetchUploads]);

  const deleteUpload = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('uploads')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting upload',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setUploads(prev => prev.filter(u => u.id !== id));
      toast({
        title: 'Upload deleted',
        description: 'The upload and its transactions have been removed.',
      });
    }
  }, [toast]);

  const viewUploadTransactions = useCallback((uploadId: string) => {
    navigate(`/transactions?upload=${uploadId}`);
  }, [navigate]);

  return {
    uploads,
    stagedFiles,
    isLoading,
    isUploading,
    fetchUploads,
    addStagedFiles,
    removeStagedFile,
    processUpload,
    deleteUpload,
    viewUploadTransactions,
  };
}
