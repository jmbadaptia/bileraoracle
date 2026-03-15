import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate, useOutletContext } from "react-router";
import ReactMarkdown from "react-markdown";
import { useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Bot,
  User,
  FileText,
  CalendarDays,
  Image,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { useConversation } from "@/api/hooks";
import type { Source, ChatMessage } from "@/types/chat";
import type { DashboardOutletContext } from "@/components/layout/dashboard-layout";

const sourceIcon: Record<string, typeof FileText> = {
  activity: CalendarDays,
  document: FileText,
  album: Image,
};

const sourceRoute: Record<string, string> = {
  activity: "/actividades",
  document: "/documentos",
  album: "/galeria",
};

const sourceLabel: Record<string, string> = {
  activity: "Actividad",
  document: "Documento",
  album: "Álbum",
};

// --- Citation handling ---

/** Replace [1], [Fuente 1], [1, 2, 3] etc. with clickable superscript links */
function injectCitations(text: string, sources: Source[]): React.ReactNode[] {
  const regex = /\[(?:Fuente\s*)?(\d+)(?:\s*,\s*(?:Fuente\s*)?(\d+))*\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const nums = [...match[0].matchAll(/(\d+)/g)].map((m) => parseInt(m[1]));
    for (const num of nums) {
      const source = sources.find((s) => s.index === num);
      if (source) {
        parts.push(
          <Link
            key={`cite-${match.index}-${num}`}
            to={`${sourceRoute[source.type] || ""}/${source.id}`}
            className="text-primary hover:underline font-medium text-xs align-super"
            title={source.title}
          >
            [{num}]
          </Link>
        );
      } else {
        parts.push(`[${num}]`);
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/** Recursively process React children, replacing citation markers in text nodes */
function processChildren(children: React.ReactNode, sources: Source[]): React.ReactNode {
  if (!children) return children;
  if (typeof children === "string") {
    if (/\[(?:Fuente\s*)?\d+/.test(children)) {
      return <>{injectCitations(children, sources)}</>;
    }
    return children;
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => (
      <span key={i}>{processChildren(child, sources)}</span>
    ));
  }
  return children;
}

function MarkdownContent({ content, sources = [] }: { content: string; sources?: Source[] }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{processChildren(children, sources)}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li>{processChildren(children, sources)}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        h3: ({ children }) => <h3 className="font-semibold mt-3 mb-1">{children}</h3>,
        h4: ({ children }) => <h4 className="font-semibold mt-2 mb-1">{children}</h4>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/30 pl-3 italic my-2">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// --- Sources list ---

function SourcesList({ sources }: { sources: Source[] }) {
  const unique = useMemo(() => {
    const seen = new Set<string>();
    return sources.filter((s) => {
      const key = `${s.type}-${s.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [sources]);

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/40">
      {unique.map((source) => {
        const Icon = sourceIcon[source.type] || FileText;
        return (
          <Link
            key={`${source.type}-${source.id}`}
            to={`${sourceRoute[source.type] || ""}/${source.id}`}
            className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-background/60 hover:bg-background transition-colors"
          >
            <Icon className="h-3 w-3" />
            <span className="max-w-[150px] truncate">{source.title}</span>
            <span className="text-muted-foreground text-[10px]">
              {sourceLabel[source.type]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// --- Main page ---

export function AsistentePage() {
  const { conversationId: paramId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = useOutletContext<DashboardOutletContext>();

  const activeConversationId = paramId === "nueva" ? undefined : paramId;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const streamingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation from server
  const { data: conversationData } = useConversation(activeConversationId);

  useEffect(() => {
    const title = activeConversationId
      ? conversationData?.title || "Asistente IA"
      : "Nueva conversación";
    setPageTitle(title);
    return () => setPageTitle("");
  }, [activeConversationId, conversationData?.title, setPageTitle]);

  useEffect(() => {
    // Don't overwrite messages while streaming — the stream updates state directly
    if (streamingRef.current) return;
    if (conversationData?.messages) {
      setMessages(
        conversationData.messages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          sources: m.sources || undefined,
        }))
      );
    } else if (!activeConversationId) {
      setMessages([]);
    }
  }, [conversationData, activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    let convId = activeConversationId;
    let justCreated = false;

    // Create conversation if needed
    if (!convId) {
      try {
        const res = await api.post<{ id: string }>("/conversations", {});
        convId = res.id;
        justCreated = true;
        // Optimistically add to sidebar
        queryClient.setQueryData(["conversations"], (old: any[] | undefined) => [
          { id: convId, title: "Nueva conversación", updatedAt: new Date().toISOString() },
          ...(old || []),
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Error al crear la conversación. Inténtalo de nuevo." },
        ]);
        return;
      }
    }

    const userMessage: ChatMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    streamingRef.current = true;

    // Add empty assistant message for streaming
    const assistantMessage: ChatMessage = { role: "assistant", content: "", sources: [] };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(api.streamUrl("/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api.getToken()}`,
        },
        body: JSON.stringify({
          message: question,
          conversationId: convId,
          history,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error en la consulta");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream available");

      let fullText = "";
      let sources: Source[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullText, sources };
                return updated;
              });
            }
            if (parsed.sources) {
              sources = parsed.sources;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullText, sources };
                return updated;
              });
            }
            if (parsed.title) {
              // Optimistically update title in sidebar cache
              queryClient.setQueryData(
                ["conversations"],
                (old: any[] | undefined) =>
                  old?.map((c) =>
                    c.id === convId ? { ...c, title: parsed.title } : c
                  )
              );
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      streamingRef.current = false;

      // Refresh sidebar conversation list only (exact match, not the individual conversation)
      queryClient.invalidateQueries({ queryKey: ["conversations"], exact: true });

      // Update URL without remounting — use window.history to avoid React Router
      // remounting the component via key change in AsistenteWrapper
      if (justCreated && convId) {
        window.history.replaceState(null, "", `/asistente/${convId}`);
      }
    } catch (error) {
      streamingRef.current = false;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content:
            error instanceof Error
              ? `Error: ${error.message}`
              : "Error al procesar la consulta. Inténtalo de nuevo.",
        };
        return updated;
      });
    }

    setLoading(false);
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages area */}
      <div className={`flex-1 min-h-0 overflow-y-auto pr-2 ${messages.length > 0 ? "space-y-4 pb-4" : ""}`}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Asistente IA</h3>
            <p className="text-muted-foreground max-w-md">
              Pregunta sobre actividades, documentos o cualquier información de la asociación
            </p>
            <div className="flex flex-wrap gap-2 mt-4 max-w-lg justify-center">
              {[
                "¿Qué eventos tenemos planificados?",
                "¿Cuáles son las tareas pendientes?",
                "Resume la última reunión",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    textareaRef.current?.focus();
                  }}
                  className="text-sm px-3 py-1.5 rounded-full border hover:bg-accent transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex gap-2.5 justify-end">
                <div className="max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
                  <p className="text-sm">{msg.content}</p>
                </div>
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center mt-0.5">
                  <User className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {msg.content ? (
                    <div className="max-w-[75%] bg-muted/60 shadow-sm rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed">
                      <MarkdownContent content={msg.content} sources={msg.sources || []} />
                    </div>
                  ) : (
                    loading && (
                      <div className="inline-flex items-center gap-1.5 bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                      </div>
                    )
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <SourcesList sources={msg.sources} />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {messages.length > 0 && <div ref={messagesEndRef} />}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t pt-3">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
            rows={1}
            className="resize-none min-h-[44px] max-h-32"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            size="icon"
            className="shrink-0 h-[44px] w-[44px]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Las respuestas son generadas por IA y pueden contener errores. Verifica siempre la información.
        </p>
      </div>
    </div>
  );
}
