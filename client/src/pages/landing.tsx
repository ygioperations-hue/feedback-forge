import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquareText,
  ArrowRight,
  Star,
  BarChart3,
  Code,
  Zap,
  Shield,
  Users,
  Check,
  ChevronRight,
  Globe,
  Map,
  FileText,
  Sparkles,
  Crown,
  Layout,
  MousePointerClick,
  ThumbsUp,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const features = [
  {
    icon: Layout,
    title: "Customizable Forms",
    description: "Build feedback forms with ratings, text fields, and multiple choice questions. Each project gets a unique shareable link.",
  },
  {
    icon: Code,
    title: "Embeddable Widget",
    description: "Drop a lightweight feedback widget on any website with a single script tag. Collect bug reports, feature requests, and ideas.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    description: "Let GPT-4o analyze your feedback patterns automatically. Get key takeaways, trends, and top user requests in seconds.",
  },
  {
    icon: Map,
    title: "Public Roadmap",
    description: "Share what you're building with your users. Let them upvote items so you always know what to prioritize next.",
  },
  {
    icon: FileText,
    title: "Product Changelog",
    description: "Keep users informed about new features, improvements, and bug fixes with a beautiful public changelog page.",
  },
  {
    icon: BarChart3,
    title: "Centralized Dashboard",
    description: "See all your feedback across every project in one place. Track response counts, analyze trends, and stay organized.",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Create a Project",
    description: "Set up a feedback project in seconds. Add rating questions, text fields, or multiple choice options.",
  },
  {
    step: "2",
    title: "Share & Collect",
    description: "Share your form link publicly or embed the widget on your site. Feedback starts flowing in immediately.",
  },
  {
    step: "3",
    title: "Analyze & Act",
    description: "Review responses, generate AI summaries, update your roadmap, and publish changelogs — all from one dashboard.",
  },
];

const plans = [
  {
    id: "monthly" as const,
    name: "Monthly",
    price: "$29",
    period: "/month",
    description: "For teams starting to collect feedback",
    features: [
      "Unlimited projects",
      "Unlimited responses",
      "AI-powered insights",
      "Public roadmap",
      "Changelog page",
      "Embeddable widget",
      "Priority support",
    ],
  },
  {
    id: "yearly" as const,
    name: "Yearly",
    price: "$249",
    period: "/year",
    description: "Best value — save $99 per year",
    savingsNote: "~$20.75/month — 2 months free!",
    features: [
      "Everything in Monthly",
      "2 months free",
      "Advanced analytics",
      "Team collaboration",
      "API access",
      "White-label option",
      "Custom branding",
    ],
  },
];

const testimonials = [
  {
    quote: "FeedbackForge replaced three different tools for us. The AI insights alone save us hours every week.",
    name: "Sarah Chen",
    role: "Product Manager",
  },
  {
    quote: "The embeddable widget is so simple to set up. We started collecting feedback within 5 minutes of signing up.",
    name: "Marcus Rivera",
    role: "Engineering Lead",
  },
  {
    quote: "Public roadmap with upvoting means we always build what users actually want. Game changer for our prioritization.",
    name: "Emily Watkins",
    role: "Founder & CEO",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [ltdCode, setLtdCode] = useState("");

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, []);

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    if (!isAuthenticated) {
      window.location.href = "/signup";
      return;
    }
    setCheckoutLoading(plan);
    try {
      const res = await apiRequest("POST", "/api/billing/checkout", { plan });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ltd/redeem", { code: ltdCode.trim() });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Lifetime deal activated!", description: "You now have unlimited access to all features." });
      setLtdCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/limits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    },
    onError: (err: Error) => {
      toast({ title: "Invalid code", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
                <MessageSquareText className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight" data-testid="text-landing-brand">FeedbackForge</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-features">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-how">How it Works</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-pricing">Pricing</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-testimonials">Testimonials</a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button data-testid="button-go-dashboard">
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" data-testid="button-signin">Sign In</Button>
                  </Link>
                  <Link href="/signup">
                    <Button data-testid="button-signup-hero">
                      Get Started Free
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t py-4 space-y-3">
              <a href="#features" className="block px-2 py-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#how-it-works" className="block px-2 py-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
              <a href="#pricing" className="block px-2 py-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#testimonials" className="block px-2 py-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
              <div className="flex flex-col gap-2 pt-2 border-t">
                {isAuthenticated ? (
                  <Link href="/dashboard">
                    <Button className="w-full" data-testid="button-mobile-dashboard">Go to Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="outline" className="w-full" data-testid="button-mobile-signin">Sign In</Button>
                    </Link>
                    <Link href="/signup">
                      <Button className="w-full" data-testid="button-mobile-signup">Get Started Free</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-32">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm" data-testid="badge-hero">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Now with AI-Powered Insights
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]" data-testid="text-hero-title">
              Collect, Analyze &<br />
              <span className="text-primary">Act on Feedback</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-subtitle">
              The all-in-one platform for product teams to collect user feedback, prioritize features with public roadmaps, and share progress through changelogs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="px-8 text-base" data-testid="button-hero-dashboard">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup">
                    <Button size="lg" className="px-8 text-base" data-testid="button-hero-signup">
                      Start Collecting Feedback
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="px-8 text-base" data-testid="button-hero-signin">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="mt-16 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-1 text-center">
              <Users className="w-5 h-5 text-primary mb-1" />
              <span className="text-2xl sm:text-3xl font-bold" data-testid="text-stat-users">1,200+</span>
              <span className="text-xs text-muted-foreground">Active Users</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <BarChart3 className="w-5 h-5 text-primary mb-1" />
              <span className="text-2xl sm:text-3xl font-bold" data-testid="text-stat-responses">50K+</span>
              <span className="text-xs text-muted-foreground">Responses Collected</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <Star className="w-5 h-5 text-primary mb-1" />
              <span className="text-2xl sm:text-3xl font-bold" data-testid="text-stat-rating">4.9/5</span>
              <span className="text-xs text-muted-foreground">User Rating</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <Shield className="w-5 h-5 text-primary mb-1" />
              <span className="text-2xl sm:text-3xl font-bold" data-testid="text-stat-uptime">99.9%</span>
              <span className="text-xs text-muted-foreground">Uptime</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-28 border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-features-title">
              Everything you need to build better products
            </h2>
            <p className="text-muted-foreground text-lg">
              From collecting feedback to sharing your roadmap — one tool that does it all.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="group hover:border-primary/30 transition-colors" data-testid={`card-feature-${i}`}>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 sm:py-28 border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-how-title">
              Up and running in minutes
            </h2>
            <p className="text-muted-foreground text-lg">
              Three simple steps to start collecting and acting on user feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {howItWorks.map((item, i) => (
              <div key={i} className="relative text-center space-y-4" data-testid={`step-${i}`}>
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground text-xl font-bold mx-auto">
                  {item.step}
                </div>
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)]">
                    <div className="border-t-2 border-dashed border-primary/30 w-full" />
                  </div>
                )}
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="secondary" className="mb-4">Why FeedbackForge</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-why-title">
              Built for product teams that move fast
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col items-center text-center p-6 space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10">
                <MousePointerClick className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold">Zero Setup</h3>
              <p className="text-sm text-muted-foreground">Create your first form in under a minute. No technical knowledge needed.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10">
                <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold">Public Sharing</h3>
              <p className="text-sm text-muted-foreground">Every form, roadmap, and changelog gets a unique public URL to share anywhere.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10">
                <ThumbsUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold">User Voting</h3>
              <p className="text-sm text-muted-foreground">Let your users upvote roadmap items so you always build what matters most.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10">
                <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold">AI Analysis</h3>
              <p className="text-sm text-muted-foreground">GPT-4o reads all your feedback and surfaces the insights that matter.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 sm:py-28 border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-pricing-title">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              No hidden fees. No per-seat pricing. Choose what works for you.
            </p>
          </div>

          <Card className="max-w-3xl mx-auto mb-10 border-amber-500/30" data-testid="card-ltd-landing">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-amber-500/10 shrink-0">
                    <Crown className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Have a Lifetime Deal code?</h3>
                    <p className="text-sm text-muted-foreground">Enter your code to unlock unlimited access forever — one payment, no recurring fees</p>
                  </div>
                </div>
                {isAuthenticated ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      placeholder="FF-XXXX-XXXX-XXXX"
                      value={ltdCode}
                      onChange={(e) => setLtdCode(e.target.value)}
                      className="w-48"
                      data-testid="input-ltd-code-landing"
                    />
                    <Button
                      onClick={() => redeemMutation.mutate()}
                      disabled={!ltdCode.trim() || redeemMutation.isPending}
                      data-testid="button-redeem-ltd-landing"
                    >
                      {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
                    </Button>
                  </div>
                ) : (
                  <Link href="/signup">
                    <Button variant="outline" className="shrink-0" data-testid="button-ltd-signup">
                      Sign Up to Redeem
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((plan) => {
              const isSelected = billingPeriod === plan.id;
              return (
                <Card
                  key={plan.id}
                  onClick={() => setBillingPeriod(plan.id)}
                  className={`relative cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary shadow-md ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  {isSelected && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge data-testid={`badge-selected-${plan.id}`}>
                        {plan.id === "yearly" ? "Best Value" : "Most Popular"}
                      </Badge>
                    </div>
                  )}
                  {plan.id === "yearly" && !isSelected && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="secondary" className="text-xs">Save 28%</Badge>
                    </div>
                  )}
                  <CardContent className="p-6 sm:p-8 space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                      <div className="flex items-baseline gap-1 mt-4">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </div>
                      {"savingsNote" in plan && plan.savingsNote && isSelected && (
                        <p className="text-sm text-primary font-medium mt-2" data-testid="text-yearly-savings">
                          {plan.savingsNote}
                        </p>
                      )}
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        className="w-full"
                        size="lg"
                        data-testid={`button-plan-${plan.id}`}
                        disabled={checkoutLoading === plan.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckout(plan.id as "monthly" | "yearly");
                        }}
                      >
                        {checkoutLoading === plan.id ? "Redirecting..." : "Get Started"}
                        {checkoutLoading !== plan.id && <ChevronRight className="w-4 h-4 ml-1" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 sm:py-28 border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-testimonials-title">
              Loved by product teams
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <Card key={i} data-testid={`card-testimonial-${i}`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed italic text-muted-foreground">"{t.quote}"</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 border-t bg-primary/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-cta-title">
            Ready to build better products?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Join thousands of product teams already using FeedbackForge to collect, analyze, and act on user feedback.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="px-8 text-base" data-testid="button-cta-dashboard">
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signup">
                  <Button size="lg" className="px-8 text-base" data-testid="button-cta-signup">
                    Get Started for Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="px-8 text-base" data-testid="button-cta-signin">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary">
                <MessageSquareText className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold" data-testid="text-footer-brand">FeedbackForge</span>
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-footer-copy">
              &copy; {new Date().getFullYear()} FeedbackForge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
