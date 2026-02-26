import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Crown, Plus, Trash2, Copy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LtdCode = {
  id: string;
  code: string;
  isRedeemed: boolean;
  redeemedAt: string | null;
  userId: string | null;
  userEmail: string | null;
  createdAt: string;
};

type LtdData = {
  totalCodes: number;
  usedCodes: number;
  unusedCodes: number;
  codes: LtdCode[];
};

export default function AdminLtd() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<LtdData>({
    queryKey: ["/api/admin/ltd"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/ltd/generate");
      return res.json();
    },
    onSuccess: (code: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ltd"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Code generated", description: code.code });
    },
    onError: () => {
      toast({ title: "Failed to generate code", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/ltd/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ltd"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Code deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete code", variant: "destructive" });
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied to clipboard" });
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-ltd">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-ltd-title">LTD Codes</h1>
          <p className="text-muted-foreground">Generate and manage lifetime deal codes</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-codes">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalCodes ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-used-codes">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Used Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{data?.usedCodes ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-unused-codes">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{data?.unusedCodes ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-muted rounded" />
              ))}
            </div>
          ) : data?.codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No LTD codes yet. Click "Generate Code" to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Redeemed By</TableHead>
                    <TableHead>Date Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.codes.map((code) => (
                    <TableRow key={code.id} data-testid={`row-code-${code.id}`}>
                      <TableCell>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded" data-testid={`text-code-${code.id}`}>
                          {code.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        {code.isRedeemed ? (
                          <Badge className="bg-green-500 hover:bg-green-600">Redeemed</Badge>
                        ) : (
                          <Badge variant="secondary">Available</Badge>
                        )}
                      </TableCell>
                      <TableCell>{code.userEmail || "—"}</TableCell>
                      <TableCell>{code.redeemedAt ? new Date(code.redeemedAt).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCode(code.code)}
                            data-testid={`button-copy-${code.id}`}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          {!code.isRedeemed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(code.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${code.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
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
