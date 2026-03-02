import { LayoutDashboard, FolderPlus, MessageSquareText, Crown, LogOut, User, CreditCard, Users } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const customerNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderPlus },
  { title: "Responses", url: "/responses", icon: MessageSquareText },
  { title: "Billing", url: "/billing", icon: CreditCard },
];

const adminNavItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "LTD Codes", url: "/admin/ltd", icon: Crown },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();

  const isAdmin = user?.role === "platform_admin";
  const navItems = isAdmin ? adminNavItems : customerNavItems;

  return (
    <Sidebar data-testid="sidebar-nav">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
            <MessageSquareText className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold tracking-tight block truncate" data-testid="text-sidebar-brand">FeedbackForge</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? "Admin" : "Navigation"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url || (item.url !== "/admin" && location.startsWith(item.url))}>
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t space-y-2">
        {user && (
          <div className="space-y-1">
            {!isAdmin && user.planType && user.planType !== "none" && (
              <div className="px-2">
                <Badge variant="secondary" className="text-xs w-full justify-center" data-testid="badge-sidebar-plan">
                  <Crown className="w-3 h-3 mr-1" />
                  {user.planType === "lifetime_starter" ? "Starter Lifetime" :
                   user.planType === "lifetime_pro" ? "Pro Lifetime" :
                   user.planType === "monthly" ? "Monthly" :
                   user.planType === "yearly" ? "Yearly" : user.planType}
                </Badge>
              </div>
            )}
            <Link href="/profile">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors" data-testid="link-profile">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate" data-testid="text-sidebar-user">{user.firstName} {user.lastName}</span>
              </div>
            </Link>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={logout}
          disabled={isLoggingOut}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
