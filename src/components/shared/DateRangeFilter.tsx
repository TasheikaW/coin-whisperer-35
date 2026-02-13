import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";

export type DatePreset = "this-month" | "last-month" | "3-months" | "ytd" | "all" | "custom";

interface DateRangeFilterProps {
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  preset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange, preset, onPresetChange }: DateRangeFilterProps) {
  const [customStart, setCustomStart] = useState<Date | undefined>(dateRange.start ?? undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(dateRange.end ?? undefined);

  const handlePresetChange = (value: string) => {
    const p = value as DatePreset;
    onPresetChange(p);
    const now = new Date();

    switch (p) {
      case "this-month":
        onDateRangeChange({ start: startOfMonth(now), end: endOfMonth(now) });
        break;
      case "last-month": {
        const last = subMonths(now, 1);
        onDateRangeChange({ start: startOfMonth(last), end: endOfMonth(last) });
        break;
      }
      case "3-months":
        onDateRangeChange({ start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) });
        break;
      case "ytd":
        onDateRangeChange({ start: startOfYear(now), end: now });
        break;
      case "all":
        onDateRangeChange({ start: null, end: null });
        break;
      case "custom":
        break;
    }
  };

  const applyCustom = () => {
    if (customStart && customEnd) {
      onDateRangeChange({ start: customStart, end: customEnd });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[160px]">
          <CalendarIcon size={16} className="mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this-month">This Month</SelectItem>
          <SelectItem value="last-month">Last Month</SelectItem>
          <SelectItem value="3-months">Last 3 Months</SelectItem>
          <SelectItem value="ytd">Year to Date</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("text-left font-normal", !customStart && "text-muted-foreground")}>
                {customStart ? format(customStart, "MMM d, yyyy") : "Start"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("text-left font-normal", !customEnd && "text-muted-foreground")}>
                {customEnd ? format(customEnd, "MMM d, yyyy") : "End"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Button size="sm" onClick={applyCustom} disabled={!customStart || !customEnd}>Apply</Button>
        </div>
      )}

      {dateRange.start && dateRange.end && (
        <span className="text-xs text-muted-foreground">
          {format(dateRange.start, "MMM d, yyyy")} — {format(dateRange.end, "MMM d, yyyy")}
        </span>
      )}
    </div>
  );
}
