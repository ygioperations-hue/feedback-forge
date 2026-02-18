import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Star, CheckCircle, MessageSquareText } from "lucide-react";
import type { ProjectWithQuestions } from "@shared/schema";

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="p-0.5"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          data-testid={`button-star-${star}`}
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function PublicForm() {
  const { toast } = useToast();
  const [, params] = useRoute("/form/:slug");
  const slug = params?.slug;
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: project, isLoading } = useQuery<ProjectWithQuestions>({
    queryKey: ["/api/forms", slug],
    enabled: !!slug,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project");
      await apiRequest("POST", `/api/forms/${slug}/submit`, {
        respondentName: name || null,
        respondentEmail: email || null,
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value,
        })),
      });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    },
  });

  const updateAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-xl space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <MessageSquareText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Form not found</h2>
            <p className="text-sm text-muted-foreground">This feedback form doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold mb-2" data-testid="text-thank-you">Thank you!</h2>
            <p className="text-sm text-muted-foreground">Your feedback has been submitted successfully.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requiredQuestions = project.questions?.filter((q) => q.required) || [];
  const allRequiredAnswered = requiredQuestions.every(
    (q) => answers[q.id] && answers[q.id].trim() !== ""
  );

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-8 sm:pt-16">
      <div className="w-full max-w-xl space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
              <MessageSquareText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">FeedbackForge</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-form-title">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Information (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="respondent-name" className="text-xs">Name</Label>
              <Input
                id="respondent-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-respondent-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="respondent-email" className="text-xs">Email</Label>
              <Input
                id="respondent-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-respondent-email"
              />
            </div>
          </CardContent>
        </Card>

        {project.questions
          ?.sort((a, b) => a.order - b.order)
          .map((question, index) => (
            <Card key={question.id} data-testid={`card-form-question-${index}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-1">
                  <Label className="text-sm font-medium">
                    {question.label}
                  </Label>
                  {question.required && (
                    <span className="text-destructive text-xs">*</span>
                  )}
                </div>

                {question.type === "rating" && (
                  <StarRating
                    value={parseInt(answers[question.id] || "0")}
                    onChange={(v) => updateAnswer(question.id, v.toString())}
                  />
                )}

                {question.type === "text" && (
                  <Textarea
                    placeholder="Your answer..."
                    className="resize-none"
                    rows={3}
                    value={answers[question.id] || ""}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    data-testid={`input-answer-${index}`}
                  />
                )}

                {question.type === "multiple_choice" && question.options && (
                  <RadioGroup
                    value={answers[question.id] || ""}
                    onValueChange={(v) => updateAnswer(question.id, v)}
                    data-testid={`radio-answer-${index}`}
                  >
                    {question.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <RadioGroupItem value={opt} id={`${question.id}-${optIdx}`} />
                        <Label htmlFor={`${question.id}-${optIdx}`} className="text-sm font-normal cursor-pointer">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          ))}

        <div className="flex justify-end pb-8">
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!allRequiredAnswered || submitMutation.isPending}
            data-testid="button-submit-form"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </div>
    </div>
  );
}
