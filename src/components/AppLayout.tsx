import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { demoCompany, demoAlerts } from "@/lib/demo-data";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const unreadAlerts = demoAlerts.filter((a) => !a.read).length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-3 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products, customers, invoices..."
                  className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unreadAlerts > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground">
                {demoCompany.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="p-6 animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
