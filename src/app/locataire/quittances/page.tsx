"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Download, Loader2, FileCheck2, History, X, ShieldAlert } from "lucide-react";
import { formatUnitDisplay, getPaymentDisplayCode, sortPaymentsDesc } from "@/lib/utils";
import { getPortalSession } from "@/lib/authSession";
import { loadAllDataFromDatabase } from "@/lib/dataService";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

function parsePeriodToDate(periodStr: string): Date | null {
  if (!periodStr) return null;
  const s = periodStr.trim().toLowerCase();

  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }

  const monthsMap: { [key: string]: number } = {
    janv: 0, "janv.": 0, janvier: 0,
    févr: 1, "févr.": 1, février: 1, fevrier: 1,
    mars: 2,
    avr: 3, "avr.": 3, avril: 3,
    mai: 4,
    juin: 5,
    juil: 6, "juil.": 6, juillet: 6,
    août: 7, aout: 7,
    sept: 8, "sept.": 8, septembre: 8,
    oct: 9, "oct.": 9, octobre: 9,
    nov: 10, "nov.": 10, novembre: 10,
    déc: 11, "déc.": 11, décembre: 11, decembre: 11
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
    return new Date(foundYear, foundMonth, 1);
  }

  return null;
}

const defaultInitialPayments = [
  { id: "P-1925", tenant: "Cora Richards", unit: "A-101", date: "05 Sept 2026", period: "Septembre 2026", amount: 165000, method: "Mobile Money", status: "VALIDÉ" },
  { id: "P-1801", tenant: "Cora Richards", unit: "A-101", date: "03 Août 2026", period: "Août 2026", amount: 165000, method: "Virement Bancaire", status: "VALIDÉ" },
  { id: "P-1927", tenant: "Bibi Shelton", unit: "A-102", date: "07 Sept 2026", period: "Septembre 2026", amount: 200000, method: "Espèces", status: "VALIDÉ" },
  { id: "P-1926", tenant: "Alistair Dunlap", unit: "B-204", date: "06 Sept 2026", period: "Septembre 2026", amount: 220000, method: "Wave", status: "EN RETARD" },
];

export default function LocataireQuittancesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeLease, setActiveLease] = useState<any>(null);
  const [activePayments, setActivePayments] = useState<any[]>([]);
  const [terminatedPayments, setTerminatedPayments] = useState<any[]>([]);
  const [hasTerminatedLease, setHasTerminatedLease] = useState(false);
  const [showTerminatedModal, setShowTerminatedModal] = useState(false);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const loadQuittances = async () => {
      await loadAllDataFromDatabase();
      // 1. Read logged in user
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

    // 2. Read active and terminated leases from gestimmo_baux
    let activeLeaseFound: any = null;
    const activeUnits: string[] = [];
    const terminatedUnits: string[] = [];
    const terminatedLeaseIds: string[] = [];
    let foundTerminatedLease = false;

    const storedBaux = localStorage.getItem("gestimmo_baux");
    if (storedBaux) {
      try {
        const baux: any[] = JSON.parse(storedBaux);
        baux.forEach((b) => {
          const bTenant = (b.tenant || "").trim().toUpperCase();
          if (bTenant === normTenantName) {
            if (b.status === "ACTIF") {
              activeLeaseFound = b;
              if (b.unit) activeUnits.push(b.unit.trim().toUpperCase());
            } else {
              foundTerminatedLease = true;
              if (b.id) terminatedLeaseIds.push(b.id);
              if (b.unit) terminatedUnits.push(b.unit.trim().toUpperCase());
            }
          }
        });
        if (activeLeaseFound) setActiveLease(activeLeaseFound);
        setHasTerminatedLease(foundTerminatedLease);
      } catch (e) {
        console.error(e);
      }
    }

    if (user?.unit && !activeUnits.includes(user.unit.trim().toUpperCase())) {
      activeUnits.push(user.unit.trim().toUpperCase());
    }

    // 3. Load payments from gestimmo_paiements
    const storedPaiements = localStorage.getItem("gestimmo_paiements");
    let allPayments: any[] = [];
    if (storedPaiements) {
      try {
        allPayments = JSON.parse(storedPaiements);
      } catch (e) {
        console.error(e);
      }
    }

    if (allPayments.length === 0) {
      allPayments = defaultInitialPayments;
    }

    // Filter payments for this tenant
    const filtered = allPayments.filter((p: any) => {
      const pTenant = (p.tenant || "").trim().toUpperCase();
      const pUnit = (p.unit || "").trim().toUpperCase();
      const userUnit = (user?.unit || "").trim().toUpperCase();

      return pTenant === normTenantName || (userUnit && userUnit !== "-" && pUnit === userUnit);
    });

    const activeList: any[] = [];
    const terminatedList: any[] = [];
    const paymentsToProcess = filtered.length > 0 ? filtered : defaultInitialPayments.filter(p => p.tenant.trim().toUpperCase() === normTenantName);

    const activeRent = activeLeaseFound ? Number(activeLeaseFound.rent || 0) : (user?.rent || 0);
    const activeCharges = activeLeaseFound ? Number(activeLeaseFound.charges || 0) : 0;
    const activeTotal = activeRent + activeCharges;

    paymentsToProcess.forEach((p: any) => {
      const pUnit = (p.unit || "").trim().toUpperCase();
      const periodLower = (p.period || "").toLowerCase();
      const isDepositOrAdvance = periodLower.includes("caution") || periodLower.includes("avance") || periodLower.includes("dépôt");

      // Check if payment belongs to a terminated lease
      let isResilie = Boolean(
        p.isResilie ||
        p.leaseResilie ||
        p.leaseStatus === "RÉSILIÉ" ||
        p.leaseStatus === "RESILIE" ||
        p.status === "RÉSILIÉ" ||
        p.status === "RESILIE" ||
        (p.leaseId && terminatedLeaseIds.includes(p.leaseId)) ||
        (activeLeaseFound?.id && p.leaseId && p.leaseId !== activeLeaseFound.id) ||
        (activeLeaseFound?.unit && pUnit && pUnit !== activeLeaseFound.unit.trim().toUpperCase())
      );

      // Check if rent amount differs from active lease total and isn't deposit/avance
      if (!isResilie && activeTotal > 0 && p.amount && p.amount !== activeTotal && p.amount !== activeRent && !isDepositOrAdvance) {
        isResilie = true;
      }

      // Check if period is before active lease start
      if (!isResilie && activeLeaseFound?.start) {
        const startDate = parsePeriodToDate(activeLeaseFound.start);
        const pDate = parsePeriodToDate(p.period || p.date);
        if (startDate && pDate && pDate.getTime() < startDate.getTime()) {
          isResilie = true;
        }
      }

      if (isResilie) {
        terminatedList.push(p);
      } else {
        activeList.push(p);
      }
    });

    setActivePayments(sortPaymentsDesc(activeList));
    setTerminatedPayments(sortPaymentsDesc(terminatedList));
  };

  loadQuittances();

  const handleUpdate = () => {
    loadQuittances();
  };

  window.addEventListener("storage", handleUpdate);
  window.addEventListener("gestimmo_paiements_updated", handleUpdate);

  return () => {
    window.removeEventListener("storage", handleUpdate);
    window.removeEventListener("gestimmo_paiements_updated", handleUpdate);
  };
  }, []);

  const handleDownloadPdf = async (payment: any) => {
    setIsDownloadingId(payment.id);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const tenantName = currentUser?.name || payment.tenant || "Locataire";
      const propertyName = activeLease?.property || currentUser?.property || "Résidence Les Flamboyants";
      const unitId = formatUnitDisplay(payment.unit || activeLease?.unit || currentUser?.unit || "A-101");

      const element = document.createElement("div");
      element.innerHTML = `
        <div style="padding: 40px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; max-width: 750px; margin: 0 auto; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 25px;">
            <div>
              <h1 style="color: #2563eb; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.025em;">GESTIMMO</h1>
              <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0; font-weight: 500;">Agence de Gestion Immobilière</p>
              <p style="font-size: 12px; color: #94a3b8; margin: 2px 0 0 0;">Abidjan, Côte d'Ivoire</p>
            </div>
            <div style="text-align: right;">
              <div style="display: inline-block; background: #dcfce7; color: #15803d; font-weight: 700; padding: 6px 16px; border-radius: 9999px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                ${payment.status || "VALIDÉ"}
              </div>
              <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0;">QUITTANCE DE LOYER</h2>
              <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">N° ${getPaymentDisplayCode(payment)}</p>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px; display: flex; justify-content: space-between;">
            <div>
              <p style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin: 0 0 6px 0; letter-spacing: 0.05em;">Locataire</p>
              <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">${tenantName}</p>
              <p style="font-size: 13px; color: #475569; margin: 4px 0 0 0;">Bien : ${propertyName}</p>
              <p style="font-size: 13px; color: #475569; margin: 2px 0 0 0;">Appartement : ${unitId}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin: 0 0 6px 0; letter-spacing: 0.05em;">Détails du Paiement</p>
              <p style="font-size: 13px; color: #475569; margin: 0;">Période : <strong style="color: #0f172a;">${payment.period}</strong></p>
              <p style="font-size: 13px; color: #475569; margin: 4px 0 0 0;">Date de règlement : <strong style="color: #0f172a;">${payment.date}</strong></p>
              <p style="font-size: 13px; color: #475569; margin: 4px 0 0 0;">Mode : <strong style="color: #0f172a;">${payment.method || "Règlement Direct"}</strong></p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
                <th style="padding: 12px 16px; font-weight: 700; color: #334155; font-size: 12px; text-transform: uppercase;">Désignation</th>
                <th style="padding: 12px 16px; font-weight: 700; color: #334155; font-size: 12px; text-transform: uppercase; text-align: right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 16px; color: #334155; font-weight: 500;">
                  Quittance de loyer et charges locatives - ${payment.period}
                </td>
                <td style="padding: 16px; color: #0f172a; font-weight: 700; text-align: right;">
                  ${formatFCFA(payment.amount)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc;">
                <td style="padding: 16px; font-weight: 700; color: #0f172a; text-align: right; font-size: 15px;">
                  TOTAL REÇU ET ACQUITTÉ :
                </td>
                <td style="padding: 16px; font-weight: 800; color: #2563eb; font-size: 18px; text-align: right;">
                  ${formatFCFA(payment.amount)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px; margin-bottom: 30px; font-size: 12px; color: #1e40af;">
            <strong>Remarque :</strong> La présente quittance annule tous les reçus provisoires qui auraient pu être délivrés antérieurement pour cette même période.
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0;">Généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}</p>
            <p style="margin: 0; font-weight: 600;">GESTIMMO - Document Officiel de Gestion Locative</p>
          </div>
        </div>
      `;

      const opt = {
        margin: 8,
        filename: `Quittance_${(payment.period || 'Mois').replace(/\s+/g, '_')}_${tenantName.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as const;

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Erreur téléchargement PDF quittance:", error);
      alert("Impossible de générer le fichier PDF. Veuillez réessayer.");
    } finally {
      setIsDownloadingId(null);
    }
  };

  const showHistoryButton = terminatedPayments.length > 0 || hasTerminatedLease;

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes Quittances</h1>
          <p className="text-sm text-gray-500 mt-1">Historique de vos paiements et téléchargement de vos reçus officiels.</p>
        </div>

        {showHistoryButton && (
          <button
            onClick={() => setShowTerminatedModal(true)}
            className="bg-white border border-app-border text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2.5 shadow-sm w-fit shrink-0"
          >
            <History className="w-4 h-4 text-gray-500" />
            <span>Historique baux résiliés</span>
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {terminatedPayments.length}
            </span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                <th className="px-6 py-4 font-medium">Période</th>
                <th className="px-6 py-4 font-medium">Date de paiement</th>
                <th className="px-6 py-4 font-medium text-center">Montant</th>
                <th className="px-6 py-4 font-medium text-center">Statut</th>
                <th className="px-6 py-4 font-medium text-right">Quittance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {activePayments.length > 0 ? (
                activePayments.map((payment) => {
                  const isPaid = payment.status === "VALIDÉ" || payment.status === "PAYÉ";
                  const isDownloading = isDownloadingId === payment.id;

                  return (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {payment.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payment.date || "-"}
                        <p className="text-xs text-gray-400 mt-0.5">{payment.method || "Paiement direct"}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                        {formatFCFA(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge dot variant={isPaid ? "success" : payment.status === "EN ATTENTE" ? "warning" : "danger"}>
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isPaid ? (
                          <button 
                            onClick={() => handleDownloadPdf(payment)}
                            disabled={isDownloading}
                            className="text-xs font-medium text-primary hover:text-white hover:bg-primary transition-colors px-3 py-1.5 border border-primary rounded-lg flex items-center justify-end ml-auto shadow-sm disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {isDownloading ? "Téléchargement..." : "PDF"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Indisponible</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <FileCheck2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    Aucune quittance du bail actif pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Historique Baux Résiliés */}
      {showTerminatedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-app-border shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-app-border flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Historique des Paiements - Baux Résiliés</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Consultez et téléchargez les quittances de vos anciens contrats résiliés.</p>
                </div>
              </div>
              <button
                onClick={() => setShowTerminatedModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-4 mb-6 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Ces reçus et quittances correspondent à des périodes de baux antérieures qui ont été résiliés. Ils restent consultables à titre d'archive officielle.
                </p>
              </div>

              <div className="border border-app-border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[550px]">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                      <th className="px-6 py-3.5 font-medium">Période</th>
                      <th className="px-6 py-3.5 font-medium">Date de paiement</th>
                      <th className="px-6 py-3.5 font-medium text-center">Montant</th>
                      <th className="px-6 py-3.5 font-medium text-center">Statut du Bail</th>
                      <th className="px-6 py-3.5 font-medium text-right">Quittance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {terminatedPayments.length > 0 ? (
                      terminatedPayments.map((payment) => {
                        const isPaid = payment.status === "VALIDÉ" || payment.status === "PAYÉ";
                        const isDownloading = isDownloadingId === payment.id;

                        return (
                          <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {payment.period}
                              {payment.unit && (
                                <span className="block text-xs text-gray-400 font-normal mt-0.5">
                                  Appartement : {formatUnitDisplay(payment.unit)}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {payment.date || "-"}
                              <p className="text-xs text-gray-400 mt-0.5">{payment.method || "Paiement direct"}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                              {formatFCFA(payment.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <Badge dot variant="danger">
                                Résilié
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {isPaid ? (
                                <button
                                  onClick={() => handleDownloadPdf(payment)}
                                  disabled={isDownloading}
                                  className="text-xs font-medium text-primary hover:text-white hover:bg-primary transition-colors px-3 py-1.5 border border-primary rounded-lg flex items-center justify-end ml-auto shadow-sm disabled:opacity-50"
                                >
                                  {isDownloading ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                  )}
                                  {isDownloading ? "Téléchargement..." : "PDF"}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">Indisponible</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                          Aucun paiement enregistré pour vos anciens baux résiliés.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-app-border bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setShowTerminatedModal(false)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


