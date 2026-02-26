import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Crown, FolderPlus, MessageSquareText, DollarSign } from "lucide-react";

type AdminStats = {
  totalUsers: number;
  activeSubscriptions: number;
  lifetimeUsers: number;
  totalProjects: number;
  totalResponses: number;
  mrr: number;
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-500" },
    { title: "Active Subscriptions", value: stats?.activeSubscriptions ?? 0, icon: CreditCard, color: "text-green-500" },
    { title: "Lifetime Users", value: stats?.lifetimeUsers ?? 0, icon: Crown, color: "text-amber-500" },
    { title: "Total Projects", value: stats?.totalProjects ?? 0, icon: FolderPlus, color: "text-purple-500" },
    { title: "Total Responses", value: stats?.totalResponses ?? 0, icon: MessageSquareText, color: "text-cyan-500" },
    { title: "MRR", value: stats?.mrr ? `$${(stats.mrr / 100).toFixed(2)}` : "$0.00", icon: DollarSign, color: "text-emerald-500" },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-dashboard">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and metrics</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
