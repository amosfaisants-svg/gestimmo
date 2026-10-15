"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { ArrowRight, Building2, TrendingUp, Wallet, PieChart, FileText, MessageSquare, Clock, Shield } from "lucide-react";
import Link from "next/link";
import { loadAllDataFromDatabase } from "@/lib/dataService";
import { getPortalSession } from "@/lib/authSession";
import { getMessagesForUser, markMessageAsRead, UserMessage } from "@/lib/messagesService";
import { MessageDetailModal } from "@/components/ui/MessageDetailModal";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

export default function ProprietaireDashboard() {
  const [currentOwner, setCurrentOwner] = useState<any>(null);
  const [stats, setStats] = useState({
    pendingPayout: 0,
    grossRevenue: 0,
    occupancyRate: 0,
    occupiedUnits: 0,
    totalUnits: 0,
    propertiesCount: 0,
    status: "EN ATTENTE",
  });
  const [messagesList, setMessagesList] = useState<UserMessage[]>([]);
  const [selectedMsgForModal, setSelectedMsgForModal] = useState<UserMessage | null>(null);
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);

  useEffect(() => {
    const initData = async () => {
      await loadAllDataFromDatabase();

      // 1. Get logged in owner from session
      let ownerObj: any = getPortalSession("PROPRIETAIRE");
      if (!ownerObj) {
        const storedUser = localStorage.getItem("gestimmo_current_user");
        if (storedUser) {
          try {
            ownerObj = JSON.parse(storedUser);
          } catch (e) {
            console.error(e);
          }
        }
      }

      // 2. Fetch or update owner from stored owners list
      const storedOwners = localStorage.getItem("gestimmo_proprietaires");
      if (storedOwners) {
        const owners = JSON.parse(storedOwners);
        if (ownerObj?.id || ownerObj?.name) {
          const found = owners.find(
            (o: any) =>
              (ownerObj.id && o.id === ownerObj.id) ||
              (ownerObj.name && o.name && o.name.trim().toUpperCase() === ownerObj.name.trim().toUpperCase())
          );
          if (found) ownerObj = found;
        }
        if (!ownerObj && owners.length > 0) {
          ownerObj = owners[0];
        }
      }

      setCurrentOwner(ownerObj);

      if (ownerObj) {
        const ownerName = ownerObj.name || "";


      // Load biens
      const storedBiens = localStorage.getItem("gestimmo_biens");
      const biens: any[] = storedBiens ? JSON.parse(storedBiens) : [];
      const myBiens = biens.filter(
        (b: any) => b.owner && ownerName && b.owner.trim().toUpperCase() === ownerName.trim().toUpperCase()
      );
      const myBiensNames = myBiens.map((b: any) => b.name.trim().toUpperCase());

      // Load logements
      const storedLogements = localStorage.getItem("gestimmo_logements");
      const logements: any[] = storedLogements ? JSON.parse(storedLogements) : [];
      const myLogements = logements.filter(
        (l: any) =>
          (l.property && myBiensNames.includes(l.property.trim().toUpperCase())) ||
          (l.owner && ownerName && l.owner.trim().toUpperCase() === ownerName.trim().toUpperCase())
      );
      const myLogementsIds = myLogements.map((l: any) => l.id);

      const totalUnits = myLogements.length > 0 ? myLogements.length : myBiens.reduce((sum, b) => sum + (b.units || 1), 0);
      const occupiedUnits = myLogements.filter((l) => l.status === "OCCUPÉ" || (l.tenant && l.tenant !== "-")).length;
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

      // Load paiements
      const storedPaiements = localStorage.getItem("gestimmo_paiements");
      const paiements: any[] = storedPaiements ? JSON.parse(storedPaiements) : [];
      const myPaiements = paiements.filter(
        (p: any) =>
          (myLogementsIds.includes(p.unit) ||
            (p.property && myBiensNames.includes(p.property.trim().toUpperCase())) ||
            (p.owner && ownerName && p.owner.trim().toUpperCase() === ownerName.trim().toUpperCase())) &&
          (p.status === "VALIDÉ" || p.status === "PAYÉ")
      );
      const grossRevenue = myPaiements.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Calculate commission rate
      const rawRate =
        ownerObj.commissionRate !== undefined && ownerObj.commissionRate !== null && ownerObj.commissionRate !== ""
          ? Number(ownerObj.commissionRate)
          : (ownerObj.commission_rate !== undefined && ownerObj.commission_rate !== null && ownerObj.commission_rate !== ""
            ? Number(ownerObj.commission_rate)
            : 10);
      const validRate = isNaN(rawRate) ? 10 : rawRate;

      const netRevenue = Math.round(grossRevenue * ((100 - validRate) / 100));

      // Load reversements
      const storedReversements = localStorage.getItem("gestimmo_reversements");
      const reversements: any[] = storedReversements ? JSON.parse(storedReversements) : [];
      const myEffectues = reversements.filter(
        (r: any) =>
          ((r.ownerId && ownerObj.id && r.ownerId === ownerObj.id) ||
            (r.owner && ownerName && r.owner.trim().toUpperCase() === ownerName.trim().toUpperCase())) &&
          (r.status === "EFFECTUÉ" || r.status === "EFFECTUE")
      );
      const totalPaid = myEffectues.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

      const pendingPayout = Math.max(0, netRevenue - totalPaid);
      const hasActivity = grossRevenue > 0 || totalPaid > 0;
      const status = !hasActivity ? "AUCUN LOYER" : pendingPayout < 1 ? "EFFECTUÉ" : "EN ATTENTE";

      setStats({
        pendingPayout,
        grossRevenue,
        occupancyRate,
        occupiedUnits,
        totalUnits,
        propertiesCount: myBiens.length,
        status,
      });

      // Load messages
      try {
        const msgs = getMessagesForUser("PROPRIETAIRE", ownerObj);
        setMessagesList(msgs);
      } catch (e) {}
    }
  };

  initData();

  const handleUpdate = () => {
    initData();
  };

  window.addEventListener("gestimmo_messages_updated", handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener("gestimmo_messages_updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
  }, []);


  const ownerName = currentOwner?.name || "Propriétaire";

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenue, {ownerName}</h1>
        <p className="text-sm text-gray-500 mt-1">Voici le résumé de vos investissements immobiliers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Payout Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[200px]">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wallet className="w-48 h-48 -mr-10 -mt-10" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-2">Prochain Reversement (Net)</h2>
            <div className="flex items-end gap-3 mt-1">
              <span className="text-4xl sm:text-5xl font-bold">{formatFCFA(stats.pendingPayout)}</span>
            </div>
            <p className="text-sm text-gray-400 mt-3 flex items-center">
              <Badge 
                variant={stats.status === "EFFECTUÉ" ? "success" : stats.status === "AUCUN LOYER" ? "default" : "warning"} 
                className="mr-2 border-none"
              >
                {stats.status === "EFFECTUÉ" ? "Reversé" : stats.status === "AUCUN LOYER" ? "Aucun loyer" : "En attente"}
              </Badge>
              {stats.status === "EFFECTUÉ" ? "Tous vos reversements sont à jour" : "Prévu pour le 10 Octobre 2026"}
            </p>
          </div>
        </div>

        {/* Occupation */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col justify-center items-center text-center">
          <PieChart className="w-8 h-8 text-primary mb-3" />
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Taux d'occupation global</h3>
          <p className="text-4xl font-bold text-gray-900 mb-2">{stats.occupancyRate}%</p>
          <p className="text-xs text-gray-500">
            {stats.totalUnits > 0 
              ? `${stats.occupiedUnits} logement${stats.occupiedUnits > 1 ? "s" : ""} loué${stats.occupiedUnits > 1 ? "s" : ""} sur ${stats.totalUnits}`
              : "Aucun logement renseigné"}
          </p>
          <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: `${stats.occupancyRate}%` }}></div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/proprietaire/biens" className="bg-white p-6 rounded-2xl border border-app-border shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between h-40 cursor-pointer">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Mes Biens ({stats.propertiesCount})</h3>
            <p className="text-xs text-gray-500 mt-1">Rentabilité et détails par immeuble</p>
          </div>
        </Link>
        
        <Link href="/proprietaire/releves" className="bg-white p-6 rounded-2xl border border-app-border shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between h-40 cursor-pointer">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Relevés de gérance</h3>
            <p className="text-xs text-gray-500 mt-1">Historique des reversements et PDFs</p>
          </div>
        </Link>

        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-xs text-gray-500 uppercase font-semibold">Loyers bruts du mois</h3>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatFCFA(stats.grossRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Messages de la gérance */}
      <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Messages & Communications de l&apos;agence</h3>
                {messagesList.filter((m) => m.status === "envoyé").length > 0 && (
                  <Badge variant="warning" dot>
                    {messagesList.filter((m) => m.status === "envoyé").length} non lu
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">Communications officielles relatives à la gérance de votre patrimoine</p>
            </div>
          </div>
          <Link
            href="/proprietaire/messages"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Voir tous les messages</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {messagesList.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {messagesList.slice(0, 3).map((msg) => {
              const isUnread = msg.status === "envoyé";
              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMsgForModal(msg);
                    setIsMsgModalOpen(true);
                    if (isUnread) {
                      markMessageAsRead(msg.id, ownerName);
                    }
                  }}
                  className={`py-3.5 px-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                    isUnread ? "bg-amber-50/40" : ""
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{msg.subject}</span>
                      <Badge variant={isUnread ? "warning" : "success"} dot className="text-[10px] py-0 px-2 font-bold">
                        {isUnread ? "Nouveau (envoyé)" : "Lu"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1">{msg.content}</p>
                    <span className="text-[11px] text-gray-400 block">
                      Par {msg.senderName} ({msg.senderRole || "Agence"}) • {msg.sentDateFormatted}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="text-xs text-primary font-bold hover:underline shrink-0 flex items-center gap-1"
                  >
                    <span>Consulter</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-xs">
            Aucun message reçu de l&apos;agence pour le moment.
          </div>
        )}
      </div>

      {/* Modal de lecture */}
      <MessageDetailModal
        message={selectedMsgForModal}
        isOpen={isMsgModalOpen}
        onClose={() => {
          setIsMsgModalOpen(false);
          setSelectedMsgForModal(null);
        }}
        isRecipientView={true}
        currentViewerName={ownerName}
        onStatusChange={(updated) => {
          setMessagesList((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }}
      />
    </div>
  );
}
