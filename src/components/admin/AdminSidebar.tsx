import {
  LayoutDashboard, Building2, Users, CreditCard, ArrowLeftRight,
  Plug, AlertTriangle, ClipboardList, Flag, Headphones, LogOut, Shield,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Companies", url: "/admin/companies", icon: Building2 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Admin Users", url: "/admin/admins", icon: Shield },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: CreditCard },
  { title: "Transactions", url: "/admin/transactions", icon: ArrowLeftRight },
  { title: "Integrations", url: "/admin/integrations", icon: Plug },
  { title: "System Alerts", url: "/admin/system", icon: AlertTriangle },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: ClipboardList },
  { title: "Feature Flags", url: "/admin/feature-flags", icon: Flag },
  { title: "Support", url: "/admin/support", icon: Headphones },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, adminUser } = useAdminAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarContent>
        <div className="px-4 py-4 border-b border-border">
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-destructive tracking-wide uppercase">Admin Portal</h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{adminUser?.email}</p>
              <span className="text-[10px] uppercase font-semibold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded mt-1 inline-block">
                {adminUser?.role?.replace("_", " ")}
              </span>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/admin"} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-4">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> {!collapsed && "Sign Out"}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
