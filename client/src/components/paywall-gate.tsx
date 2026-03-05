import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Zap, BarChart3, Map, FileText, Code, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";

type LimitsData = {
  plan: string;
  activated: boolean;
  projectCount: number;
  totalResponses: number;
  maxProjects: number | null;
  maxResponses: number | null;
  canCreateProject: boolean;
  canSubmitResponse: boolean;
};

export function useActivation() {
  const { user } = useAuth();
  const { data: limits, isLoading } = useQuery<LimitsData>({
    queryKey: ["/api/limits"],
  });

  if (user?.role === "platform_admin") {
    return { limits, isLoading: false, activated: true };
  }

  return {
    limits,
    isLoading,
    activated: user?.planType !== "none" && user?.planType !== undefined,
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
  const features = [
    { icon: Zap, label: "Unlimited feedback projects" },
    { icon: BarChart3, label: "Unlimited responses" },
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
            Activate Your Account
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Get a plan or redeem a Lifetime Deal code to unlock all features and start collecting feedback.
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
          <a href="/#pricing">
            <Button className="w-full" size="lg" data-testid="button-paywall-upgrade">
              <Crown className="w-4 h-4 mr-2" />
              View Plans & Activate
            </Button>
          </a>
          <p className="text-xs text-center text-muted-foreground">
            Get lifetime access for just $59 — one-time payment
          </p>
        </div>
      </div>
    </div>
  );
}
