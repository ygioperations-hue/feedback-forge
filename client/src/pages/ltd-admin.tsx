import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Copy, Crown, Check, Key } from "lucide-react";
import { useState } from "react";
import type { LtdCode } from "@shared/schema";

export default function LtdAdmin() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: codes, isLoading } = useQuery<LtdCode[]>({
    queryKey: ["/api/ltd/codes"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ltd/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ltd/codes"] });
      toast({ title: "New LTD code generated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to generate code", description: err.message, variant: "destructive" });
    },
  });

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast({ title: "Code copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const redeemedCount = codes?.filter((c) => c.isRedeemed).length || 0;
  const availableCount = codes?.filter((c) => !c.isRedeemed).length || 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-ltd-title">Lifetime Deal Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate and manage lifetime deal codes</p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-ltd"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {generateMutation.isPending ? "Generating..." : "Generate Code"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Codes</p>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-codes">{codes?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400" data-testid="text-available-codes">{availableCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Redeemed</p>
            <p className="text-2xl font-bold mt-1" data-testid="text-redeemed-codes">{redeemedCount}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-64 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : codes && codes.length > 0 ? (
        <div className="space-y-2">
          {[...codes].reverse().map((code) => (
            <Card key={code.id} data-testid={`card-ltd-code-${code.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-amber-500/10 shrink-0">
                      <Key className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium" data-testid={`text-code-value-${code.id}`}>{code.code}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge
                          variant={code.isRedeemed ? "secondary" : "default"}
                          data-testid={`badge-code-status-${code.id}`}
                        >
                          {code.isRedeemed ? "Redeemed" : "Available"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Created {new Date(code.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {code.isRedeemed && code.redeemedAt && (
                          <span className="text-xs text-muted-foreground">
                            Redeemed {new Date(code.redeemedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!code.isRedeemed && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyCode(code.code, code.id)}
                      data-testid={`button-copy-code-${code.id}`}
                    >
                      {copiedId === code.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Crown className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-base font-medium mb-1">No LTD codes yet</h3>
            <p className="text-sm text-muted-foreground">Generate your first lifetime deal code to share with customers</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
