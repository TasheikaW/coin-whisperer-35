import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const PRESET_COLORS = [
  "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6",
  "#ec4899", "#ef4444", "#06b6d4", "#84cc16",
  "#f97316", "#6366f1", "#14b8a6", "#a855f7",
];

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryAdded?: () => void;
}

export function AddCategoryDialog({ open, onOpenChange, onCategoryAdded }: AddCategoryDialogProps) {
  const [name, setName] = useState("");
  const [categoryType, setCategoryType] = useState("expense");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter a category name.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      category_type: categoryType,
      color,
      user_id: user.id,
    });

    setIsSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Category created", description: `"${name.trim()}" has been added.` });
    setName("");
    setCategoryType("expense");
    setColor(PRESET_COLORS[0]);
    onOpenChange(false);
    onCategoryAdded?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>New Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Subscriptions"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={categoryType} onValueChange={setCategoryType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
