import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, ExternalLink, Star, MessageSquareText, ListChecks, Code, Check } from "lucide-react";
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

  const apiBase = window.location.origin;
  const snippet = `<!-- FeedbackForge Widget -->
<script>
(function(){
  var API="${apiBase}/api/widget/${slug}/submit";
  var s=document.createElement("style");
  s.textContent=\`
    .ff-trigger{position:fixed;bottom:24px;right:24px;z-index:99999;width:52px;height:52px;border-radius:50%;background:#7c3aed;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(124,58,237,.4);transition:box-shadow .2s}
    .ff-trigger:hover{box-shadow:0 6px 20px rgba(124,58,237,.5)}
    .ff-trigger svg{width:24px;height:24px}
    .ff-overlay{position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.4);opacity:0;transition:opacity .2s;pointer-events:none}
    .ff-overlay.ff-show{opacity:1;pointer-events:auto}
    .ff-modal{position:fixed;bottom:88px;right:24px;z-index:99999;width:380px;max-width:calc(100vw - 48px);background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.2);transform:translateY(16px) scale(.95);opacity:0;transition:transform .25s,opacity .25s;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
    .ff-modal.ff-show{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}
    .ff-header{padding:20px 20px 0;display:flex;align-items:center;justify-content:space-between}
    .ff-header h3{margin:0;font-size:16px;font-weight:600;color:#1a1a2e}
    .ff-close{background:none;border:none;cursor:pointer;color:#9ca3af;font-size:20px;padding:4px;line-height:1}
    .ff-body{padding:16px 20px 20px}
    .ff-field{margin-bottom:14px}
    .ff-label{display:block;font-size:13px;font-weight:500;color:#4b5563;margin-bottom:6px}
    .ff-stars{display:flex;gap:4px}
    .ff-star{background:none;border:none;cursor:pointer;padding:2px;font-size:0;line-height:0}
    .ff-star svg{width:28px;height:28px;transition:color .15s,fill .15s}
    .ff-star .off{fill:none;stroke:#d1d5db;stroke-width:1.5}
    .ff-star .on{fill:#f59e0b;stroke:#f59e0b;stroke-width:1.5}
    .ff-select,.ff-textarea,.ff-input{width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;color:#1a1a2e;background:#fff;outline:none;box-sizing:border-box;transition:border-color .15s}
    .ff-select:focus,.ff-textarea:focus,.ff-input:focus{border-color:#7c3aed}
    .ff-textarea{resize:vertical;min-height:80px;font-family:inherit}
    .ff-submit{width:100%;padding:10px;border:none;border-radius:8px;background:#7c3aed;color:#fff;font-size:14px;font-weight:500;cursor:pointer;transition:opacity .15s}
    .ff-submit:hover{opacity:.9}
    .ff-submit:disabled{opacity:.6;cursor:not-allowed}
    .ff-success{text-align:center;padding:32px 20px}
    .ff-success svg{width:48px;height:48px;color:#10b981;margin:0 auto 12px}
    .ff-success p{margin:0;font-size:15px;color:#4b5563}
    .ff-success strong{display:block;font-size:17px;color:#1a1a2e;margin-bottom:4px}
    @media(prefers-color-scheme:dark){
      .ff-modal{background:#1e1e2e;box-shadow:0 20px 60px rgba(0,0,0,.5)}
      .ff-header h3,.ff-success strong{color:#f1f5f9}
      .ff-label{color:#94a3b8}
      .ff-select,.ff-textarea,.ff-input{background:#2a2a3e;border-color:#3f3f5e;color:#f1f5f9}
      .ff-select:focus,.ff-textarea:focus,.ff-input:focus{border-color:#7c3aed}
      .ff-star .off{stroke:#4b5563}
      .ff-success p{color:#94a3b8}
      .ff-close{color:#6b7280}
    }
  \`;
  document.head.appendChild(s);
  var star='<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>';
  var btn=document.createElement("button");
  btn.className="ff-trigger";
  btn.setAttribute("aria-label","Send feedback");
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  document.body.appendChild(btn);
  var ov=document.createElement("div");ov.className="ff-overlay";document.body.appendChild(ov);
  var m=document.createElement("div");m.className="ff-modal";
  m.innerHTML='<div class="ff-header"><h3>Send Feedback</h3><button class="ff-close" aria-label="Close">&times;</button></div><div class="ff-body"><div class="ff-field"><label class="ff-label">Rating</label><div class="ff-stars" id="ff-stars"></div></div><div class="ff-field"><label class="ff-label">Category</label><select class="ff-select" id="ff-cat"><option value="">Select...</option><option value="Bug">Bug</option><option value="Feature">Feature</option><option value="Idea">Idea</option><option value="Other">Other</option></select></div><div class="ff-field"><label class="ff-label">Message</label><textarea class="ff-textarea" id="ff-msg" placeholder="Tell us what you think..."></textarea></div><div class="ff-field"><label class="ff-label">Name (optional)</label><input class="ff-input" id="ff-name" placeholder="Your name"/></div><button class="ff-submit" id="ff-sub">Submit Feedback</button></div>';
  document.body.appendChild(m);
  var rating=0;
  var starsEl=m.querySelector("#ff-stars");
  for(var i=1;i<=5;i++){(function(v){var b=document.createElement("button");b.className="ff-star";b.innerHTML=star;b.querySelector("path").classList.add("off");b.onclick=function(){rating=v;updateStars()};starsEl.appendChild(b)})(i)}
  function updateStars(){var bs=starsEl.querySelectorAll(".ff-star path");for(var j=0;j<bs.length;j++){bs[j].classList.remove("on","off");bs[j].classList.add(j<rating?"on":"off")}}
  function toggle(show){m.classList.toggle("ff-show",show);ov.classList.toggle("ff-show",show)}
  btn.onclick=function(){toggle(true)};
  ov.onclick=function(){toggle(false)};
  m.querySelector(".ff-close").onclick=function(){toggle(false)};
  m.querySelector("#ff-sub").onclick=function(){
    var cat=m.querySelector("#ff-cat").value;
    var msg=m.querySelector("#ff-msg").value;
    var name=m.querySelector("#ff-name").value;
    if(!rating||!cat||!msg){alert("Please fill in rating, category, and message.");return}
    var sub=m.querySelector("#ff-sub");sub.disabled=true;sub.textContent="Sending...";
    fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rating:rating,category:cat,message:msg,name:name||undefined})})
    .then(function(r){if(!r.ok)throw new Error();return r.json()})
    .then(function(){
      m.querySelector(".ff-body").innerHTML='<div class="ff-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg><strong>Thank you!</strong><p>Your feedback has been received.</p></div>';
      setTimeout(function(){toggle(false);setTimeout(function(){location.reload()},300)},2000);
    })
    .catch(function(){sub.disabled=false;sub.textContent="Submit Feedback";alert("Something went wrong. Please try again.")});
  };
})();
<\/script>`;

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
