import { useState } from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Shield,
  ChevronDown,
  ChevronRight,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/constants";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Image,
  Shield,
};

interface SidebarProps {
  userRole: string;
}

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

export function Sidebar({ userRole }: SidebarProps) {
  const { pathname } = useLocation();
  const [logoError, setLogoError] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          {logoError ? (
            <Shield className="h-6 w-6 shrink-0 text-sidebar-primary" />
          ) : (
            <img
              src={`${API_BASE}/admin/logo`}
              alt="Logo"
              className="h-6 w-6 shrink-0 object-contain"
              onError={() => setLogoError(true)}
            />
          )}
          <span className="font-semibold text-sm leading-tight text-sidebar-foreground truncate">
            {APP_NAME}
          </span>
        </Link>
      </div>

      {/* Main nav items */}
      <div className="px-3 pt-4 space-y-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          const hasChildren = "children" in item && item.children;
          const parentActive = isActive(item.href);
          return (
            <div key={item.href}>
              <Link
                to={hasChildren ? item.children![0].href : item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  parentActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span className="flex-1">{item.label}</span>
                {hasChildren && (
                  parentActive
                    ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    : <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                )}
              </Link>
              {hasChildren && parentActive && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                  {item.children!.map((child) => {
                    const childActive = child.href === "/actividades"
                      ? pathname === "/actividades"
                      : pathname.startsWith(child.href);
                    return (
                      <Link
                        key={child.href}
                        to={child.href}
                        className={cn(
                          "block rounded-md px-3 py-1.5 text-sm transition-colors",
                          childActive
                            ? "font-medium text-sidebar-foreground bg-sidebar-accent"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
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
        <div className="px-3 py-4 space-y-1 border-t border-sidebar-border shrink-0">
          <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider pb-1">
            Administración
          </p>
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}
