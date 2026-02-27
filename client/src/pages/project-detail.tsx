import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, ExternalLink, Star, MessageSquareText, ListChecks, Code, Check, Map, FileText, Globe, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PaywallGate } from "@/components/paywall-gate";
import type { ProjectWithQuestions, ResponseWithAnswers, Question } from "@shared/schema";

function RatingDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{value}/5</span>
    </div>
  );
}

function QuestionTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "rating":
      return <Star className="w-3.5 h-3.5" />;
    case "text":
      return <MessageSquareText className="w-3.5 h-3.5" />;
    case "multiple_choice":
      return <ListChecks className="w-3.5 h-3.5" />;
    default:
      return <MessageSquareText className="w-3.5 h-3.5" />;
  }
}

function ResponseCard({ response, questions }: { response: ResponseWithAnswers; questions: Question[] }) {
  return (
    <Card data-testid={`card-response-detail-${response.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-medium">{response.respondentName || "Anonymous"}</p>
            {response.respondentEmail && (
              <p className="text-xs text-muted-foreground">{response.respondentEmail}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(response.submittedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="space-y-2 pt-2 border-t">
          {response.answers.map((answer) => {
            const question = questions.find((q) => q.id === answer.questionId);
            if (!question) return null;
            return (
              <div key={answer.id} className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <QuestionTypeIcon type={question.type} />
                  {question.label}
                </p>
                {question.type === "rating" ? (
                  <RatingDisplay value={parseInt(answer.value) || 0} />
                ) : (
                  <p className="text-sm">{answer.value}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectDetail() {
  return (
    <PaywallGate>
      <ProjectDetailContent />
    </PaywallGate>
  );
}

function ProjectDetailContent() {
  const { toast } = useToast();
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;

  const { data: project, isLoading: loadingProject } = useQuery<ProjectWithQuestions>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: responses, isLoading: loadingResponses } = useQuery<ResponseWithAnswers[]>({
    queryKey: ["/api/projects", projectId, "responses"],
    enabled: !!projectId,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project");
      const newStatus = project.status === "active" ? "draft" : "active";
      await apiRequest("PATCH", `/api/projects/${project.id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: project?.status === "active" ? "Project unpublished" : "Project published" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
    },
  });

  const copyFormLink = () => {
    if (!project) return;
    const url = `${window.location.origin}/form/${project.slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Form link copied to clipboard" });
  };

  if (loadingProject) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Project not found</p>
        <Link href="/projects">
          <Button variant="outline" className="mt-4">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const avgRating = (() => {
    if (!responses || responses.length === 0 || !project.questions) return null;
    const ratingQuestions = project.questions.filter((q) => q.type === "rating");
    if (ratingQuestions.length === 0) return null;
    const ratingAnswers = responses.flatMap((r) =>
      r.answers.filter((a) => ratingQuestions.some((q) => q.id === a.questionId))
    );
    if (ratingAnswers.length === 0) return null;
    const sum = ratingAnswers.reduce((acc, a) => acc + (parseInt(a.value) || 0), 0);
    return (sum / ratingAnswers.length).toFixed(1);
  })();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects">
          <Button variant="ghost" size="icon" data-testid="button-back-projects">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight truncate" data-testid="text-project-title">
              {project.name}
            </h1>
            <Badge variant={project.status === "active" ? "default" : "secondary"} data-testid="badge-project-status">
              {project.status === "active" ? "Published" : "Draft"}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={project.status === "active" ? "outline" : "default"}
          size="sm"
          onClick={() => toggleStatusMutation.mutate()}
          disabled={toggleStatusMutation.isPending}
          data-testid="button-toggle-status"
        >
          {project.status === "active" ? (
            <>
              <EyeOff className="w-3.5 h-3.5 mr-1.5" />
              {toggleStatusMutation.isPending ? "Unpublishing..." : "Unpublish"}
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              {toggleStatusMutation.isPending ? "Publishing..." : "Publish"}
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={copyFormLink} disabled={project.status === "draft"} data-testid="button-copy-form-link">
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Copy Link
        </Button>
        {project.status === "active" ? (
          <a href={`/form/${project.slug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" data-testid="button-open-form">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Open Form
            </Button>
          </a>
        ) : (
          <Button variant="outline" size="sm" disabled data-testid="button-open-form">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open Form
          </Button>
        )}
        {project.status === "active" ? (
          <a href={`/roadmap/${project.slug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" data-testid="button-open-roadmap">
              <Map className="w-3.5 h-3.5 mr-1.5" />
              Roadmap
            </Button>
          </a>
        ) : (
          <Button variant="outline" size="sm" disabled data-testid="button-open-roadmap">
            <Map className="w-3.5 h-3.5 mr-1.5" />
            Roadmap
          </Button>
        )}
        {project.status === "active" ? (
          <a href={`/changelog/${project.slug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" data-testid="button-open-changelog">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Changelog
            </Button>
          </a>
        ) : (
          <Button variant="outline" size="sm" disabled data-testid="button-open-changelog">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Changelog
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Responses</p>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-responses">{responses?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Questions</p>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-questions">{project.questions?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Rating</p>
            <p className="text-2xl font-bold mt-1" data-testid="text-avg-rating">{avgRating ?? "N/A"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="responses">
        <TabsList>
          <TabsTrigger value="responses" data-testid="tab-responses">Responses</TabsTrigger>
          <TabsTrigger value="questions" data-testid="tab-questions">Questions</TabsTrigger>
          <TabsTrigger value="widget" data-testid="tab-widget">
            <Code className="w-3.5 h-3.5 mr-1.5" />
            Install Widget
          </TabsTrigger>
        </TabsList>
        <TabsContent value="responses" className="mt-4">
          {loadingResponses ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : responses && responses.length > 0 ? (
            <div className="space-y-3">
              {responses.map((response) => (
                <ResponseCard key={response.id} response={response} questions={project.questions || []} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquareText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No responses yet</p>
                <p className="text-xs text-muted-foreground mt-1">Share your form to start collecting feedback</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="questions" className="mt-4">
          {project.questions && project.questions.length > 0 ? (
            <div className="space-y-2">
              {project.questions
                .sort((a, b) => a.order - b.order)
                .map((question, index) => (
                  <Card key={question.id} data-testid={`card-question-${question.id}`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-xs font-medium shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{question.label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <QuestionTypeIcon type={question.type} />
                            <span className="ml-1">{question.type.replace("_", " ")}</span>
                          </Badge>
                          {question.required && (
                            <span className="text-xs text-muted-foreground">Required</span>
                          )}
                        </div>
                        {question.options && question.options.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {question.options.map((opt, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {opt}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <ListChecks className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No questions configured</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="widget" className="mt-4">
          <WidgetSnippet slug={project.slug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WidgetSnippet({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const appUrl = window.location.origin;
  const snippet = `<!-- FeedbackForge Widget -->\n<script src="${appUrl}/widget.js" data-slug="${slug}"></script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast({ title: "Widget code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-purple-500/10">
              <Code className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-base">Embeddable Feedback Widget</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add a floating feedback button to any website
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                Copy the code below and paste it before the closing <code className="text-xs bg-muted px-1.5 py-0.5 rounded">&lt;/body&gt;</code> tag of your website.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={copySnippet}
                data-testid="button-copy-widget-snippet"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                )}
                {copied ? "Copied" : "Copy Code"}
              </Button>
            </div>
            <div className="relative">
              <pre
                className="bg-muted rounded-md p-4 text-xs overflow-x-auto max-h-72 overflow-y-auto font-mono leading-relaxed"
                data-testid="text-widget-snippet"
              >
                <code>{snippet}</code>
              </pre>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-semibold">What your visitors will see</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500 text-white mx-auto mb-2">
                    <MessageSquareText className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium">Floating Button</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Bottom-right corner</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="flex items-center gap-0.5 justify-center mb-2 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= 4 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <p className="text-xs font-medium">Star Rating</p>
                  <p className="text-xs text-muted-foreground mt-0.5">1-5 star scale</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="flex items-center gap-1 justify-center mb-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">Bug</Badge>
                    <Badge variant="secondary" className="text-xs">Feature</Badge>
                    <Badge variant="secondary" className="text-xs">Idea</Badge>
                  </div>
                  <p className="text-xs font-medium">Categories</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Bug, Feature, Idea, Other</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Widget submissions will appear in the Responses tab. The widget automatically supports dark mode and is fully responsive.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
