import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded: () => void;
}

export function AddTransactionDialog({ open, onOpenChange, onTransactionAdded }: AddTransactionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'debit' | 'credit'>('debit');
  const [categoryId, setCategoryId] = useState<string>('');

  useEffect(() => {
    if (open) {
      supabase.from('categories').select('id, name').order('name').then(({ data }) => {
        setCategories(data || []);
      });
    }
  }, [open]);

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setAmount('');
    setDirection('debit');
    setCategoryId('');
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount || !date) {
      toast({ title: 'Missing fields', description: 'Please fill in date, description, and amount.', variant: 'destructive' });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid positive number.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      transaction_date: date,
      description_raw: description.trim(),
      merchant_normalized: description.trim(),
      amount: parsedAmount,
      direction,
      category_id: categoryId || null,
    });

    setIsSubmitting(false);

    if (error) {
      toast({ title: 'Error adding transaction', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Transaction added' });
      resetForm();
      onOpenChange(false);
      onTransactionAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="txn-date">Date</Label>
            <Input id="txn-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="txn-desc">Description</Label>
            <Input id="txn-desc" placeholder="e.g. Coffee at Blue Mountain" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="txn-amount">Amount</Label>
              <Input id="txn-amount" type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as 'debit' | 'credit')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Expense</SelectItem>
                  <SelectItem value="credit">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Category (optional)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding...</> : 'Add Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
