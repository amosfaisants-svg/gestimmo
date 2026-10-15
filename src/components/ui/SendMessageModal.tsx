"use client";

import { useState, useEffect } from "react";
import { X, Send, User, Users, Building, AlertCircle, CheckCircle2, Shield, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { 
  sendMessage, 
  MessageRecipientType, 
  MessagePriority, 
  UserMessage 
} from "@/lib/messagesService";
import { getPortalSession } from "@/lib/authSession";
import { getCompanyUsers } from "@/lib/companyCredentials";

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMessageSent?: (msg: UserMessage) => void;
  defaultRecipientType?: MessageRecipientType;
  defaultRecipientId?: string;
  defaultRecipientName?: string;
}

interface RecipientOption {
  id: string;
  name: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  unit?: string;
  type: MessageRecipientType;
}

export function SendMessageModal({
  isOpen,
  onClose,
  onMessageSent,
  defaultRecipientType = "locataire",
  defaultRecipientId = "",
  defaultRecipientName = "",
}: SendMessageModalProps) {
  const [recipientType, setRecipientType] = useState<MessageRecipientType>(defaultRecipientType);
  const [recipientsList, setRecipientsList] = useState<RecipientOption[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(defaultRecipientId);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<MessagePriority>("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senderName, setSenderName] = useState("Administration GESTIMMO");
  const [senderRole, setSenderRole] = useState("Agence");

  // Load current sender info
  useEffect(() => {
    const adminSession = getPortalSession("ADMIN");
    if (adminSession) {
      setSenderName(adminSession.name || "Kouassi Jean-Philippe");
      setSenderRole(adminSession.role || "Administrateur");
    }
  }, []);

  // Load available recipients based on selected recipient type
  useEffect(() => {
    const options: RecipientOption[] = [];

    if (recipientType === "locataire") {
      options.push({
        id: "all_tenants",
        name: "📢 Tous les locataires",
        subtitle: "Diffusion globale à l'ensemble des locataires",
        type: "locataire",
      });

      try {
        const stored = localStorage.getItem("gestimmo_locataires");
        const list = stored ? JSON.parse(stored) : [];
        if (Array.isArray(list) && list.length > 0) {
          list.forEach((t: any) => {
            options.push({
              id: t.id || `loc-${t.name}`,
              name: t.name || "Locataire",
              subtitle: t.unit ? `Logement ${t.unit}` : (t.property || "Locataire"),
              email: t.email,
              phone: t.phone,
              unit: t.unit,
              type: "locataire",
            });
          });
        } else {
          // Fallback defaults
          options.push(
            { id: "LOC-101", name: "Cora Richards", subtitle: "Logement A-101", unit: "A-101", type: "locataire" },
            { id: "LOC-204", name: "Alistair Dunlap", subtitle: "Logement B-204", unit: "B-204", type: "locataire" },
            { id: "LOC-003", name: "Marc Antoine", subtitle: "Logement A-102", unit: "A-102", type: "locataire" },
            { id: "LOC-004", name: "Bibi Shelton", subtitle: "Logement B-205", unit: "B-205", type: "locataire" }
          );
        }
      } catch (e) {
        options.push(
          { id: "LOC-101", name: "Cora Richards", subtitle: "Logement A-101", unit: "A-101", type: "locataire" }
        );
      }
    } else if (recipientType === "gerant" || recipientType === "equipe") {
      options.push({
        id: "all_team",
        name: "👥 Toute l'équipe & Gérants",
        subtitle: "Diffusion interne à tous les collaborateurs",
        type: "gerant",
      });

      const companyUsers = getCompanyUsers();
      if (Array.isArray(companyUsers) && companyUsers.length > 0) {
        companyUsers.forEach((u) => {
          options.push({
            id: u.id,
            name: u.name,
            subtitle: `${u.role} • ${u.email}`,
            email: u.email,
            phone: u.phone,
            type: "gerant",
          });
        });
      }

      // Also check gestimmo_gerants
      try {
        const storedGerants = localStorage.getItem("gestimmo_gerants");
        if (storedGerants) {
          const gerants = JSON.parse(storedGerants);
          if (Array.isArray(gerants)) {
            gerants.forEach((g: any) => {
              if (!options.some((o) => o.name.toLowerCase() === g.name?.toLowerCase())) {
                options.push({
                  id: g.id || `gerant-${g.name}`,
                  name: g.name,
                  subtitle: `Gérante de biens • ${g.email || ""}`,
                  email: g.email,
                  phone: g.phone,
                  type: "gerant",
                });
              }
            });
          }
        }
      } catch (e) {}
    } else if (recipientType === "proprietaire") {
      options.push({
        id: "all_owners",
        name: "🏢 Tous les propriétaires",
        subtitle: "Diffusion globale à l'ensemble des bailleurs",
        type: "proprietaire",
      });

      try {
        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        const list = storedOwners ? JSON.parse(storedOwners) : [];
        if (Array.isArray(list) && list.length > 0) {
          list.forEach((o: any) => {
            options.push({
              id: o.id || `owner-${o.name}`,
              name: o.name,
              subtitle: o.email || "Bailleur partenaire",
              email: o.email,
              phone: o.phone,
              type: "proprietaire",
            });
          });
        } else {
          options.push(
            { id: "PR-001", name: "Kouadio Invest", subtitle: "Bailleur entreprise", type: "proprietaire" },
            { id: "PR-002", name: "M. Bamba Seydou", subtitle: "Bailleur particulier", type: "proprietaire" }
          );
        }
      } catch (e) {}
    }

    setRecipientsList(options);

    // Keep or set default selection
    if (options.length > 1) {
      const match = options.find((o) => o.id === defaultRecipientId || o.name === defaultRecipientName);
      if (match) {
        setSelectedRecipientId(match.id);
      } else {
        setSelectedRecipientId(options[1].id); // First individual recipient
      }
    } else if (options.length > 0) {
      setSelectedRecipientId(options[0].id);
    }
  }, [recipientType, defaultRecipientId, defaultRecipientName]);

  if (!isOpen) return null;

  // Preset subject suggestions based on target
  const subjectSuggestions = 
    recipientType === "locataire" ? [
      "Rappel échéance de loyer",
      "Information travaux & intervention",
      "Visite technique de contrôle",
      "Transmission de document ou quittance",
      "Préavis de départ & état des lieux"
    ] : recipientType === "gerant" ? [
      "Point sur les encaissements de la semaine",
      "Validation de quittances & décharges",
      "Coordination état des lieux",
      "Intervention technique prioritaire"
    ] : [
      "Relevé de gérance mensuel disponible",
      "Notification de virement de reversement",
      "Validation devis travaux de rénovation",
      "Point de gestion de votre patrimoine"
    ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) return;

    setIsSubmitting(true);

    const selected = recipientsList.find((r) => r.id === selectedRecipientId);
    const recipientName = selected ? selected.name : "Destinataire";

    const sent = sendMessage({
      senderName,
      senderRole,
      recipientType,
      recipientId: selectedRecipientId,
      recipientName,
      recipientEmail: selected?.email,
      recipientPhone: selected?.phone,
      recipientUnit: selected?.unit,
      subject: subject.trim(),
      content: content.trim(),
      priority,
    });

    setIsSubmitting(false);
    onMessageSent?.(sent);
    onClose();

    // Reset fields
    setSubject("");
    setContent("");
    setPriority("normal");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl border border-app-border shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="p-5 border-b border-app-border flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Envoyer un message</h2>
              <p className="text-xs text-gray-500">
                Communication directe vers l&apos;espace d&apos;un locataire, gérant ou propriétaire
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status lifecycle hint */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Cycle de suivi des statuts :</span> Le message sera initialement enregistré au statut{" "}
              <Badge variant="warning" dot className="mx-1 py-0 px-2 font-semibold">Envoyé</Badge>.
              Dès que le destinataire se connecte à son espace personnel et ouvre le message, son statut passera automatiquement à{" "}
              <Badge variant="success" dot className="mx-1 py-0 px-2 font-semibold">Lu</Badge>.
            </div>
          </div>

          {/* 1. Recipient Category Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-2 tracking-wider">
              1. Type d&apos;espace destinataire *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setRecipientType("locataire")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  recipientType === "locataire"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-gray-700 border-app-border hover:bg-gray-50"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Espace Locataire</span>
              </button>

              <button
                type="button"
                onClick={() => setRecipientType("gerant")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  recipientType === "gerant"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-gray-700 border-app-border hover:bg-gray-50"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Gérant / Équipe</span>
              </button>

              <button
                type="button"
                onClick={() => setRecipientType("proprietaire")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  recipientType === "proprietaire"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-gray-700 border-app-border hover:bg-gray-50"
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Espace Propriétaire</span>
              </button>
            </div>
          </div>

          {/* 2. Target Recipient Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5 tracking-wider">
              2. Destinataire précis *
            </label>
            <select
              value={selectedRecipientId}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-app-border rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              required
            >
              {recipientsList.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.name} {rec.subtitle ? `(${rec.subtitle})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Subject and Quick Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
                3. Objet du message *
              </label>
              <span className="text-[11px] text-gray-400">Suggestions rapides :</span>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {subjectSuggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSubject(sug)}
                  className="text-[11px] px-2.5 py-1 bg-gray-100 hover:bg-primary/10 hover:text-primary rounded-lg text-gray-600 transition-colors font-medium border border-gray-200/60"
                >
                  {sug}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Information importante concernant votre contrat..."
              className="w-full px-3.5 py-2.5 bg-white border border-app-border rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              required
            />
          </div>

          {/* 4. Priority */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5 tracking-wider">
              4. Degré d&apos;importance
            </label>
            <div className="flex items-center gap-2">
              {(["normal", "important", "urgent"] as MessagePriority[]).map((p) => {
                const isSelected = priority === p;
                const label = p === "normal" ? "Normale" : p === "important" ? "Importante" : "Urgente";
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all capitalize ${
                      isSelected
                        ? p === "urgent"
                          ? "bg-red-500 text-white border-red-500 shadow-xs"
                          : p === "important"
                          ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                          : "bg-primary text-white border-primary shadow-xs"
                        : "bg-white text-gray-600 border-app-border hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Message Content */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5 tracking-wider">
              5. Contenu du message *
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Rédigez ici le message qui sera immédiatement notifié et affiché dans l'espace personnel du destinataire..."
              className="w-full px-3.5 py-2.5 bg-white border border-app-border rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              required
            />
          </div>

          {/* Sender Preview */}
          <div className="bg-gray-50 p-3 rounded-xl border border-app-border flex items-center justify-between text-xs text-gray-500">
            <span>Expéditeur identifié : <strong className="text-gray-800">{senderName}</strong> ({senderRole})</span>
            <span className="text-gray-400">Date : À l&apos;envoi instantané</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-app-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-white border border-app-border text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !content.trim()}
              className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Envoi en cours..." : "Envoyer le message"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
