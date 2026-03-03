import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderPlus, ExternalLink, MoreVertical, Copy, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PaywallGate } from "@/components/paywall-gate";
import type { Project, FeedbackResponse } from "@shared/schema";

export default function Projects() {
  return (
    <PaywallGate>
      <ProjectsContent />
    </PaywallGate>
  );
}

function ProjectsContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: responses } = useQuery<FeedbackResponse[]>({
    queryKey: ["/api/responses"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/responses"] });
      toast({ title: "Project deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete project", variant: "destructive" });
    },
  });

  const copyFormLink = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Form link copied to clipboard" });
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-projects-title">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your feedback collection projects</p>
        </div>
        <Link href="/projects/new">
          <Button data-testid="button-new-project">
            <FolderPlus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const responseCount = responses?.filter((r) => r.projectId === project.id).length ?? 0;
            return (
              <Card
                key={project.id}
                className="hover-elevate cursor-pointer"
                data-testid={`card-project-${project.id}`}
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold" data-testid={`text-project-name-${project.id}`}>
                      {project.name}
                    </h3>
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" data-testid={`button-project-menu-${project.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyFormLink(project.slug)} data-testid={`button-copy-link-${project.id}`}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy form link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(project.id)}
                            data-testid={`button-delete-project-${project.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant={project.status === "active" ? "default" : "secondary"} className="text-xs">
                        {project.status === "active" ? "Published" : "Draft"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{responseCount} responses</span>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Link href={`/form/${project.slug}`} target="_blank">
                        <Button variant="ghost" size="sm" data-testid={`button-view-form-${project.id}`}>
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Form
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderPlus className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-base font-medium mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first feedback project to start collecting insights</p>
            <Link href="/projects/new">
              <Button data-testid="button-create-first-project">
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
