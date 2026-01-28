import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowRight, BarChart3, Upload, PiggyBank, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const features = [
  {
    icon: Upload,
    title: "Upload Statements",
    description: "Import CSV, XLSX, or PDF bank statements with automatic parsing",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    description: "Visualize spending patterns with interactive charts and reports",
  },
  {
    icon: PiggyBank,
    title: "Budget Tracking",
    description: "Set category budgets and get alerts when you're overspending",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Bank-level encryption keeps your financial data safe",
  },
];

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDE0di0yaDIyek0zNiA0NHYySDE0di0yaDIyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        
        <div className="relative container max-w-6xl mx-auto px-4 py-24 lg:py-32">
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-success flex items-center justify-center shadow-glow">
                <Wallet size={28} className="text-white" />
              </div>
              <span className="text-3xl font-bold text-white">BudgetFlow</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl lg:text-6xl font-bold text-white max-w-3xl leading-tight">
              Take Control of Your{" "}
              <span className="text-gradient bg-gradient-to-r from-accent to-emerald-400 bg-clip-text text-transparent">
                Financial Future
              </span>
            </h1>
            
            <p className="text-lg lg:text-xl text-white/70 mt-6 max-w-2xl">
              Upload your bank statements, auto-categorize transactions, and get powerful insights to build better spending habits.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 h-12">
                    Go to Dashboard
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth">
                    <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 h-12">
                      Get Started Free
                      <ArrowRight size={18} className="ml-2" />
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-12">
                      View Demo
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Trust indicators */}
            <p className="text-white/50 text-sm mt-8">
              No credit card required • Free forever plan available
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
            Everything You Need to Budget Smarter
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Powerful features designed to make managing your money effortless
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="stat-card animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-3 rounded-xl bg-accent/10 w-fit mb-4">
                <feature.icon className="text-accent" size={24} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-muted/50 border-t border-border">
        <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
            Ready to Start Saving?
          </h2>
          <p className="text-muted-foreground mt-3 mb-8">
            Join thousands of users who have transformed their financial habits
          </p>
          <Link to="/dashboard">
            <Button size="lg" className="px-8">
              Start Your Free Account
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Wallet size={20} className="text-accent" />
              <span className="font-semibold text-foreground">BudgetFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 BudgetFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
