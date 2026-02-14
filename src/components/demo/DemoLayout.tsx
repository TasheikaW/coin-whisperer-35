import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Receipt,
  PiggyBank,
  BarChart3,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type DemoPage = "dashboard" | "uploads" | "transactions" | "budgets" | "reports" | "subscription" | "settings";

const navItems: { id: DemoPage; icon: React.ReactNode; label: string }[] = [
  { id: "dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
  { id: "uploads", icon: <Upload size={20} />, label: "Uploads" },
  { id: "transactions", icon: <Receipt size={20} />, label: "Transactions" },
  { id: "budgets", icon: <PiggyBank size={20} />, label: "Budgets" },
  { id: "reports", icon: <BarChart3 size={20} />, label: "Reports" },
  { id: "subscription", icon: <CreditCard size={20} />, label: "Subscription" },
  { id: "settings", icon: <Settings size={20} />, label: "Settings" },
];

const mobileNavItems: { id: DemoPage; icon: React.ComponentType<any>; label: string }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Home" },
  { id: "uploads", icon: Upload, label: "Upload" },
  { id: "transactions", icon: Receipt, label: "Transactions" },
  { id: "budgets", icon: PiggyBank, label: "Budgets" },
  { id: "settings", icon: Settings, label: "Settings" },
];

interface DemoLayoutProps {
  activePage: DemoPage;
  onPageChange: (page: DemoPage) => void;
  children: React.ReactNode;
}

export function DemoLayout({ activePage, onPageChange, children }: DemoLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Banner */}
      <div className="sticky top-0 z-50 bg-accent text-accent-foreground px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-white/20 text-white border-0">DEMO</Badge>
          <span className="text-sm font-medium">You're viewing sample data</span>
        </div>
        <Link to="/">
          <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
            <ArrowLeft size={16} className="mr-2" />
            Exit Demo
          </Button>
        </Link>
      </div>

      <div className="flex min-h-[calc(100vh-40px)]">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden lg:flex h-[calc(100vh-40px)] sticky top-10 flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
            collapsed ? "w-16" : "w-64"
          )}
        >
          <div className={cn("flex items-center h-16 px-4 border-b border-sidebar-border", collapsed && "justify-center")}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-info flex items-center justify-center shadow-glow">
                <Wallet size={20} className="text-white" />
              </div>
              {!collapsed && <span className="text-lg font-semibold text-sidebar-foreground">Coin Whisperer</span>}
            </div>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left",
                  "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  activePage === item.id && "bg-sidebar-accent text-sidebar-primary font-medium",
                  collapsed && "justify-center px-3"
                )}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-sidebar-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "w-full justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                !collapsed && "justify-start"
              )}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              {!collapsed && <span className="ml-2">Collapse</span>}
            </Button>
          </div>
        </aside>

        {/* Mobile Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
          <div className="flex items-center justify-around py-2">
            {mobileNavItems.map((item) => {
              const isActive = activePage === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors",
                    isActive ? "text-accent" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <div className="container max-w-7xl py-6 px-4 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
