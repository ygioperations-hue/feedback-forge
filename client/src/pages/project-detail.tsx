import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, ExternalLink, Star, MessageSquareText, ListChecks } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
            <Badge variant={project.status === "active" ? "default" : "secondary"}>
              {project.status}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={copyFormLink} data-testid="button-copy-form-link">
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Copy Link
        </Button>
        <Link href={`/form/${project.slug}`} target="_blank">
          <Button variant="outline" size="sm" data-testid="button-open-form">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open Form
          </Button>
        </Link>
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
      </Tabs>
    </div>
  );
}
