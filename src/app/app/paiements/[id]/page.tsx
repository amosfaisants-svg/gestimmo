"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Download, Printer, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatUnitDisplay, getPaymentDisplayCode } from "@/lib/utils";
import { getStoredCompanyInfo, CompanyInfo } from "@/lib/companyInfo";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const getMonthName = (period: string): string => {
  // Gère le format "YYYY-MM"
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("fr-FR", { month: "long" })
      .replace(/^./, (c) => c.toUpperCase());
  }
  return "";
};

const defaultReceipts = [
  { id: "P-1925", tenant: "Cora Richards", unit: "A-101", property: "Résidence Les Flamboyants", date: "05 Sept 2026", period: "Septembre 2026", amount: 165000, method: "Virement Bancaire (Réf: VIR-993884)", status: "VALIDÉ", receivedBy: "Aron Levine", notes: "Paiement du loyer de septembre, reçu dans les temps." },
  { id: "P-1801", tenant: "Alistair Dunlap", unit: "B-204", property: "Résidence Les Flamboyants", date: "05 Août 2026", period: "Août 2026", amount: 200000, method: "Wave (Réf: WAV-88219)", status: "VALIDÉ", receivedBy: "Aron Levine", notes: "Paiement via mobile money." },
];

export default function PaymentDetailsPage({ params }: { params: { id: string } }) {
  const [receipt, setReceipt] = useState<any>(null);
  const [leaseCharges, setLeaseCharges] = useState<number>(0);
  const [resolvedProperty, setResolvedProperty] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    setCompany(getStoredCompanyInfo());
    const stored = localStorage.getItem("gestimmo_paiements");
    const all = stored ? JSON.parse(stored) : defaultReceipts;
    const found = all.find((p: any) => p.id === params.id || p.code === params.id || getPaymentDisplayCode(p) === params.id);
    setReceipt(found);

    if (found) {
      let propName = found.property || "";

      // 1. Look up in gestimmo_logements
      const storedLogements = localStorage.getItem("gestimmo_logements");
      if (!propName && storedLogements) {
        try {
          const logements = JSON.parse(storedLogements);
          const matchLog = logements.find((l: any) => l.id === found.unit || l.unit === found.unit);
          if (matchLog?.property) propName = matchLog.property;
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Look up in gestimmo_baux
      const storedBaux = localStorage.getItem("gestimmo_baux");
      if (storedBaux) {
        try {
          const baux = JSON.parse(storedBaux);
          const matchingLease = baux.find((b: any) =>
            (found.tenant && b.tenant && b.tenant.trim().toLowerCase() === found.tenant.trim().toLowerCase()) ||
            (found.unit && b.unit && b.unit.trim().toLowerCase() === found.unit.trim().toLowerCase())
          );
          if (matchingLease) {
            setLeaseCharges(matchingLease.charges || 0);
            if (!propName && matchingLease.property) {
              propName = matchingLease.property;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 3. Look up in gestimmo_locataires
      if (!propName) {
        const storedLocs = localStorage.getItem("gestimmo_locataires");
        if (storedLocs) {
          try {
            const locs = JSON.parse(storedLocs);
            const matchLoc = locs.find((t: any) =>
              (found.tenant && t.name && t.name.trim().toLowerCase() === found.tenant.trim().toLowerCase()) ||
              (found.unit && t.unit && t.unit.trim().toLowerCase() === found.unit.trim().toLowerCase())
            );
            if (matchLoc?.property && matchLoc.property !== "-") propName = matchLoc.property;
          } catch (e) {
            console.error(e);
          }
        }
      }

      // 4. Fallback if still empty
      if (!propName || propName === "-") {
        propName = "Résidence Les Flamboyants";
      }

      setResolvedProperty(propName);
    }
  }, [params.id]);

  const handleDownloadPdf = async () => {
    const element = document.getElementById("receipt-details-card");
    if (!element) return;
    setIsDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js" as any)).default;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Recu_${receipt ? getPaymentDisplayCode(receipt) : "paiement"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Erreur lors du téléchargement du PDF:", error);
      alert("Impossible de générer le fichier PDF. Veuillez réessayer.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!receipt) return <div className="p-8 text-center text-gray-500">Paiement introuvable ou en cours de chargement...</div>;
  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 print:hidden">
        <div className="flex items-start gap-4">
          <Link href="/app/paiements">
            <button className="p-2 bg-white border border-app-border rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">Reçu de paiement {getPaymentDisplayCode(receipt)}</h1>
              <Badge dot variant="success">{receipt.status}</Badge>
            </div>
            <p className="text-sm text-gray-500">Généré le {receipt.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center">
            <Printer className="h-4 w-4 mr-2" /> Imprimer
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isDownloading ? "Téléchargement..." : "Télécharger PDF"}
          </button>
        </div>
      </div>

      <div id="receipt-details-card" className="max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-app-border shadow-sm mt-8">
        <div className="flex justify-between items-start border-b border-app-border pb-6 mb-6">
          <div className="flex items-start gap-4">
            {company?.logo && (
              <img src={company.logo} alt="Logo" className="w-14 h-14 object-contain rounded-lg border border-gray-100 p-1 bg-white" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-tight">{company?.name || "GESTIMMO"}</h2>
              <p className="text-sm text-gray-600 mt-1">{company?.address || "Cocody II Plateaux, Abidjan"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Tél : {company?.phone || "+225 0102030405"} {company?.email ? `• ${company.email}` : ""}</p>
              {company?.rccm && <p className="text-[11px] text-gray-400 font-mono mt-0.5">RCCM : {company.rccm}</p>}
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-semibold text-gray-900">QUITTANCE DE LOYER</h3>
            <p className="text-sm text-gray-500 mt-1">N° {getPaymentDisplayCode(receipt)}</p>
            <p className="text-sm text-gray-500">Date: {receipt.date}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Reçu de :</h4>
            <p className="text-base font-bold text-gray-900">{receipt.tenant}</p>
            <p className="text-sm text-gray-600 mt-1">{formatUnitDisplay(receipt.unit).toLowerCase().startsWith("studio") || formatUnitDisplay(receipt.unit).toLowerCase().startsWith("appartement") || formatUnitDisplay(receipt.unit).toLowerCase().startsWith("villa") || formatUnitDisplay(receipt.unit).toLowerCase().startsWith("magasin") ? formatUnitDisplay(receipt.unit) : `Appartement ${formatUnitDisplay(receipt.unit)}`}</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">{resolvedProperty || receipt.property}</p>
          </div>
          <div className="text-right">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Période concernée :</h4>
            <p className="text-base font-bold text-gray-900">{receipt.period}</p>
          </div>
        </div>

        <div className="border border-app-border rounded-xl overflow-hidden mb-8">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-app-border">
                <th className="px-4 py-3 text-sm font-semibold text-gray-900">Description</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {leaseCharges > 0 ? (
                <>
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-900">Loyer de base pour {receipt.period}{getMonthName(receipt.period) ? ` (${getMonthName(receipt.period)})` : ""}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-right">{formatFCFA(receipt.amount - leaseCharges)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-900">Charges locatives forfaitaires</td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-right">{formatFCFA(leaseCharges)}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {(() => {
                      const pLower = (receipt.period || "").toLowerCase();
                      if (pLower.includes("caution") || pLower.includes("dépôt") || pLower.includes("depot")) {
                        return `Dépôt de garantie - ${receipt.period}`;
                      }
                      if (pLower.includes("avance")) {
                        return `Loyer d'avance - ${receipt.period}`;
                      }
                      return `Loyer pour ${receipt.period}${getMonthName(receipt.period) ? ` (${getMonthName(receipt.period)})` : ""}`;
                    })()}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-right">{formatFCFA(receipt.amount)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td className="px-4 py-4 text-base font-bold text-gray-900 text-right">Total Payé</td>
                <td className="px-4 py-4 text-lg font-bold text-primary text-right">{formatFCFA(receipt.amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Détails du paiement</h4>
            <p className="text-gray-600">Mode: {receipt.method}</p>
            <p className="text-gray-600 mt-1">Encaissé par: {
              (() => {
                const storedTeam = localStorage.getItem("gestimmo_equipe");
                const team = storedTeam ? JSON.parse(storedTeam) : [];
                const manager = team.find((m: any) => m.assignedLogements && m.assignedLogements.includes(receipt.unit));
                return manager ? `${manager.name} (${manager.phone})` : (receipt.receivedBy || "Non spécifié");
              })()
            }</p>
            {receipt.notes && (
              <p className="text-gray-500 italic mt-3 text-xs bg-gray-50 p-2 rounded-lg border border-gray-100">{receipt.notes}</p>
            )}
          </div>
          <div className="flex flex-col items-end justify-end">
            <div className="flex items-center text-green-600 mb-2">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span className="font-bold">PAIEMENT VALIDÉ</span>
            </div>
            <p className="text-xs text-gray-400">Signature électronique : {getPaymentDisplayCode(receipt)}-VALID</p>
          </div>
        </div>
      </div>
    </div>
  );
}
