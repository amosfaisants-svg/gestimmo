"use client";

import { useEffect } from "react";
import { X, Send, CheckCircle2, Clock, User, Building, Shield, Trash2, Mail, Phone, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { UserMessage, markMessageAsRead, deleteMessage } from "@/lib/messagesService";

interface MessageDetailModalProps {
  message: UserMessage | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (updated: UserMessage) => void;
  onDelete?: (id: string) => void;
  currentViewerName?: string;
  isRecipientView?: boolean;
}

export function MessageDetailModal({
  message,
  isOpen,
  onClose,
  onStatusChange,
  onDelete,
  currentViewerName,
  isRecipientView = false,
}: MessageDetailModalProps) {
  // If the recipient opens the message, auto-mark it as "lu"
  useEffect(() => {
    if (isOpen && message && isRecipientView && message.status === "envoyé") {
      const updated = markMessageAsRead(message.id, currentViewerName || message.recipientName);
      if (updated) {
        onStatusChange?.(updated);
      }
    }
  }, [isOpen, message, isRecipientView, currentViewerName, onStatusChange]);

  if (!isOpen || !message) return null;

  const handleDelete = () => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce message ?")) {
      deleteMessage(message.id);
      onDelete?.(message.id);
      onClose();
    }
  };

  const isRead = message.status === "lu";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl border border-app-border shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="p-5 border-b border-app-border flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              isRead ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>
              {isRead ? <CheckCircle2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 line-clamp-1">{message.subject}</h2>
              </div>
              <p className="text-xs text-gray-500">
                {message.sentDateFormatted}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status Tracker Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isRead 
              ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-900" 
              : "bg-amber-50/60 border-amber-200/80 text-amber-900"
          }`}>
            <div className="flex items-center gap-3">
              <Badge variant={isRead ? "success" : "warning"} dot className="text-xs px-2.5 py-1 font-bold">
                {isRead ? "Statut : Lu" : "Statut : Envoyé"}
              </Badge>
              <span className="text-xs font-medium">
                {isRead 
                  ? `Consulté par le destinataire ${message.readDateFormatted ? `(${message.readDateFormatted})` : ""}`
                  : "Message transmis, en attente d'ouverture par le destinataire"
                }
              </span>
            </div>

            {/* Quick manual mark as read button if viewing from admin */}
            {!isRead && !isRecipientView && (
              <button
                type="button"
                onClick={() => {
                  const updated = markMessageAsRead(message.id, message.recipientName);
                  if (updated) onStatusChange?.(updated);
                }}
                className="text-xs bg-white text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg font-semibold hover:bg-amber-100 transition-colors shrink-0"
                title="Simuler ou valider la lecture"
              >
                Marquer comme lu
              </button>
            )}
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50/80 p-4 rounded-xl border border-app-border">
            <div>
              <span className="text-gray-500 block mb-0.5">Expéditeur :</span>
              <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                {message.senderName} {message.senderRole ? `(${message.senderRole})` : ""}
              </span>
            </div>

            <div>
              <span className="text-gray-500 block mb-0.5">Destinataire :</span>
              <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                {message.recipientType === "locataire" ? (
                  <User className="w-3.5 h-3.5 text-blue-600" />
                ) : message.recipientType === "proprietaire" ? (
                  <Building className="w-3.5 h-3.5 text-purple-600" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-primary" />
                )}
                {message.recipientName} {message.recipientUnit ? `(${message.recipientUnit})` : ""}
              </span>
            </div>

            <div>
              <span className="text-gray-500 block mb-0.5">Date d&apos;envoi :</span>
              <span className="font-medium text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {message.sentDateFormatted}
              </span>
            </div>

            <div>
              <span className="text-gray-500 block mb-0.5">Priorité :</span>
              <span className="capitalize font-semibold">
                <Badge variant={message.priority === "urgent" ? "danger" : message.priority === "important" ? "alert" : "info"}>
                  {message.priority === "urgent" ? "Urgente" : message.priority === "important" ? "Importante" : "Normale"}
                </Badge>
              </span>
            </div>
          </div>

          {/* Message Body */}
          <div>
            <span className="text-xs font-semibold uppercase text-gray-400 block mb-2 tracking-wider">
              Message :
            </span>
            <div className="p-4 bg-white rounded-xl border border-app-border text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans min-h-[120px]">
              {message.content}
            </div>
          </div>

          {/* Read Receipt Details if available */}
          {isRead && message.readDateFormatted && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Accusé de lecture confirmé le <strong>{message.readDateFormatted}</strong> par {message.readBy || message.recipientName}.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50/50 border-t border-app-border flex items-center justify-between">
          {!isRecipientView ? (
            <button
              onClick={handleDelete}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer le message</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
