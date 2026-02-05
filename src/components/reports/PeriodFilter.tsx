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
import { Calendar as CalendarIcon, Download, FileText, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { PeriodType } from "@/hooks/useReportsData";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PeriodFilterProps {
  periodType: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  customRange: { start: Date; end: Date } | null;
  onCustomRangeChange: (range: { start: Date; end: Date } | null) => void;
  dateRanges: { currentStart: Date; currentEnd: Date };
  onExport: (format: 'csv' | 'pdf') => void;
}

export function PeriodFilter({
  periodType,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
  dateRanges,
  onExport
}: PeriodFilterProps) {
  const [customStart, setCustomStart] = useState<Date | undefined>(customRange?.start);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(customRange?.end);

  const handlePeriodChange = (value: string) => {
    onPeriodChange(value as PeriodType);
  };

  const handleApplyCustomRange = () => {
    if (customStart && customEnd) {
      onCustomRangeChange({ start: customStart, end: customEnd });
      onPeriodChange('custom');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Select value={periodType} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[180px]">
            <CalendarIcon size={16} className="mr-2" />
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">Last 3 Months</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {periodType === 'custom' && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !customStart && "text-muted-foreground"
                  )}
                >
                  {customStart ? format(customStart, "MMM d, yyyy") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customStart}
                  onSelect={setCustomStart}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !customEnd && "text-muted-foreground"
                  )}
                >
                  {customEnd ? format(customEnd, "MMM d, yyyy") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customEnd}
                  onSelect={setCustomEnd}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleApplyCustomRange} disabled={!customStart || !customEnd}>
              Apply
            </Button>
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {format(dateRanges.currentStart, "MMM d, yyyy")} — {format(dateRanges.currentEnd, "MMM d, yyyy")}
      </div>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download size={18} className="mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport('csv')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('pdf')}>
              <FileText className="mr-2 h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
