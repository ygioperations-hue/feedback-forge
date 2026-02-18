import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderPlus, MessageSquareText, BarChart3, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { Project, FeedbackResponse } from "@shared/schema";

export default function Dashboard() {
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: responses, isLoading: loadingResponses } = useQuery<FeedbackResponse[]>({
    queryKey: ["/api/responses"],
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
