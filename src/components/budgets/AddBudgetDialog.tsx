import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
}

interface AddBudgetDialogProps {
  existingCategoryIds: string[];
  onAdd: (categoryId: string, amount: number, period: string) => Promise<boolean>;
}

export function AddBudgetDialog({ existingCategoryIds, onAdd }: AddBudgetDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      // Fetch all categories (same as transaction list)
      const { data } = await supabase
        .from('categories')
        .select('id, name, color')
        .order('name');
      
      if (data) {
        // Filter out categories that already have budgets
        const available = data.filter(c => !existingCategoryIds.includes(c.id));
        setCategories(available);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, existingCategoryIds]);

  const handleSubmit = async () => {
    if (!selectedCategory || !amount) return;
    
    setIsLoading(true);
    const success = await onAdd(selectedCategory, parseFloat(amount), period);
    setIsLoading(false);
    
    if (success) {
      setIsOpen(false);
      setSelectedCategory("");
      setAmount("");
      setPeriod("monthly");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={18} className="mr-2" />
          Add Budget
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Budget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No categories available
                  </SelectItem>
                ) : (
                  categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Monthly Budget Amount</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="10"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Budget Type</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Recurring</SelectItem>
                <SelectItem value="fixed">Fixed Bill</SelectItem>
                <SelectItem value="rolling">Rolling Budget</SelectItem>
                <SelectItem value="annual">Annual / Irregular</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={isLoading || !selectedCategory || !amount}
          >
            {isLoading ? "Creating..." : "Create Budget"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
