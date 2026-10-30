"use client";

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { CreditCard, FileText, AlertTriangle, ArrowRight, Wallet, UserCheck, Clock, CheckCircle2, Plus, Image as ImageIcon, Eye, Bell, X, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { checkAndAutoRenewLeases } from "@/lib/leaseRenewal";
import { loadAllDataFromDatabase } from "@/lib/dataService";
import { formatUnitDisplay, getIncidentDisplayCode, calculateTenantDelay } from "@/lib/utils";
import { getPortalSession } from "@/lib/authSession";
import { TenantPaymentModal } from "@/components/ui/TenantPaymentModal";
import { IncidentDetailModal } from "@/components/ui/IncidentDetailModal";
import { getMessagesForUser, markMessageAsRead, UserMessage } from "@/lib/messagesService";
import { MessageDetailModal } from "@/components/ui/MessageDetailModal";


const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function parsePeriodToYearMonth(periodStr: string): { year: number; month: number } | null {
  if (!periodStr) return null;
  const s = periodStr.trim().toLowerCase();

  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split('-').map(Number);
    return { year: y, month: m };
  }

  const monthsMap: { [key: string]: number } = {
    janv: 1, 'janv.': 1, janvier: 1,
    févr: 2, 'févr.': 2, février: 2, fevrier: 2,
    mars: 3,
    avr: 4, 'avr.': 4, avril: 4,
    mai: 5,
    juin: 6,
    juil: 7, 'juil.': 7, juillet: 7,
    août: 8, aout: 8,
    sept: 9, 'sept.': 9, septembre: 9,
    oct: 10, 'oct.': 10, octobre: 10,
    nov: 11, 'nov.': 11, novembre: 11,
    déc: 12, 'déc.': 12, décembre: 12, decembre: 12
  };

  const parts = s.split(/[\s,]+/);
  let foundMonth: number | null = null;
  let foundYear: number | null = null;

  for (const p of parts) {
    if (monthsMap[p] !== undefined) {
      foundMonth = monthsMap[p];
    } else if (/^\d{4}$/.test(p)) {
      foundYear = parseInt(p, 10);
    }
  }

  if (foundMonth !== null && foundYear !== null) {
    return { year: foundYear, month: foundMonth };
  }

  return null;
}

export default function LocataireDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeLease, setActiveLease] = useState<any>(null);
  const [nextRentDate, setNextRentDate] = useState<string>("10 Novembre 2026");
  const [nextRentPeriod, setNextRentPeriod] = useState<string>("Novembre 2026");
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedIncidentForModal, setSelectedIncidentForModal] = useState<any | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Messages state
  const [messagesList, setMessagesList] = useState<UserMessage[]>([]);
  const [selectedMessageForModal, setSelectedMessageForModal] = useState<UserMessage | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [tenantDelay, setTenantDelay] = useState<any>(null);

  useEffect(() => {
    const initData = async () => {
      await loadAllDataFromDatabase();

      // Read logged-in locataire
      let user: any = getPortalSession("LOCATAIRE");
      if (user) {
        setCurrentUser(user);
      } else {
        const storedUser = localStorage.getItem("gestimmo_current_user");
        if (storedUser) {
          try {
            user = JSON.parse(storedUser);
            setCurrentUser(user);
          } catch (e) {
            console.error(e);
          }
        }
      }

      const nameToMatch = user?.name || "Cora Richards";
      const normName = nameToMatch.trim().toUpperCase();

      // Read active lease for tenant if available
      let lease: any = null;
      const storedBaux = localStorage.getItem("gestimmo_baux");
      if (storedBaux) {
        try {
          const rawBaux: any[] = JSON.parse(storedBaux);
          const baux = checkAndAutoRenewLeases(rawBaux);
          const found = baux.find(
            (b) => b.tenant && b.tenant.trim().toUpperCase() === normName && b.status === "ACTIF"
          );
          if (found) {
            lease = found;
            setActiveLease(found);
          }
        } catch (e) {
          console.error(e);
        }
      }


    // Read paid payments to determine next unpaid month
    const storedPaiements = localStorage.getItem("gestimmo_paiements");
    let payments: any[] = storedPaiements ? JSON.parse(storedPaiements) : [];

    const userUnit = (user?.unit || lease?.unit || "").trim().toUpperCase();

    const tenantPaidPayments = payments.filter((p: any) => {
      const pTenant = (p.tenant || "").trim().toUpperCase();
      const pUnit = (p.unit || "").trim().toUpperCase();
      const isPaid = p.status === "VALIDÉ" || p.status === "PAYÉ";

      return isPaid && (pTenant === normName || (userUnit && userUnit !== "-" && pUnit === userUnit));
    });

    let highestYear = 2026;
    let highestMonth = 10; // Octobre 2026 as highest paid month if paid

    if (tenantPaidPayments.length > 0) {
      let maxY = 0;
      let maxM = 0;
      tenantPaidPayments.forEach((p) => {
        const ym = parsePeriodToYearMonth(p.period);
        if (ym) {
          if (ym.year > maxY || (ym.year === maxY && ym.month > maxM)) {
            maxY = ym.year;
            maxM = ym.month;
          }
        }
      });
      if (maxY > 0 && maxM > 0) {
        highestYear = maxY;
        highestMonth = maxM;
      }
    } else {
      const parsedStart = lease?.start ? parsePeriodToYearMonth(lease.start) : null;
      if (parsedStart) {
        highestYear = parsedStart.year;
        highestMonth = parsedStart.month;
      }
    }

    // Next unpaid month is highest paid month + 1
    let nextM = highestMonth + 1;
    let nextY = highestYear;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }

    const nextMonthName = MONTH_NAMES_FR[nextM - 1];
    setNextRentDate(`10 ${nextMonthName} ${nextY}`);
    setNextRentPeriod(`${nextMonthName} ${nextY}`);

    // Calcul dynamique de l'état des arriérés / retards de loyer du locataire
    const delay = calculateTenantDelay(user || { name: nameToMatch }, lease, payments);
    setTenantDelay(delay);

    // Read reported incidents for this tenant
    const storedIncidents = localStorage.getItem("gestimmo_incidents");
    if (storedIncidents) {
      try {
        const parsed: any[] = JSON.parse(storedIncidents);
        const filtered = parsed.filter((inc) => {
          if (!inc) return false;
          const incTenant = (inc.tenant || "").trim().toLowerCase();
          const curName = (user?.name || "Cora Richards").trim().toLowerCase();
          const incTenantId = inc.tenantId || inc.tenant_id;
          const curId = user?.id;
          const incUnit = (inc.unit || "").trim().toLowerCase();
          const curUnit = (user?.unit || lease?.unit || "").trim().toLowerCase();

          return (
            (curId && incTenantId && curId === incTenantId) ||
            (incTenant && curName && (incTenant === curName || incTenant.includes(curName) || curName.includes(incTenant))) ||
            (curUnit && incUnit && curUnit !== "-" && (incUnit === curUnit || incUnit.includes(curUnit)))
          );
        });
        setRecentIncidents(filtered);

        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const incidentParam = urlParams.get("incident");
          if (incidentParam && filtered.length > 0) {
            const found = filtered.find(
              (i) => i.id === incidentParam || getIncidentDisplayCode(i.id).toLowerCase() === incidentParam.toLowerCase()
            );
            if (found) {
              setSelectedIncidentForModal(found);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setRecentIncidents([]);
    }

    // Load messages for tenant
    try {
      const msgs = getMessagesForUser("LOCATAIRE", user);
      setMessagesList(msgs);
    } catch (e) {}
  };

  initData();

  const handleUpdate = () => {
    initData();
  };

  window.addEventListener("storage", handleUpdate);
  window.addEventListener("gestimmo_incidents_updated", handleUpdate);
  window.addEventListener("gestimmo_paiements_updated", handleUpdate);
  window.addEventListener("gestimmo_messages_updated", handleUpdate);

  return () => {
    window.removeEventListener("storage", handleUpdate);
    window.removeEventListener("gestimmo_incidents_updated", handleUpdate);
    window.removeEventListener("gestimmo_paiements_updated", handleUpdate);
    window.removeEventListener("gestimmo_messages_updated", handleUpdate);
  };
  }, []);

  const tenantName = currentUser?.name || "Cora Richards";
  const propertyName = activeLease?.property || currentUser?.property || "Résidence Les Flamboyants";
  const unitId = formatUnitDisplay(activeLease?.unit || currentUser?.unit || "A-101");
  const rentAmount = activeLease?.rent || currentUser?.rent || 165000;

  // Calcul des notifications locataire (mises à jour d'incidents, photos ajoutées, messages agence)
  const tenantNotifications = useMemo(() => {
    const notifs: any[] = [];

    // Messages envoyés par l'agence
    messagesList.forEach((msg) => {
      notifs.unshift({
        id: `msg-${msg.id}`,
        title: `Message : ${msg.subject}`,
        message: `${msg.content.slice(0, 110)}${msg.content.length > 110 ? "..." : ""}`,
        date: msg.sentDateFormatted,
        status: msg.status,
        isMessage: true,
        messageObj: msg,
      });
    });

    recentIncidents.forEach((inc) => {
      const fileCount = inc.files?.length || 0;
      if (inc.status === "RÉSOLU") {
        notifs.push({
          id: `res-${inc.id}`,
          title: `Signalement résolu (${getIncidentDisplayCode(inc.id)})`,
          message: `Votre incident "${inc.title || inc.type}" a été résolu par l'agence.${fileCount > 0 ? ` ${fileCount} photo(s) consultable(s).` : ""}`,
          date: inc.dateStr || "Récemment",
          status: inc.status,
          incident: inc,
        });
      } else if (inc.status === "EN COURS") {
        notifs.push({
          id: `prog-${inc.id}`,
          title: `Intervention en cours (${getIncidentDisplayCode(inc.id)})`,
          message: `L'équipe technique est mobilisée sur "${inc.title || inc.type}".${fileCount > 0 ? ` ${fileCount} photo(s) au dossier.` : ""}`,
          date: inc.dateStr || "Récemment",
          status: inc.status,
          incident: inc,
        });
      } else if (fileCount > 0) {
        notifs.push({
          id: `files-${inc.id}`,
          title: `Dossier photo disponible (${getIncidentDisplayCode(inc.id)})`,
          message: `${fileCount} pièce(s) jointe(s) et photo(s) associées à votre réclamation "${inc.title || inc.type}".`,
          date: inc.dateStr || "Récemment",
          status: inc.status,
          incident: inc,
        });
      }
    });

    return notifs;
  }, [recentIncidents]);

  const latestUpdatedIncident = recentIncidents.length > 0 ? recentIncidents[0] : null;

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 font-sans">
      {/* Header avec Centre de Notification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {tenantName}</h1>
          <p className="text-sm text-gray-500 mt-1">Bienvenue dans votre espace locataire personnel.</p>
        </div>
        
        <div className="flex items-center gap-2.5">
          {/* Bouton de consultation des notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2.5 rounded-xl border border-app-border bg-white text-gray-700 hover:text-primary hover:border-primary/40 transition-all shadow-xs cursor-pointer flex items-center gap-2"
              title="Consulter les notifications et alertes"
            >
              <div className="relative">
                <Bell className="w-4 h-4 text-primary" />
                {tenantNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
              <span className="text-xs font-semibold hidden md:inline">Notifications</span>
              {tenantNotifications.length > 0 && (
                <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs">
                  {tenantNotifications.length}
                </span>
              )}
            </button>

            {/* Menu Déroulant Notifications */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-app-border shadow-xl z-50 p-4 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-app-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-gray-900">Notifications & Suivis</h3>
                  </div>
                  <button 
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {tenantNotifications.length > 0 ? (
                    tenantNotifications.map((notif, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-app-border/80 space-y-2 hover:bg-gray-100/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-gray-900">{notif.title}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{notif.date}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                        {notif.isMessage && (
                          <div className="pt-1 flex items-center justify-between gap-2">
                            <Badge variant={notif.status === "envoyé" ? "warning" : "success"} dot className="text-[10px]">
                              {notif.status === "envoyé" ? "Nouveau" : "Lu"}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMessageForModal(notif.messageObj);
                                setIsMessageModalOpen(true);
                                setIsNotificationsOpen(false);
                                if (notif.messageObj.status === "envoyé") {
                                  markMessageAsRead(notif.messageObj.id, tenantName);
                                }
                              }}
                              className="flex items-center gap-1.5 py-1 px-2.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lire le message</span>
                            </button>
                          </div>
                        )}
                        {notif.incident && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIncidentForModal(notif.incident);
                              setIsNotificationsOpen(false);
                            }}
                            className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Consulter l'incident & voir les photos</span>
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      Aucune notification en attente.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {currentUser?.login && (
            <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-xl border border-gray-200">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
              <span className="truncate max-w-[130px] font-medium text-gray-800">{currentUser.login}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bannière de notification proactive si un incident a été mis à jour avec photos */}
      {latestUpdatedIncident && (
        <div className="bg-gradient-to-r from-primary-50/80 via-blue-50/50 to-emerald-50/50 border border-primary-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wide">
                  Suivi de signalement : {getIncidentDisplayCode(latestUpdatedIncident.id)}
                </span>
                <Badge
                  dot
                  variant={
                    latestUpdatedIncident.status === "RÉSOLU"
                      ? "success"
                      : latestUpdatedIncident.status === "EN COURS"
                      ? "warning"
                      : "info"
                  }
                >
                  {latestUpdatedIncident.status}
                </Badge>
              </div>
              <p className="text-xs font-medium text-gray-700 mt-0.5">
                {latestUpdatedIncident.title || latestUpdatedIncident.type}
                {latestUpdatedIncident.files && latestUpdatedIncident.files.length > 0 && (
                  <span className="text-primary font-bold ml-1">
                    • {latestUpdatedIncident.files.length} pièce(s) jointe(s) / photo(s) disponibles
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIncidentForModal(latestUpdatedIncident)}
            className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Consulter les photos & détails</span>
          </button>
        </div>
      )}

      {/* Bannière d'alerte en cas de retard de loyer */}
      {tenantDelay?.isOverdue && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-red-950 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 bg-red-100 rounded-2xl text-red-600 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wider text-red-700">Alerte Impayé de Loyer</span>
                <Badge variant="alert" dot className="bg-red-600 text-white font-bold">
                  {tenantDelay.unpaidMonths} mois de retard ({tenantDelay.delayDays} jours)
                </Badge>
              </div>
              <p className="text-base font-bold text-red-900">
                Montant total exigible : <span className="underline decoration-red-400">{formatFCFA(tenantDelay.unpaidAmount)}</span>
              </p>
              <p className="text-xs text-red-700">
                Dernier loyer acquitté : <strong className="font-semibold">{tenantDelay.lastPaidPeriod || "Avril 2026"}</strong> • Périodes impayées : <strong className="font-semibold">{tenantDelay.unpaidPeriods.join(", ")}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="bg-red-600 text-white text-xs font-bold px-5 py-3 rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <CreditCard className="w-4 h-4" /> Régulariser l'impayé
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Payment Card */}
        <div className={`lg:col-span-2 rounded-2xl p-8 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[240px] ${
          tenantDelay?.isOverdue
            ? "bg-gradient-to-br from-red-600 via-rose-700 to-red-900"
            : "bg-gradient-to-br from-primary to-blue-800"
        }`}>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wallet className="w-48 h-48 -mr-10 -mt-10" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              {tenantDelay?.isOverdue ? (
                <Badge variant="alert" dot className="bg-white/20 text-white border-none backdrop-blur-sm font-bold">
                  EN RETARD ({tenantDelay.unpaidMonths} MOIS)
                </Badge>
              ) : (
                <Badge variant="success" className="bg-white/20 text-white border-none backdrop-blur-sm">À JOUR</Badge>
              )}
            </div>
            <h2 className="text-sm font-medium text-white/90 uppercase tracking-wider mt-4">
              {tenantDelay?.isOverdue ? "Loyer impayé à régulariser" : "Prochain loyer à régler"}
            </h2>
            <div className="flex items-end gap-3 mt-1">
              <span className="text-4xl sm:text-5xl font-bold">
                {formatFCFA(tenantDelay?.isOverdue ? tenantDelay.unpaidAmount : rentAmount)}
              </span>
            </div>
            <p className="text-sm text-white/90 mt-2">
              {tenantDelay?.isOverdue
                ? `Retard de ${tenantDelay.delayDays} jours • Périodes : ${tenantDelay.unpaidPeriods[0]} à ${tenantDelay.unpaidPeriods[tenantDelay.unpaidPeriods.length - 1]}`
                : `Avant le ${nextRentDate}`}
            </p>
          </div>

          <div className="relative z-10 mt-8 flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="bg-white text-gray-900 px-6 py-3 rounded-xl font-bold shadow-md hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
            >
              <CreditCard className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform text-primary" />
              {tenantDelay?.isOverdue ? "Régulariser mon impayé en ligne (Wave / Orange / MTN / Moov)" : "Payer en ligne (Wave / Orange / MTN / Moov)"}
            </button>
          </div>
        </div>

        {/* Info Logement */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mon Logement</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Résidence</p>
                <p className="text-sm font-medium text-gray-900">{propertyName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Appartement</p>
                <p className="text-sm font-medium text-gray-900">{unitId.toLowerCase().startsWith("studio") || unitId.toLowerCase().startsWith("appartement") || unitId.toLowerCase().startsWith("villa") || unitId.toLowerCase().startsWith("magasin") ? unitId : `Appartement ${unitId}`}</p>
              </div>
              <div className="pt-4 border-t border-app-border">
                <p className="text-xs text-gray-500 mb-1">Agence Gestionnaire</p>
                <p className="text-sm font-bold text-gray-900">GESTIMMO</p>
                <p className="text-xs text-gray-500 mt-1">+225 01 02 03 04 05</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/locataire/baux" className="bg-white p-6 rounded-2xl border border-app-border shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between h-40 cursor-pointer">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Mon contrat de bail</h3>
            <p className="text-xs text-gray-500 mt-1">Consulter et télécharger le PDF</p>
          </div>
        </Link>
        
        <Link href="/locataire/quittances" className="bg-white p-6 rounded-2xl border border-app-border shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between h-40 cursor-pointer">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Mes quittances</h3>
            <p className="text-xs text-gray-500 mt-1">Historique de mes paiements</p>
          </div>
        </Link>

        <Link href="/locataire/incidents" className="bg-white p-6 rounded-2xl border border-app-border shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between h-40 cursor-pointer">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Signaler un incident</h3>
            <p className="text-xs text-gray-500 mt-1">Fuite d'eau, problème électrique...</p>
          </div>
        </Link>
      </div>

      {/* Suivi des incidents signalés */}
      <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-border pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Mes signalements d'incidents récents</h2>
              <p className="text-xs text-gray-500">Suivi des réclamations techniques et interventions dans votre logement</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
              {recentIncidents.length} signalement(s)
            </span>
            <Link
              href="/locataire/incidents"
              className="bg-primary text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Signaler un incident
            </Link>
          </div>
        </div>

        {recentIncidents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {recentIncidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 border border-app-border rounded-xl bg-gray-50/40 hover:bg-white hover:border-gray-300 transition-all space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        {getIncidentDisplayCode(inc.id)}
                      </span>
                      {inc.isUrgent && (
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Urgence
                        </span>
                      )}
                    </div>
                    <Badge
                      dot
                      variant={
                        inc.status === "RÉSOLU"
                          ? "success"
                          : inc.status === "EN COURS"
                          ? "warning"
                          : "info"
                      }
                    >
                      {inc.status}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{inc.title || inc.type}</h4>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1 leading-relaxed bg-white p-2.5 rounded-lg border border-app-border/60">
                      {inc.description}
                    </p>
                    {inc.files && inc.files.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedIncidentForModal(inc)}
                        className="flex items-center gap-1.5 pt-2 text-[11px] text-primary font-semibold hover:underline cursor-pointer group/pill text-left"
                      >
                        <ImageIcon className="w-3.5 h-3.5 group-hover/pill:scale-110 transition-transform" />
                        <span>{inc.files.length} pièce(s) jointe(s) / photo(s)</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold ml-1">
                          Voir
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-gray-100 space-y-2.5 mt-1">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {inc.dateStr || "Récemment"}
                    </span>
                    <span className="font-medium text-gray-600">
                      {formatUnitDisplay(inc.unit).toLowerCase().startsWith("studio") ||
                      formatUnitDisplay(inc.unit).toLowerCase().startsWith("appartement") ||
                      formatUnitDisplay(inc.unit).toLowerCase().startsWith("villa") ||
                      formatUnitDisplay(inc.unit).toLowerCase().startsWith("magasin")
                        ? formatUnitDisplay(inc.unit)
                        : `Appartement ${formatUnitDisplay(inc.unit)}`}
                    </span>
                  </div>

                  {/* Bouton Consulter le signalement & Visualiser les photos */}
                  <button
                    type="button"
                    onClick={() => setSelectedIncidentForModal(inc)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer shadow-xs group/btn"
                  >
                    <Eye className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                    <span>Consulter le signalement & photos</span>
                    {inc.files && inc.files.length > 0 && (
                      <span className="ml-1 text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-bold">
                        {inc.files.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Aucun problème technique en cours</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Vos équipements et installations fonctionnent normalement. En cas de besoin, vous pouvez transmettre un signalement en quelques secondes.
            </p>
          </div>
        )}
      </div>

      {/* Section Messages & Communications reçus de l'agence */}
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
              <p className="text-xs text-gray-500">Consultez les messages officiels transmis par votre gestionnaire</p>
            </div>
          </div>
          <Link
            href="/locataire/messages"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Toute la boîte de réception</span>
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
                    setSelectedMessageForModal(msg);
                    setIsMessageModalOpen(true);
                    if (isUnread) {
                      markMessageAsRead(msg.id, tenantName);
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

      {/* Modal interactif de consultation et visualisation des incidents & photos */}
      <IncidentDetailModal
        incident={selectedIncidentForModal}
        isOpen={Boolean(selectedIncidentForModal)}
        onClose={() => setSelectedIncidentForModal(null)}
        isTenantView={true}
        onIncidentUpdated={(updated) => {
          setSelectedIncidentForModal(updated);
          setRecentIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        }}
      />

      {/* Modal de lecture de message avec accusé de lecture */}
      <MessageDetailModal
        message={selectedMessageForModal}
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false);
          setSelectedMessageForModal(null);
        }}
        isRecipientView={true}
        currentViewerName={tenantName}
        onStatusChange={(updated) => {
          setMessagesList((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }}
      />

      {/* Modal interactif de paiement en ligne Wave / Orange Money */}
      <TenantPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        tenantName={tenantName}
        propertyName={propertyName}
        unitId={unitId}
        rentAmount={rentAmount}
        period={nextRentPeriod}
        dueDate={nextRentDate}
        activeLease={activeLease}
        currentUser={currentUser}
        onPaymentSuccess={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("gestimmo_paiements_updated"));
          }
        }}
      />

    </div>
  );
}
