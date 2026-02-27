import { useQuery, useMutation } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

function planBadgeVariant(planType: string) {
  switch (planType) {
    case "lifetime": return "default";
    case "yearly": return "secondary";
    case "monthly": return "outline";
    default: return "destructive";
  }
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const { data: users, isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ userId, planType }: { userId: string; planType: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/plan`, { planType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Plan updated", description: "User plan has been changed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update plan.", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User deleted", description: "User and all their data have been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-users">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-admin-users-title">Users</h1>
        <p className="text-muted-foreground">Manage platform users and their plans</p>
      </div>

      {error && (
        <Alert variant="destructive" data-testid="alert-users-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Failed to load users. Please try refreshing the page.</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-center">Projects</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                    <TableCell className="font-medium" data-testid={`text-email-${u.id}`}>{u.email}</TableCell>
                    <TableCell>{u.firstName} {u.lastName}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "platform_admin" ? "default" : "secondary"} data-testid={`badge-role-${u.id}`}>
                        {u.role === "platform_admin" ? "Admin" : "Customer"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isSelf ? (
                        <Badge variant={planBadgeVariant(u.planType)} data-testid={`badge-plan-${u.id}`}>{u.planType}</Badge>
                      ) : (
                        <Select
                          value={u.planType}
                          onValueChange={(val) => changePlanMutation.mutate({ userId: u.id, planType: val })}
                          disabled={changePlanMutation.isPending}
                        >
                          <SelectTrigger className="w-[120px] h-8" data-testid={`select-plan-${u.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">none</SelectItem>
                            <SelectItem value="monthly">monthly</SelectItem>
                            <SelectItem value="yearly">yearly</SelectItem>
                            <SelectItem value="lifetime">lifetime</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-center" data-testid={`text-projects-${u.id}`}>{u.projectCount}</TableCell>
                    <TableCell data-testid={`text-joined-${u.id}`}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground">You</span>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" data-testid={`button-delete-${u.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete user?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete <strong>{u.email}</strong> and all their projects, feedback, and subscription data. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUserMutation.mutate(u.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid="button-confirm-delete"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {users?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
