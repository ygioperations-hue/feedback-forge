import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, MessageSquareText, Sparkles, Bug, Lightbulb, Zap } from "lucide-react";
import type { ChangelogItem } from "@shared/schema";

const typeConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Sparkles }> = {
  improvement: { label: "Improvement", variant: "default", icon: Sparkles },
  feature: { label: "New Feature", variant: "default", icon: Zap },
  bugfix: { label: "Bug Fix", variant: "secondary", icon: Bug },
  update: { label: "Update", variant: "outline", icon: Lightbulb },
};

function getTypeInfo(type: string) {
  return typeConfig[type] || { label: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), variant: "secondary" as const, icon: Sparkles };
}

type ChangelogData = {
  project: { id: string; name: string; description: string | null; slug: string };
  items: ChangelogItem[];
};

export default function PublicChangelog() {
  const [, params] = useRoute("/changelog/:slug");
  const slug = params?.slug;

  const { data, isLoading, error } = useQuery<ChangelogData>({
    queryKey: ["/api/changelog", slug],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
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
            <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold" data-testid="text-changelog-error">Changelog not found</h2>
            <p className="text-sm text-muted-foreground">This changelog doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, items } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 pb-16">
        <header className="mb-8 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
              <MessageSquareText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium" data-testid="text-changelog-brand">FeedbackForge</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-changelog-title">{project.name} Changelog</h1>
          {project.description && (
            <p className="text-muted-foreground" data-testid="text-changelog-description">{project.description}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "update" : "updates"} published
          </p>
        </header>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground" data-testid="text-changelog-empty">No changelog entries yet. Check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-6">
              {[...items].reverse().map((item) => {
                const info = getTypeInfo(item.type);
                const Icon = info.icon;
                return (
                  <div key={item.id} className="relative pl-10" data-testid={`changelog-item-${item.id}`}>
                    <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={info.variant}>
                              <Icon className="w-3 h-3 mr-1" />
                              {info.label}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.publishedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <h3 className="font-medium leading-snug">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <footer className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">Powered by FeedbackForge</p>
        </footer>
      </div>
    </div>
  );
}
