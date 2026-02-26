import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AuthProvider, RequireAuth, RequireAdmin } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
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
import ForgotPassword from "@/pages/forgot-password";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUsers from "@/pages/admin-users";
import AdminLtd from "@/pages/admin-ltd";

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

function AdminLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <RequireAdmin>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AdminSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between gap-2 p-2 border-b shrink-0 sticky top-0 z-50 bg-background">
              <SidebarTrigger data-testid="button-admin-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </RequireAdmin>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/form/:slug" component={PublicForm} />
      <Route path="/roadmap/:slug" component={PublicRoadmap} />
      <Route path="/changelog/:slug" component={PublicChangelog} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/admin">
        <AdminLayout><AdminDashboard /></AdminLayout>
      </Route>
      <Route path="/admin/users">
        <AdminLayout><AdminUsers /></AdminLayout>
      </Route>
      <Route path="/admin/ltd">
        <AdminLayout><AdminLtd /></AdminLayout>
      </Route>
      <Route path="/dashboard">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/projects">
        <AppLayout><Projects /></AppLayout>
      </Route>
      <Route path="/projects/new">
        <AppLayout><ProjectNew /></AppLayout>
      </Route>
      <Route path="/projects/:id">
        <AppLayout><ProjectDetail /></AppLayout>
      </Route>
      <Route path="/responses">
        <AppLayout><ResponsesList /></AppLayout>
      </Route>
      <Route path="/responses/:id">
        <AppLayout><ResponseDetail /></AppLayout>
      </Route>
      <Route path="/profile">
        <AppLayout><Profile /></AppLayout>
      </Route>
      <Route path="/billing">
        <AppLayout><Billing /></AppLayout>
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
