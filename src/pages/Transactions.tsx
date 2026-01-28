import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Download,
  ArrowUpDown,
  MoreHorizontal,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Film,
  Heart,
  Repeat,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  category: string;
  account: string;
  isTransfer: boolean;
}

const mockTransactions: Transaction[] = [
  { id: "1", date: "2024-02-10", description: "AMAZON.COM", merchant: "Amazon", amount: -89.99, category: "Shopping", account: "Chase Freedom", isTransfer: false },
  { id: "2", date: "2024-02-09", description: "UBER EATS", merchant: "Uber Eats", amount: -32.50, category: "Dining", account: "Amex Gold", isTransfer: false },
  { id: "3", date: "2024-02-09", description: "TRANSFER FROM SAVINGS", merchant: "Internal", amount: 500.00, category: "Transfer", account: "Chase Checking", isTransfer: true },
  { id: "4", date: "2024-02-08", description: "WHOLE FOODS MARKET", merchant: "Whole Foods", amount: -127.34, category: "Groceries", account: "Amex Gold", isTransfer: false },
  { id: "5", date: "2024-02-08", description: "SHELL GAS STATION", merchant: "Shell", amount: -45.00, category: "Transportation", account: "Chase Freedom", isTransfer: false },
  { id: "6", date: "2024-02-07", description: "NETFLIX", merchant: "Netflix", amount: -15.99, category: "Entertainment", account: "Chase Freedom", isTransfer: false },
  { id: "7", date: "2024-02-07", description: "PAYROLL DEPOSIT", merchant: "Employer", amount: 2750.00, category: "Income", account: "Chase Checking", isTransfer: false },
  { id: "8", date: "2024-02-06", description: "ELECTRIC COMPANY", merchant: "Duke Energy", amount: -142.00, category: "Utilities", account: "Chase Checking", isTransfer: false },
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showTransfers, setShowTransfers] = useState(true);

  const filteredTransactions = mockTransactions.filter((t) => {
    if (!showTransfers && t.isTransfer) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (searchQuery && !t.description.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !t.merchant.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));

  return (
    <AppLayout>
      <PageHeader
        title="Transactions"
        description="View and manage all your transactions"
        action={
          <Button variant="outline">
            <Download size={18} className="mr-2" />
            Export
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
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
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-semibold">
            {filteredTransactions.length} Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-xs uppercase">
                      Date <ArrowUpDown size={14} className="ml-1" />
                    </Button>
                  </th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th className="text-right">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="text-muted-foreground tabular-nums">
                      {transaction.date}
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-foreground">{transaction.merchant}</p>
                        <p className="text-xs text-muted-foreground">{transaction.description}</p>
                      </div>
                    </td>
                    <td>
                      <Badge
                        variant="secondary"
                        className={cn("flex items-center gap-1.5 w-fit", categoryColors[transaction.category])}
                      >
                        {categoryIcons[transaction.category]}
                        {transaction.category}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground">{transaction.account}</td>
                    <td className={cn(
                      "text-right font-medium tabular-nums",
                      transaction.amount >= 0 ? "text-success" : "text-foreground"
                    )}>
                      {transaction.amount >= 0 ? "+" : "-"}{formatCurrency(transaction.amount)}
                    </td>
                    <td>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
