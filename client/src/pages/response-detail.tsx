import { useRoute, Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaywallGate } from "@/components/paywall-gate";
import { ArrowLeft, Star, MessageSquareText, User, Mail, Calendar, Tag } from "lucide-react";
import type { FeedbackResponse, Answer, Question } from "@shared/schema";

type ResponseDetail = FeedbackResponse & {
  answers: (Answer & { question: Question })[];
  projectName: string;
};

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${
            star <= value
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/20"
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
    </div>
  );
}

export default function ResponseDetailPage() {
  return (
    <PaywallGate>
      <ResponseDetailContent />
    </PaywallGate>
  );
}

function ResponseDetailContent() {
  usePageTitle("Response Details");
  const [, params] = useRoute("/responses/:id");
  const id = params?.id;

  const { data: response, isLoading } = useQuery<ResponseDetail>({
    queryKey: ["/api/responses", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!response) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquareText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-base font-medium mb-1">Response not found</h3>
            <p className="text-sm text-muted-foreground">This response may have been deleted.</p>
            <Link href="/responses">
              <Button variant="outline" className="mt-4" data-testid="button-back-responses">
                Back to Responses
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formAnswers = response.answers.filter((a) => a.question.source === "form");
  const widgetAnswers = response.answers.filter((a) => a.question.source === "widget");

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/responses">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-response-title">Response Detail</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Submitted to <Link href={`/projects/${response.projectId}`}><span className="text-primary hover:underline cursor-pointer" data-testid="link-project">{response.projectName}</span></Link>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Respondent Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm" data-testid="text-respondent-name">{response.respondentName || "Anonymous"}</span>
          </div>
          {response.respondentEmail && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm" data-testid="text-respondent-email">{response.respondentEmail}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground" data-testid="text-submitted-date">
              {new Date(response.submittedAt).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <Badge variant="secondary" data-testid="badge-source">
              {widgetAnswers.length > 0 && formAnswers.length === 0 ? "Widget" : "Form"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {formAnswers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-medium">Form Answers</h2>
          {formAnswers
            .sort((a, b) => a.question.order - b.question.order)
            .map((answer) => (
              <Card key={answer.id} data-testid={`card-answer-${answer.id}`}>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{answer.question.label}</p>
                  {answer.question.type === "rating" ? (
                    <StarDisplay value={parseInt(answer.value) || 0} />
                  ) : (
                    <p className="text-sm" data-testid={`text-answer-value-${answer.id}`}>{answer.value}</p>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {widgetAnswers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-medium">Widget Feedback</h2>
          {widgetAnswers
            .sort((a, b) => a.question.order - b.question.order)
            .map((answer) => (
              <Card key={answer.id} data-testid={`card-answer-${answer.id}`}>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {answer.question.label.replace("Widget ", "")}
                  </p>
                  {answer.question.type === "rating" ? (
                    <StarDisplay value={parseInt(answer.value) || 0} />
                  ) : (
                    <p className="text-sm" data-testid={`text-answer-value-${answer.id}`}>{answer.value}</p>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
