import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, RequireAuth, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUsers from "@/pages/admin-users";
import AdminLtd from "@/pages/admin-ltd";
import Projects from "@/pages/projects";
import ProjectNew from "@/pages/project-new";
import ProjectDetail from "@/pages/project-detail";
import PublicForm from "@/pages/public-form";
import ResponsesList from "@/pages/responses-list";
import ResponseDetail from "@/pages/response-detail";
import PublicRoadmap from "@/pages/public-roadmap";
import PublicChangelog from "@/pages/public-changelog";
import Pricing from "@/pages/pricing";
import Profile from "@/pages/profile";
import Billing from "@/pages/billing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <RequireAuth>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between gap-2 p-2 border-b shrink-0 sticky top-0 z-50 bg-background">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </RequireAuth>
  );
}

function RequireCustomer({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role === "platform_admin") return <Redirect to="/admin" />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role !== "platform_admin") return <Redirect to="/dashboard" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/form/:slug" component={PublicForm} />
      <Route path="/roadmap/:slug" component={PublicRoadmap} />
      <Route path="/changelog/:slug" component={PublicChangelog} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/dashboard">
        <AppLayout><RequireCustomer><Dashboard /></RequireCustomer></AppLayout>
      </Route>
      <Route path="/projects">
        <AppLayout><RequireCustomer><Projects /></RequireCustomer></AppLayout>
      </Route>
      <Route path="/projects/new">
        <AppLayout><RequireCustomer><ProjectNew /></RequireCustomer></AppLayout>
      </Route>
      <Route path="/projects/:id">
        <AppLayout><RequireCustomer><ProjectDetail /></RequireCustomer></AppLayout>
      </Route>
      <Route path="/responses">
        <AppLayout><RequireCustomer><ResponsesList /></RequireCustomer></AppLayout>
      </Route>
      <Route path="/responses/:id">
        <AppLayout><RequireCustomer><ResponseDetail /></RequireCustomer></AppLayout>
      </Route>
      <Route path="/profile">
        <AppLayout><Profile /></AppLayout>
      </Route>
      <Route path="/billing">
        <AppLayout><RequireCustomer><Billing /></RequireCustomer></AppLayout>
      </Route>
      <Route path="/admin">
        <AppLayout><RequireAdmin><AdminDashboard /></RequireAdmin></AppLayout>
      </Route>
      <Route path="/admin/users">
        <AppLayout><RequireAdmin><AdminUsers /></RequireAdmin></AppLayout>
      </Route>
      <Route path="/admin/ltd">
        <AppLayout><RequireAdmin><AdminLtd /></RequireAdmin></AppLayout>
      </Route>
      <Route>
        <AppLayout><NotFound /></AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
