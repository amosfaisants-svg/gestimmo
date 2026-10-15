"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  Info, 
  Trash2, 
  Check, 
  ExternalLink, 
  Search, 
  Plus, 
  RefreshCw,
  Eye,
  EyeOff,
  X,
  ArrowRight,
  AlertTriangle,
  MessageSquare,
  Send,
  User,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatFCFA } from "@/lib/utils";
import { loadAllDataFromDatabase } from "@/lib/dataService";
import { IncidentDetailModal } from "@/components/ui/IncidentDetailModal";
import { SendMessageModal } from "@/components/ui/SendMessageModal";
import { MessageDetailModal } from "@/components/ui/MessageDetailModal";
import { getStoredMessages, UserMessage, markMessageAsRead, deleteMessage } from "@/lib/messagesService";

export interface SystemNotification {
  id: string;
  type: "ALERT" | "WARNING" | "INFO" | "SUCCESS";
  title: string;
  message: string;
  date: string;
  read: boolean;
  link?: string;
  category: "loyer" | "bail" | "contrat" | "reversement" | "incident" | "preavis" | "general";
}

const defaultNotifications: SystemNotification[] = [
  { 
    id: "notif-001", 
    type: "ALERT", 
    title: "Loyer Impayé", 
    message: "Alistair Dunlap (Appartement B-204) a dépassé la date limite de paiement de 5 jours.", 
    date: "Il y a 2h", 
    read: false,
    link: "/app/paiements",
    category: "loyer"
  },
  { 
    id: "notif-002", 
    type: "WARNING", 
    title: "Fin de bail proche", 
    message: "Le bail de Marc Antoine (Appartement A-101) expire dans 30 jours.", 
    date: "Il y a 5h", 
    read: false,
    link: "/app/baux",
    category: "bail"
  },
  { 
    id: "notif-006", 
    type: "WARNING", 
    title: "Préavis émis par locataire", 
    message: "Le locataire Cora Richards (Appartement A-101) a émis son préavis de départ de 3 mois depuis son espace locataire. Libération prévue : 30 Nov 2026.", 
    date: "Aujourd'hui", 
    read: false,
    link: "/app/resiliations",
    category: "preavis"
  },
  { 
    id: "notif-003", 
    type: "INFO", 
    title: "Nouveau contrat généré", 
    message: "Le contrat de location pour Cora Richards a été généré et est en attente de signature.", 
    date: "Hier", 
    read: true,
    link: "/app/locataires",
    category: "contrat"
  },
  { 
    id: "notif-004", 
    type: "SUCCESS", 
    title: "Paiement reçu", 
    message: `Le virement de ${formatFCFA(165000)} de Bibi Shelton a été validé.`, 
    date: "Hier", 
    read: true,
    link: "/app/paiements",
    category: "loyer"
  },
  { 
    id: "notif-005", 
    type: "WARNING", 
    title: "Reversement en attente", 
    message: `Le reversement de ${formatFCFA(3150000)} pour Kouadio Invest doit être effectué avant le 10.`, 
    date: "03 Sept", 
    read: true,
    link: "/app/reversements",
    category: "reversement"
  },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [notificationsList, setNotificationsList] = useState<SystemNotification[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "messages" | "alerts" | "payments" | "leases" | "preavis" | "incidents">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Messages state
  const [messagesList, setMessagesList] = useState<UserMessage[]>([]);
  const [isSendMessageModalOpen, setIsSendMessageModalOpen] = useState(false);
  const [selectedMessageForDetail, setSelectedMessageForDetail] = useState<UserMessage | null>(null);
  const [isMessageDetailModalOpen, setIsMessageDetailModalOpen] = useState(false);

  // Modal create custom notification
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newType, setNewType] = useState<SystemNotification["type"]>("INFO");
  const [newLink, setNewLink] = useState("/app/paiements");

  // Modal Incident Details
  const [selectedIncidentForModal, setSelectedIncidentForModal] = useState<any | null>(null);

  // Comprehensive dynamic synchronization of all system notifications
  const syncSystemNotifications = (notifyUser = false) => {
    const savedNotifs = localStorage.getItem("gestimmo_notifications");
    let current: SystemNotification[] = [];

    if (savedNotifs) {
      try {
        current = JSON.parse(savedNotifs);
      } catch (e) {
        current = defaultNotifications;
      }
    } else {
      current = defaultNotifications;
    }

    try {
      // 1. Scan Paiements (Impayés & Retards)
      const storedPaiementsRaw = localStorage.getItem("gestimmo_paiements");
      const paiementsList = storedPaiementsRaw ? JSON.parse(storedPaiementsRaw) : [
        { id: "P-1926", tenant: "Alistair Dunlap", unit: "B-204", amount: 3150000, status: "EN RETARD", period: "Septembre 2026" },
        { id: "P-1928", tenant: "Jean Dupont", unit: "V-001", amount: 800000, status: "REJETÉ", period: "Septembre 2026" },
        { id: "P-1929", tenant: "Addie Bradford", unit: "B-205", amount: 220000, status: "IMPAYÉ", period: "Septembre 2026" }
      ];

      if (Array.isArray(paiementsList)) {
        paiementsList.forEach((p: any) => {
          const st = String(p.status || "").toUpperCase();
          if (st === "IMPAYÉ" || st === "EN RETARD" || st === "REJETÉ") {
            const notifId = `auto-pay-${p.id}`;
            if (!current.some((n) => n.id === notifId)) {
              current.unshift({
                id: notifId,
                type: "ALERT",
                title: st === "REJETÉ" ? "Chèque de loyer rejeté" : "Alerte Impayé détectée",
                message: `Retard de paiement pour ${p.tenant || p.tenantName || 'Locataire'} (${p.unit || p.property || 'Logement'}) — Montant : ${formatFCFA(p.amount || 0)}.`,
                date: p.date || p.period || "Mois en cours",
                read: false,
                link: "/app/paiements",
                category: "loyer",
              });
            }
          }
        });
      }

      // 2. Scan Locataires (Retards & Dossiers en attente)
      const storedLocatairesRaw = localStorage.getItem("gestimmo_locataires");
      if (storedLocatairesRaw) {
        const locataires = JSON.parse(storedLocatairesRaw);
        if (Array.isArray(locataires)) {
          locataires.forEach((t: any) => {
            const st = String(t.status || "").toUpperCase();
            if (st === "IMPAYÉ" || st === "EN RETARD") {
              const notifId = `auto-loc-${t.id}`;
              if (!current.some((n) => n.id === notifId)) {
                current.unshift({
                  id: notifId,
                  type: "ALERT",
                  title: `Statut Locataire : ${t.name}`,
                  message: `Le locataire ${t.name} (Logement ${t.unit || '-'}) est actuellement en statut ${st}. Loyer mensuel : ${formatFCFA(t.rent || 0)}.`,
                  date: "Fiche locataire",
                  read: false,
                  link: `/app/locataires/${t.id}`,
                  category: "loyer",
                });
              }
            } else if (st === "EN ATTENTE") {
              const notifId = `auto-loc-pending-${t.id}`;
              if (!current.some((n) => n.id === notifId)) {
                current.unshift({
                  id: notifId,
                  type: "INFO",
                  title: "Dossier locataire en attente",
                  message: `La candidature de ${t.name} (${t.email || t.phone}) est en attente d'attribution de logement et signature de bail.`,
                  date: "Récemment",
                  read: true,
                  link: `/app/locataires/${t.id}`,
                  category: "contrat",
                });
              }
            }
          });
        }
      }

      // 3. Scan Baux (Fins de bail proches & baux actifs)
      const storedBauxRaw = localStorage.getItem("gestimmo_baux");
      const bauxList = storedBauxRaw ? JSON.parse(storedBauxRaw) : [
        { id: "L-101", tenant: "Cora Richards", unit: "A-101", rent: 150000, start: "01 Janv 2026", status: "ACTIF" },
        { id: "L-204", tenant: "Alistair Dunlap", unit: "B-204", rent: 3150000, start: "01 Fév 2026", status: "ACTIF" }
      ];

      if (Array.isArray(bauxList)) {
        bauxList.forEach((b: any) => {
          if (b.status === "ACTIF" || b.status === "Actif") {
            if (b.dateFin) {
              const endDate = new Date(b.dateFin);
              const now = new Date();
              const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
              if (diffDays <= 60 && diffDays >= 0) {
                const notifId = `auto-bail-${b.id}`;
                if (!current.some((n) => n.id === notifId)) {
                  current.unshift({
                    id: notifId,
                    type: "WARNING",
                    title: "Fin de bail proche",
                    message: `Le bail de ${b.tenant || b.tenantName || 'Locataire'} (${b.unit || b.propertyName || 'Bien'}) expire dans ${diffDays} jour(s).`,
                    date: "Échéance bail",
                    read: false,
                    link: "/app/baux",
                    category: "bail",
                  });
                }
              }
            }
          }
        });
      }

      // 4. Scan Reversements (Reversements propriétaires en attente)
      const storedReversementRaw = localStorage.getItem("gestimmo_reversements");
      const reversementList = storedReversementRaw ? JSON.parse(storedReversementRaw) : [
        { id: "REV-001", ownerName: "Kouadio Invest", amount: 3150000, status: "En attente", date: "03 Sept" }
      ];

      if (Array.isArray(reversementList)) {
        reversementList.forEach((r: any) => {
          if (r.status === "En attente" || r.status === "EN ATTENTE") {
            const notifId = `auto-rev-${r.id}`;
            if (!current.some((n) => n.id === notifId)) {
              current.unshift({
                id: notifId,
                type: "WARNING",
                title: "Reversement propriétaire en attente",
                message: `Le reversement pour ${r.ownerName || r.owner || 'Propriétaire'} (Montant net : ${formatFCFA(r.amount || 0)}) est en attente de paiement.`,
                date: r.date || "À régulariser",
                read: false,
                link: "/app/reversements",
                category: "reversement",
              });
            }
          }
        });
      }

      // 5. Scan Incidents (Signalisations & Constats locataires)
      const storedIncidentsRaw = localStorage.getItem("gestimmo_incidents");
      if (storedIncidentsRaw) {
        const incidents = JSON.parse(storedIncidentsRaw);
        if (Array.isArray(incidents)) {
          incidents.forEach((inc: any) => {
            const st = String(inc.status || "").toUpperCase();
            if (st !== "RÉSOLU" && st !== "RESOLU") {
              const notifId = `auto-inc-${inc.id}`;
              const isUrgent = Boolean(
                inc.isUrgent || 
                inc.priority === "URGENTE" || 
                inc.priority === "HAUTE" || 
                st === "URGENT"
              );
              const problemType = inc.title || inc.type || "Problème technique";
              const titleText = isUrgent
                ? `URGENT - Incident signalé : ${problemType}`
                : `Incident signalé : ${problemType}`;
              const tenantStr = inc.tenant || inc.tenantName || "Locataire";
              const locationStr = [inc.property, inc.unit].filter(Boolean).join(" - ") || "Logement";
              const descSnippet = inc.description
                ? ` : "${inc.description.slice(0, 100)}${inc.description.length > 100 ? "..." : ""}"`
                : "";

              if (!current.some((n) => n.id === notifId)) {
                current.unshift({
                  id: notifId,
                  type: isUrgent ? "ALERT" : "WARNING",
                  title: titleText,
                  message: `Signalé par ${tenantStr} (${locationStr})${descSnippet}`,
                  date: inc.dateStr || (inc.createdAt ? new Date(inc.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "Récemment"),
                  read: false,
                  link: `/app?incident=${encodeURIComponent(inc.id)}#incidents`,
                  category: "incident",
                });
              }
            }
          });
        }
      }

      // 6. Scan Préavis émis par locataires (gestimmo_preavis)
      const samplePreavisList = [
        { 
          id: "PRV-1005", 
          leaseId: "L-101", 
          tenant: "Cora Richards", 
          unit: "A-101", 
          property: "Résidence Les Flamboyants", 
          requestDate: "09 oct. 2026", 
          exitDate: "09 janvier 2027", 
          durationMonths: 3, 
          initiatedBy: "LOCATAIRE", 
          reason: "affectation", 
          deposit: 300000, 
          deductions: 0, 
          status: "EN PRÉAVIS",
          notes: "Notification transmise le 09 oct. 2026. Libération des lieux fixée au 09 janvier 2027. Motif : affectation"
        },
        { 
          id: "PRV-1001", 
          leaseId: "BX-007", 
          tenant: "Koffi Mensah", 
          unit: "C-201", 
          property: "Complexe Riviera", 
          requestDate: "01 Sept 2026", 
          exitDate: "30 Nov 2026", 
          durationMonths: 3, 
          initiatedBy: "LOCATAIRE", 
          reason: "Déménagement professionnel", 
          deposit: 900000, 
          deductions: 0, 
          status: "EN PRÉAVIS",
          notes: "État des lieux de sortie prévu fin novembre"
        }
      ];

      const storedPreavisRaw = localStorage.getItem("gestimmo_preavis");
      let preavisList: any[] = [];
      if (storedPreavisRaw) {
        try {
          preavisList = JSON.parse(storedPreavisRaw);
        } catch (e) {
          preavisList = samplePreavisList;
        }
      } else {
        preavisList = samplePreavisList;
        localStorage.setItem("gestimmo_preavis", JSON.stringify(samplePreavisList));
      }

      if (Array.isArray(preavisList)) {
        preavisList.forEach((prv: any) => {
          if (prv.status === "EN PRÉAVIS" || prv.status === "EN PRÉAVIS DE DÉPART" || prv.status === "Actif") {
            const notifId = `auto-prv-${prv.id || prv.leaseId}`;
            if (!current.some((n) => n.id === notifId)) {
              current.unshift({
                id: notifId,
                type: "WARNING",
                title: `Préavis émis par locataire : ${prv.tenant || 'Locataire'}`,
                message: `Préavis de départ émis depuis l'espace locataire par ${prv.tenant || 'Locataire'} (${prv.unit || prv.property || 'Logement'}). Libération des lieux fixée au ${prv.exitDate || prv.effectiveExitDate || 'à définir'}. Motif : ${prv.reason || 'affectation'}.`,
                date: prv.requestDate || prv.notificationDate || "09 oct. 2026",
                read: false,
                link: "/app/resiliations",
                category: "preavis",
              });
            }
          }
        });
      }
    } catch (e) {
      console.error(e);
    }

    setNotificationsList(current);
    localStorage.setItem("gestimmo_notifications", JSON.stringify(current));
    window.dispatchEvent(new Event("storage"));

    if (notifyUser) {
      showToast("Toutes les alertes et notifications ont été synchronisées !");
    }
  };

  useEffect(() => {
    syncSystemNotifications(false);

    loadAllDataFromDatabase()
      .then(() => {
        syncSystemNotifications(false);
      })
      .catch((e) => console.error("loadAllDataFromDatabase in notifications:", e));

    setMessagesList(getStoredMessages());

    const handleStorage = () => {
      syncSystemNotifications(false);
      setMessagesList(getStoredMessages());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("gestimmo_notifications_updated", handleStorage);
    window.addEventListener("gestimmo_incidents_updated", handleStorage);
    window.addEventListener("gestimmo_messages_updated", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("gestimmo_notifications_updated", handleStorage);
      window.removeEventListener("gestimmo_incidents_updated", handleStorage);
      window.removeEventListener("gestimmo_messages_updated", handleStorage);
    };
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const saveNotifications = (updated: SystemNotification[]) => {
    setNotificationsList(updated);
    localStorage.setItem("gestimmo_notifications", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  // Actions
  const handleMarkAllAsRead = () => {
    const updated = notificationsList.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
    showToast("Toutes les notifications ont été marquées comme lues.");
  };

  const handleToggleRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = notificationsList.map((n) => (n.id === id ? { ...n, read: !n.read } : n));
    saveNotifications(updated);
  };

  const handleDeleteNotification = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = notificationsList.filter((n) => n.id !== id);
    saveNotifications(updated);
    showToast("Notification supprimée.");
  };

  const handleClearRead = () => {
    const updated = notificationsList.filter((n) => !n.read);
    saveNotifications(updated);
    showToast("Les notifications lues ont été effacées.");
  };

  const handleNavigateToNotificationLink = (notif: SystemNotification) => {
    if (!notif.read) {
      const updated = notificationsList.map((n) => (n.id === notif.id ? { ...n, read: true } : n));
      saveNotifications(updated);
    }

    if (notif.category === "incident" || notif.id.startsWith("auto-inc-") || notif.title.toLowerCase().includes("incident")) {
      let incId = notif.id.startsWith("auto-inc-") ? notif.id.replace("auto-inc-", "") : "";
      if (!incId && notif.link?.includes("incident=")) {
        const match = notif.link.match(/incident=([^&#]+)/);
        if (match) incId = match[1];
      }
      if (!incId) {
        try {
          const storedIncidents = JSON.parse(localStorage.getItem("gestimmo_incidents") || "[]");
          const found = storedIncidents.find((inc: any) => 
            (notif.title && inc.title && notif.title.toLowerCase().includes(inc.title.toLowerCase())) ||
            (notif.message && inc.tenant && notif.message.toLowerCase().includes(inc.tenant.toLowerCase())) ||
            (notif.message && inc.description && notif.message.toLowerCase().includes(inc.description.slice(0, 30).toLowerCase()))
          );
          if (found) incId = found.id;
        } catch (e) {}
      }

      if (incId) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("gestimmo_target_incident", incId);
        }
        router.push(`/app?incident=${encodeURIComponent(incId)}#incidents`);
        return;
      }
    }

    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleOpenIncidentModalDirectly = (notif: SystemNotification, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!notif.read) {
      const updated = notificationsList.map((n) => (n.id === notif.id ? { ...n, read: true } : n));
      saveNotifications(updated);
    }

    let incId = notif.id.startsWith("auto-inc-") ? notif.id.replace("auto-inc-", "") : "";
    if (!incId && notif.link?.includes("incident=")) {
      const match = notif.link.match(/incident=([^&#]+)/);
      if (match) incId = match[1];
    }

    let foundIncident: any = null;
    try {
      const storedIncidents = JSON.parse(localStorage.getItem("gestimmo_incidents") || "[]");
      if (incId) {
        foundIncident = storedIncidents.find((i: any) => 
          (i.id && i.id.toLowerCase() === incId.toLowerCase()) ||
          (i.id && i.id.toLowerCase().includes(incId.toLowerCase()))
        );
      }
      if (!foundIncident) {
        foundIncident = storedIncidents.find((inc: any) => 
          (notif.title && inc.title && notif.title.toLowerCase().includes(inc.title.toLowerCase())) ||
          (notif.message && inc.tenant && notif.message.toLowerCase().includes(inc.tenant.toLowerCase())) ||
          (notif.message && inc.description && notif.message.toLowerCase().includes(inc.description.slice(0, 30).toLowerCase()))
        );
      }
    } catch (e) {
      console.error(e);
    }

    if (foundIncident) {
      setSelectedIncidentForModal(foundIncident);
    } else {
      setSelectedIncidentForModal({
        id: incId || notif.id,
        title: notif.title.replace(/^URGENT\s*-\s*Incident\s*signalé\s*:\s*/i, "").replace(/^Incident\s*signalé\s*:\s*/i, ""),
        description: notif.message,
        isUrgent: notif.type === "ALERT",
        status: "EN ATTENTE",
        dateStr: notif.date,
        files: [],
      });
    }
  };

  const handleCreateCustomNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      alert("Veuillez saisir un titre et un message.");
      return;
    }

    const newNotif: SystemNotification = {
      id: `custom-${Date.now()}`,
      type: newType,
      title: newTitle.trim(),
      message: newMessage.trim(),
      date: "À l'instant",
      read: false,
      link: newLink || "/app/paiements",
      category: "general",
    };

    const updated = [newNotif, ...notificationsList];
    saveNotifications(updated);
    showToast("Notification enregistrée avec succès !");
    setIsAddModalOpen(false);

    // Reset Form
    setNewTitle("");
    setNewMessage("");
    setNewType("INFO");
    setNewLink("/app/paiements");
  };

  // Counters
  const unreadCount = useMemo(() => notificationsList.filter((n) => !n.read).length, [notificationsList]);
  const preavisCount = useMemo(() => {
    return notificationsList.filter(
      (n) => n.category === "preavis" || n.title.toLowerCase().includes("préavis") || n.message.toLowerCase().includes("préavis")
    ).length;
  }, [notificationsList]);
  const incidentsCount = useMemo(() => {
    return notificationsList.filter(
      (n) => n.category === "incident" || n.title.toLowerCase().includes("incident")
    ).length;
  }, [notificationsList]);

  const messagesPendingCount = useMemo(() => {
    return messagesList.filter((m) => m.status === "envoyé").length;
  }, [messagesList]);

  const filteredMessages = useMemo(() => {
    return messagesList.filter((msg) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        msg.subject.toLowerCase().includes(q) ||
        msg.content.toLowerCase().includes(q) ||
        msg.recipientName.toLowerCase().includes(q) ||
        msg.senderName.toLowerCase().includes(q) ||
        (msg.status && msg.status.toLowerCase().includes(q))
      );
    });
  }, [messagesList, searchQuery]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notificationsList.filter((notif) => {
      // Tab filter
      let matchesTab = true;
      if (activeTab === "unread") matchesTab = !notif.read;
      else if (activeTab === "alerts") matchesTab = notif.type === "ALERT" || notif.type === "WARNING";
      else if (activeTab === "payments") matchesTab = notif.category === "loyer" || notif.category === "reversement" || notif.type === "SUCCESS";
      else if (activeTab === "leases") matchesTab = notif.category === "bail" || notif.category === "contrat";
      else if (activeTab === "preavis") matchesTab = notif.category === "preavis" || notif.title.toLowerCase().includes("préavis") || notif.message.toLowerCase().includes("préavis");
      else if (activeTab === "incidents") matchesTab = notif.category === "incident" || notif.title.toLowerCase().includes("incident");

      // Search query filter
      const matchesSearch = 
        !searchQuery.trim() ||
        notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.message.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [notificationsList, activeTab, searchQuery]);

  const getNotificationIcon = (type: SystemNotification["type"], category?: SystemNotification["category"]) => {
    if (category === "incident") {
      return <AlertTriangle className={`w-5 h-5 shrink-0 ${type === "ALERT" ? "text-red-500" : "text-amber-500"}`} />;
    }
    switch (type) {
      case "ALERT":
        return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case "WARNING":
        return <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />;
      case "INFO":
        return <FileText className="w-5 h-5 text-blue-500 shrink-0" />;
      case "SUCCESS":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-gray-500 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 max-w-5xl mx-auto relative">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Notifications & Alertes</h1>
            {unreadCount > 0 && (
              <Badge variant="danger" dot>
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">Restez informé des impayés, échéances de baux, préavis et tâches prioritaires.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={async () => {
              try {
                await loadAllDataFromDatabase();
              } catch (e) {
                console.error(e);
              }
              syncSystemNotifications(true);
            }}
            className="bg-white border border-app-border text-gray-700 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
            title="Mettre à jour les notifications selon les derniers paiements, baux et incidents"
          >
            <RefreshCw className="h-4 w-4 mr-2 text-primary" /> Synchroniser
          </button>

          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="bg-white border border-app-border text-gray-700 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" /> Tout marquer comme lu
          </button>

          {notificationsList.some((n) => n.read) && (
            <button
              onClick={handleClearRead}
              className="bg-white border border-app-border text-gray-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center shadow-sm"
              title="Effacer les notifications déjà lues"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Effacer les lues
            </button>
          )}

          <button
            onClick={() => setIsSendMessageModalOpen(true)}
            className="bg-primary text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm"
            title="Envoyer un message à un locataire, gérant ou propriétaire"
          >
            <Send className="h-4 w-4 mr-1.5" /> Envoyer un message
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-white border border-app-border text-gray-700 hover:bg-gray-50 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nouvelle alerte
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-app-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "all" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Toutes ({notificationsList.length})
          </button>

          <button
            onClick={() => setActiveTab("unread")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "unread" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Non lues
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${activeTab === "unread" ? "bg-white text-primary" : "bg-red-500 text-white"}`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("messages")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "messages" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Messages ({messagesList.length})
            {messagesPendingCount > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${activeTab === "messages" ? "bg-white text-primary" : "bg-amber-500 text-white"}`}>
                {messagesPendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "alerts" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Alertes & Urgences
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "payments" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Paiements & Reçus
          </button>

          <button
            onClick={() => setActiveTab("leases")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "leases" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Baux & Contrats
          </button>

          <button
            onClick={() => setActiveTab("preavis")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "preavis" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Préavis Locataires
            {preavisCount > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${activeTab === "preavis" ? "bg-white text-primary" : "bg-amber-500 text-white"}`}>
                {preavisCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("incidents")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "incidents" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Incidents Locataires
            {incidentsCount > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${activeTab === "incidents" ? "bg-white text-primary" : "bg-amber-500 text-white"}`}>
                {incidentsCount}
              </span>
            )}
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une alerte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-gray-50 border border-app-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Container (Notifications or Messages) */}
      {activeTab === "messages" ? (
        <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-app-border bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Messages envoyés & suivis des statuts</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Consultez ici l&apos;état de vos messages : <strong>Envoyé</strong> (en attente) et <strong>Lu</strong> (confirmé dès l&apos;ouverture par le destinataire).
              </p>
            </div>
            <button
              onClick={() => setIsSendMessageModalOpen(true)}
              className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nouveau message</span>
            </button>
          </div>

          {filteredMessages.length > 0 ? (
            <div className="divide-y divide-app-border">
              {filteredMessages.map((msg) => {
                const isRead = msg.status === "lu";
                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessageForDetail(msg);
                      setIsMessageDetailModalOpen(true);
                    }}
                    className={`p-5 flex items-start gap-4 transition-all cursor-pointer group hover:bg-gray-50/80 ${
                      !isRead ? "bg-amber-50/20" : "bg-white"
                    }`}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 p-2.5 rounded-xl border shrink-0 ${
                      isRead ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-amber-50 border-amber-200 text-amber-600"
                    }`}>
                      {isRead ? <CheckCircle2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                            {msg.recipientType === "locataire" ? "👤 Locataire" : msg.recipientType === "proprietaire" ? "🏢 Propriétaire" : "👔 Gérant / Équipe"}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {msg.recipientName} {msg.recipientUnit ? `(${msg.recipientUnit})` : ""}
                          </span>
                          <Badge variant={msg.priority === "urgent" ? "danger" : msg.priority === "important" ? "alert" : "info"} className="text-[10px]">
                            {msg.priority === "urgent" ? "Urgente" : msg.priority === "important" ? "Importante" : "Normale"}
                          </Badge>
                        </div>

                        {/* Status Badge: Envoyé vs Lu */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <Badge 
                            variant={isRead ? "success" : "warning"} 
                            dot 
                            className="text-xs font-bold px-2.5 py-0.5"
                          >
                            {isRead ? "Statut : Lu" : "Statut : Envoyé"}
                          </Badge>
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-gray-800 line-clamp-1">
                        {msg.subject}
                      </h3>

                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {msg.content}
                      </p>

                      {/* Footer Info & Actions */}
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-gray-500 border-t border-gray-100 mt-2">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            Envoyé le {msg.sentDateFormatted} par <strong>{msg.senderName}</strong>
                          </span>
                          {isRead && msg.readDateFormatted && (
                            <span className="text-emerald-700 font-medium">
                              • Lu le {msg.readDateFormatted}
                            </span>
                          )}
                          {!isRead && (
                            <span className="text-amber-700 font-medium">
                              • En attente de consultation dans son espace
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!isRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = markMessageAsRead(msg.id, msg.recipientName);
                                if (updated) {
                                  setMessagesList(getStoredMessages());
                                  showToast(`Statut du message mis à jour : Lu (${msg.recipientName})`);
                                }
                              }}
                              className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-medium transition-colors"
                              title="Marquer comme lu (test direct)"
                            >
                              Marquer comme lu
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMessageForDetail(msg);
                              setIsMessageDetailModalOpen(true);
                            }}
                            className="text-primary hover:underline font-medium text-[11px]"
                          >
                            Consulter le message →
                          </button>
                        </div>
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
                <h3 className="text-base font-semibold text-gray-900">Aucun message trouvé</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  {searchQuery 
                    ? "Aucun message ne correspond à votre recherche."
                    : "Envoyez des messages directs à vos locataires, gérants ou propriétaires en cliquant sur le bouton ci-dessus."}
                </p>
              </div>
              <button
                onClick={() => setIsSendMessageModalOpen(true)}
                className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-2 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Rédiger un premier message</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden">
          {filteredNotifications.length > 0 ? (
            <div className="divide-y divide-app-border">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNavigateToNotificationLink(notif)}
                  className={`p-5 flex items-start gap-4 transition-all cursor-pointer group ${
                    notif.read ? "bg-white hover:bg-gray-50/80" : "bg-blue-50/40 hover:bg-blue-50/70"
                  }`}
                >
                  {/* Icon */}
                  <div className="mt-0.5 p-2 rounded-xl bg-white shadow-xs border border-app-border">
                    {getNotificationIcon(notif.type, notif.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm ${notif.read ? "font-semibold text-gray-800" : "font-bold text-gray-900"}`}>
                          {notif.title}
                        </h3>
                        {!notif.read && (
                          <Badge variant="danger" dot className="py-0 px-2 text-[10px]">
                            Nouveau
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{notif.date}</span>
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed">{notif.message}</p>

                    {/* Actions bar inside item */}
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {(notif.category === "incident" || notif.id.startsWith("auto-inc-") || notif.title.toLowerCase().includes("incident")) && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenIncidentModalDirectly(notif, e)}
                            className="text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-600" />
                            <span>Voir les détails de l'incident</span>
                          </button>
                        )}

                        {notif.link ? (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToNotificationLink(notif);
                            }}
                            className="text-primary font-medium hover:underline flex items-center cursor-pointer"
                          >
                            Consulter le module <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                          </span>
                        ) : <span />}
                      </div>

                      <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleToggleRead(notif.id, e)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                          title={notif.read ? "Marquer comme non lu" : "Marquer comme lu"}
                        >
                          {notif.read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span className="text-[11px] font-medium hidden sm:inline">{notif.read ? "Non lu" : "Lu"}</span>
                        </button>

                        <button
                          onClick={(e) => handleDeleteNotification(notif.id, e)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer la notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Aucune notification à afficher</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery ? "Aucune alerte ne correspond à votre recherche." : "Vous êtes à jour ! Aucune alerte en attente dans cet onglet."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Custom Alert */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-app-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Nouvelle notification</h3>
                  <p className="text-xs text-gray-500">Ajouter une alerte manuelle</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomNotification} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Niveau de priorité / Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 bg-white"
                >
                  <option value="ALERT">Urgente (Rouge - Impayé / Contentieux)</option>
                  <option value="WARNING">Avertissement (Orange - Fin de bail)</option>
                  <option value="INFO">Information (Bleu - Document / Contrat)</option>
                  <option value="SUCCESS">Succès (Vert - Paiement encaissé)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Titre de l'alerte
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Échéance travaux appartement A-102"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Description détaillée
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Précisez le détail de l'alerte ou de la tâche à traiter..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Lien de redirection du module
                </label>
                <select
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 bg-white"
                >
                  <option value="/app/paiements">Paiements & Quittances (/app/paiements)</option>
                  <option value="/app/baux">Baux & Contrats (/app/baux)</option>
                  <option value="/app/locataires">Locataires (/app/locataires)</option>
                  <option value="/app/biens">Biens & Logements (/app/biens)</option>
                  <option value="/app/reversements">Reversements propriétaires (/app/reversements)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Créer l'alerte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Envoyer un message */}
      <SendMessageModal
        isOpen={isSendMessageModalOpen}
        onClose={() => setIsSendMessageModalOpen(false)}
        onMessageSent={(newMsg) => {
          showToast(`Message transmis avec succès à ${newMsg.recipientName} (Statut : Envoyé)`);
          setMessagesList(getStoredMessages());
          setActiveTab("messages");
        }}
      />

      {/* Modal Détails du message */}
      <MessageDetailModal
        message={selectedMessageForDetail}
        isOpen={isMessageDetailModalOpen}
        onClose={() => {
          setIsMessageDetailModalOpen(false);
          setSelectedMessageForDetail(null);
        }}
        onStatusChange={(updated) => {
          setMessagesList(getStoredMessages());
          setSelectedMessageForDetail(updated);
        }}
        onDelete={() => {
          setMessagesList(getStoredMessages());
          showToast("Message supprimé.");
        }}
      />

      {/* Modal Détails Incident Interactif */}
      <IncidentDetailModal
        incident={selectedIncidentForModal}
        isOpen={Boolean(selectedIncidentForModal)}
        onClose={() => setSelectedIncidentForModal(null)}
        onIncidentUpdated={(updated) => {
          setSelectedIncidentForModal(updated);
          // Sync with local incidents list if open
          try {
            const stored = JSON.parse(localStorage.getItem("gestimmo_incidents") || "[]");
            const updatedList = stored.map((i: any) => (i.id === updated.id ? updated : i));
            localStorage.setItem("gestimmo_incidents", JSON.stringify(updatedList));
            window.dispatchEvent(new Event("gestimmo_incidents_updated"));
          } catch (e) {}
        }}
      />
    </div>
  );
}
