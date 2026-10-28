"use client";

import { useState, useEffect, Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { useSearchParams } from "next/navigation";
import { 
  Search, UserMinus, Calendar, Plus, FileText, CheckCircle2, 
  Clock, AlertTriangle, Printer, Download, X, ArrowRight, ShieldCheck, 
  DollarSign, Building2, User
} from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { createLeaseNotice, updateLeaseNotice, updateLease, updateUnit } from "@/lib/dataService";
import { formatUnitDisplay } from "@/lib/utils";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const defaultPreavisList = [
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
  },
  { 
    id: "PRV-1002", 
    leaseId: "BX-002", 
    tenant: "Lucie Kassi", 
    unit: "V-002", 
    property: "Villa Palmeraie", 
    requestDate: "15 Sept 2026", 
    exitDate: "31 Oct 2026", 
    durationMonths: 2, 
    initiatedBy: "AGENCE", 
    reason: "Rénovation majeure du bien", 
    deposit: 1600000, 
    deductions: 150000, 
    status: "EN PRÉAVIS",
    notes: "Retenue estimée pour remise en peinture"
  },
  { 
    id: "PRV-1000", 
    leaseId: "BX-000", 
    tenant: "Marc Antoine", 
    unit: "A-101", 
    property: "Résidence Les Flamboyants", 
    requestDate: "15 Avril 2026", 
    exitDate: "30 Juin 2026", 
    durationMonths: 2, 
    initiatedBy: "LOCATAIRE", 
    reason: "Achat immobilier", 
    deposit: 330000, 
    deductions: 50000, 
    status: "RÉSILIÉ",
    notes: "Clôturé avec remise des clés et solde de tout compte"
  },
];

function ResiliationsPageInner() {
  const { can } = usePermissions();
  const searchParams = useSearchParams();

  const [preavisList, setPreavisList] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [logements, setLogements] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous statuts");

  // Modal Saisie Préavis
  const [isPreavisModalOpen, setIsPreavisModalOpen] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [notificationDate, setNotificationDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationMonths, setDurationMonths] = useState(3);
  const [initiatedBy, setInitiatedBy] = useState<"LOCATAIRE" | "AGENCE">("LOCATAIRE");
  const [reason, setReason] = useState("Déménagement personnel");
  const [customExitDate, setCustomExitDate] = useState("");
  const [estimatedDeductions, setEstimatedDeductions] = useState("0");
  const [preavisNotes, setPreavisNotes] = useState("");

  // Modal Clôture & Solde de Tout Compte
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [selectedPreavis, setSelectedPreavis] = useState<any>(null);
  const [finalDeductions, setFinalDeductions] = useState("0");
  const [finalExitDate, setFinalExitDate] = useState("");
  const [finalNotes, setFinalNotes] = useState("");

  useEffect(() => {
    // Load preavis list
    const storedPreavis = localStorage.getItem("gestimmo_preavis");
    if (storedPreavis) {
      try {
        setPreavisList(JSON.parse(storedPreavis));
      } catch (e) {
        setPreavisList(defaultPreavisList);
      }
    } else {
      setPreavisList(defaultPreavisList);
      localStorage.setItem("gestimmo_preavis", JSON.stringify(defaultPreavisList));
    }

    // Load baux
    const storedBaux = localStorage.getItem("gestimmo_baux");
    if (storedBaux) {
      try {
        setLeases(JSON.parse(storedBaux));
      } catch (e) {}
    }

    // Load logements
    const storedLogements = localStorage.getItem("gestimmo_logements");
    if (storedLogements) {
      try {
        setLogements(JSON.parse(storedLogements));
      } catch (e) {}
    }
  }, []);

  // Listen to URL status filter (preavis, etc.)
  useEffect(() => {
    const rawStatus = searchParams.get("status") || searchParams.get("statut");
    if (rawStatus) {
      const lower = rawStatus.toLowerCase().trim();
      if (lower.includes("preavis") || lower.includes("préavis") || lower.includes("actif")) {
        setStatusFilter("En préavis");
      } else if (lower.includes("termin") || lower.includes("clotur") || lower.includes("resili")) {
        setStatusFilter("Terminé");
      }
    }
  }, [searchParams]);

  const savePreavisList = (newList: any[]) => {
    setPreavisList(newList);
    localStorage.setItem("gestimmo_preavis", JSON.stringify(newList));
  };

  // Auto calculate exit date based on notification date + duration in months
  const calculateExitDate = (notifDateStr: string, months: number) => {
    if (!notifDateStr) return "";
    const dt = new Date(notifDateStr);
    dt.setMonth(dt.getMonth() + months);
    return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  };

  // Open modal to declare notice
  const handleOpenNewPreavisModal = () => {
    setSelectedLeaseId("");
    setNotificationDate(new Date().toISOString().slice(0, 10));
    setDurationMonths(3);
    setInitiatedBy("LOCATAIRE");
    setReason("Déménagement personnel");
    setCustomExitDate("");
    setEstimatedDeductions("0");
    setPreavisNotes("");
    setIsPreavisModalOpen(true);
  };

  // Save new notice of departure (Préavis)
  const handleCreatePreavis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseId) {
      alert("Veuillez sélectionner un bail / locataire en cours.");
      return;
    }

    const targetLease = leases.find((l: any) => l.id === selectedLeaseId) || {
      id: selectedLeaseId,
      tenant: "Locataire",
      unit: "Unité",
      property: "Bien",
      rent: 150000
    };

    const calculatedExit = customExitDate 
      ? new Date(customExitDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
      : calculateExitDate(notificationDate, durationMonths);

    const notifFormatted = new Date(notificationDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

    const depositAmount = Number(targetLease.deposit || targetLease.rent * 2) || (targetLease.rent ? targetLease.rent * 2 : 300000);

    const newPreavisItem = {
      id: `PRV-${Math.floor(1000 + Math.random() * 9000)}`,
      leaseId: targetLease.id,
      tenant: targetLease.tenant,
      unit: targetLease.unit,
      property: targetLease.property || "Bien Immobilier",
      requestDate: notifFormatted,
      exitDate: calculatedExit,
      durationMonths,
      initiatedBy,
      reason,
      deposit: depositAmount,
      deductions: Number(estimatedDeductions) || 0,
      status: "EN PRÉAVIS",
      notes: preavisNotes || "Préavis de départ en cours de traitement"
    };

    const updatedPreavisList = [newPreavisItem, ...preavisList];
    savePreavisList(updatedPreavisList);

    // Update lease status in gestimmo_baux to "EN PRÉAVIS"
    const storedBaux = localStorage.getItem("gestimmo_baux");
    if (storedBaux) {
      try {
        let bauxArr: any[] = JSON.parse(storedBaux);
        bauxArr = bauxArr.map((b: any) => {
          if (b.id === targetLease.id || b.unit === targetLease.unit) {
            return { ...b, status: "EN PRÉAVIS", preavisExitDate: calculatedExit };
          }
          return b;
        });
        localStorage.setItem("gestimmo_baux", JSON.stringify(bauxArr));
        setLeases(bauxArr);
      } catch (e) {}
    }

    // Update logement status in gestimmo_logements to "EN PRÉAVIS"
    const storedLogements = localStorage.getItem("gestimmo_logements");
    if (storedLogements) {
      try {
        let logArr: any[] = JSON.parse(storedLogements);
        logArr = logArr.map((l: any) => {
          if (l.id === targetLease.unit) {
            return { ...l, status: "EN PRÉAVIS", preavisExitDate: calculatedExit };
          }
          return l;
        });
        localStorage.setItem("gestimmo_logements", JSON.stringify(logArr));
        setLogements(logArr);
      } catch (e) {}
    }

    // Persist to Supabase DB
    createLeaseNotice({
      lease_id: targetLease.id && !targetLease.id.startsWith("BX-") && !targetLease.id.startsWith("L-") ? targetLease.id : null,
      tenant_id: targetLease.tenantId || null,
      unit_id: targetLease.unitId || null,
      notification_date: notificationDate || new Date().toISOString().split("T")[0],
      effective_exit_date: customExitDate || notificationDate || new Date().toISOString().split("T")[0],
      notice_months: durationMonths,
      initiative: initiatedBy,
      reason: reason || null,
      repairs_deducted: Number(estimatedDeductions) || 0,
      status: "EN PRÉAVIS",
    }).catch(console.error);

    if (targetLease.id && !targetLease.id.startsWith("BX-") && !targetLease.id.startsWith("L-")) {
      updateLease(targetLease.id, { status: "EN PRÉAVIS" }).catch(console.error);
    }
    if (targetLease.unitId) {
      updateUnit(targetLease.unitId, { status: "EN PRÉAVIS" }).catch(console.error);
    }

    setIsPreavisModalOpen(false);
    alert(`Le préavis de départ pour ${targetLease.tenant} (Appartement ${targetLease.unit}) a été enregistré avec succès ! Date de sortie prévue : ${calculatedExit}.`);
  };

  // Open modal to finalize lease departure & settlement
  const handleOpenFinalizeModal = (prv: any) => {
    setSelectedPreavis(prv);
    setFinalDeductions(String(prv.deductions || 0));
    setFinalExitDate(new Date().toISOString().slice(0, 10));
    setFinalNotes(prv.notes || "Remise des clés effectuée. État des lieux vérifié.");
    setIsFinalizeModalOpen(true);
  };

  // Confirm finalization (Clôture & Résiliation effective)
  const handleConfirmFinalize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPreavis) return;

    const notifFormatted = new Date(finalExitDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

    // Update preavis status to RÉSILIÉ
    const updatedPreavisList = preavisList.map((item: any) => {
      if (item.id === selectedPreavis.id) {
        return {
          ...item,
          status: "RÉSILIÉ",
          deductions: Number(finalDeductions) || 0,
          effectiveExitDate: notifFormatted,
          notes: finalNotes
        };
      }
      return item;
    });

    savePreavisList(updatedPreavisList);

    // Update lease status to RÉSILIÉ
    const storedBaux = localStorage.getItem("gestimmo_baux");
    if (storedBaux) {
      try {
        let bauxArr: any[] = JSON.parse(storedBaux);
        bauxArr = bauxArr.map((b: any) => {
          if (b.id === selectedPreavis.leaseId || b.unit === selectedPreavis.unit) {
            return { ...b, status: "RÉSILIÉ", endDate: notifFormatted };
          }
          return b;
        });
        localStorage.setItem("gestimmo_baux", JSON.stringify(bauxArr));
        setLeases(bauxArr);
      } catch (e) {}
    }

    // Update logement status to VACANT
    const storedLogements = localStorage.getItem("gestimmo_logements");
    if (storedLogements) {
      try {
        let logArr: any[] = JSON.parse(storedLogements);
        logArr = logArr.map((l: any) => {
          if (l.id === selectedPreavis.unit) {
            return { ...l, status: "VACANT", tenant: "-" };
          }
          return l;
        });
        localStorage.setItem("gestimmo_logements", JSON.stringify(logArr));
        setLogements(logArr);
      } catch (e) {}
    }

    // Persist finalized notice to Supabase DB
    if (selectedPreavis.id && !selectedPreavis.id.startsWith("PRV-")) {
      updateLeaseNotice(selectedPreavis.id, {
        status: "RÉSILIÉ",
        repairs_deducted: Number(finalDeductions) || 0,
        effective_exit_date: finalExitDate || new Date().toISOString().split("T")[0]
      }).catch(console.error);
    }
    if (selectedPreavis.leaseId && !selectedPreavis.leaseId.startsWith("BX-") && !selectedPreavis.leaseId.startsWith("L-")) {
      updateLease(selectedPreavis.leaseId, {
        status: "RÉSILIÉ",
        end_date: finalExitDate || new Date().toISOString().split("T")[0]
      }).catch(console.error);
    }
    if (selectedPreavis.unitId) {
      updateUnit(selectedPreavis.unitId, { status: "VACANT" }).catch(console.error);
    }

    setIsFinalizeModalOpen(false);
    alert(`Le bail de ${selectedPreavis.tenant} (Logement ${selectedPreavis.unit}) a été résilié et clôturé. Le logement est désormais répertorié VACANT.`);
  };

  // Print settlement document (Solde de Tout Compte)
  const handlePrintSettlement = (item: any) => {
    const netRefund = Math.max(0, Number(item.deposit || 0) - Number(item.deductions || 0));
    const printWindow = window.open("", "", "height=900,width=1100");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Solde de Tout Compte - ${item.tenant}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @page { margin: 1.5cm; }
              }
            </style>
          </head>
          <body class="p-8 bg-white font-sans text-gray-900 max-w-4xl mx-auto">
            <div class="border-b-2 border-primary pb-4 mb-6 flex justify-between items-end">
              <div>
                <h1 class="text-2xl font-bold text-gray-900">GESTIMMO</h1>
                <p class="text-sm font-semibold text-primary">Plateforme de Gestion Immobilière</p>
                <p class="text-xs text-gray-500 mt-1">Attestation de Décompte de Fin de Bail & Préavis</p>
              </div>
              <div class="text-right text-xs text-gray-500">
                <p>Édité le ${new Date().toLocaleDateString('fr-FR')}</p>
                <p class="font-bold text-gray-700 mt-0.5">Réf : ${item.id}</p>
              </div>
            </div>

            <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p class="text-gray-500">Locataire sortant :</p>
                <p class="text-sm font-bold text-gray-900">${item.tenant}</p>
                <p class="text-gray-600 mt-1">Logement : <strong>${item.unit}</strong> (${item.property})</p>
              </div>
              <div class="text-right">
                <p class="text-gray-500">Dates du préavis :</p>
                <p class="text-xs font-semibold text-gray-900">Notification : ${item.requestDate}</p>
                <p class="text-xs font-bold text-primary">Date d'effet / Sortie : ${item.exitDate}</p>
                <p class="text-[11px] text-gray-500 mt-0.5">Initiative : ${item.initiatedBy === 'LOCATAIRE' ? 'Du Locataire' : 'De l\'Agence'}</p>
              </div>
            </div>

            <h3 class="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Décompte Financier de la Caution</h3>
            <table class="w-full text-left text-xs border-collapse border border-gray-300 mb-6">
              <thead>
                <tr class="bg-gray-100 text-gray-800">
                  <th class="p-3 font-bold border-b">Libellé</th>
                  <th class="p-3 font-bold border-b text-right">Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b">
                  <td class="p-3 text-gray-800">Dépôt de garantie / Caution initiale versée</td>
                  <td class="p-3 text-right font-semibold text-gray-900">${formatFCFA(item.deposit)}</td>
                </tr>
                <tr class="border-b">
                  <td class="p-3 text-red-700">Retenues estimées / Frais de remise en état (travaux)</td>
                  <td class="p-3 text-right font-semibold text-red-600">-${formatFCFA(item.deductions)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-emerald-50 text-emerald-950 font-bold">
                  <td class="p-3 text-base">Net à restituer au locataire :</td>
                  <td class="p-3 text-right text-base text-emerald-700">${formatFCFA(netRefund)}</td>
                </tr>
              </tfoot>
            </table>

            <div class="border border-gray-200 rounded-xl p-4 text-xs text-gray-600 mb-8 bg-white">
              <p class="font-bold text-gray-900 mb-1">Motif & Observations :</p>
              <p>${item.reason} - ${item.notes || 'Aucune observation particulière.'}</p>
            </div>

            <div class="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200 text-xs">
              <div class="text-center">
                <p class="font-bold text-gray-800 mb-12">Signature du Locataire :</p>
                <p class="text-gray-400 font-serif italic">(Lu et approuvé)</p>
              </div>
              <div class="text-center">
                <p class="font-bold text-gray-800 mb-12">Pour l'Agence GESTIMMO :</p>
                <p class="text-gray-400 font-serif italic">(Cachet et signature)</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  if (!can("baux", "view")) {
    return <AccessDeniedCard moduleName="Baux & Résiliations" />;
  }

  // Filter calculations
  const filteredPreavis = preavisList.filter((item: any) => {
    if (statusFilter === "En préavis") return item.status === "EN PRÉAVIS";
    if (statusFilter === "Terminé") return item.status === "RÉSILIÉ" || item.status === "TERMINÉ";
    return true;
  }).filter((item: any) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.tenant?.toLowerCase().includes(q) ||
      item.unit?.toLowerCase().includes(q) ||
      item.property?.toLowerCase().includes(q) ||
      item.reason?.toLowerCase().includes(q)
    );
  });

  // Active notice count & monthly rent value soon released
  const activeNoticeCount = preavisList.filter(p => p.status === "EN PRÉAVIS").length;
  const terminatedCount = preavisList.filter(p => p.status === "RÉSILIÉ" || p.status === "TERMINÉ").length;
  const totalNetDepositToRefund = preavisList
    .filter(p => p.status === "EN PRÉAVIS")
    .reduce((sum, p) => sum + Math.max(0, Number(p.deposit || 0) - Number(p.deductions || 0)), 0);

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Résiliations & Préavis de Départ</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivi des congés de bail, baux en préavis, états des lieux de sortie et solde de tout compte.
          </p>
        </div>

        {can("baux", "edit") && (
          <button
            onClick={handleOpenNewPreavisModal}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Saisir un préavis de départ
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Baux en Préavis Actif</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{activeNoticeCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Dossiers de départ en cours</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Départs Clôturés</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{terminatedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Clés remises & unités libérées</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Cautions à Restituer</span>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatFCFA(totalNetDepositToRefund)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Net estimé après retenues</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
        {/* Table Filter Header */}
        <div className="p-6 border-b border-app-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Rechercher locataire, bien, motif..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-app-border rounded-xl text-xs text-gray-900 w-full outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-gray-600">Statut :</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-app-border rounded-xl px-3 py-2 text-xs bg-white font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="Tous statuts">Tous les dossiers</option>
                <option value="En préavis">En préavis (Actifs)</option>
                <option value="Terminé">Clôturés / Résiliés</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Locataire Concerné</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Logement & Bien</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Dates du Préavis</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Initiative & Motif</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Caution Net</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Statut</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border text-xs">
              {filteredPreavis.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    Aucun préavis ou résiliation ne correspond à vos critères.
                  </td>
                </tr>
              ) : (
                filteredPreavis.map((term) => {
                  const netRefund = Math.max(0, Number(term.deposit || 0) - Number(term.deductions || 0));
                  const isPending = term.status === "EN PRÉAVIS";
                  return (
                    <tr key={term.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mr-3 font-bold shrink-0">
                            <UserMinus className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-900">{term.tenant}</span>
                            <p className="text-[11px] text-gray-500">{term.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-gray-900">{formatUnitDisplay(term.unit).toLowerCase().startsWith("studio") || formatUnitDisplay(term.unit).toLowerCase().startsWith("appartement") || formatUnitDisplay(term.unit).toLowerCase().startsWith("villa") || formatUnitDisplay(term.unit).toLowerCase().startsWith("magasin") ? formatUnitDisplay(term.unit) : `Appartement ${formatUnitDisplay(term.unit)}`}</p>
                        <p className="text-xs text-gray-500">{term.property}</p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-gray-500 text-[11px]">Notifié : {term.requestDate}</span>
                          <span className="text-xs font-bold text-amber-700 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" /> Sortie : {term.exitDate}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                          {term.initiatedBy === "LOCATAIRE" ? "Locataire" : "Agence"}
                        </span>
                        <p className="text-xs text-gray-600 mt-1 truncate max-w-[150px]" title={term.reason}>
                          {term.reason}
                        </p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <p className="text-xs font-bold text-gray-900">{formatFCFA(netRefund)}</p>
                        {term.deductions > 0 && (
                          <span className="text-[10px] text-red-600 font-medium">
                            (Retenue: -{formatFCFA(term.deductions)})
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge dot variant={isPending ? "warning" : "default"}>
                          {term.status}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePrintSettlement(term)}
                            title="Imprimer l'attestation de décompte"
                            className="p-1.5 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors border border-app-border"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {isPending && can("baux", "edit") && (
                            <button
                              onClick={() => handleOpenFinalizeModal(term)}
                              className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Clôturer le bail
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 1 : SAISIR UN PRÉAVIS DE DÉPART */}
      {/* -------------------------------------------------------------------------- */}
      {isPreavisModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-app-border overflow-hidden flex flex-col">
            <div className="p-5 bg-amber-50 border-b border-app-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-amber-950">Déclarer un Préavis de Départ</h3>
              </div>
              <button onClick={() => setIsPreavisModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePreavis} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bail / Locataire Occupant *</label>
                <select
                  required
                  value={selectedLeaseId}
                  onChange={(e) => setSelectedLeaseId(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl text-xs font-semibold bg-white text-gray-900 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Sélectionner un bail / logement --</option>
                  {leases.filter(l => l.status === "ACTIF" || l.status === "OCCUPÉ").map(b => (
                    <option key={b.id} value={b.id}>
                      {b.tenant} - Logement {b.unit} ({b.property}) - {formatFCFA(b.rent)}
                    </option>
                  ))}
                  {/* Fallback if no active leases in state */}
                  {leases.length === 0 && (
                    <>
                      <option value="B-2026-084">Cora Richards - Logement A-101 (Résidence Les Flamboyants)</option>
                      <option value="B-2026-085">Alistair Dunlap - Logement B-204 (Résidence Les Flamboyants)</option>
                      <option value="B-2026-086">Bibi Shelton - Logement A-102 (Résidence Les Flamboyants)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date de notification *</label>
                  <input
                    type="date"
                    required
                    value={notificationDate}
                    onChange={(e) => setNotificationDate(e.target.value)}
                    className="w-full px-3 py-2 border border-app-border rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Durée du préavis *</label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-app-border rounded-xl text-xs font-semibold bg-white text-gray-900 focus:ring-2 focus:ring-primary/20"
                  >
                    <option value={1}>1 Mois</option>
                    <option value={2}>2 Mois</option>
                    <option value={3}>3 Mois (Standard)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
                <span className="text-amber-900 font-semibold">Date de sortie calculée : </span>
                <strong className="text-amber-700 font-bold ml-1">
                  {calculateExitDate(notificationDate, durationMonths)}
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Initiative *</label>
                  <select
                    value={initiatedBy}
                    onChange={(e) => setInitiatedBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-app-border rounded-xl text-xs font-semibold bg-white text-gray-900"
                  >
                    <option value="LOCATAIRE">Du Locataire</option>
                    <option value="AGENCE">De l'Agence / Bailleur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Motif du départ *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Déménagement, Achat..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-app-border rounded-xl text-xs text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Retenues sur caution prévues (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={estimatedDeductions}
                  onChange={(e) => setEstimatedDeductions(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl text-xs text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Observations & Notes</label>
                <textarea
                  rows={2}
                  placeholder="Précisions sur l'état des lieux ou la remise des clés..."
                  value={preavisNotes}
                  onChange={(e) => setPreavisNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl text-xs text-gray-900 resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setIsPreavisModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 shadow-sm"
                >
                  Enregistrer le Préavis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 2 : CLÔTURER ET RÉSILIER LE BAIL (SOLDE DE TOUT COMPTE) */}
      {/* -------------------------------------------------------------------------- */}
      {isFinalizeModalOpen && selectedPreavis && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-app-border overflow-hidden flex flex-col">
            <div className="p-5 bg-emerald-50 border-b border-app-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-emerald-950">Clôturer le Bail & Restitution</h3>
              </div>
              <button onClick={() => setIsFinalizeModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmFinalize} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <p className="font-bold text-gray-900">{selectedPreavis.tenant}</p>
                <p className="text-gray-500 mt-0.5">{formatUnitDisplay(selectedPreavis.unit)} ({selectedPreavis.property})</p>
                <p className="text-gray-500">Caution initiale : <strong>{formatFCFA(selectedPreavis.deposit)}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Date effective d'état des lieux & sortie *</label>
                <input
                  type="date"
                  required
                  value={finalExitDate}
                  onChange={(e) => setFinalExitDate(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl text-xs text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Retenues finales travaux / impayés (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  value={finalDeductions}
                  onChange={(e) => setFinalDeductions(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl text-xs text-gray-900"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex justify-between items-center">
                <span className="font-bold text-emerald-950">Solde Net à restituer :</span>
                <span className="text-base font-bold text-emerald-700">
                  {formatFCFA(Math.max(0, Number(selectedPreavis.deposit || 0) - Number(finalDeductions || 0)))}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Notes de clôture</label>
                <textarea
                  rows={2}
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl text-xs text-gray-900 resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setIsFinalizeModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                >
                  Confirmer la Résiliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResiliationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Chargement des préavis et résiliations...</div>}>
      <ResiliationsPageInner />
    </Suspense>
  );
}
