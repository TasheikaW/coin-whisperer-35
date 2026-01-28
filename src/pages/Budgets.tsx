import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
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
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Budget {
  id: string;
  category: string;
  budget: number;
  spent: number;
}

const defaultBudgets: Budget[] = [
  { id: "1", category: "Groceries", budget: 500, spent: 450 },
  { id: "2", category: "Dining", budget: 200, spent: 280 },
  { id: "3", category: "Transportation", budget: 400, spent: 320 },
  { id: "4", category: "Shopping", budget: 300, spent: 420 },
  { id: "5", category: "Utilities", budget: 200, spent: 180 },
  { id: "6", category: "Entertainment", budget: 150, spent: 95 },
  { id: "7", category: "Health", budget: 100, spent: 45 },
];

const categories = [
  "Groceries",
  "Dining",
  "Transportation",
  "Shopping",
  "Utilities",
  "Entertainment",
  "Health",
  "Subscriptions",
  "Travel",
  "Other",
];

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>(defaultBudgets);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const totalBudget = budgets.reduce((sum, b) => sum + b.budget, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remaining = totalBudget - totalSpent;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);

  const handleSaveBudget = () => {
    if (!newCategory || !newAmount) return;
    
    if (editingBudget) {
      setBudgets(budgets.map(b => 
        b.id === editingBudget.id 
          ? { ...b, category: newCategory, budget: parseFloat(newAmount) }
          : b
      ));
    } else {
      setBudgets([
        ...budgets,
        {
          id: Date.now().toString(),
          category: newCategory,
          budget: parseFloat(newAmount),
          spent: 0,
        },
      ]);
    }
    
    setIsDialogOpen(false);
    setEditingBudget(null);
    setNewCategory("");
    setNewAmount("");
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setNewCategory(budget.category);
    setNewAmount(budget.budget.toString());
    setIsDialogOpen(true);
  };

  const handleDeleteBudget = (id: string) => {
    setBudgets(budgets.filter(b => b.id !== id));
  };

  return (
    <AppLayout>
      <PageHeader
        title="Budgets"
        description="Set and track your monthly spending limits"
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingBudget(null); setNewCategory(""); setNewAmount(""); }}>
                <Plus size={18} className="mr-2" />
                Add Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBudget ? "Edit Budget" : "Add New Budget"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Budget</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleSaveBudget}>
                  {editingBudget ? "Update Budget" : "Create Budget"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Remaining</p>
            <p className={`text-2xl font-bold mt-1 ${remaining >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(remaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Monthly Budgets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {budgets.map((budget) => (
            <div key={budget.id} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <BudgetProgress
                    category={budget.category}
                    spent={budget.spent}
                    budget={budget.budget}
                  />
                </div>
                <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditBudget(budget)}
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteBudget(budget.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
