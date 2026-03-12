import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Shield,
  ChevronDown,
  ChevronRight,
  Image,
  BotMessageSquare,
  Contact,
  Plus,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/constants";
import { useConversations, useDeleteConversation } from "@/api/hooks";
import type { ConversationSummary } from "@/types/chat";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Image,
  Shield,
  BotMessageSquare,
  Contact,
};

interface SidebarProps {
  userRole: string;
}

function groupByDate(conversations: ConversationSummary[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: ConversationSummary[] }[] = [
    { label: "Hoy", items: [] },
    { label: "Ayer", items: [] },
    { label: "Últimos 7 días", items: [] },
    { label: "Anteriores", items: [] },
  ];

  for (const conv of conversations) {
    const date = new Date(conv.updatedAt);
    if (date >= today) groups[0].items.push(conv);
    else if (date >= yesterday) groups[1].items.push(conv);
    else if (date >= lastWeek) groups[2].items.push(conv);
    else groups[3].items.push(conv);
  }

  return groups.filter((g) => g.items.length > 0);
}

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

export function Sidebar({ userRole }: SidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: conversations = [] } = useConversations();
  const deleteConversation = useDeleteConversation();
  const [logoError, setLogoError] = useState(false);

  const groups = useMemo(() => groupByDate(conversations), [conversations]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Separate nav items: all except asistente (handled specially)
  const mainNavItems = NAV_ITEMS.filter((item) => item.href !== "/asistente");
  const asistenteItem = NAV_ITEMS.find((item) => item.href === "/asistente");
  const AsistenteIcon = asistenteItem ? iconMap[asistenteItem.icon] : BotMessageSquare;

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
      <div className="px-3 pt-4 space-y-1 shrink-0">
        {mainNavItems.map((item) => {
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

      {/* Asistente IA + conversations */}
      <div className="flex flex-col mt-1 min-h-0 flex-1">
        <div className="px-3 shrink-0">
          <div className="flex items-center">
            <Link
              to="/asistente"
              className={cn(
                "flex-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive("/asistente")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {AsistenteIcon && <AsistenteIcon className="h-4 w-4" />}
              Asistente IA
            </Link>
            <button
              onClick={() => navigate("/asistente/nueva")}
              className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="Nueva conversación"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 pt-1 pb-2">
          {groups.map((group) => (
            <div key={group.label} className="mt-2 first:mt-0">
              <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3 mb-0.5">
                {group.label}
              </p>
              {group.items.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/asistente/${conv.id}`)}
                  className={cn(
                    "w-full flex items-center gap-2 text-left rounded-md pl-6 pr-2 py-1.5 text-xs group transition-colors",
                    pathname === `/asistente/${conv.id}`
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  <span className="truncate flex-1">{conv.title}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation.mutate(conv.id, {
                        onSuccess: () => {
                          if (pathname === `/asistente/${conv.id}`) {
                            navigate("/asistente");
                          }
                        },
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        deleteConversation.mutate(conv.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-sidebar-accent transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
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
