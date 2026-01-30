import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  category_type: string;
}

interface CategorySelectProps {
  value: string | null;
  categoryName?: string;
  onSelect: (categoryId: string) => void;
  compact?: boolean;
}

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
  Salary: "bg-green-100 text-green-700",
  Freelance: "bg-emerald-100 text-emerald-700",
  Investment: "bg-cyan-100 text-cyan-700",
  Subscriptions: "bg-indigo-100 text-indigo-700",
  Travel: "bg-blue-100 text-blue-700",
  "Rent/Mortgage": "bg-stone-100 text-stone-700",
  Other: "bg-gray-100 text-gray-700",
};

export function CategorySelect({ value, categoryName, onSelect, compact = false }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      setCategories(data || []);
      setIsLoading(false);
    };

    fetchCategories();
  }, []);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  const displayName = categoryName || 'Uncategorized';
  const colorClass = categoryColors[displayName] || 'bg-muted text-muted-foreground';

  return (
    <Select value={value || ''} onValueChange={onSelect}>
      <SelectTrigger className={cn(
        "h-auto border-0 p-0 shadow-none focus:ring-0",
        compact && "w-auto"
      )}>
        <Badge
          variant="secondary"
          className={cn("flex items-center gap-1.5 cursor-pointer hover:opacity-80", colorClass)}
        >
          {displayName}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: category.color || '#94a3b8' }}
              />
              {category.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
