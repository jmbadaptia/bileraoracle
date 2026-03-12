import { useState, useCallback } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export interface DashboardOutletContext {
  setPageTitle: (title: string) => void;
}

function useSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; }
    catch { return false; }
  });
  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  }, []);
  return { collapsed, toggle };
}

export function DashboardLayout() {
  const { user } = useAuth();
  const [pageTitle, setPageTitle] = useState("");
  const stableSetPageTitle = useCallback((t: string) => setPageTitle(t), []);
  const { collapsed, toggle } = useSidebarState();

  return (
    <div className="h-screen">
      <Sidebar
        userRole={user?.role || "MEMBER"}
        collapsed={collapsed}
        onToggle={toggle}
      />
      <div className={cn(
        "h-full flex flex-col transition-[padding] duration-200",
        collapsed ? "md:pl-16" : "md:pl-64"
      )}>
        <Header
          userName={user?.name || "Usuario"}
          userEmail={user?.email || ""}
          userRole={user?.role || "MEMBER"}
          pageTitle={pageTitle}
        />
        <main className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
          <Outlet context={{ setPageTitle: stableSetPageTitle } satisfies DashboardOutletContext} />
        </main>
      </div>
    </div>
  );
}
