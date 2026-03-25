import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Filter,
  Download,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Film,
  Heart,
  Repeat,
  DollarSign,
  Loader2,
  X,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactions, Transaction } from "@/hooks/useTransactions";
import { CategorySelect } from "@/components/transactions/CategorySelect";
import { SaveRuleDialog } from "@/components/transactions/SaveRuleDialog";
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog";
import { useToast } from "@/hooks/use-toast";
import { DateRangeFilter, type DatePreset } from "@/components/shared/DateRangeFilter";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

const categoryIcons: Record<string, React.ReactNode> = {
  Shopping: <ShoppingCart size={16} />,
  Dining: <Utensils size={16} />,
  Groceries: <ShoppingCart size={16} />,
  Transportation: <Car size={16} />,
  "Rent/Mortgage": <Home size={16} />,
  Utilities: <Zap size={16} />,
  Entertainment: <Film size={16} />,
  Health: <Heart size={16} />,
  Transfer: <Repeat size={16} />,
  Income: <DollarSign size={16} />,
};

const categoryColors: Record<string, string> = {
  Shopping: "bg-purple-100 text-purple-700",
  Dining: "bg-amber-100 text-amber-700",
  Groceries: "bg-emerald-100 text-emerald-700",
  Transportation: "bg-sky-100 text-sky-700",
  Utilities: "bg-slate-100 text-slate-700",
  Entertainment: "bg-pink-100 text-pink-700",
  Health: "bg-red-100 text-red-700",
  Transfer: "bg-gray-100 text-gray-700",
  Income: "bg-teal-100 text-teal-700",
};

export default function Transactions() {
  const { transactions, isLoading, uploadFilter, updateTransaction, deleteTransaction, fetchTransactions } = useTransactions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const merchantParam = searchParams.get('merchant') || '';
  const [searchQuery, setSearchQuery] = useState(merchantParam);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showTransfers, setShowTransfers] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  // Sync search query from URL param
  useEffect(() => {
    const m = searchParams.get('merchant');
    if (m) {
      setSearchQuery(m);
      // Clean up URL after applying
      searchParams.delete('merchant');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);
  
  // Sorting state
  type SortField = 'date' | 'description' | 'category' | 'source' | 'amount';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // State for edit/delete
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setDeletingTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deletingTransaction) {
      await deleteTransaction(deletingTransaction.id);
      toast({ title: "Transaction deleted" });
      setDeleteDialogOpen(false);
      setDeletingTransaction(null);
    }
  };

  // State for save rule dialog
  const [saveRuleDialogOpen, setSaveRuleDialogOpen] = useState(false);
  const [pendingRuleData, setPendingRuleData] = useState<{
    transactionId: string;
    merchantName: string;
    categoryId: string;
    categoryName: string;
  } | null>(null);

  const handleCategoryChange = async (transactionId: string, categoryId: string, categoryName: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    const success = await updateTransaction(transactionId, { category_id: categoryId });
    if (success) {
      // Get merchant name for the rule
      const merchantName = transaction.merchant_normalized || 
        transaction.description_raw.split(/\s+/).slice(0, 3).join(' ');
      
      if (merchantName) {
        setPendingRuleData({
          transactionId,
          merchantName,
          categoryId,
          categoryName,
        });
        setSaveRuleDialogOpen(true);
      } else {
        toast({
          title: 'Category updated',
          description: 'Transaction category has been changed.',
        });
      }
    }
  };

  const handleRuleApplied = () => {
    // Silent refetch to pick up rule-applied changes without resetting scroll
    fetchTransactions(true);
  };

  // Add transaction dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((t) => {
      if (!showTransfers && t.is_transfer) return false;
      if (categoryFilter !== "all" && t.categories?.name !== categoryFilter) return false;
      if (dateRange.start || dateRange.end) {
        const txDate = parseISO(t.transaction_date);
        if (dateRange.start && txDate < dateRange.start) return false;
        if (dateRange.end && txDate > dateRange.end) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = t.description_raw.toLowerCase().includes(query);
        const matchesMerchant = t.merchant_normalized?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesMerchant) return false;
      }
      return true;
    });

    // Sort the filtered results
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = a.transaction_date.localeCompare(b.transaction_date);
          break;
        case 'description':
          const descA = (a.merchant_normalized || a.description_raw).toLowerCase();
          const descB = (b.merchant_normalized || b.description_raw).toLowerCase();
          comparison = descA.localeCompare(descB);
          break;
        case 'category':
          const catA = a.categories?.name || '';
          const catB = b.categories?.name || '';
          comparison = catA.localeCompare(catB);
          break;
        case 'source':
          const srcA = a.uploads?.filename || '';
          const srcB = b.uploads?.filename || '';
          comparison = srcA.localeCompare(srcB);
          break;
        case 'amount':
          const amtA = a.direction === 'credit' ? a.amount : -a.amount;
          const amtB = b.direction === 'credit' ? b.amount : -b.amount;
          comparison = amtA - amtB;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [transactions, showTransfers, categoryFilter, searchQuery, sortField, sortDirection]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));

  const clearUploadFilter = () => {
    navigate('/transactions');
  };

  const uploadName = uploadFilter 
    ? transactions.find(t => t.upload_id === uploadFilter)?.uploads?.filename 
    : null;

  return (
    <AppLayout>
      <PageHeader
        title="Transactions"
        description="View and manage all your transactions"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus size={18} className="mr-2" />
              Add
            </Button>
            <Button variant="outline">
              <Download size={18} className="mr-2" />
              Export
            </Button>
          </div>
        }
      />

      {/* Upload Filter Banner */}
      {uploadFilter && (
        <Card className="mb-6 border-accent/50 bg-accent/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload size={18} className="text-accent" />
                <span className="text-sm">
                  Showing transactions from: <span className="font-medium">{uploadName || 'Selected upload'}</span>
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearUploadFilter}>
                <X size={16} className="mr-1" />
                Clear filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search transactions..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter size={16} className="mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Shopping">Shopping</SelectItem>
                  <SelectItem value="Dining">Dining</SelectItem>
                  <SelectItem value="Groceries">Groceries</SelectItem>
                  <SelectItem value="Transportation">Transportation</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showTransfers ? "secondary" : "outline"}
                onClick={() => setShowTransfers(!showTransfers)}
              >
                <Repeat size={16} className="mr-2" />
                Transfers
              </Button>
            </div>
          </div>
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            preset={datePreset}
            onPresetChange={setDatePreset}
          />
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-semibold">
            {isLoading ? 'Loading...' : `${filteredTransactions.length} Transactions`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={32} />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No transactions found. Upload a bank statement to get started!</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/uploads')}>
                <Upload size={16} className="mr-2" />
                Go to Uploads
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-xs uppercase" onClick={() => handleSort('date')}>
                        Date {sortField === 'date' ? (sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />) : <ArrowDown size={14} className="ml-1 opacity-30" />}
                      </Button>
                    </th>
                    <th>
                      <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-xs uppercase" onClick={() => handleSort('description')}>
                        Description {sortField === 'description' ? (sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />) : <ArrowDown size={14} className="ml-1 opacity-30" />}
                      </Button>
                    </th>
                    <th>
                      <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-xs uppercase" onClick={() => handleSort('category')}>
                        Category {sortField === 'category' ? (sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />) : <ArrowDown size={14} className="ml-1 opacity-30" />}
                      </Button>
                    </th>
                    <th>
                      <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-xs uppercase" onClick={() => handleSort('source')}>
                        Source {sortField === 'source' ? (sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />) : <ArrowDown size={14} className="ml-1 opacity-30" />}
                      </Button>
                    </th>
                    <th className="text-right">
                      <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-xs uppercase" onClick={() => handleSort('amount')}>
                        Amount {sortField === 'amount' ? (sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />) : <ArrowDown size={14} className="ml-1 opacity-30" />}
                      </Button>
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const categoryName = transaction.categories?.name || 'Uncategorized';
                    const isInflow = transaction.direction === 'credit';
                    
                    return (
                      <tr key={transaction.id}>
                        <td className="text-muted-foreground tabular-nums">
                          {transaction.transaction_date}
                        </td>
                        <td>
                          <div>
                            <p className="font-medium text-foreground">
                              {transaction.merchant_normalized || transaction.description_raw.slice(0, 30)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {transaction.description_raw}
                            </p>
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <CategorySelect
                            value={transaction.category_id}
                            categoryName={categoryName}
                            onSelect={(catId, catName) => handleCategoryChange(transaction.id, catId, catName)}
                            compact
                          />
                        </td>
                        <td className="text-muted-foreground text-sm">
                          {transaction.uploads?.filename || '-'}
                        </td>
                        <td className={cn(
                          "text-right font-medium tabular-nums",
                          isInflow ? "text-success" : "text-foreground"
                        )}>
                          {isInflow ? "+" : "-"}{formatCurrency(transaction.amount)}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                                <Pencil size={14} className="mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(transaction)} className="text-destructive focus:text-destructive">
                                <Trash2 size={14} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Rule Dialog */}
      {pendingRuleData && (
        <SaveRuleDialog
          open={saveRuleDialogOpen}
          onOpenChange={setSaveRuleDialogOpen}
          merchantName={pendingRuleData.merchantName}
          categoryId={pendingRuleData.categoryId}
          categoryName={pendingRuleData.categoryName}
          currentTransactionId={pendingRuleData.transactionId}
          onRuleApplied={handleRuleApplied}
        />
      )}

      <AddTransactionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onTransactionAdded={() => fetchTransactions()}
      />

      <EditTransactionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        transaction={editingTransaction}
        onSave={async (id, updates) => {
          const success = await updateTransaction(id, updates as any);
          if (success) {
            toast({ title: "Transaction updated" });
            fetchTransactions(true);
          }
          return success;
        }}
      />
    </AppLayout>
  );
}
