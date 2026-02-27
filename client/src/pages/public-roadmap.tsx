import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronUp, Map, MessageSquareText } from "lucide-react";
import type { RoadmapItem } from "@shared/schema";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  planned: { label: "Planned", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  under_review: { label: "Under Review", variant: "secondary" },
};

function getStatusInfo(status: string) {
  return statusConfig[status] || { label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), variant: "secondary" as const };
}

type RoadmapData = {
  project: { id: string; name: string; description: string | null; slug: string };
  items: RoadmapItem[];
};

export default function PublicRoadmap() {
  const { toast } = useToast();
  const [, params] = useRoute("/roadmap/:slug");
  const slug = params?.slug;

  const { data, isLoading, error } = useQuery<RoadmapData>({
    queryKey: ["/api/roadmap", slug],
    enabled: !!slug,
  });

  const upvoteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("POST", `/api/roadmap/items/${itemId}/upvote`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap", slug] });
    },
    onError: () => {
      toast({ title: "Vote failed", description: "Unable to register your vote. Please try again.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-3">
            <Map className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold" data-testid="text-roadmap-error">Roadmap not found</h2>
            <p className="text-sm text-muted-foreground">This roadmap doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, items } = data;

  const grouped: Record<string, RoadmapItem[]> = {};
  for (const item of items) {
    if (!grouped[item.status]) grouped[item.status] = [];
    grouped[item.status].push(item);
  }

  const statusOrder = ["in_progress", "planned", "under_review", "completed"];
  const sortedStatuses = Object.keys(grouped).sort((a, b) => {
    const ai = statusOrder.indexOf(a);
    const bi = statusOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6 pb-16">
        <header className="mb-8 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
              <MessageSquareText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium" data-testid="text-roadmap-brand">FeedbackForge</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-roadmap-title">{project.name} Roadmap</h1>
          {project.description && (
            <p className="text-muted-foreground" data-testid="text-roadmap-description">{project.description}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"} on the roadmap
          </p>
        </header>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <Map className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground" data-testid="text-roadmap-empty">No roadmap items yet. Check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {sortedStatuses.map((status) => {
              const info = getStatusInfo(status);
              const statusItems = grouped[status];
              return (
                <section key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={info.variant} data-testid={`badge-status-${status}`}>{info.label}</Badge>
                    <span className="text-xs text-muted-foreground">{statusItems.length}</span>
                  </div>
                  <div className="space-y-3">
                    {statusItems.map((item) => (
                      <Card key={item.id} data-testid={`card-roadmap-item-${item.id}`}>
                        <CardContent className="py-4 flex items-start gap-4">
                          <div className="flex flex-col items-center pt-0.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => upvoteMutation.mutate(item.id)}
                              disabled={upvoteMutation.isPending}
                              data-testid={`button-upvote-${item.id}`}
                            >
                              <ChevronUp className="w-5 h-5" />
                            </Button>
                            <span className="text-sm font-semibold tabular-nums" data-testid={`text-upvotes-${item.id}`}>
                              {item.upvotes}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium leading-snug" data-testid={`text-item-title-${item.id}`}>{item.title}</h3>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed" data-testid={`text-item-desc-${item.id}`}>{item.description}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <footer className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">Powered by FeedbackForge</p>
        </footer>
      </div>
    </div>
  );
}
