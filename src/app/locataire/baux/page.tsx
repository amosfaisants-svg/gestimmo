"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Download, FileText, Calendar, ShieldCheck, Loader2, Clock, UserMinus, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { checkAndAutoRenewLeases } from "@/lib/leaseRenewal";
import { loadAllDataFromDatabase } from "@/lib/dataService";
import { formatUnitDisplay, getLeaseDisplayCode } from "@/lib/utils";
import { getPortalSession } from "@/lib/authSession";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

export default function LocataireBauxPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeLease, setActiveLease] = useState<any>(null);
  const [attachedDocuments, setAttachedDocuments] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Tenant Notice Modal state
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().slice(0, 10));
  const [noticeDuration, setNoticeDuration] = useState(3);
  const [noticeReason, setNoticeReason] = useState("Déménagement personnel");
  const [currentPreavis, setCurrentPreavis] = useState<any>(null);

  useEffect(() => {
    const initData = async () => {
      await loadAllDataFromDatabase();

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


    const tenantName = user?.name || "Cora Richards";
    const normTenantName = tenantName.trim().toUpperCase();

    // Check if there is an existing preavis in gestimmo_preavis
    const storedPreavis = localStorage.getItem("gestimmo_preavis");
    if (storedPreavis) {
      try {
        const prvArr: any[] = JSON.parse(storedPreavis);
        const foundPrv = prvArr.find(
          (p) =>
            p.status === "EN PRÉAVIS" &&
            ((user?.id && p.leaseId === user.id) ||
              (p.tenant && p.tenant.trim().toUpperCase() === normTenantName))
        );
        if (foundPrv) setCurrentPreavis(foundPrv);
      } catch (e) {}
    }

    let lease: any = null;
    let tenantLeaseIds: string[] = [];
    const storedBaux = localStorage.getItem("gestimmo_baux");
    if (storedBaux) {
      try {
        const rawBaux: any[] = JSON.parse(storedBaux);
        const baux = checkAndAutoRenewLeases(rawBaux);
        const matchingBaux = baux.filter(
          (b) =>
            (user?.id && b.tenantId === user.id) ||
            (b.tenant && b.tenant.trim().toUpperCase() === normTenantName)
        );
        tenantLeaseIds = matchingBaux.map((b) => b.id);
        const found = matchingBaux.find((b) => b.status === "ACTIF" || b.status === "EN PRÉAVIS") || matchingBaux[0];
        if (found) {
          lease = found;
          setActiveLease(found);
        }
      } catch (e) {
        console.error(e);
      }
    }

    const currentLeaseId = lease?.id || "B-2026-084";
    if (currentLeaseId && !tenantLeaseIds.includes(currentLeaseId)) {
      tenantLeaseIds.push(currentLeaseId);
    }

    // 1. Fetch "Documents des baux" for all leases of this tenant
    const leaseDocs: any[] = [];
    tenantLeaseIds.forEach((lId) => {
      const storedLeaseDocs = localStorage.getItem(`gestimmo_docs_${lId}`);
      if (storedLeaseDocs) {
        try {
          const docs = JSON.parse(storedLeaseDocs);
          docs.forEach((d: any) => {
            leaseDocs.push({ ...d, leaseId: lId, fromLease: true });
          });
        } catch (e) {
          console.error(e);
        }
      }
    });

    // 2. Fetch "Documents du locataire"
    const locataireDocs: any[] = [];
    const storedLocataires = localStorage.getItem("gestimmo_locataires");
    if (storedLocataires) {
      try {
        const locs = JSON.parse(storedLocataires);
        const matchLoc = locs.find(
          (t: any) =>
            (user?.id && t.id === user.id) ||
            (t.name && t.name.trim().toUpperCase() === normTenantName)
        );
        if (matchLoc?.documents && Array.isArray(matchLoc.documents)) {
          matchLoc.documents.forEach((d: any) => locataireDocs.push(d));
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (user?.id) {
      const storedTenantDocs = localStorage.getItem(`gestimmo_tenant_docs_${user.id}`);
      if (storedTenantDocs) {
        try {
          const parsed = JSON.parse(storedTenantDocs);
          parsed.forEach((d: any) => {
            if (!locataireDocs.some((existing) => existing.id === d.id || existing.name === d.name)) {
              locataireDocs.push(d);
            }
          });
        } catch (e) {
          console.error(e);
        }
      }
    }

    // 3. Combine into final list strictly containing documents from "Documents du locataire" and "Documents des baux"
    const finalDocsList: any[] = [];

    locataireDocs.forEach((d: any) => {
      if (!finalDocsList.some((existing) => existing.name?.toLowerCase() === d.name?.toLowerCase())) {
        finalDocsList.push({ ...d, source: "Document du locataire" });
      }
    });

    leaseDocs.forEach((d: any) => {
      if (!finalDocsList.some((existing) => existing.name?.toLowerCase() === d.name?.toLowerCase())) {
        finalDocsList.push({ ...d, source: `Bail ${d.leaseId ? getLeaseDisplayCode(d.leaseId) : ""}` });
      }
    });

    setAttachedDocuments(finalDocsList);
  };

  initData();
  }, []);


  const calculateExitDate = (notifDateStr: string, months: number) => {
    if (!notifDateStr) return "";
    const dt = new Date(notifDateStr);
    dt.setMonth(dt.getMonth() + months);
    return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const handleTenantSubmitNotice = (e: React.FormEvent) => {
    e.preventDefault();

    const tName = currentUser?.name || activeLease?.tenant || "Locataire";
    const uId = activeLease?.unit || currentUser?.unit || "A-101";
    const pName = activeLease?.property || currentUser?.property || "Bien Immobilier";
    const lId = activeLease?.id || "B-2026-084";
    const rentVal = activeLease?.rent || currentUser?.rent || 200000;

    const exitFormatted = calculateExitDate(noticeDate, noticeDuration);
    const notifFormatted = new Date(noticeDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

    const newPrvObj = {
      id: `PRV-${Math.floor(1000 + Math.random() * 9000)}`,
      leaseId: lId,
      tenant: tName,
      unit: uId,
      property: pName,
      requestDate: notifFormatted,
      exitDate: exitFormatted,
      durationMonths: noticeDuration,
      initiatedBy: "LOCATAIRE",
      reason: noticeReason,
      deposit: rentVal * 2,
      deductions: 0,
      status: "EN PRÉAVIS",
      notes: "Préavis déclaré par le locataire depuis le portail self-service"
    };

    // Save to gestimmo_preavis
    const storedPreavis = localStorage.getItem("gestimmo_preavis");
    let prvArr: any[] = storedPreavis ? JSON.parse(storedPreavis) : [];
    prvArr = [newPrvObj, ...prvArr];
    localStorage.setItem("gestimmo_preavis", JSON.stringify(prvArr));
    setCurrentPreavis(newPrvObj);

    // Push notification to gestimmo_notifications for Agence Admin
    const storedNotifs = localStorage.getItem("gestimmo_notifications");
    let notifsArr: any[] = storedNotifs ? JSON.parse(storedNotifs) : [];
    const preavisNotif = {
      id: `auto-prv-${newPrvObj.id}`,
      type: "WARNING",
      title: `Préavis émis par locataire : ${tName}`,
      message: `Préavis de départ de ${noticeDuration} mois émis depuis l'espace locataire par ${tName} (${uId || pName}). Libération des lieux prévue : ${exitFormatted}. Motif : ${noticeReason}.`,
      date: notifFormatted,
      read: false,
      link: "/app/resiliations",
      category: "preavis",
    };
    notifsArr = [preavisNotif, ...notifsArr.filter((n: any) => n.id !== preavisNotif.id)];
    localStorage.setItem("gestimmo_notifications", JSON.stringify(notifsArr));
    window.dispatchEvent(new Event("storage"));

    // Update gestimmo_baux
    const storedBaux = localStorage.getItem("gestimmo_baux");
    if (storedBaux) {
      try {
        let bauxArr: any[] = JSON.parse(storedBaux);
        bauxArr = bauxArr.map((b: any) => {
          if (b.id === lId || b.unit === uId) {
            return { ...b, status: "EN PRÉAVIS", preavisExitDate: exitFormatted };
          }
          return b;
        });
        localStorage.setItem("gestimmo_baux", JSON.stringify(bauxArr));
        if (activeLease) setActiveLease({ ...activeLease, status: "EN PRÉAVIS" });
      } catch (err) {}
    }

    // Update gestimmo_logements
    const storedLogements = localStorage.getItem("gestimmo_logements");
    if (storedLogements) {
      try {
        let logArr: any[] = JSON.parse(storedLogements);
        logArr = logArr.map((l: any) => {
          if (l.id === uId) {
            return { ...l, status: "EN PRÉAVIS", preavisExitDate: exitFormatted };
          }
          return l;
        });
        localStorage.setItem("gestimmo_logements", JSON.stringify(logArr));
      } catch (err) {}
    }

    setIsNoticeModalOpen(false);
    alert(`Votre préavis de départ a bien été transmis à l'agence. Date d'effet / libération des lieux prévue : ${exitFormatted}.`);
  };

  const leaseId = getLeaseDisplayCode(activeLease?.id || activeLease || "B-2026-084");
  const tenantName = currentUser?.name || activeLease?.tenant || "Cora Richards";
  const propertyName = activeLease?.property || currentUser?.property || "Résidence Les Flamboyants";
  const unitId = formatUnitDisplay(activeLease?.unit || currentUser?.unit || "A-101");
  const startDate = activeLease?.start || "12 Août 2026";
  const endDate = activeLease?.end || "11 Août 2027";
  const rentAmount = activeLease?.rent !== undefined && activeLease?.rent !== null ? Number(activeLease.rent) : (currentUser?.rent || 250000);
  const chargesAmount = activeLease?.charges !== undefined && activeLease?.charges !== null ? Number(activeLease.charges) : 0;
  const totalAmount = rentAmount + chargesAmount;

  const isPreavisActive = activeLease?.status === "EN PRÉAVIS" || currentPreavis?.status === "EN PRÉAVIS";

  const handleDownloadContract = async () => {
    setIsDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const element = document.createElement("div");
      element.innerHTML = `
        <div style="padding: 40px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; max-width: 750px; margin: 0 auto; background: #ffffff;">
          <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 25px;">
            <h1 style="color: #2563eb; font-size: 20px; font-weight: 800; margin: 0; line-height: 1.35; text-transform: uppercase;">CONTRAT DE BAIL À USAGE D'HABITATION : ENGAGEMENT DE RÈGLEMENT DU LOYER AVANT LE 10 DE CHAQUE MOIS EN COURS</h1>
            <p style="font-size: 13px; color: #64748b; margin: 6px 0 0 0;">Contrat d'Engagement N° ${leaseId} - GESTIMMO</p>
          </div>

          <div style="margin-bottom: 25px; line-height: 1.6; font-size: 13px; color: #334155;">
            <p><strong>ENTRE LES SOUSSIGNÉS :</strong></p>
            <p>L'Agence <strong>GESTIMMO</strong>, agissant en qualité de mandataire du propriétaire du bien d'une part,</p>
            <p>Et Monsieur / Madame <strong>${tenantName}</strong>, désigné(e) ci-après "Le Locataire" d'autre part.</p>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; text-transform: uppercase;">1. Désignation du Logement</h3>
            <p style="font-size: 13px; margin: 4px 0;"><strong>Bien Immobiler :</strong> ${propertyName}</p>
            <p style="font-size: 13px; margin: 4px 0;"><strong>Numéro d'Appartement :</strong> ${unitId}</p>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; text-transform: uppercase;">2. Durée & Période</h3>
            <p style="font-size: 13px; margin: 4px 0;"><strong>Date de prise d'effet :</strong> ${startDate}</p>
            <p style="font-size: 13px; margin: 4px 0;"><strong>Date d'échéance :</strong> ${endDate}</p>
            <p style="font-size: 12px; color: #475569; margin: 10px 0 0 0; padding-top: 10px; border-top: 1px solid #e2e8f0; line-height: 1.45;">
              En l'absence de résiliation à la date d'échéance, ce bail est automatiquement reconduit de 1 an chaque année.
            </p>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; text-transform: uppercase;">3. Conditions Financières</h3>
            <p style="font-size: 13px; margin: 4px 0;"><strong>Loyer mensuel hors charges :</strong> ${formatFCFA(rentAmount)}</p>
            <p style="font-size: 13px; margin: 4px 0;"><strong>Charges forfaitaires :</strong> ${formatFCFA(chargesAmount)}</p>
            <p style="font-size: 15px; margin: 8px 0 0 0; font-weight: 800; color: #2563eb;">Total Mensuel Convenu : ${formatFCFA(totalAmount)}</p>
          </div>

          <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #475569; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <div>
              <p>Signature du Locataire :</p>
              <div style="margin-top: 40px; font-weight: 700;">${tenantName}</div>
            </div>
            <div style="text-align: right;">
              <p>Pour l'Agence GESTIMMO :</p>
              <div style="margin-top: 40px; font-weight: 700;">Cachet & Signature</div>
            </div>
          </div>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `Contrat_Bail_${leaseId}_${tenantName.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as const;

      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error(e);
      alert("Impossible de télécharger le PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDoc = async (doc: any) => {
    if (doc.base64) {
      const a = document.createElement("a");
      a.href = doc.base64;
      a.download = doc.name || `Document_${leaseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    if (doc.url) {
      const a = document.createElement("a");
      a.href = doc.url;
      a.download = doc.name || `Document_${leaseId}.pdf`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Default handler for contract PDF or generated files
    handleDownloadContract();
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Contrat de Bail</h1>
          <p className="text-sm text-gray-500 mt-1">Consultez les informations de votre bail en cours.</p>
        </div>

        {!isPreavisActive ? (
          <button
            onClick={() => setIsNoticeModalOpen(true)}
            className="bg-amber-500 text-white hover:bg-amber-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 w-fit"
          >
            <Clock className="w-4 h-4" /> Donner mon préavis de départ
          </button>
        ) : (
          <div className="bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-700" /> Préavis en cours - Sortie le {currentPreavis?.exitDate || activeLease?.preavisExitDate || "prochainement"}
          </div>
        )}
      </div>

      {/* Active Preavis Banner */}
      {isPreavisActive && (
        <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center shrink-0 font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">Préavis de départ en cours</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Notification transmise le <strong>{currentPreavis?.requestDate || "récemment"}</strong>. Libération des lieux fixée au <strong>{currentPreavis?.exitDate || activeLease?.preavisExitDate || "fin du préavis"}</strong>.
              </p>
              {currentPreavis?.reason && (
                <p className="text-xs text-amber-700 mt-1 italic">Motif : {currentPreavis.reason}</p>
              )}
            </div>
          </div>
          <Badge dot variant="warning" className="shrink-0 text-xs px-3 py-1">
            EN PRÉAVIS DE DÉPART
          </Badge>
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl border border-app-border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-app-border pb-6 mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              Contrat N° {leaseId}
              <Badge variant={isPreavisActive ? "warning" : "success"}>
                {isPreavisActive ? "En préavis" : "Actif"}
              </Badge>
            </h2>
            <p className="text-sm text-gray-500 mt-1">Géré et certifié avec GESTIMMO</p>
          </div>
          <button 
            onClick={handleDownloadContract}
            disabled={isDownloading}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm w-fit disabled:opacity-50"
          >
            {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {isDownloading ? "Téléchargement..." : "Télécharger (PDF)"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-primary" /> Période de validité
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 border border-app-border space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Date d'effet</p>
                  <p className="text-sm font-bold text-gray-900">{startDate}</p>
                </div>
                <div className="w-8 h-[1px] bg-gray-300"></div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Date de fin</p>
                  <p className="text-sm font-bold text-gray-900">{endDate}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-app-border flex items-start gap-2 text-xs text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  En l'absence de résiliation à la date d'échéance, ce bail est automatiquement reconduit de 1 an chaque année.
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-primary" /> Conditions Financières
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Loyer de base mensuel</span>
                <span className="text-sm font-bold text-gray-900">{formatFCFA(rentAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Charges forfaitaires</span>
                <span className="text-sm font-bold text-gray-900">{formatFCFA(chargesAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-app-border">
                <span className="text-sm font-semibold text-gray-900">Total Mensuel</span>
                <span className="text-lg font-bold text-primary">{formatFCFA(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-app-border">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Mes documents annexes</h3>
          {attachedDocuments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {attachedDocuments.map((doc) => (
                <div 
                  key={doc.id || doc.name}
                  onClick={() => handleDownloadDoc(doc)}
                  className="border border-app-border rounded-xl p-4 flex items-center justify-between hover:border-primary group transition-colors cursor-pointer bg-gray-50"
                >
                  <div className="flex items-center min-w-0 mr-3">
                    <FileText className="w-5 h-5 text-primary group-hover:text-primary mr-3 shrink-0 transition-colors" />
                    <div className="truncate">
                      <p className="text-sm font-semibold text-gray-900 truncate" title={doc.name}>{doc.name}</p>
                      <p className="text-xs text-gray-500 truncate">{doc.date || doc.source || "Document du locataire"}</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-primary shrink-0 transition-colors" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic py-2">Aucun document rattaché au locataire ou à ses baux.</p>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL LOCATAIRE : TRANSMETTRE UN PRÉAVIS DE DÉPART */}
      {/* -------------------------------------------------------------------------- */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-app-border overflow-hidden flex flex-col font-sans">
            <div className="p-5 bg-amber-50 border-b border-app-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-amber-950">Donner mon préavis de départ</h3>
              </div>
              <button onClick={() => setIsNoticeModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTenantSubmitNotice} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <p className="font-bold text-gray-900">{tenantName}</p>
                <p className="text-gray-500 mt-0.5">Logement {unitId} - {propertyName}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Date de notification *</label>
                <input
                  type="date"
                  required
                  value={noticeDate}
                  onChange={(e) => setNoticeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl text-xs text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Durée du préavis *</label>
                <select
                  value={noticeDuration}
                  onChange={(e) => setNoticeDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-app-border rounded-xl text-xs font-semibold bg-white text-gray-900"
                >
                  <option value={1}>1 Mois</option>
                  <option value={2}>2 Mois</option>
                  <option value={3}>3 Mois (Standard)</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                <span className="text-amber-900 font-semibold">Date de sortie calculée : </span>
                <strong className="text-amber-700 font-bold ml-1">
                  {calculateExitDate(noticeDate, noticeDuration)}
                </strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Motif de départ *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: Déménagement professionnel, raison personnelle..."
                  value={noticeReason}
                  onChange={(e) => setNoticeReason(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl text-xs text-gray-900 resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 shadow-sm"
                >
                  Transmettre mon préavis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


