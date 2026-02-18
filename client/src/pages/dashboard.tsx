import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderPlus, MessageSquareText, BarChart3, TrendingUp, Sparkles, Lightbulb, ListChecks, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Project, FeedbackResponse } from "@shared/schema";

interface AISummary {
  bullets: string[];
  insight: string;
  topRequests: string[];
  responseCount: number;
  projectCount: number;
  generatedAt: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);

  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: responses, isLoading: loadingResponses } = useQuery<FeedbackResponse[]>({
    queryKey: ["/api/responses"],
  });

  const summaryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/summary");
      return res.json() as Promise<AISummary>;
    },
    onSuccess: (data) => {
      setAiSummary(data);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to generate summary",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const totalProjects = projects?.length ?? 0;
  const activeProjects = projects?.filter((p) => p.status === "active").length ?? 0;
  const totalResponses = responses?.length ?? 0;
  const recentResponses = responses?.filter((r) => {
    const date = new Date(r.submittedAt);
    const week = new Date();
    week.setDate(week.getDate() - 7);
    return date >= week;
  }).length ?? 0;

  const stats = [
    {
      title: "Total Projects",
      value: totalProjects,
      icon: FolderPlus,
      description: `${activeProjects} active`,
    },
    {
      title: "Total Responses",
      value: totalResponses,
      icon: MessageSquareText,
      description: "All time",
    },
    {
      title: "This Week",
      value: recentResponses,
      icon: TrendingUp,
      description: "New responses",
    },
    {
      title: "Avg / Project",
      value: totalProjects > 0 ? Math.round(totalResponses / totalProjects) : 0,
      icon: BarChart3,
      description: "Responses per project",
    },
  ];

  const isLoading = loadingProjects || loadingResponses;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your feedback projects</p>
        </div>
        <Link href="/projects/new">
          <Button data-testid="button-new-project">
            <FolderPlus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s/g, "-")}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="relative overflow-visible">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-purple-500/10">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-base">AI Insights</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Powered by GPT-4o Mini</p>
            </div>
          </div>
          <Button
            onClick={() => summaryMutation.mutate()}
            disabled={summaryMutation.isPending || totalResponses === 0}
            data-testid="button-generate-ai-summary"
          >
            {summaryMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {summaryMutation.isPending ? "Analyzing..." : "Generate AI Summary"}
          </Button>
        </CardHeader>
        <CardContent>
          {!aiSummary && !summaryMutation.isPending && (
            <div className="text-center py-6">
              <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Click "Generate AI Summary" to get AI-powered insights from all your feedback
              </p>
              {totalResponses === 0 && (
                <p className="text-xs text-muted-foreground mt-2">Collect some feedback first to unlock insights</p>
              )}
            </div>
          )}

          {summaryMutation.isPending && (
            <div className="space-y-3 py-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-16 w-full mt-4" />
              <Skeleton className="h-4 w-2/3 mt-4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {aiSummary && !summaryMutation.isPending && (
            <div className="space-y-5" data-testid="card-ai-summary">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-semibold">Key Takeaways</h3>
                </div>
                <ul className="space-y-2">
                  {aiSummary.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-muted-foreground">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Overall Insight</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{aiSummary.insight}</p>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <h3 className="text-sm font-semibold">Top Requests</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiSummary.topRequests.map((req, i) => (
                    <Badge key={i} variant="secondary" data-testid={`badge-top-request-${i}`}>{req}</Badge>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3 flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Based on {aiSummary.responseCount} responses across {aiSummary.projectCount} projects</span>
                <span>Generated {new Date(aiSummary.generatedAt).toLocaleString()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-2">
                {projects.slice(0, 5).map((project) => {
                  const projectResponses = responses?.filter((r) => r.projectId === project.id).length ?? 0;
                  return (
                    <Link href={`/projects/${project.id}`} key={project.id}>
                      <div
                        className="flex items-center justify-between gap-4 p-3 rounded-md hover-elevate cursor-pointer"
                        data-testid={`card-project-${project.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                            <FolderPlus className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{project.name}</p>
                            <p className="text-xs text-muted-foreground">{projectResponses} responses</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-md ${project.status === "active" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                          {project.status}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderPlus className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No projects yet</p>
                <Link href="/projects/new">
                  <Button variant="outline" className="mt-3" size="sm" data-testid="button-create-first-project">
                    Create your first project
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Responses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : responses && responses.length > 0 ? (
              <div className="space-y-2">
                {responses.slice(0, 5).map((response) => {
                  const project = projects?.find((p) => p.id === response.projectId);
                  return (
                    <div
                      key={response.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-md"
                      data-testid={`card-response-${response.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-chart-2/10 shrink-0">
                          <MessageSquareText className="w-4 h-4 text-chart-2" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {response.respondentName || "Anonymous"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {project?.name ?? "Unknown project"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(response.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquareText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No responses yet</p>
                <p className="text-xs text-muted-foreground mt-1">Share your feedback forms to start collecting</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
