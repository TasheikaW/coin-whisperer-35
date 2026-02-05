import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCategoryRules } from '@/hooks/useCategoryRules';
import { Loader2 } from 'lucide-react';

interface SaveRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantName: string;
  categoryId: string;
  categoryName: string;
  currentTransactionId: string;
  onRuleApplied: () => void;
}

export function SaveRuleDialog({
  open,
  onOpenChange,
  merchantName,
  categoryId,
  categoryName,
  currentTransactionId,
  onRuleApplied,
}: SaveRuleDialogProps) {
  const { countMatchingTransactions, saveRuleAndApplyToAll } = useCategoryRules();
  const [matchingCount, setMatchingCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && merchantName) {
      setIsLoading(true);
      countMatchingTransactions(merchantName, currentTransactionId)
        .then(count => {
          setMatchingCount(count);
          setIsLoading(false);
        });
    }
  }, [open, merchantName, currentTransactionId, countMatchingTransactions]);

  const handleApplyAll = async () => {
    setIsSaving(true);
    const result = await saveRuleAndApplyToAll(merchantName, categoryId, categoryName);
    setIsSaving(false);
    
    if (result.success) {
      onRuleApplied();
      onOpenChange(false);
    }
  };

  const handleJustThisOne = () => {
    onOpenChange(false);
  };

  // Total count includes the current transaction
  const totalCount = (matchingCount || 0) + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remember this category?</DialogTitle>
          <DialogDescription className="pt-2">
            Apply <span className="font-semibold text-foreground">"{categoryName}"</span> to all
            transactions from <span className="font-semibold text-foreground">"{merchantName}"</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking for matching transactions...
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This will update <span className="font-medium text-foreground">{totalCount}</span> existing
              transaction{totalCount !== 1 ? 's' : ''} and remember for future uploads.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleJustThisOne}
            disabled={isSaving}
          >
            No, just this one
          </Button>
          <Button
            onClick={handleApplyAll}
            disabled={isLoading || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Applying...
              </>
            ) : (
              'Yes, apply all'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
