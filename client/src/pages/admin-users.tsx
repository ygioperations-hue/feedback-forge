import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Crown, Shield } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  planType: string;
  projectCount: number;
  createdAt: string;
};

export default function AdminUsers() {
  const { toast } = useToast();

  const { data: usersList, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const upgradeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/plan`, { planType: "lifetime" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User upgraded to lifetime" });
    },
    onError: () => {
      toast({ title: "Failed to upgrade user", variant: "destructive" });
    },
  });

  const planBadge = (planType: string) => {
    switch (planType) {
      case "platform_admin":
        return <Badge variant="default" data-testid="badge-plan"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case "lifetime":
        return <Badge className="bg-amber-500 hover:bg-amber-600" data-testid="badge-plan"><Crown className="w-3 h-3 mr-1" />Lifetime</Badge>;
      case "active":
        return <Badge className="bg-green-500 hover:bg-green-600" data-testid="badge-plan">Active</Badge>;
      default:
        return <Badge variant="secondary" data-testid="badge-plan">No Plan</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-users">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-admin-users-title">Users</h1>
        <p className="text-muted-foreground">Manage all platform users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({usersList?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-muted rounded" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersList?.map((u) => (
                    <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                      <TableCell className="font-medium" data-testid={`text-user-email-${u.id}`}>{u.email}</TableCell>
                      <TableCell>{u.firstName} {u.lastName}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "platform_admin" ? "default" : "outline"}>
                          {u.role === "platform_admin" ? "Admin" : "Customer"}
                        </Badge>
                      </TableCell>
                      <TableCell>{planBadge(u.planType)}</TableCell>
                      <TableCell data-testid={`text-user-projects-${u.id}`}>{u.projectCount}</TableCell>
                      <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {u.role !== "platform_admin" && u.planType !== "lifetime" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => upgradeMutation.mutate(u.id)}
                            disabled={upgradeMutation.isPending}
                            data-testid={`button-upgrade-${u.id}`}
                          >
                            <Crown className="w-3 h-3 mr-1" />
                            Grant Lifetime
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
