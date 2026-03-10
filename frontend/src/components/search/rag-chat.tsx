import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router";
import ReactMarkdown from "react-markdown";
import { useQueryClient } from "@tanstack/react-query";
import {
  Send,
  FileText,
  Loader2,
  Bot,
  User,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SESSION_TYPE_LABELS } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { useConversation } from "@/api/hooks";
import type { Source, ChatMessage } from "@/types/chat";

interface RagChatProps {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
}

/** Build a superscript citation link */
function citationLink(sourceIndex: number, sources: Source[], keyPrefix: string) {
  const source = sources.find((s) => s.index === sourceIndex);
  if (!source) return `[${sourceIndex}]`;
  return (
    <Link
      key={keyPrefix}
      to={`/documentos/${source.documentId}`}
      className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors no-underline align-super ml-0.5 leading-none"
      title={source.title}
    >
      {sourceIndex}
    </Link>
  );
}

/** Replace citation markers with superscript linked numbers.
 *  Handles: [1], [Fuente 1], [Fuente 1, Fuente 2, Fuente 3], [1, 2, 3] */
function injectCitations(
  text: string,
  sources: Source[]
): React.ReactNode[] {
  // Match grouped citations like [Fuente 1, Fuente 2, ...] or [1, 2, ...] or single [Fuente 1] or [1]
  const regex = /\[(?:Fuente\s*)?(\d+)(?:\s*,\s*(?:Fuente\s*)?(\d+))*\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Extract all numbers from the matched string
    const nums = [...match[0].matchAll(/(\d+)/g)].map((m) => parseInt(m[1]));
    for (const num of nums) {
      parts.push(citationLink(num, sources, `cite-${match.index}-${num}`));
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function MarkdownContent({
  content,
  sources = [],
}: {
  content: string;
  sources?: Source[];
}) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => {
          const processed = processChildren(children, sources);
          return <p className="mb-2 last:mb-0">{processed}</p>;
        },
        ul: ({ children }) => (
          <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => {
          const processed = processChildren(children, sources);
          return <li>{processed}</li>;
        },
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold mt-3 mb-1">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="font-semibold mt-2 mb-1">{children}</h4>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/30 pl-3 italic my-2">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="bg-muted px-1 py-0.5 rounded text-xs">
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/** Recursively process React children, replacing [Fuente N] in text nodes */
function processChildren(
  children: React.ReactNode,
  sources: Source[]
): React.ReactNode {
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

function SourcesList({ sources }: { sources: Source[] }) {
  const unique = useMemo(() => {
    const seen = new Set<string>();
    return sources.filter((s) => {
      if (seen.has(s.documentId)) return false;
      seen.add(s.documentId);
      return true;
    });
  }, [sources]);

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {unique.map((source) => (
        <Link
          key={source.documentId}
          to={`/documentos/${source.documentId}`}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-muted hover:bg-accent border transition-colors"
        >
          <FileText className="h-3 w-3 text-primary shrink-0" />
          <span className="font-medium truncate max-w-[200px]">
            {source.title}
          </span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
            {SESSION_TYPE_LABELS[source.sessionType] || source.sessionType}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

export function RagChat({ conversationId, onConversationCreated }: RagChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Load messages from server when conversationId changes
  const { data: conversationData } = useConversation(conversationId);

  useEffect(() => {
    if (conversationData?.messages) {
      setMessages(
        conversationData.messages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          sources: m.sources || undefined,
        }))
      );
    } else if (!conversationId) {
      setMessages([]);
    }
  }, [conversationData, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    let activeConversationId = conversationId;
    let justCreated = false;

    // Create conversation if there's none
    if (!activeConversationId) {
      try {
        const res = await api.post<{ id: string }>("/conversations", {});
        activeConversationId = res.id;
        justCreated = true;
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Error al crear la conversación. Inténtalo de nuevo.",
          },
        ]);
        return;
      }
    }

    const userMessage: ChatMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: "",
      sources: [],
    };
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
          conversationId: activeConversationId,
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
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: fullText,
                  sources,
                };
                return updated;
              });
            }
            if (parsed.sources) {
              sources = parsed.sources;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: fullText,
                  sources,
                };
                return updated;
              });
            }
            if (parsed.title) {
              queryClient.setQueryData(
                ["conversations"],
                (old: any[] | undefined) =>
                  old?.map((c) =>
                    c.id === activeConversationId
                      ? { ...c, title: parsed.title }
                      : c
                  )
              );
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Invalidate conversations list to pick up title changes
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Navigate after stream completes so we don't kill the fetch
      if (justCreated && activeConversationId) {
        onConversationCreated?.(activeConversationId);
      }
    } catch (error) {
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
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className={`flex-1 overflow-y-auto pr-2 ${messages.length > 0 ? "space-y-5 pb-4" : ""}`}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Consulta tus documentos
            </h3>
            <p className="text-muted-foreground max-w-md">
              Pregunta lo que necesites sobre los documentos del sistema. Por
              ejemplo:
            </p>
            <div className="flex flex-wrap gap-2 mt-4 max-w-lg justify-center">
              {[
                "Que se hablo sobre urbanismo en los plenos?",
                "Resume las ultimas notas de prensa",
                "Que acuerdos se tomaron en la junta de gobierno?",
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
                <div className="max-w-[65%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
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
                    <div className="max-w-[75%] bg-muted/60 shadow-sm rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed prose-sm">
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
      <div className="border-t pt-3">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta sobre los documentos..."
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
          Las respuestas son generadas por IA y pueden contener errores. Verifica siempre la información con las fuentes originales.
        </p>
      </div>
    </div>
  );
}
