import { useState, useCallback } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAuth } from "@/lib/auth";
import { usePwaInstall } from "@/lib/use-pwa-install";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export interface DashboardOutletContext {
  setPageTitle: (title: string) => void;
}

export function DashboardLayout() {
  const { user } = useAuth();
  const { canInstall, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const stableSetPageTitle = useCallback((t: string) => setPageTitle(t), []);

  return (
    <div className="h-screen">
      <Sidebar userRole={user?.role || "MEMBER"} />
      <div className="h-full flex flex-col md:pl-64">
        <Header
          userName={user?.name || "Usuario"}
          userEmail={user?.email || ""}
          userRole={user?.role || "MEMBER"}
          pageTitle={pageTitle}
        />
        <main className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
          <Outlet context={{ setPageTitle: stableSetPageTitle } satisfies DashboardOutletContext} />
        </main>
        {canInstall && !dismissed && (
          <div className="fixed bottom-4 left-4 right-4 md:left-68 flex justify-center z-50">
            <div className="flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg">
              <Download className="h-4 w-4 shrink-0" />
              <span className="text-sm">Instala la app para un acceso mas rapido</span>
              <Button size="sm" onClick={install}>Instalar</Button>
              <button onClick={() => setDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
