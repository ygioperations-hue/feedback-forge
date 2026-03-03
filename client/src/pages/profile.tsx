import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock } from "lucide-react";

export default function Profile() {
  usePageTitle("Profile");
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
    }
  }, [user]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const profileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/auth/profile", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({ title: "Profile updated", description: "Your name has been updated successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/auth/password", {
        currentPassword,
        newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Password change failed", description: err.message, variant: "destructive" });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Missing fields", description: "First and last name are required.", variant: "destructive" });
      return;
    }
    profileMutation.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "New password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }
    passwordMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-profile-title">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your name</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  data-testid="input-profile-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  data-testid="input-profile-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="bg-muted" data-testid="input-profile-email" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <Button
              type="submit"
              disabled={profileMutation.isPending}
              data-testid="button-save-profile"
            >
              {profileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password by entering your current one</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                data-testid="input-current-password"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                data-testid="input-confirm-password"
              />
            </div>
            <Button
              type="submit"
              disabled={passwordMutation.isPending}
              data-testid="button-change-password"
            >
              {passwordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
