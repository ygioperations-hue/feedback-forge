import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, MessageSquareText, Shield, Zap, Crown, Users, BarChart3, Code, Star } from "lucide-react";
import { Link } from "wouter";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out FeedbackForge",
    features: [
      "1 feedback project",
      "50 responses",
      "Public feedback forms",
      "Basic dashboard",
      "Embeddable widget",
    ],
    cta: "Current Plan",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Monthly",
    price: "$29",
    period: "/month",
    description: "For growing teams collecting feedback",
    features: [
      "Unlimited projects",
      "Unlimited responses",
      "AI-powered insights",
      "Public roadmap",
      "Changelog page",
      "Priority support",
      "Custom branding",
    ],
    cta: "Get Started",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Yearly",
    price: "$249",
    period: "/year",
    description: "Best value - save $99 per year",
    features: [
      "Everything in Monthly",
      "2 months free",
      "Advanced analytics",
      "Team collaboration",
      "API access",
      "White-label option",
    ],
    cta: "Get Started",
    variant: "outline" as const,
    popular: false,
  },
];

type LimitsData = {
  plan: string;
  projectCount: number;
  totalResponses: number;
  maxProjects: number;
  maxResponses: number;
  canCreateProject: boolean;
  canSubmitResponse: boolean;
};

export default function Pricing() {
  const { toast } = useToast();
  const [ltdCode, setLtdCode] = useState("");

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
    },
    onError: (err: Error) => {
      toast({ title: "Invalid code", description: err.message, variant: "destructive" });
    },
  });

  const isLifetime = limits?.plan === "lifetime";

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
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-pricing-title">Simple, transparent pricing</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Start free, upgrade when you need more. No hidden fees.
          </p>
          {isLifetime && (
            <Badge variant="default" className="text-sm" data-testid="badge-lifetime-active">
              <Crown className="w-3.5 h-3.5 mr-1" />
              Lifetime Deal Active
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${plan.popular ? "border-primary" : ""}`}
              data-testid={`card-plan-${plan.name.toLowerCase()}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" data-testid="badge-popular">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2.5">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.variant}
                  className="w-full"
                  disabled={isLifetime || plan.name === "Free"}
                  data-testid={`button-plan-${plan.name.toLowerCase()}`}
                >
                  {isLifetime ? "Lifetime Active" : plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-12" data-testid="card-ltd-redeem">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-amber-500/10 shrink-0">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Have a Lifetime Deal code?</h3>
                  <p className="text-sm text-muted-foreground">Enter your code to unlock unlimited access forever</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  placeholder="FF-XXXX-XXXX-XXXX"
                  value={ltdCode}
                  onChange={(e) => setLtdCode(e.target.value)}
                  className="w-48"
                  data-testid="input-ltd-code"
                />
                <Button
                  onClick={() => redeemMutation.mutate()}
                  disabled={!ltdCode.trim() || redeemMutation.isPending}
                  data-testid="button-redeem-ltd"
                >
                  {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
