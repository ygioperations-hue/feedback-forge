import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquareText, Loader2, ArrowLeft, KeyRound, CheckCircle, ShieldCheck } from "lucide-react";

type Step = "email" | "code" | "success";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [displayCode, setDisplayCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const forgotMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.hasCode && data.code) {
        setDisplayCode(data.code);
        setStep("code");
      } else {
        toast({
          title: "No account found",
          description: "No account was found with that email address.",
          variant: "destructive",
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Request failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/reset-password", { email, code, password });
      return res.json();
    },
    onSuccess: () => {
      setStep("success");
    },
    onError: (err: Error) => {
      toast({
        title: "Reset failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotMutation.mutate();
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match", variant: "destructive" });
      return;
    }
    if (code.length !== 6) {
      toast({ title: "Invalid code", description: "Please enter the 6-digit code shown above", variant: "destructive" });
      return;
    }
    resetMutation.mutate();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
            <MessageSquareText className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-forgot-title">FeedbackForge</h1>
          <p className="text-sm text-muted-foreground">Reset your password</p>
        </div>

        {step === "email" && (
          <Card>
            <CardHeader>
              <CardTitle>Forgot password?</CardTitle>
              <CardDescription>Enter your email to get a security code</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotMutation.isPending}
                  data-testid="button-get-code"
                >
                  {forgotMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Get Reset Code
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "code" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Your Security Code
              </CardTitle>
              <CardDescription>Use the code below to reset your password. It expires in 10 minutes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-center p-4 bg-muted rounded-lg border-2 border-dashed border-primary/30">
                <span className="text-3xl font-mono font-bold tracking-[0.5em] text-primary" data-testid="text-reset-code">
                  {displayCode}
                </span>
              </div>

              <div className="border-t pt-5">
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Enter Code</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      className="text-center text-lg font-mono tracking-widest"
                      data-testid="input-code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      data-testid="input-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={resetMutation.isPending}
                    data-testid="button-reset-password"
                  >
                    {resetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Reset Password
                  </Button>
                </form>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => { setStep("email"); setCode(""); setPassword(""); setConfirmPassword(""); setDisplayCode(""); }}
                data-testid="button-try-different-email"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Try a different email
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "success" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <CardTitle className="text-center">Password reset!</CardTitle>
              <CardDescription className="text-center">
                Your password has been updated successfully.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full" data-testid="button-go-to-login">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Sign In with New Password
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <p className="text-sm text-center text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
