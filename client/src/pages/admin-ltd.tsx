import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Plus, Trash2, Hash, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type LtdCode = {
  id: string;
  code: string;
  isRedeemed: boolean;
  redeemedAt: string | null;
  userId: string | null;
  redeemerEmail: string | null;
  createdAt: string;
};

export default function AdminLtd() {
  const { toast } = useToast();

  const { data: codes, isLoading } = useQuery<LtdCode[]>({
    queryKey: ["/api/admin/ltd/codes"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/ltd/generate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ltd/codes"] });
      toast({ title: "Code generated", description: "New LTD code has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate code.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/ltd/codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ltd/codes"] });
      toast({ title: "Code deleted", description: "LTD code has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete code.", variant: "destructive" });
    },
  });

  const totalCodes = codes?.length ?? 0;
  const usedCodes = codes?.filter((c) => c.isRedeemed).length ?? 0;
  const unusedCodes = totalCodes - usedCodes;

  const statCards = [
    { title: "Total Codes", value: totalCodes, icon: Hash },
    { title: "Used", value: usedCodes, icon: CheckCircle },
    { title: "Unused", value: unusedCodes, icon: XCircle },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-ltd">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-admin-ltd-title">LTD Codes</h1>
          <p className="text-muted-foreground">Generate and manage Lifetime Deal codes</p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-code"
        >
          <Plus className="w-4 h-4 mr-2" />
          {generateMutation.isPending ? "Generating..." : "Generate Code"}
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.title} data-testid={`card-ltd-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid={`text-ltd-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  {card.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Redeemed By</TableHead>
                <TableHead>Date Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes?.map((code) => (
                <TableRow key={code.id} data-testid={`row-ltd-${code.id}`}>
                  <TableCell className="font-mono text-sm" data-testid={`text-code-${code.id}`}>{code.code}</TableCell>
                  <TableCell>
                    <Badge variant={code.isRedeemed ? "secondary" : "default"} data-testid={`badge-status-${code.id}`}>
                      {code.isRedeemed ? "Used" : "Available"}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-redeemer-${code.id}`}>
                    {code.redeemerEmail || "—"}
                  </TableCell>
                  <TableCell data-testid={`text-redeemed-date-${code.id}`}>
                    {code.redeemedAt ? new Date(code.redeemedAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {!code.isRedeemed && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(code.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-code-${code.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {codes?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No LTD codes yet. Click "Generate Code" to create one.
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
