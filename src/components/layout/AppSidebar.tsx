import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  LogOut,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}

const NavItem = ({ to, icon, label, collapsed }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
        "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        isActive && "bg-sidebar-accent text-sidebar-primary font-medium",
        collapsed && "justify-center px-3"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
};

const navItems = [
  { to: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
  { to: "/uploads", icon: <Upload size={20} />, label: "Uploads" },
  { to: "/transactions", icon: <Receipt size={20} />, label: "Transactions" },
  { to: "/budgets", icon: <PiggyBank size={20} />, label: "Budgets" },
  { to: "/reports", icon: <BarChart3 size={20} />, label: "Reports" },
  { to: "/subscription", icon: <CreditCard size={20} />, label: "Subscription" },
  { to: "/settings", icon: <Settings size={20} />, label: "Settings" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar sticky top-0 flex flex-col transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        collapsed && "justify-center"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center shadow-glow">
            <Wallet size={20} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-sidebar-foreground">
              Fundza
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
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
        
        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={cn(
              "w-full justify-center text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10",
              !collapsed && "justify-start"
            )}
          >
            <LogOut size={18} />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        )}
      </div>
    </aside>
  );
}
