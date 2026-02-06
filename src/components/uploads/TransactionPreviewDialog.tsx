import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Loader2,
  FileText,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedTransaction } from '@/lib/fileParser';
import type { StatementMetadata } from '@/lib/pdfParser';

export interface PreviewTransaction extends ParsedTransaction {
  id: string;
  excluded: boolean;
  edited: boolean;
}

interface TransactionPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: ParsedTransaction[];
  metadata?: StatementMetadata;
  fileName: string;
  onConfirm: (transactions: ParsedTransaction[]) => void;
  isImporting: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export function TransactionPreviewDialog({
  open,
  onOpenChange,
  transactions,
  metadata,
  fileName,
  onConfirm,
  isImporting,
}: TransactionPreviewDialogProps) {
  const [previewTransactions, setPreviewTransactions] = useState<PreviewTransaction[]>(() =>
    transactions.map((t, i) => ({
      ...t,
      id: `preview-${i}`,
      excluded: false,
      edited: false,
    }))
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeTransactions = useMemo(
    () => previewTransactions.filter((t) => !t.excluded),
    [previewTransactions]
  );

  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return previewTransactions;
    const q = searchQuery.toLowerCase();
    return previewTransactions.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.date.includes(q) ||
        t.amount.toString().includes(q)
    );
  }, [previewTransactions, searchQuery]);

  const totals = useMemo(() => {
    const active = activeTransactions;
    const debits = active.filter((t) => t.direction === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const credits = active.filter((t) => t.direction === 'credit').reduce((sum, t) => sum + t.amount, 0);
    return { debits, credits, net: credits - debits, count: active.length };
  }, [activeTransactions]);

  const handleToggleExclude = (id: string) => {
    setPreviewTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, excluded: !t.excluded } : t))
    );
  };

  const handleStartEdit = (id: string, currentDesc: string) => {
    setEditingId(id);
    setEditValue(currentDesc);
  };

  const handleSaveEdit = (id: string) => {
    if (editValue.trim()) {
      setPreviewTransactions((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, description: editValue.trim(), edited: true } : t
        )
      );
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleConfirm = () => {
    const toImport = activeTransactions.map(({ id, excluded, edited, ...t }) => t);
    onConfirm(toImport);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} className="text-accent" />
            Preview Parsed Transactions
          </DialogTitle>
          <DialogDescription>
            Review the transactions extracted from <span className="font-medium">{fileName}</span>.
            Edit descriptions, remove incorrect rows, then confirm to import.
          </DialogDescription>
        </DialogHeader>

        {/* Metadata Banner */}
        {metadata && (metadata.institution || metadata.accountName || metadata.lastFourDigits) && (
          <div className="flex flex-wrap gap-2 px-1">
            {metadata.institution && (
              <Badge variant="outline" className="text-xs">
                {metadata.institution}
              </Badge>
            )}
            {metadata.accountName && (
              <Badge variant="outline" className="text-xs">
                {metadata.accountName}
              </Badge>
            )}
            {metadata.lastFourDigits && (
              <Badge variant="outline" className="text-xs">
                •••• {metadata.lastFourDigits}
              </Badge>
            )}
            {metadata.statementPeriodStart && metadata.statementPeriodEnd && (
              <Badge variant="outline" className="text-xs">
                {metadata.statementPeriodStart} – {metadata.statementPeriodEnd}
              </Badge>
            )}
            {metadata.newBalance !== undefined && (
              <Badge variant="outline" className="text-xs">
                Balance: {formatCurrency(metadata.newBalance)}
              </Badge>
            )}
          </div>
        )}

        {/* Summary Bar */}
        <div className="grid grid-cols-4 gap-3 px-1">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-lg font-semibold">{totals.count}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Debits</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(totals.debits)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Credits</p>
            <p className="text-lg font-semibold text-success">
              {formatCurrency(totals.credits)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Net</p>
            <p
              className={cn(
                'text-lg font-semibold',
                totals.net >= 0 ? 'text-success' : 'text-destructive'
              )}
            >
              {totals.net >= 0 ? '+' : ''}
              {formatCurrency(totals.net)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative px-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            placeholder="Search transactions..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Transaction Table */}
        <ScrollArea className="flex-1 min-h-0 border rounded-lg">
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="w-[100px]">Date</th>
                  <th>Description</th>
                  <th className="w-[80px]">Type</th>
                  <th className="text-right w-[120px]">Amount</th>
                  <th className="w-[80px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    className={cn(t.excluded && 'opacity-40 line-through')}
                  >
                    <td className="text-muted-foreground tabular-nums text-sm">
                      {t.date}
                    </td>
                    <td>
                      {editingId === t.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(t.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => handleSaveEdit(t.id)}
                          >
                            <CheckCircle2 size={14} className="text-success" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate max-w-[300px]">
                            {t.description}
                          </span>
                          {t.edited && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-accent border-accent/30">
                              edited
                            </Badge>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          t.direction === 'credit'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {t.direction === 'credit' ? (
                          <ArrowDown size={12} className="mr-1" />
                        ) : (
                          <ArrowUp size={12} className="mr-1" />
                        )}
                        {t.direction}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        'text-right font-medium tabular-nums text-sm',
                        t.direction === 'credit' ? 'text-success' : 'text-foreground'
                      )}
                    >
                      {t.direction === 'credit' ? '+' : '-'}
                      {formatCurrency(t.amount)}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        {editingId !== t.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleStartEdit(t.id, t.description)}
                            disabled={t.excluded}
                          >
                            <Pencil size={13} className="text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className={cn(
                            'h-7 w-7',
                            t.excluded
                              ? 'text-success hover:text-success'
                              : 'text-muted-foreground hover:text-destructive'
                          )}
                          onClick={() => handleToggleExclude(t.id)}
                        >
                          {t.excluded ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>

        {/* Excluded count */}
        {previewTransactions.filter((t) => t.excluded).length > 0 && (
          <p className="text-xs text-muted-foreground px-1">
            <AlertCircle size={12} className="inline mr-1" />
            {previewTransactions.filter((t) => t.excluded).length} transaction(s) excluded from import
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isImporting || totals.count === 0}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={16} />
                Import {totals.count} Transactions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
