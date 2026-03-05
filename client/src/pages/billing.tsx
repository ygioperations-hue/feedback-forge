import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, CheckCircle, Crown, Calendar, DollarSign, XCircle, RefreshCw, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useActivation } from "@/components/paywall-gate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SubscriptionData = {
  subscription: {
    id: string;
    status: string;
    planName: string;
    planPrice: number;
    interval: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
};

type PaymentData = {
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: number;
  }>;
};

export default function Billing() {
  usePageTitle("Billing");
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [verifyingCheckout, setVerifyingCheckout] = useState(false);
  const { activated, limits } = useActivation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSuccess = params.get("success") === "true";
    const sessionId = params.get("session_id");

    if (isSuccess) {
      window.history.replaceState({}, "", "/billing");

      if (sessionId) {
        setVerifyingCheckout(true);
        apiRequest("POST", "/api/billing/verify-checkout", { sessionId })
          .then((res) => res.json())
          .then(() => {
            setShowSuccess(true);
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
            queryClient.invalidateQueries({ queryKey: ["/api/limits"] });
            queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
            queryClient.invalidateQueries({ queryKey: ["/api/billing/history"] });
          })
          .catch((err) => {
            console.error("Verify checkout failed:", err);
            toast({ title: "Subscription setup", description: "Your payment was received. Your subscription will be activated shortly.", variant: "default" });
            setShowSuccess(true);
          })
          .finally(() => setVerifyingCheckout(false));
      } else {
        setShowSuccess(true);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/limits"] });
      }
    }
  }, []);

  const { data: billingData, isLoading: billingLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/billing/status"],
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<PaymentData>({
    queryKey: ["/api/billing/history"],
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/cancel");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Subscription canceled", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/limits"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const switchMutation = useMutation({
    mutationFn: async (plan: "monthly" | "yearly") => {
      const res = await apiRequest("POST", "/api/billing/switch", { plan });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Plan switched", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/limits"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/reactivate");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Subscription reactivated", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/limits"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const subscription = billingData?.subscription;
  const payments = historyData?.payments || [];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getPlanPrice = () => {
    if (!subscription) return null;
    const amount = subscription.planPrice;
    const interval = subscription.interval;
    return `$${(amount / 100).toFixed(0)}/${interval === "year" ? "yr" : "mo"}`;
  };

  if (verifyingCheckout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Activating your access...</p>
      </div>
    );
  }

  if (billingLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-billing-title">Billing</h1>
        <p className="text-muted-foreground">Manage your plan and payment history</p>
      </div>

      {showSuccess && (
        <Card className="border-green-500/30 bg-green-500/5" data-testid="card-payment-success">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Payment successful!</p>
              <p className="text-sm text-muted-foreground">Your lifetime access is now active. Enjoy all features!</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-current-plan">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your active subscription details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Subscription management UI hidden for Phase 1 launch — only LTD shown */}
          {limits?.plan?.startsWith("lifetime") ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-lg" data-testid="text-plan-name">
                    Lifetime Deal
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Unlimited access forever — no recurring charges
                  </p>
                </div>
                <Badge className="ml-auto" data-testid="badge-plan-status">Active</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-sm">
                  <p className="text-muted-foreground">Projects</p>
                  <p className="font-medium" data-testid="text-ltd-projects">
                    {limits.projectCount} / {limits.maxProjects ?? "Unlimited"}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">Responses</p>
                  <p className="font-medium" data-testid="text-ltd-responses">Unlimited</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">No active plan</p>
              <a href="/#pricing">
                <Button data-testid="button-view-plans">
                  <Crown className="w-4 h-4 mr-2" />
                  Get Lifetime Access — $59
                </Button>
              </a>
              <p className="text-xs text-muted-foreground mt-2">One-time payment, unlimited access forever</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-payment-history">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Your recent payments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payments yet</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`row-payment-${payment.id}`}>
                  <div>
                    <p className="text-sm font-medium">
                      {formatAmount(payment.amount, payment.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(payment.created)}
                    </p>
                  </div>
                  <Badge variant={payment.status === "succeeded" ? "default" : "secondary"}>
                    {payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
