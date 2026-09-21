import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Zap, BarChart3, Map, FileText, Code, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type LimitsData = {
  plan: string;
  basePlan: string;
  effectivePlan: string;
  activated: boolean;
  projectCount: number;
  totalResponses: number;
  maxProjects: number | null;
  maxResponses: number | null;
  canCreateProject: boolean;
  canSubmitResponse: boolean;
  canRunAiInsight: boolean;
  monthlyUsed: number;
  monthlyLimit: number | null;
  monthlyRemaining: number | null;
  responseUsed: number;
  responseLimit: number | null;
  responseRemaining: number | null;
  aiInsightUsed: number;
  aiInsightLimit: number | null;
  aiInsightRemaining: number | null;
  aiInsightsUnlimited: boolean;
  resetsAt: string;
  trialActive: boolean;
  trialEnded: boolean;
  trialEndsAt: string | null;
};

export function useActivation() {
  const { user } = useAuth();
  const { data: limits, isLoading } = useQuery<LimitsData>({
    queryKey: ["/api/limits"],
    refetchOnMount: "always",
    refetchInterval: 60_000,
  });

  if (user?.role === "platform_admin") {
    return { limits, isLoading: false, activated: true };
  }

  return {
    limits,
    isLoading,
    activated: limits?.activated ?? false,
  };
}

export function PaywallGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activated, isLoading } = useActivation();

  if (user?.role === "platform_admin") return <>{children}</>;
  if (isLoading) return null;
  if (activated) return <>{children}</>;

  return <PaywallScreen />;
}

function PaywallScreen() {
  const { limits } = useActivation();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const trialEnded = limits?.trialEnded;
  const startGrowthCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const response = await apiRequest("POST", "/api/billing/checkout", { plan: "growth" });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      toast({ title: "Checkout failed", description: error.message, variant: "destructive" });
      setCheckoutLoading(false);
    }
  };
  const features = [
    { icon: Zap, label: "Unlimited feedback projects" },
    { icon: BarChart3, label: "50 responses and AI insights per month on Lifetime" },
    { icon: Sparkles, label: "AI-powered insights (GPT-4o)" },
    { icon: Map, label: "Public roadmap with upvotes" },
    { icon: FileText, label: "Product changelog page" },
    { icon: Code, label: "Embeddable feedback widget" },
  ];

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-60px)] p-6">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mx-auto">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-paywall-title">
            {trialEnded ? "Your free trial has ended. Upgrade to continue" : "Activate Your Account"}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {trialEnded
              ? "Upgrade to continue using your feedback projects and insights."
              : "Get a plan or redeem a Lifetime Deal code to unlock all features and start collecting feedback."}
          </p>
        </div>

        <Card data-testid="card-paywall-features">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Everything included with your plan
            </h3>
            <ul className="space-y-3">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          {trialEnded ? (
            <Button className="w-full" size="lg" onClick={startGrowthCheckout} disabled={checkoutLoading} data-testid="button-paywall-upgrade">
              <Crown className="w-4 h-4 mr-2" />
              {checkoutLoading ? "Redirecting..." : "Upgrade to Growth — $19/month"}
            </Button>
          ) : (
            <a href="/#pricing"><Button className="w-full" size="lg" data-testid="button-paywall-upgrade"><Crown className="w-4 h-4 mr-2" />View Plans & Activate</Button></a>
          )}
          <p className="text-xs text-center text-muted-foreground">
            {trialEnded ? "500 responses per month with unlimited AI insights" : "Choose Growth monthly or Lifetime access"}
          </p>
        </div>
      </div>
    </div>
  );
}
