import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, ExternalLink, CheckCircle, Crown, Calendar, DollarSign } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useActivation } from "@/components/paywall-gate";

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const { activated, limits } = useActivation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setShowSuccess(true);
      window.history.replaceState({}, "", "/billing");
    }
  }, []);

  const { data: billingData, isLoading: billingLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/billing/status"],
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<PaymentData>({
    queryKey: ["/api/billing/history"],
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
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
        <p className="text-muted-foreground">Manage your subscription and payment history</p>
      </div>

      {showSuccess && (
        <Card className="border-green-500/30 bg-green-500/5" data-testid="card-payment-success">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Payment successful!</p>
              <p className="text-sm text-muted-foreground">Your subscription is now active. Enjoy all features!</p>
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
          {subscription && (subscription.status === "active" || subscription.status === "trialing") ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg" data-testid="text-plan-name">
                      {subscription.planName} Plan
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid="text-plan-price">
                      {getPlanPrice()}
                    </p>
                  </div>
                </div>
                <Badge variant={subscription.cancelAtPeriodEnd ? "secondary" : "default"} data-testid="badge-plan-status">
                  {subscription.cancelAtPeriodEnd ? "Cancelling" : "Active"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Current period</p>
                    <p className="font-medium" data-testid="text-period-dates">
                      {formatDate(subscription.currentPeriodStart)} — {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-subscription"
              >
                {portalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Manage Subscription
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : limits?.plan === "lifetime" ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-lg" data-testid="text-plan-name">Lifetime Deal</p>
                <p className="text-sm text-muted-foreground">Unlimited access forever — no recurring charges</p>
              </div>
              <Badge className="ml-auto" data-testid="badge-plan-status">Active</Badge>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">No active subscription</p>
              <a href="/#pricing">
                <Button data-testid="button-view-plans">
                  <Crown className="w-4 h-4 mr-2" />
                  View Plans
                </Button>
              </a>
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
