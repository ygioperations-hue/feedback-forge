import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, ExternalLink, Star, MessageSquareText, ListChecks, Code, Check, Map, FileText, Globe, EyeOff, Plus, Pencil, Trash2, ThumbsUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PaywallGate } from "@/components/paywall-gate";
import type { ProjectWithQuestions, ResponseWithAnswers, Question, RoadmapItem, ChangelogItem } from "@shared/schema";

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
  usePageTitle("Project Details");
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
          <TabsTrigger value="roadmap" data-testid="tab-roadmap">
            <Map className="w-3.5 h-3.5 mr-1.5" />
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="changelog" data-testid="tab-changelog">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Changelog
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
          <QuestionsManager projectId={project.id} questions={project.questions || []} />
        </TabsContent>
        <TabsContent value="widget" className="mt-4">
          <WidgetSnippet slug={project.slug} />
        </TabsContent>
        <TabsContent value="roadmap" className="mt-4">
          <RoadmapManager projectId={project.id} slug={project.slug} />
        </TabsContent>
        <TabsContent value="changelog" className="mt-4">
          <ChangelogManager projectId={project.id} slug={project.slug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  under_review: "Under Review",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  under_review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

function QuestionsManager({ projectId, questions }: { projectId: string; questions: Question[] }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<string>("text");
  const [required, setRequired] = useState(true);
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  const resetForm = () => {
    setLabel("");
    setType("text");
    setRequired(true);
    setOptions([]);
    setNewOption("");
    setEditingQuestion(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (q: Question) => {
    setEditingQuestion(q);
    setLabel(q.label);
    setType(q.type);
    setRequired(q.required);
    setOptions(q.options || []);
    setNewOption("");
    setDialogOpen(true);
  };

  const addMutation = useMutation({
    mutationFn: async (data: { label: string; type: string; required: boolean; options: string[]; order: number }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/questions`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Question added" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Failed to add question", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { label?: string; required?: boolean; options?: string[] } }) => {
      const res = await apiRequest("PATCH", `/api/questions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Question updated" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Failed to update question", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Question deleted" });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Failed to delete question", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!label.trim()) return;
    if (editingQuestion) {
      updateMutation.mutate({
        id: editingQuestion.id,
        data: { label: label.trim(), required, options: type === "multiple_choice" ? options : [] },
      });
    } else {
      const maxOrder = questions.length > 0 ? Math.max(...questions.map((q) => q.order)) + 1 : 0;
      addMutation.mutate({
        label: label.trim(),
        type,
        required,
        options: type === "multiple_choice" ? options : [],
        order: maxOrder,
      });
    }
  };

  const addOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const sorted = [...questions].sort((a, b) => a.order - b.order);
  const formQuestions = sorted.filter((q) => q.source !== "widget");
  const widgetQuestions = sorted.filter((q) => q.source === "widget");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openAddDialog} data-testid="button-add-question">
          <Plus className="w-4 h-4 mr-1" /> Add Question
        </Button>
      </div>

      {formQuestions.length > 0 && (
        <div className="space-y-2">
          {formQuestions.map((question, index) => (
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
                        <Badge key={i} variant="outline" className="text-xs">{opt}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(question)} data-testid={`button-edit-question-${question.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(question)} data-testid={`button-delete-question-${question.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {widgetQuestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Widget Questions</p>
          {widgetQuestions.map((question) => (
            <Card key={question.id} data-testid={`card-question-${question.id}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{question.label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      <QuestionTypeIcon type={question.type} />
                      <span className="ml-1">{question.type.replace("_", " ")}</span>
                    </Badge>
                    <Badge variant="outline" className="text-xs">Widget</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {formQuestions.length === 0 && widgetQuestions.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <ListChecks className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No questions configured</p>
            <p className="text-xs text-muted-foreground mt-1">Add questions to start collecting feedback</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } else { setDialogOpen(true); } }} data-testid="dialog-question">
        <DialogContent data-testid="dialog-question">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question-label">Label</Label>
              <Input id="question-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Enter question text" data-testid="input-question-label" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              {editingQuestion ? (
                <Input value={type.replace("_", " ")} disabled className="capitalize" data-testid="input-question-type-disabled" />
              ) : (
                <Select value={type} onValueChange={setType} data-testid="select-question-type">
                  <SelectTrigger data-testid="select-question-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="question-required" checked={required} onChange={(e) => setRequired(e.target.checked)} className="rounded border-gray-300" data-testid="checkbox-question-required" />
              <Label htmlFor="question-required" className="text-sm font-normal">Required</Label>
            </div>
            {type === "multiple_choice" && (
              <div className="space-y-2">
                <Label>Options</Label>
                {options.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {options.map((opt, i) => (
                      <Badge key={i} variant="secondary" className="text-xs gap-1">
                        {opt}
                        <button onClick={() => removeOption(i)} className="ml-1 hover:text-destructive" data-testid={`button-remove-option-${i}`}>×</button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Add option" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }} data-testid="input-question-option" />
                  <Button type="button" variant="outline" size="sm" onClick={addOption} data-testid="button-add-option">Add</Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!label.trim() || addMutation.isPending || updateMutation.isPending} data-testid="button-save-question">
              {addMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} data-testid="dialog-delete-question">
        <DialogContent data-testid="dialog-delete-question">
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "<strong>{deleteTarget?.label}</strong>"?
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Existing responses for this question will no longer be linked to it.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-question">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoadmapManager({ projectId, slug }: { projectId: string; slug: string }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", status: "planned", order: 0 });

  const { data: items, isLoading } = useQuery<RoadmapItem[]>({
    queryKey: ["/api/projects", projectId, "roadmap"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("POST", `/api/roadmap/${slug}/items`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "roadmap"] });
      toast({ title: "Roadmap item created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create item", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      await apiRequest("PATCH", `/api/roadmap/items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "roadmap"] });
      toast({ title: "Roadmap item updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update item", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/roadmap/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "roadmap"] });
      toast({ title: "Roadmap item deleted" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete item", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ title: "", description: "", status: "planned", order: (items?.length ?? 0) + 1 });
    setDialogOpen(true);
  };

  const openEdit = (item: RoadmapItem) => {
    setEditingItem(item);
    setFormData({ title: item.title, description: item.description || "", status: item.status, order: item.order });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ title: "", description: "", status: "planned", order: 0 });
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const grouped = (items || []).reduce((acc, item) => {
    if (!acc[item.status]) acc[item.status] = [];
    acc[item.status].push(item);
    return acc;
  }, {} as Record<string, RoadmapItem[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage your product roadmap. Items are visible on your{" "}
          <a href={`/roadmap/${slug}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            public roadmap page
          </a>.
        </p>
        <Button size="sm" onClick={openCreate} data-testid="button-add-roadmap-item">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Item
        </Button>
      </div>

      {items && items.length > 0 ? (
        <div className="space-y-6">
          {["in_progress", "planned", "under_review", "completed"].map((status) => {
            const statusItems = grouped[status];
            if (!statusItems || statusItems.length === 0) return null;
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`text-xs ${STATUS_COLORS[status]}`} data-testid={`badge-status-group-${status}`}>
                    {STATUS_LABELS[status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{statusItems.length} item{statusItems.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {statusItems.sort((a, b) => a.order - b.order).map((item) => (
                    <Card key={item.id} data-testid={`card-roadmap-item-${item.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" data-testid={`text-roadmap-title-${item.id}`}>{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <ThumbsUp className="w-3 h-3" />
                                {item.upvotes} upvote{item.upvotes !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} data-testid={`button-edit-roadmap-${item.id}`}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)} data-testid={`button-delete-roadmap-${item.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Map className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No roadmap items yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add items to share your product roadmap with customers</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent data-testid="dialog-roadmap-item">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Roadmap Item" : "Add Roadmap Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roadmap-title">Title</Label>
              <Input
                id="roadmap-title"
                placeholder="e.g., Dark mode support"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-roadmap-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roadmap-description">Description (optional)</Label>
              <Textarea
                id="roadmap-description"
                placeholder="Describe this roadmap item..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                data-testid="input-roadmap-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roadmap-status">Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger data-testid="select-roadmap-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-roadmap">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-roadmap">
              {isPending ? "Saving..." : editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent data-testid="dialog-delete-roadmap">
          <DialogHeader>
            <DialogTitle>Delete Roadmap Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this roadmap item? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete-roadmap">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-roadmap">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  improvement: "Improvement",
  new_feature: "New Feature",
  bug_fix: "Bug Fix",
  update: "Update",
};

const TYPE_COLORS: Record<string, string> = {
  improvement: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  new_feature: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  bug_fix: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  update: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

function ChangelogManager({ projectId, slug }: { projectId: string; slug: string }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChangelogItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", type: "improvement" });

  const { data: items, isLoading } = useQuery<ChangelogItem[]>({
    queryKey: ["/api/projects", projectId, "changelog"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("POST", `/api/changelog/${slug}/items`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "changelog"] });
      toast({ title: "Changelog entry created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create entry", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      await apiRequest("PATCH", `/api/changelog/items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "changelog"] });
      toast({ title: "Changelog entry updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update entry", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/changelog/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "changelog"] });
      toast({ title: "Changelog entry deleted" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete entry", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ title: "", description: "", type: "improvement" });
    setDialogOpen(true);
  };

  const openEdit = (item: ChangelogItem) => {
    setEditingItem(item);
    setFormData({ title: item.title, description: item.description || "", type: item.type });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ title: "", description: "", type: "improvement" });
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const sortedItems = [...(items || [])].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Keep customers informed about updates via your{" "}
          <a href={`/changelog/${slug}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            public changelog
          </a>.
        </p>
        <Button size="sm" onClick={openCreate} data-testid="button-add-changelog-entry">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Entry
        </Button>
      </div>

      {sortedItems.length > 0 ? (
        <div className="space-y-3">
          {sortedItems.map((item) => (
            <Card key={item.id} data-testid={`card-changelog-item-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium" data-testid={`text-changelog-title-${item.id}`}>{item.title}</p>
                      <Badge className={`text-xs ${TYPE_COLORS[item.type] || TYPE_COLORS.update}`}>
                        {TYPE_LABELS[item.type] || item.type}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(item.publishedAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} data-testid={`button-edit-changelog-${item.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)} data-testid={`button-delete-changelog-${item.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No changelog entries yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add entries to share product updates with your customers</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent data-testid="dialog-changelog-item">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Changelog Entry" : "Add Changelog Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="changelog-title">Title</Label>
              <Input
                id="changelog-title"
                placeholder="e.g., Improved dashboard performance"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-changelog-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="changelog-description">Description (optional)</Label>
              <Textarea
                id="changelog-description"
                placeholder="Describe this update..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                data-testid="input-changelog-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="changelog-type">Type</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                <SelectTrigger data-testid="select-changelog-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="new_feature">New Feature</SelectItem>
                  <SelectItem value="bug_fix">Bug Fix</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-changelog">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-changelog">
              {isPending ? "Saving..." : editingItem ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent data-testid="dialog-delete-changelog">
          <DialogHeader>
            <DialogTitle>Delete Changelog Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this changelog entry? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete-changelog">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-changelog">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
