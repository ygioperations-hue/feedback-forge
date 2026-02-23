import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MessageSquareText, Star } from "lucide-react";
import { Link } from "wouter";
import { PaywallGate } from "@/components/paywall-gate";
import type { FeedbackResponse, Project, Answer, Question } from "@shared/schema";

type ResponseWithProject = FeedbackResponse & {
  answers: Answer[];
  projectName: string;
  projectId: string;
};

export default function ResponsesList() {
  return (
    <PaywallGate>
      <ResponsesContent />
    </PaywallGate>
  );
}

function ResponsesContent() {
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allResponses, isLoading } = useQuery<(FeedbackResponse & { answers: Answer[] })[]>({
    queryKey: ["/api/responses"],
  });

  const responses: ResponseWithProject[] = (allResponses || []).map((r) => {
    const project = projects?.find((p) => p.id === r.projectId);
    return {
      ...r,
      projectName: project?.name || "Unknown",
      projectId: r.projectId,
    };
  });

  const sortedResponses = responses.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-responses-title">All Responses</h1>
        <p className="text-sm text-muted-foreground mt-1">View all feedback responses across projects</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedResponses.length > 0 ? (
        <div className="space-y-3">
          {sortedResponses.map((response) => (
            <Link href={`/responses/${response.id}`} key={response.id}>
              <Card className="hover-elevate cursor-pointer" data-testid={`card-response-list-${response.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 shrink-0">
                        <MessageSquareText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {response.respondentName || "Anonymous"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant="secondary" className="text-xs">{response.projectName}</Badge>
                          {response.respondentEmail && (
                            <span className="text-xs text-muted-foreground">{response.respondentEmail}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(response.submittedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">{response.answers?.length ?? 0} answers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquareText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-base font-medium mb-1">No responses yet</h3>
            <p className="text-sm text-muted-foreground">Responses will appear here once people submit your feedback forms</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
