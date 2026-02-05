import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit2, Trash2, Check, X, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BudgetWithSpending } from "@/hooks/useBudgets";

interface BudgetProgressCardProps {
  budget: BudgetWithSpending;
  onUpdate: (id: string, amount: number) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const getCategoryIcon = (name: string | undefined): string => {
  const icons: Record<string, string> = {
    'Groceries': '🛒',
    'Dining': '🍽️',
    'Transportation': '🚗',
    'Shopping': '🛍️',
    'Utilities': '💡',
    'Entertainment': '🎬',
    'Health': '🏥',
    'Subscriptions': '📱',
    'Travel': '✈️',
    'Other': '📦',
  };
  return icons[name || ''] || '📊';
};

export function BudgetProgressCard({ budget, onUpdate, onDelete }: BudgetProgressCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(String(budget.amount));
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();

  const budgetAmount = Number(budget.amount);
  const displayPercent = Math.min(budget.percentUsed, 100);
  const overflowPercent = budget.isOverBudget ? Math.min((budget.spent - budgetAmount) / budgetAmount * 100, 50) : 0;

  const statusConfig = {
    'on-track': {
      label: 'On track',
      className: 'bg-success/10 text-success border-success/20',
    },
    'at-risk': {
      label: 'At risk',
      className: 'bg-warning/10 text-warning border-warning/20',
    },
    'over-budget': {
      label: 'Over budget',
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  };

  const handleSave = async () => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    setIsUpdating(true);
    const success = await onUpdate(budget.id, amount);
    setIsUpdating(false);
    
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditAmount(String(budget.amount));
    setIsEditing(false);
  };

  const viewTransactions = () => {
    navigate(`/transactions?category=${budget.category_id}`);
  };

  return (
    <div className="group p-4 rounded-xl border border-border/50 bg-card hover:border-border transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label={budget.categories?.name}>
            {getCategoryIcon(budget.categories?.name)}
          </span>
          <div>
            <h3 className="font-medium text-foreground">{budget.categories?.name || 'Unknown'}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full border",
                statusConfig[budget.status].className
              )}>
                {statusConfig[budget.status].label}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={viewTransactions}
                >
                  <ExternalLink size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View transactions</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit budget</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(budget.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete budget</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Amount display or edit */}
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-muted-foreground">
          Spent: <span className="font-medium text-foreground">{formatCurrency(budget.spent)}</span>
        </span>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="w-24 h-8 text-sm"
              min="0"
              step="10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSave}
              disabled={isUpdating}
            >
              <Check size={14} className="text-success" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCancel}
            >
              <X size={14} />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground">
            Budget: <span className="font-medium text-foreground">{formatCurrency(budgetAmount)}</span>
          </span>
        )}
      </div>

      {/* Progress bar with expected spend marker */}
      <div className="relative">
        <div className="h-3 rounded-full bg-secondary overflow-visible flex">
          {/* Main progress */}
          <div
            className={cn(
              "h-full rounded-l-full transition-all duration-500",
              budget.status === 'on-track' && "bg-success",
              budget.status === 'at-risk' && "bg-warning",
              budget.status === 'over-budget' && "bg-destructive"
            )}
            style={{ width: `${displayPercent}%` }}
          />
          {/* Overflow segment for over-budget */}
          {budget.isOverBudget && (
            <div
              className="h-full bg-destructive/60 rounded-r-full animate-pulse"
              style={{ width: `${overflowPercent}%` }}
            />
          )}
        </div>
        
        {/* Expected spend marker */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute top-0 w-0.5 h-5 -mt-1 border-l-2 border-dashed border-muted-foreground/50 cursor-help"
                style={{ left: `${Math.min(budget.expectedPercent, 100)}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Expected: {formatCurrency(budget.expectedSpend)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span className="tabular-nums">{budget.percentUsed.toFixed(0)}% used</span>
        <span>
          {budget.isOverBudget ? (
            <span className="text-destructive font-medium">
              {formatCurrency(budget.spent - budgetAmount)} over
            </span>
          ) : (
            <span>{formatCurrency(budget.remaining)} remaining</span>
          )}
        </span>
      </div>

      {/* Projection info */}
      {budget.status === 'at-risk' && !budget.isOverBudget && budget.projectedOverage > 0 && (
        <p className="text-xs text-warning mt-2 flex items-center gap-1">
          ⚠️ Projected to exceed by {formatCurrency(budget.projectedOverage)}
        </p>
      )}
    </div>
  );
}
