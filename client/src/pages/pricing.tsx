import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, MessageSquareText, Shield, Zap, Crown, Users, BarChart3, Code, Star, Lock } from "lucide-react";
import { Link, useLocation } from "wouter";

/* Subscription plans hidden for Phase 1 launch — only LTD via Stripe is active
const subscriptionPlans = [
  { name: "Monthly", price: "$29", period: "/month", ... },
  { name: "Yearly", price: "$249", period: "/year", ... },
]; */

/* ltdTiers kept for reference — UI now shows single $59 Lifetime card via Stripe checkout
const ltdTiers = [
  { id: "starter", name: "Starter", price: "$69", ... },
  { id: "pro", name: "Pro", price: "$129", ... },
]; */

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

export default function Pricing() {
  usePageTitle("Pricing");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [ltdCode, setLtdCode] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleCheckout = async (planName: string) => {
    const plan = planName.toLowerCase() as "monthly" | "yearly" | "lifetime";
    setCheckoutLoading(plan);
    try {
      const res = await apiRequest("POST", "/api/billing/checkout", { plan });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const { data: limits } = useQuery<LimitsData>({
    queryKey: ["/api/limits"],
  });

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ltd/redeem", { code: ltdCode.trim() });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Lifetime deal activated!", description: "You now have unlimited access to all features." });
      setLtdCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/limits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setTimeout(() => setLocation("/dashboard"), 1500);
    },
    onError: (err: Error) => {
      toast({ title: "Invalid code", description: err.message, variant: "destructive" });
    },
  });

  const activated = limits?.activated ?? false;
  const isLifetime = limits?.plan?.startsWith("lifetime") ?? false;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 pb-16">
        <header className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
                  <MessageSquareText className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium" data-testid="text-pricing-brand">FeedbackForge</span>
              </div>
            </Link>
          </div>
        </header>

        <div className="text-center mb-12 space-y-3">
          {!activated && (
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 mx-auto mb-4">
              <Lock className="w-7 h-7 text-amber-500" />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-pricing-title">
            {activated ? "You're all set" : "Activate FeedbackForge"}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {activated
              ? "Your account is active with access to all features."
              : "Choose a plan or redeem a Lifetime Deal code to unlock all features."}
          </p>
          {isLifetime && (
            <Badge variant="default" className="text-sm" data-testid="badge-lifetime-active">
              <Crown className="w-3.5 h-3.5 mr-1" />
              {limits?.plan === "lifetime_starter" ? "Starter Lifetime Active" : "Pro Lifetime Active"}
            </Badge>
          )}
        </div>

        {!activated && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                <Crown className="w-4 h-4" />
                Limited-Time Offer
              </div>
              <h2 className="text-2xl font-bold tracking-tight" data-testid="text-ltd-section-title">Pay once, own it forever</h2>
              <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
                Lock in lifetime access at today's price. No monthly bills, no renewals — just one payment and you're set for life.
              </p>
            </div>

            <Card className="max-w-2xl mx-auto mb-8 relative border-amber-500 shadow-md ring-2 ring-amber-500/20" data-testid="card-ltd-pricing">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-amber-500 hover:bg-amber-600" data-testid="badge-ltd-best-value">Best Value</Badge>
              </div>
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold">Lifetime Access</h3>
                  <p className="text-sm text-muted-foreground mt-1">Everything unlimited, forever — one single payment</p>
                  <div className="flex items-baseline justify-center gap-1 mt-4">
                    <span className="text-3xl font-bold">$59</span>
                    <span className="text-sm text-muted-foreground">one-time</span>
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-2" data-testid="text-ltd-savings">
                    One payment. Unlimited access. Forever.
                  </p>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto">
                  {[
                    "Unlimited projects",
                    "Unlimited responses & submissions",
                    "AI-powered insights (GPT-4o)",
                    "Public roadmap & changelog",
                    "Embeddable feedback widget",
                    "Priority support & all future updates",
                    "No recurring fees, ever",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-center">
                  <Button
                    size="lg"
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    disabled={activated || checkoutLoading === "lifetime"}
                    onClick={() => handleCheckout("Lifetime")}
                    data-testid="button-ltd-checkout"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    {checkoutLoading === "lifetime" ? "Redirecting..." : "Get Lifetime Access — $59"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Code redemption and subscription plans hidden for Phase 1 launch — only LTD via Stripe is active */}
          </>
        )}

        <div className="text-center space-y-6 mb-12">
          <h2 className="text-xl font-semibold">Trusted by product teams everywhere</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-1 p-3">
              <Users className="w-6 h-6 text-muted-foreground" />
              <span className="text-2xl font-bold">1,200+</span>
              <span className="text-xs text-muted-foreground">Active Users</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3">
              <BarChart3 className="w-6 h-6 text-muted-foreground" />
              <span className="text-2xl font-bold">50K+</span>
              <span className="text-xs text-muted-foreground">Responses Collected</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3">
              <Star className="w-6 h-6 text-muted-foreground" />
              <span className="text-2xl font-bold">4.9/5</span>
              <span className="text-xs text-muted-foreground">User Rating</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3">
              <Shield className="w-6 h-6 text-muted-foreground" />
              <span className="text-2xl font-bold">99.9%</span>
              <span className="text-xs text-muted-foreground">Uptime</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4 mb-12">
          <h2 className="text-xl font-semibold">Everything you need to collect better feedback</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Card>
              <CardContent className="p-4 text-center space-y-2">
                <Zap className="w-6 h-6 mx-auto text-primary" />
                <h3 className="font-medium text-sm">AI-Powered Insights</h3>
                <p className="text-xs text-muted-foreground">Get instant analysis of feedback patterns and trends</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center space-y-2">
                <Code className="w-6 h-6 mx-auto text-primary" />
                <h3 className="font-medium text-sm">Embeddable Widget</h3>
                <p className="text-xs text-muted-foreground">Add a feedback button to any website in seconds</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center space-y-2">
                <BarChart3 className="w-6 h-6 mx-auto text-primary" />
                <h3 className="font-medium text-sm">Public Roadmap</h3>
                <p className="text-xs text-muted-foreground">Share your product roadmap and let users vote</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="text-center">
          <p className="text-xs text-muted-foreground">Powered by FeedbackForge</p>
        </footer>
      </div>
    </div>
  );
}
