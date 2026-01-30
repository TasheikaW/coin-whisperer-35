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
          // Continue without storing the file - transactions can still be saved
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

        // 4. Insert transactions in batches to avoid issues
        const transactionsToInsert: TablesInsert<'transactions'>[] = parseResult.transactions.map(t => ({
          user_id: user.id,
          upload_id: uploadData.id,
          transaction_date: t.date,
          description_raw: t.description,
          merchant_normalized: t.description.split(/\s+/).slice(0, 3).join(' ').substring(0, 50),
          amount: Math.abs(t.amount),
          direction: t.direction,
          is_transfer: t.description.toLowerCase().includes('transfer'),
          currency: 'USD',
        }));

        // Insert in batches of 50 to avoid payload limits
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
          // Update upload status to error
          await supabase
            .from('uploads')
            .update({ status: 'error', error_message: 'No transactions were saved' })
            .eq('id', uploadData.id);
          continue;
        }

        toast({
          title: 'Upload complete',
          description: `${parseResult.transactions.length} transactions imported from ${staged.name}`,
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
