"use client";

import { useState, useEffect, useMemo } from "react";
import { MessageSquare, CheckCircle2, Shield, Search, Eye, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { getPortalSession } from "@/lib/authSession";
import { 
  getMessagesForUser, 
  markMessageAsRead, 
  UserMessage 
} from "@/lib/messagesService";
import { MessageDetailModal } from "@/components/ui/MessageDetailModal";

export default function ProprietaireMessagesPage() {
  const [currentOwner, setCurrentOwner] = useState<any>(null);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<UserMessage | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadMessages = (owner: any) => {
    if (!owner) return;
    const ownerMsgs = getMessagesForUser("PROPRIETAIRE", owner);
    setMessages(ownerMsgs);
  };

  useEffect(() => {
    const owner = getPortalSession("PROPRIETAIRE");
    if (owner) {
      setCurrentOwner(owner);
      loadMessages(owner);
    }

    const handleUpdate = () => {
      const o = getPortalSession("PROPRIETAIRE") || currentOwner;
      loadMessages(o);
    };

    window.addEventListener("gestimmo_messages_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("gestimmo_messages_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const handleOpenMessage = (msg: UserMessage) => {
    setSelectedMessage(msg);
    setIsDetailOpen(true);
    // Auto mark as read immediately on open
    if (msg.status === "envoyé") {
      const updated = markMessageAsRead(msg.id, currentOwner?.name || "Propriétaire");
      if (updated) {
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.subject.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q)
      );
    });
  }, [messages, searchQuery]);

  const unreadCount = messages.filter((m) => m.status === "envoyé").length;

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 font-sans max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Communications & Relevés de gérance</h1>
            {unreadCount > 0 && (
              <Badge variant="warning" dot>
                {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Consultez les messages officiels, bilans et notifications envoyés par votre agence de gestion.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-app-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 shadow-2xs"
          />
        </div>
      </div>

      {/* Messages List Container */}
      <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden">
        {filteredMessages.length > 0 ? (
          <div className="divide-y divide-app-border">
            {filteredMessages.map((msg) => {
              const isUnread = msg.status === "envoyé";
              return (
                <div
                  key={msg.id}
                  onClick={() => handleOpenMessage(msg)}
                  className={`p-5 flex items-start gap-4 transition-all cursor-pointer group hover:bg-gray-50/80 ${
                    isUnread ? "bg-amber-50/30 font-medium" : "bg-white"
                  }`}
                >
                  <div className={`mt-0.5 p-2.5 rounded-xl border shrink-0 ${
                    isUnread ? "bg-amber-100 border-amber-300 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                  }`}>
                    {isUnread ? <MessageSquare className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-primary" />
                          {msg.senderName} ({msg.senderRole || "Agence GESTIMMO"})
                        </span>
                        <Badge variant={msg.priority === "urgent" ? "danger" : msg.priority === "important" ? "alert" : "info"} className="text-[10px]">
                          {msg.priority === "urgent" ? "Urgente" : msg.priority === "important" ? "Importante" : "Normale"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={isUnread ? "warning" : "success"} dot className="text-xs font-bold px-2.5 py-0.5">
                          {isUnread ? "Nouveau" : "Lu"}
                        </Badge>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{msg.sentDateFormatted}</span>
                      </div>
                    </div>

                    <h3 className={`text-sm ${isUnread ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
                      {msg.subject}
                    </h3>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {msg.content}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
                      <span className="text-[11px] text-primary group-hover:underline flex items-center gap-1 font-semibold">
                        <Eye className="w-3.5 h-3.5" />
                        Ouvrir et lire le message
                      </span>
                      {msg.readDateFormatted && (
                        <span className="text-[11px] text-gray-400">
                          Consulté le {msg.readDateFormatted}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Aucun message pour le moment</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? "Aucun message ne correspond à votre recherche."
                  : "Vous n'avez aucun message en attente dans votre espace propriétaire."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Message Reader Modal */}
      <MessageDetailModal
        message={selectedMessage}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedMessage(null);
        }}
        isRecipientView={true}
        currentViewerName={currentOwner?.name || "Propriétaire"}
        onStatusChange={(updated) => {
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }}
      />
    </div>
  );
}
