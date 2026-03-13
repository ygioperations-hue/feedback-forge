import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
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
  Mail,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import avatar1 from "@assets/stock_images/avatar_sarah.png";
import avatar2 from "@assets/stock_images/avatar_marcus.png";
import avatar3 from "@assets/stock_images/avatar_emily.png";
import avatar4 from "@assets/stock_images/avatar_jessica.png";
import avatar5 from "@assets/stock_images/avatar_aisha.png";
import avatar6 from "@assets/stock_images/avatar_daniel.png";

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

/* Subscription plans hidden for Phase 1 launch — only LTD via Stripe is active
const plans = [
  { id: "monthly", name: "Monthly", price: "$29", period: "/month", ... },
  { id: "yearly", name: "Yearly", price: "$249", period: "/year", ... },
]; */

const testimonials = [
  {
    quote: "FeedbackForge replaced three different tools for us. The AI insights alone save us hours every week.",
    name: "Sarah Chen",
    role: "Product Manager",
    avatar: avatar1,
  },
  {
    quote: "The embeddable widget is so simple to set up. We started collecting feedback within 5 minutes of signing up.",
    name: "Marcus Rivera",
    role: "Engineering Lead",
    avatar: avatar2,
  },
  {
    quote: "Public roadmap with upvoting means we always build what users actually want. Game changer for our prioritization.",
    name: "Emily Watkins",
    role: "Founder & CEO",
    avatar: avatar3,
  },
  {
    quote: "We went from guessing what to build next to having real data. The response dashboard is incredibly well designed.",
    name: "Jessica Torres",
    role: "Head of Product",
    avatar: avatar4,
  },
  {
    quote: "The changelog feature keeps our users in the loop and shows them we actually listen. Our retention improved noticeably.",
    name: "Aisha Patel",
    role: "Customer Success Lead",
    avatar: avatar5,
  },
  {
    quote: "Lifetime deal was a no-brainer. We use it across four products now and it pays for itself every single month.",
    name: "Daniel Ortiz",
    role: "Co-Founder & CTO",
    avatar: avatar6,
  },
];

export default function Landing() {
  usePageTitle("");
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleCheckout = async (plan: "monthly" | "yearly" | "lifetime") => {
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

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Crown className="w-4 h-4" />
              Limited-Time Offer
            </div>
            <h3 className="text-2xl font-bold tracking-tight">Pay once, own it forever</h3>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              Lock in lifetime access at today's price. No monthly bills, no renewals — just one payment and you're set for life.
            </p>
          </div>

          <Card className="max-w-2xl mx-auto mb-8 relative border-amber-500 shadow-md ring-2 ring-amber-500/20" data-testid="card-ltd-landing">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-amber-500 hover:bg-amber-600" data-testid="badge-ltd-best-value">Best Value</Badge>
            </div>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold">Lifetime Access</h3>
                <p className="text-sm text-muted-foreground mt-1">Everything unlimited, forever — one single payment</p>
                <div className="flex items-baseline justify-center gap-1 mt-4">
                  <span className="text-4xl font-bold">$59</span>
                  <span className="text-muted-foreground">one-time</span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-2" data-testid="text-ltd-savings">
                  One payment. Unlimited access. Forever.
                </p>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {[
                  "Unlimited projects",
                  "Unlimited responses & submissions",
                  "AI-powered insights (GPT-4o)",
                  "Public roadmap & changelog",
                  "Embeddable feedback widget",
                  "Priority support & all future updates",
                  "No recurring fees, ever",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="text-center">
                {isAuthenticated ? (
                  <Button
                    size="lg"
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => handleCheckout("lifetime")}
                    disabled={checkoutLoading === "lifetime"}
                    data-testid="button-ltd-checkout-landing"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    {checkoutLoading === "lifetime" ? "Redirecting..." : "Get Lifetime Access — $59"}
                  </Button>
                ) : (
                  <Link href="/signup">
                    <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white" data-testid="button-ltd-signup">
                      Sign Up to Get Started
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Code redemption and subscription plans hidden for Phase 1 launch — only LTD via Stripe is active */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <Card key={i} data-testid={`card-testimonial-${i}`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed italic text-muted-foreground">"{t.quote}"</p>
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-muted shrink-0"
                      data-testid={`img-testimonial-avatar-${i}`}
                    />
                    <div>
                      <p className="text-sm font-semibold" data-testid={`text-testimonial-name-${i}`}>{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
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

      <footer className="border-t bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Column 1 — Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                  <MessageSquareText className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-base font-semibold" data-testid="text-footer-brand">FeedbackForge</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Collect, understand, and act on customer feedback — all in one place.
              </p>
              <a
                href="mailto:support@feedbackforge.co"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-support"
              >
                <Mail className="w-3.5 h-3.5" />
                support@feedbackforge.co
              </a>
            </div>

            {/* Column 2 — Product */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Product</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-features">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-pricing">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-testimonials">
                    Testimonials
                  </a>
                </li>
                <li>
                  <Link href="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-signup">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3 — Legal */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-privacy">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-terms">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground" data-testid="text-footer-copy">
              &copy; {new Date().getFullYear()} FeedbackForge. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <a href="mailto:support@feedbackforge.co" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
