import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, GripVertical, Star, MessageSquareText, ListChecks } from "lucide-react";
import { Link } from "wouter";
import { PaywallGate } from "@/components/paywall-gate";

type QuestionDraft = {
  id: string;
  label: string;
  type: "rating" | "text" | "multiple_choice";
  required: boolean;
  options: string[];
};

function QuestionTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "rating": return <Star className="w-4 h-4" />;
    case "text": return <MessageSquareText className="w-4 h-4" />;
    case "multiple_choice": return <ListChecks className="w-4 h-4" />;
    default: return <MessageSquareText className="w-4 h-4" />;
  }
}

export default function ProjectNew() {
  return (
    <PaywallGate>
      <ProjectNewContent />
    </PaywallGate>
  );
}

function ProjectNewContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { id: "1", label: "", type: "rating", required: true, options: [] },
  ]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        + "-" + Math.random().toString(36).substring(2, 6);

      const res = await apiRequest("POST", "/api/projects", {
        project: { name, description, slug, status: "draft" },
        questions: questions.map((q, i) => ({
          label: q.label,
          type: q.type,
          required: q.required,
          options: q.type === "multiple_choice" ? q.options.filter(Boolean) : [],
          order: i,
        })),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created successfully" });
      navigate(`/projects/${data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create project", description: err.message, variant: "destructive" });
    },
  });

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: Date.now().toString(), label: "", type: "text", required: true, options: [] },
    ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<QuestionDraft>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const addOption = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, options: [...q.options, ""] } : q))
    );
  };

  const updateOption = (qId: string, idx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? { ...q, options: q.options.map((o, i) => (i === idx ? value : o)) }
          : q
      )
    );
  };

  const removeOption = (qId: string, idx: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q
      )
    );
  };

  const canSubmit = name.trim() !== "" && questions.every((q) => q.label.trim() !== "");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects">
          <Button variant="ghost" size="icon" data-testid="button-back-projects">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-new-project-title">New Project</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up a new feedback collection project</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="e.g., Product Feedback Q1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-project-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-desc">Description (optional)</Label>
            <Textarea
              id="project-desc"
              placeholder="Brief description of what you're collecting feedback for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={3}
              data-testid="input-project-description"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Questions</CardTitle>
          <Button variant="outline" size="sm" onClick={addQuestion} data-testid="button-add-question">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Question
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="relative p-4 rounded-md border space-y-3"
              data-testid={`card-question-draft-${index}`}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <span className="text-xs font-medium text-muted-foreground shrink-0">Q{index + 1}</span>
                <div className="flex-1" />
                {questions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(question.id)}
                    data-testid={`button-remove-question-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Question text..."
                  value={question.label}
                  onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                  data-testid={`input-question-label-${index}`}
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <Select
                    value={question.type}
                    onValueChange={(v) =>
                      updateQuestion(question.id, {
                        type: v as QuestionDraft["type"],
                        options: v === "multiple_choice" ? ["Option 1", "Option 2"] : [],
                      })
                    }
                  >
                    <SelectTrigger className="w-48" data-testid={`select-question-type-${index}`}>
                      <div className="flex items-center gap-2">
                        <QuestionTypeIcon type={question.type} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">Rating (1-5)</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={question.required}
                      onCheckedChange={(v) => updateQuestion(question.id, { required: v })}
                      data-testid={`switch-question-required-${index}`}
                    />
                    <Label className="text-xs text-muted-foreground">Required</Label>
                  </div>
                </div>
                {question.type === "multiple_choice" && (
                  <div className="space-y-2 pl-4">
                    {question.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${optIdx + 1}`}
                          value={opt}
                          onChange={(e) => updateOption(question.id, optIdx, e.target.value)}
                          className="flex-1"
                          data-testid={`input-option-${index}-${optIdx}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(question.id, optIdx)}
                          data-testid={`button-remove-option-${index}-${optIdx}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(question.id)}
                      data-testid={`button-add-option-${index}`}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Option
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href="/projects">
          <Button variant="outline" data-testid="button-cancel">Cancel</Button>
        </Link>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!canSubmit || createMutation.isPending}
          data-testid="button-create-project"
        >
          {createMutation.isPending ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </div>
  );
}
