import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, Shield, Plus, Trash2, MessageSquare } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_SECTIONS } from "@/lib/constants";
import { useConversations, useDeleteConversation } from "@/api/hooks";
import type { ConversationSummary } from "@/types/chat";

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

interface MobileNavProps {
  userRole: string;
}

export function MobileNav({ userRole }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: conversations = [] } = useConversations();
  const deleteConversation = useDeleteConversation();

  const groups = useMemo(() => groupByDate(conversations), [conversations]);

  const allHrefs = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (!matches) return false;
    return !allHrefs.some(
      (other) =>
        other !== href &&
        other.length > href.length &&
        (pathname === other || pathname.startsWith(other + "/"))
    );
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

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className={cn("px-3", sIdx === 0 ? "pt-4" : "pt-2")}>
              {section.label && (
                <p className="px-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const isAsistente = item.href === "/asistente";

                  return (
                    <div key={item.href}>
                      {isAsistente ? (
                        <div className="flex items-center">
                          <Link
                            to="/asistente"
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground/70 hover:bg-accent"
                            )}
                          >
                            <span className="flex-1">{item.label}</span>
                          </Link>
                          <button
                            onClick={() => {
                              navigate("/asistente/nueva");
                              setOpen(false);
                            }}
                            className="p-1.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
                            title="Nueva conversación"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Link
                          to={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground/70 hover:bg-accent"
                          )}
                        >
                          <span className="flex-1">{item.label}</span>
                        </Link>
                      )}

                      {/* Conversation list under Asistente IA */}
                      {isAsistente && groups.length > 0 && (
                        <div className="ml-4 mt-0.5 space-y-0 border-l border-border pl-2 pb-1">
                          {groups.map((group) => (
                            <div key={group.label} className="mt-1.5 first:mt-0.5">
                              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-2 mb-0.5">
                                {group.label}
                              </p>
                              {group.items.map((conv) => (
                                <button
                                  key={conv.id}
                                  onClick={() => {
                                    navigate(`/asistente/${conv.id}`);
                                    setOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 text-left rounded-md px-2 py-1.5 text-xs group transition-colors",
                                    pathname === `/asistente/${conv.id}`
                                      ? "bg-accent text-accent-foreground"
                                      : "text-foreground/60 hover:bg-accent/50 hover:text-accent-foreground"
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
                                    className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-accent transition-opacity"
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
          ))}
        </div>

      </SheetContent>
    </Sheet>
  );
}
