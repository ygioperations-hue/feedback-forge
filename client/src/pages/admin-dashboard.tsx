import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, CreditCard, Crown, FolderPlus, MessageSquareText, DollarSign, AlertTriangle } from "lucide-react";

type AdminStats = {
  totalUsers: number;
  activeSubscriptions: number;
  lifetimeUsers: number;
  totalProjects: number;
  totalFeedback: number;
  mrr: number;
};

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers, icon: Users, format: (v: number) => v.toLocaleString() },
    { title: "Active Subscriptions", value: stats?.activeSubscriptions, icon: CreditCard, format: (v: number) => v.toLocaleString() },
    { title: "Lifetime Users", value: stats?.lifetimeUsers, icon: Crown, format: (v: number) => v.toLocaleString() },
    { title: "Total Projects", value: stats?.totalProjects, icon: FolderPlus, format: (v: number) => v.toLocaleString() },
    { title: "Total Feedback", value: stats?.totalFeedback, icon: MessageSquareText, format: (v: number) => v.toLocaleString() },
    { title: "MRR", value: stats?.mrr, icon: DollarSign, format: (v: number) => `$${(v / 100).toFixed(2)}` },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-dashboard">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-admin-title">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key metrics</p>
      </div>

      {error && (
        <Alert variant="destructive" data-testid="alert-stats-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Failed to load dashboard stats. Please try refreshing the page.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.title} data-testid={`card-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid={`text-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  {card.value !== undefined ? card.format(card.value) : "—"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
