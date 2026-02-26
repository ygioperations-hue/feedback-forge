import { LayoutDashboard, Users, Crown, LogOut, User, ArrowLeft } from "lucide-react";
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

const navItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "LTD Codes", url: "/admin/ltd", icon: Crown },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <Sidebar data-testid="sidebar-admin-nav">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-destructive shrink-0">
            <Users className="w-4 h-4 text-destructive-foreground" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold tracking-tight block truncate" data-testid="text-admin-brand">Admin Panel</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard" data-testid="link-admin-back-to-app">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to App</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t space-y-2">
        {user && (
          <Link href="/profile">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors" data-testid="link-admin-profile">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate" data-testid="text-admin-user">{user.firstName} {user.lastName}</span>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={logout}
          disabled={isLoggingOut}
          data-testid="button-admin-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
