import { useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router";
import { RagChat } from "@/components/search/rag-chat";
import { useConversation } from "@/api/hooks";
import type { DashboardOutletContext } from "@/components/layout/dashboard-layout";

export function BusquedaPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = useOutletContext<DashboardOutletContext>();

  const activeConversationId =
    conversationId === "nueva" ? undefined : conversationId;

  const { data: conversationData } = useConversation(activeConversationId);

  useEffect(() => {
    const title = activeConversationId
      ? conversationData?.title || "Consulta IA"
      : "Nueva conversación";
    setPageTitle(title);
    return () => setPageTitle("");
  }, [activeConversationId, conversationData?.title, setPageTitle]);

  return (
    <div className="h-full overflow-hidden">
      <RagChat
        key={activeConversationId || "new"}
        conversationId={activeConversationId}
        onConversationCreated={(id) =>
          navigate(`/busqueda/${id}`, { replace: true })
        }
      />
    </div>
  );
}
