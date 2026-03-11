import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu, Shield, ChevronDown, ChevronRight } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/constants";

interface MobileNavProps {
  userRole: string;
}

export function MobileNav({ userRole }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { pathname } = useLocation();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 flex flex-col">
        <SheetTitle className="sr-only">Navegación</SheetTitle>
        <div className="flex items-center h-16 px-6 border-b shrink-0">
          {logoError ? (
            <Shield className="h-6 w-6 shrink-0 text-primary mr-2" />
          ) : (
            <img
              src={`${API_BASE}/admin/logo`}
              alt="Logo"
              className="h-6 w-6 shrink-0 object-contain mr-2"
              onError={() => setLogoError(true)}
            />
          )}
          <span className="font-semibold text-sm leading-tight truncate">{APP_NAME}</span>
        </div>

        {/* Main nav */}
        <div className="px-3 pt-4 space-y-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const hasChildren = "children" in item && item.children;
            const parentActive = isActive(item.href);
            return (
              <div key={item.href}>
                <Link
                  to={hasChildren ? item.children![0].href : item.href}
                  onClick={() => !hasChildren && setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    parentActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/70 hover:bg-accent"
                  )}
                >
                  <span className="flex-1">{item.label}</span>
                  {hasChildren && (
                    parentActive
                      ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                      : <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  )}
                </Link>
                {hasChildren && parentActive && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l pl-3">
                    {item.children!.map((child) => {
                      const childActive = child.href === "/actividades"
                        ? pathname === "/actividades"
                        : pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "block rounded-md px-3 py-1.5 text-sm transition-colors",
                            childActive
                              ? "font-medium bg-accent"
                              : "text-foreground/60 hover:text-foreground hover:bg-accent/50"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Admin section */}
        {userRole === "ADMIN" && (
          <div className="px-3 py-4 space-y-1 border-t shrink-0">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1">
              Administración
            </p>
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-accent"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
