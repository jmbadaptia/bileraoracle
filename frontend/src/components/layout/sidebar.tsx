import { useMemo, useState, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Shield,
  Image,
  BotMessageSquare,
  Contact,
  UsersRound,
  BookOpen,
  SquareKanban,
  History,
  Building2,
  CalendarCheck,
  ClipboardList,
  Plus,
  Trash2,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_SECTIONS } from "@/lib/constants";
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
  UsersRound,
  BookOpen,
  SquareKanban,
  History,
  Building2,
  CalendarCheck,
  ClipboardList,
  UserCheck,
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
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

const STORAGE_KEY = "bilera-sidebar-sections";

function loadExpandedSections(): Set<number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  // Default: all sections expanded
  return new Set(NAV_SECTIONS.map((_, i) => i));
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { data: conversations = [] } = useConversations();
  const deleteConversation = useDeleteConversation();
  const [logoError, setLogoError] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(loadExpandedSections);

  const toggleSection = useCallback((idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Auto-expand section containing the active route
  useEffect(() => {
    const activeIdx = NAV_SECTIONS.findIndex((s) =>
      s.items.some((item) => {
        if (item.href === "/") return pathname === "/";
        const [hrefPath] = item.href.split("?");
        return pathname === hrefPath || pathname.startsWith(hrefPath + "/");
      })
    );
    if (activeIdx >= 0 && !expandedSections.has(activeIdx)) {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        next.add(activeIdx);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        return next;
      });
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => groupByDate(conversations), [conversations]);

  // Collect all nav hrefs to find the most specific match
  const allHrefs = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";

    // Split href into path and query parts
    const [hrefPath, hrefQuery] = href.split("?");

    const pathMatches = pathname === hrefPath || pathname.startsWith(hrefPath + "/");
    if (!pathMatches) return false;

    // If href has query params, they must be present in current URL
    if (hrefQuery) {
      const hrefParams = new URLSearchParams(hrefQuery);
      const currentParams = new URLSearchParams(search);
      for (const [key, value] of hrefParams) {
        if (currentParams.get(key) !== value) return false;
      }
      return true;
    }

    // For hrefs without query params, check that no other more-specific href matches
    // Also, if another href with query params matches, prefer that
    const currentParams = new URLSearchParams(search);
    const hasMatchingQueryHref = allHrefs.some((other) => {
      if (other === href || !other.includes("?")) return false;
      const [otherPath, otherQuery] = other.split("?");
      if (otherPath !== hrefPath) return false;
      const otherParams = new URLSearchParams(otherQuery);
      for (const [key, value] of otherParams) {
        if (currentParams.get(key) !== value) return false;
      }
      return true;
    });
    if (hasMatchingQueryHref) return false;

    return !allHrefs.some(
      (other) =>
        other !== href &&
        !other.includes("?") &&
        other.length > href.length &&
        (pathname === other || pathname.startsWith(other + "/"))
    );
  };

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200",
        collapsed ? "md:w-16" : "md:w-64"
      )}
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center h-16 px-3 border-b border-sidebar-border shrink-0 justify-between">
        <Link to="/" className={cn("flex items-center gap-2 min-w-0", collapsed && "justify-center w-full")}>
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
          {!collapsed && (
            <span className="font-semibold text-sm leading-tight text-sidebar-foreground truncate">
              {APP_NAME}
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title="Colapsar sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="px-2 pt-3 shrink-0">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title="Expandir sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto">
        {NAV_SECTIONS.map((section, sIdx) => {
          const isExpanded = expandedSections.has(sIdx);
          return (
          <div key={sIdx} className={cn(collapsed ? "px-2" : "px-3", sIdx === 0 ? "pt-4" : "pt-2")}>
            {/* Section label */}
            {section.label && !collapsed && (
              <button
                onClick={() => toggleSection(sIdx)}
                className="w-full flex items-center justify-between px-3 pb-1 group"
              >
                <span className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                  {section.label}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-transform duration-200",
                    !isExpanded && "-rotate-90"
                  )}
                />
              </button>
            )}
            {section.label && collapsed && (
              <div className="my-1 mx-2 border-t border-sidebar-border" />
            )}

            {/* Section items */}
            <div className={cn("space-y-0.5", section.label && !collapsed && !isExpanded && "hidden")}>
              {section.items.map((item) => {
                const Icon = iconMap[item.icon];
                const active = isActive(item.href);
                const isAsistente = item.href === "/asistente";

                return (
                  <div key={item.href}>
                    {/* Asistente gets special rendering with + button */}
                    {isAsistente && !collapsed ? (
                      <div className="flex items-center">
                        <Link
                          to="/asistente"
                          className={cn(
                            "flex-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          {Icon && <Icon className="h-4 w-4 shrink-0" />}
                          <span className="flex-1">{item.label}</span>
                        </Link>
                        <button
                          onClick={() => navigate("/asistente/nueva")}
                          className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                          title="Nueva conversación"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center rounded-md text-sm font-medium transition-colors",
                          collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        {Icon && <Icon className="h-4 w-4 shrink-0" />}
                        {!collapsed && <span className="flex-1">{item.label}</span>}
                      </Link>
                    )}

                    {/* Conversation list under Asistente IA */}
                    {isAsistente && !collapsed && groups.length > 0 && (
                      <div className="ml-4 mt-0.5 space-y-0 border-l border-sidebar-border pl-2 pb-1">
                        {groups.map((group) => (
                          <div key={group.label} className="mt-1.5 first:mt-0.5">
                            <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-2 mb-0.5">
                              {group.label}
                            </p>
                            {group.items.map((conv) => (
                              <button
                                key={conv.id}
                                onClick={() => navigate(`/asistente/${conv.id}`)}
                                className={cn(
                                  "w-full flex items-center gap-2 text-left rounded-md px-2 py-1.5 text-xs group transition-colors",
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>

    </aside>
  );
}
