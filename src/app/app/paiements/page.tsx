"use client"; // force recompilation

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Search, CreditCard, Download, X, Save, AlertCircle, Trash2, CheckSquare, Square, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { loadAllDataFromDatabase, createPayment, deletePayment } from "@/lib/dataService";
import { formatUnitDisplay, getPaymentDisplayCode, getLeaseDisplayCode, syncPaymentsWithLeases } from "@/lib/utils";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const parseFrenchDate = (dateStr: string) => {
  if (!dateStr) return null;
  const months: { [key: string]: number } = {
    'janv.': 0, 'janvier': 0, 'févr.': 1, 'février': 1, 'mars': 2, 'avr.': 3, 'avril': 3,
    'mai': 4, 'juin': 5, 'juil.': 6, 'juillet': 6, 'août': 7, 'sept.': 8, 'septembre': 8,
    'oct.': 9, 'octobre': 9, 'nov.': 10, 'novembre': 10, 'déc.': 11, 'décembre': 11
  };
  const parts = dateStr.toLowerCase().split(' ');
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = months[parts[1]];
    const year = parseInt(parts[2], 10);
    if (month !== undefined) return new Date(year, month, day);
  }
  return null;
};

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const parsePeriod = (str: string): { year: number; month: number; key: string; label: string } | null => {
  if (!str) return null;
  const s = str.trim();

  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      const monthName = MONTH_NAMES_FR[m - 1];
      return { year: y, month: m, key: `${y}-${m.toString().padStart(2, "0")}`, label: `${monthName} ${y}` };
    }
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

  const parts = s.toLowerCase().split(/[\s,]+/);
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
    const monthName = MONTH_NAMES_FR[foundMonth - 1];
    const key = `${foundYear}-${foundMonth.toString().padStart(2, "0")}`;
    return { year: foundYear, month: foundMonth, key, label: `${monthName} ${foundYear}` };
  }

  return null;
};

const getLeaseMonthOptions = (selectedLease: any, payments: any[]) => {
  if (!selectedLease) return { options: [], paidPeriodLabels: [], firstUnpaidPeriod: "" };

  const parsedStart = parsePeriod(selectedLease.start);
  const now = new Date();
  const startYear = parsedStart ? parsedStart.year : now.getFullYear();
  const startMonth = parsedStart ? parsedStart.month : 1;

  const paidKeys = new Set<string>();
  const paidPeriodLabels: string[] = [];

  payments.forEach((p) => {
    const matchTenant = p.tenant && selectedLease.tenant && p.tenant.trim().toLowerCase() === selectedLease.tenant.trim().toLowerCase();
    const matchUnit = p.unit && selectedLease.unit && p.unit.trim().toLowerCase() === selectedLease.unit.trim().toLowerCase();
    const isPaidStatus = p.status === "VALIDÉ" || p.status === "PAYÉ" || p.status === "EN ATTENTE";

    if ((matchTenant || matchUnit) && isPaidStatus) {
      const parsedP = parsePeriod(p.period);
      if (parsedP) {
        paidKeys.add(parsedP.key);
        if (!paidPeriodLabels.includes(parsedP.label)) {
          paidPeriodLabels.push(parsedP.label);
        }
      }
    }
  });

  const options: Array<{ key: string; value: string; label: string; disabled: boolean; isPaid: boolean }> = [];
  const startTotalMonths = startYear * 12 + startMonth;
  let firstUnpaidPeriod = "";

  for (let i = 0; i < 24; i++) {
    const currentTotal = startTotalMonths + i;
    const y = Math.floor((currentTotal - 1) / 12);
    const m = ((currentTotal - 1) % 12) + 1;

    const key = `${y}-${m.toString().padStart(2, "0")}`;
    const baseLabel = `${MONTH_NAMES_FR[m - 1]} ${y}`;
    const isPaid = paidKeys.has(key);

    if (!isPaid && !firstUnpaidPeriod) {
      firstUnpaidPeriod = baseLabel;
    }

    options.push({
      key,
      value: baseLabel,
      label: isPaid ? `${baseLabel} — (Déjà payé - Grisé)` : baseLabel,
      disabled: isPaid,
      isPaid
    });
  }

  return { options, paidPeriodLabels, firstUnpaidPeriod };
};

const checkPreviousMonthPaid = (selectedLease: any, selectedPeriodStr: string, payments: any[]) => {
  if (!selectedLease || !selectedPeriodStr) {
    return { isPrevMonthUnpaid: false, missingPrevMonthLabel: "" };
  }

  const parsedCurrent = parsePeriod(selectedPeriodStr);
  if (!parsedCurrent) {
    return { isPrevMonthUnpaid: false, missingPrevMonthLabel: "" };
  }

  const prevYear = parsedCurrent.month === 1 ? parsedCurrent.year - 1 : parsedCurrent.year;
  const prevMonth = parsedCurrent.month === 1 ? 12 : parsedCurrent.month - 1;
  const prevKey = `${prevYear}-${prevMonth.toString().padStart(2, "0")}`;
  const prevLabel = `${MONTH_NAMES_FR[prevMonth - 1]} ${prevYear}`;

  const parsedStart = parsePeriod(selectedLease.start);
  if (parsedStart) {
    const startTotalMonths = parsedStart.year * 12 + parsedStart.month;
    const prevTotalMonths = prevYear * 12 + prevMonth;

    if (prevTotalMonths < startTotalMonths) {
      return { isPrevMonthUnpaid: false, missingPrevMonthLabel: "" };
    }
  }

  const isPaid = payments.some((p) => {
    const matchTenant = p.tenant && selectedLease.tenant && p.tenant.trim().toLowerCase() === selectedLease.tenant.trim().toLowerCase();
    const matchUnit = p.unit && selectedLease.unit && p.unit.trim().toLowerCase() === selectedLease.unit.trim().toLowerCase();
    const isPaidStatus = p.status === "VALIDÉ" || p.status === "PAYÉ" || p.status === "EN ATTENTE";

    if ((matchTenant || matchUnit) && isPaidStatus) {
      const parsedP = parsePeriod(p.period);
      return parsedP && parsedP.key === prevKey;
    }
    return false;
  });

  if (!isPaid) {
    return { isPrevMonthUnpaid: true, missingPrevMonthLabel: prevLabel };
  }

  return { isPrevMonthUnpaid: false, missingPrevMonthLabel: "" };
};

const initialOwners = [
  { id: "O-123", code: "PR-KI-100123", type: "entreprise", name: "Kouadio Invest", phone: "+225 0102030405", email: "contact@kouadio-invest.com" },
  { id: "O-124", code: "PR-MT-100124", type: "particulier", name: "Mme. Traoré", phone: "+225 0708091011", email: "traore@email.com" },
  { id: "O-125", code: "PR-SZ-100125", type: "entreprise", name: "SCI Zenith", phone: "+225 0506070809", email: "gestion@scizenith.com" },
];

const initialBiens = [
  { id: "B-001", name: "Résidence Les Flamboyants", type: "Immeuble", owner: "Kouadio Invest", units: 24, occupied: 22, revenue: 3500000 },
  { id: "B-002", name: "Villa Palmeraie", type: "Villa", owner: "Mme. Traoré", units: 1, occupied: 1, revenue: 800000 },
  { id: "B-003", name: "Immeuble Horizon", type: "Immeuble", owner: "Biens Propres", units: 40, occupied: 38, revenue: 5200000 },
  { id: "B-004", name: "Complexe Riviera", type: "Résidence fermée", owner: "SCI Zenith", units: 15, occupied: 12, revenue: 2100000 },
];

const initialLogements = [
  { id: "A-101", property: "Résidence Les Flamboyants", type: "3 Pièces", rent: 150000, tenant: "Cora Richards", status: "OCCUPÉ" },
  { id: "A-102", property: "Résidence Les Flamboyants", type: "4 Pièces", rent: 200000, tenant: "Bibi Shelton", status: "OCCUPÉ" },
  { id: "B-201", property: "Résidence Les Flamboyants", type: "3 Pièces", rent: 150000, tenant: "-", status: "NON OCCUPÉ" },
  { id: "B-204", property: "Résidence Les Flamboyants", type: "2 Pièces", rent: 3150000, tenant: "Alistair Dunlap", status: "OCCUPÉ" },
  { id: "V-001", property: "Villa Palmeraie", type: "Villa", rent: 800000, tenant: "Jean Dupont", status: "OCCUPÉ" },
  { id: "C-101", property: "Complexe Riviera", type: "Duplex", rent: 2100000, tenant: "Sery Paul", status: "OCCUPÉ" },
];

const initialTenants = [
  { id: "T-892", name: "Cora Richards", phone: "+225 0102030405", email: "cora@email.com", unit: "A-101", property: "Résidence Les Flamboyants", rent: 150000, status: "À JOUR", registeredAt: "2026-01-10T08:00:00Z" },
  { id: "T-893", name: "Alistair Dunlap", phone: "+225 0506070809", email: "alistair@email.com", unit: "B-204", property: "Résidence Les Flamboyants", rent: 3150000, status: "EN RETARD", registeredAt: "2026-01-12T09:30:00Z" },
  { id: "T-894", name: "Bibi Shelton", phone: "+225 0708091011", email: "bibi@email.com", unit: "A-102", property: "Résidence Les Flamboyants", rent: 200000, status: "À JOUR", registeredAt: "2026-01-15T11:00:00Z" },
  { id: "T-895", name: "Jean Dupont", phone: "+225 0910111213", email: "jean@email.com", unit: "V-001", property: "Villa Palmeraie", rent: 850000, status: "EN RETARD", registeredAt: "2026-01-20T14:15:00Z" },
  { id: "T-896", name: "Addie Bradford", phone: "+225 0203040506", email: "addie@email.com", unit: "B-205", property: "Résidence Les Flamboyants", rent: 220000, status: "IMPAYÉ", registeredAt: "2026-02-01T10:00:00Z" },
  { id: "T-897", name: "Koffi Mensah", phone: "+225 0101010101", email: "koffi@email.com", unit: "-", property: "-", rent: 0, status: "EN ATTENTE", registeredAt: "2026-02-05T09:00:00Z" },
  { id: "T-898", name: "Fatou Diop", phone: "+225 0202020202", email: "fatou@email.com", unit: "-", property: "-", rent: 0, status: "EN ATTENTE", registeredAt: "2026-02-10T16:45:00Z" },
];

const initialBaux = [
  { id: "L-101", tenant: "Cora Richards", unit: "A-101", rent: 150000, start: "01 Janv 2026", status: "ACTIF" },
  { id: "L-102", tenant: "Bibi Shelton", unit: "A-102", rent: 200000, start: "01 Janv 2026", status: "ACTIF" },
  { id: "L-204", tenant: "Alistair Dunlap", unit: "B-204", rent: 3150000, start: "01 Fév 2026", status: "ACTIF" },
  { id: "L-205", tenant: "Addie Bradford", unit: "B-205", rent: 220000, start: "01 Janv 2026", status: "ACTIF" },
  { id: "L-001", tenant: "Jean Dupont", unit: "V-001", rent: 800000, start: "01 Janv 2026", status: "ACTIF" },
  { id: "L-301", tenant: "Sery Paul", unit: "C-101", rent: 2100000, start: "01 Mars 2026", status: "ACTIF" },
];

const initialPayments = [
  { id: "P-1925", tenant: "Cora Richards", unit: "A-101", date: "05 Sept 2026", period: "Septembre 2026", amount: 150000, method: "Virement", status: "VALIDÉ" },
  { id: "P-1926", tenant: "Alistair Dunlap", unit: "B-204", date: "06 Sept 2026", period: "Septembre 2026", amount: 3150000, method: "Wave", status: "EN RETARD" },
  { id: "P-1927", tenant: "Bibi Shelton", unit: "A-102", date: "07 Sept 2026", period: "Septembre 2026", amount: 200000, method: "Espèces", status: "VALIDÉ" },
  { id: "P-1928", tenant: "Jean Dupont", unit: "V-001", date: "01 Sept 2026", period: "Septembre 2026", amount: 800000, method: "Chèque", status: "REJETÉ" },
  { id: "P-1929", tenant: "Addie Bradford", unit: "B-205", date: "02 Sept 2026", period: "Septembre 2026", amount: 220000, method: "Espèces", status: "IMPAYÉ" },
];

function PaymentsPageInner() {
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [logements, setLogements] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("Tous modes");
  const [statusFilter, setStatusFilter] = useState("Tous statuts");
  const [ownerFilter, setOwnerFilter] = useState("Tous les propriétaires");
  const [propertyFilter, setPropertyFilter] = useState("Tous les biens");

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Selection and Delete modal states
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    idsToDelete: string[];
    isBulk: boolean;
    label?: string;
    leaseCode?: string;
    tenant?: string;
    unit?: string;
  } | null>(null);

  // Modal filters before Locataire selection
  const [modalOwnerFilter, setModalOwnerFilter] = useState("Tous les propriétaires");
  const [modalPropertyFilter, setModalPropertyFilter] = useState("Tous les biens");

  // Modal form states
  const [newLeaseId, setNewLeaseId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newPeriod, setNewPeriod] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newMethod, setNewMethod] = useState("Virement");
  const [newTransferNumber, setNewTransferNumber] = useState("");

  useEffect(() => {
    const initData = async () => {
      let pList: any[] = [];
      let bList: any[] = [];
      let tList: any[] = [];
      let uList: any[] = [];
      let propList: any[] = [];
      let oList: any[] = [];

      const dbState = await loadAllDataFromDatabase();
      if (dbState) {
        pList = dbState.payments;
        bList = dbState.leases;
        tList = dbState.tenants;
        uList = dbState.units;
        propList = dbState.properties;
        oList = dbState.owners;
      } else {
        const storedPayments = localStorage.getItem("gestimmo_paiements");
        pList = storedPayments ? JSON.parse(storedPayments) : initialPayments;

        const storedLeases = localStorage.getItem("gestimmo_baux");
        bList = storedLeases ? JSON.parse(storedLeases) : initialBaux;

        const storedTenants = localStorage.getItem("gestimmo_locataires");
        tList = storedTenants ? JSON.parse(storedTenants) : initialTenants;

        const storedLogements = localStorage.getItem("gestimmo_logements");
        uList = storedLogements ? JSON.parse(storedLogements) : initialLogements;

        const storedBiens = localStorage.getItem("gestimmo_biens");
        propList = storedBiens ? JSON.parse(storedBiens) : initialBiens;

        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        oList = storedOwners ? JSON.parse(storedOwners) : initialOwners;
      }

      const syncedPayments = syncPaymentsWithLeases(pList, bList);

      setPayments(syncedPayments);
      setLeases(bList);
      setTenants(tList);
      setLogements(uList);
      setBiens(propList);
      setOwners(oList);

      if (typeof window !== "undefined" && syncedPayments.length > 0) {
        localStorage.setItem("gestimmo_paiements", JSON.stringify(syncedPayments));
      }
    };

    initData();

    const handleUpdate = () => {
      initData();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("gestimmo_paiements_updated", handleUpdate);
    window.addEventListener("gestimmo_baux_updated", handleUpdate);
    window.addEventListener("gestimmo_locataires_updated", handleUpdate);
    window.addEventListener("gestimmo_logements_updated", handleUpdate);

    // Apply URL query param filter
    const urlStatus = searchParams.get("status");
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("gestimmo_paiements_updated", handleUpdate);
      window.removeEventListener("gestimmo_baux_updated", handleUpdate);
      window.removeEventListener("gestimmo_locataires_updated", handleUpdate);
      window.removeEventListener("gestimmo_logements_updated", handleUpdate);
    };
  }, [searchParams]);


  const getPropertyForUnit = (item: any) => {
    if (!item) return "-";
    if (typeof item === "object" && item.property) return item.property;

    const unitId = typeof item === "string" ? item : (item?.unit || "");
    const tenantName = typeof item === "object" ? (item?.tenant || "") : "";

    const logement = logements.find(l => 
      (l.id && unitId && l.id.trim().toUpperCase() === unitId.trim().toUpperCase()) ||
      (l.name && unitId && l.name.trim().toUpperCase() === unitId.trim().toUpperCase()) ||
      (l.tenant && tenantName && l.tenant.trim().toUpperCase() === tenantName.trim().toUpperCase())
    );
    if (logement && logement.property) return logement.property;

    const lease = leases.find((b: any) =>
      (b.unit && unitId && b.unit.trim().toUpperCase() === unitId.trim().toUpperCase()) ||
      (b.tenant && tenantName && b.tenant.trim().toUpperCase() === tenantName.trim().toUpperCase())
    );
    if (lease && lease.property) return lease.property;

    return "-";
  };

  const getOwnerForUnit = (item: any) => {
    if (!item) return "-";
    if (typeof item === "object" && item.owner) return item.owner;

    const propName = getPropertyForUnit(item);
    if (propName && propName !== "-") {
      const bien = biens.find(b => b.name && b.name.trim().toUpperCase() === propName.trim().toUpperCase());
      if (bien && bien.owner) return bien.owner;
    }
    return "-";
  };

  // --- Filtres en cascade de la Modale "Encaisser un loyer" ---
  const modalFilteredBiens = modalOwnerFilter === "Tous les propriétaires"
    ? biens
    : biens.filter(b => b.owner === modalOwnerFilter);

  const modalFilteredLeases = leases.filter((l: any) => {
    const owner = getOwnerForUnit(l.unit);
    const prop = getPropertyForUnit(l.unit);
    const matchOwner = modalOwnerFilter === "Tous les propriétaires" || owner === modalOwnerFilter;
    const matchProperty = modalPropertyFilter === "Tous les biens" || prop === modalPropertyFilter;
    return matchOwner && matchProperty;
  });

  const handleOpenModal = () => {
    setModalOwnerFilter("Tous les propriétaires");
    setModalPropertyFilter("Tous les biens");
    setNewLeaseId("");
    setNewDate(new Date().toISOString().split("T")[0]);
    setNewPeriod(new Date().toISOString().slice(0, 7));
    setNewAmount("");
    setNewMethod("Virement");
    setNewTransferNumber("");
    setIsModalOpen(true);
  };

  const handleSavePayment = () => {
    const selectedLease = leases.find(l => l.id === newLeaseId);
    if (!selectedLease) return;

    const leaseStartDate = parseFrenchDate(selectedLease.start);
    const leaseEndDate = selectedLease.end ? parseFrenchDate(selectedLease.end) : null;

    if (newDate && leaseStartDate) {
      const paymentDate = new Date(newDate);
      if (paymentDate < leaseStartDate) {
        alert(`La date d'encaissement ne peut pas être antérieure à la date de début du bail (${selectedLease.start}).`);
        return;
      }
    }

    if (newPeriod && leaseStartDate) {
      const parsedP = parsePeriod(newPeriod);
      if (parsedP) {
        const periodValue = parsedP.year * 12 + parsedP.month;
        const startValue = leaseStartDate.getFullYear() * 12 + (leaseStartDate.getMonth() + 1);
        
        if (periodValue < startValue) {
          alert(`La période payée ne peut pas être antérieure au mois de début du bail (${selectedLease.start}).`);
          return;
        }

        if (leaseEndDate) {
          const endValue = leaseEndDate.getFullYear() * 12 + (leaseEndDate.getMonth() + 1);
          if (periodValue > endValue) {
            alert(`La période payée ne peut pas être postérieure au mois de fin du bail (${selectedLease.end}).`);
            return;
          }
        }
      }
    }

    // Verify duplicate payment
    const parsedNewPeriod = parsePeriod(newPeriod);
    const isDuplicate = payments.some(p => {
      const isSameTenantOrUnit = (p.tenant && p.tenant === selectedLease.tenant) || (p.unit && p.unit === selectedLease.unit);
      if (!isSameTenantOrUnit || p.status === "REJETÉ") return false;
      const parsedP = parsePeriod(p.period);
      return parsedP && parsedNewPeriod && parsedP.key === parsedNewPeriod.key;
    });

    if (isDuplicate) {
      alert("Un paiement a déjà été enregistré pour ce locataire à cette période (période déjà payée).");
      return;
    }

    const prevCheck = checkPreviousMonthPaid(selectedLease, newPeriod, payments);
    if (prevCheck.isPrevMonthUnpaid) {
      alert(`Impossible d'enregistrer le paiement : le locataire doit d'abord régler le mois précédent (${prevCheck.missingPrevMonthLabel}).`);
      return;
    }

    const dateObj = newDate ? new Date(newDate) : new Date();
    const formattedDate = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

    const tempId = `P-${Math.floor(2000 + Math.random() * 8000)}`;

    const newPayment = {
      id: tempId,
      tenant: selectedLease ? selectedLease.tenant.toUpperCase() : "LOCATAIRE INCONNU",
      unit: selectedLease ? selectedLease.unit.toUpperCase() : "-",
      date: formattedDate,
      period: newPeriod,
      amount: parseInt(newAmount) || 0,
      method: newMethod ? newMethod.toUpperCase() : "VIREMENT",
      transferNumber: newTransferNumber ? newTransferNumber.toUpperCase() : "",
      status: "PAYÉ"
    };
    
    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    localStorage.setItem("gestimmo_paiements", JSON.stringify(updatedPayments));

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("gestimmo_paiements_updated"));
    }

    // Async save to Supabase
    createPayment({
      amount: parseInt(newAmount) || 0,
      lease_id: selectedLease?.id && !selectedLease.id.startsWith("L-") ? selectedLease.id : null,
      tenant_id: selectedLease?.tenantId || null,
      unit_id: selectedLease?.unitId || null,
      payment_date: newDate || new Date().toISOString().split("T")[0],
      payment_method: (newMethod || "VIREMENT").toUpperCase(),
      period_month: newPeriod || new Date().toISOString().slice(0, 7),
      status: "PAYÉ"
    }).then((created) => {
      if (created) {
        setPayments(prev => prev.map(p => p.id === tempId ? { ...p, id: created.id } : p));
      }
    }).catch(console.error);

    // Reset and close
    setNewLeaseId("");
    setNewDate("");
    setNewPeriod("");
    setNewAmount("");
    setNewMethod("Virement");
    setNewTransferNumber("");
    setIsModalOpen(false);
  };

  // ─── Génération des lignes virtuelles "EN RETARD" ──────────────────────────
  const now = new Date();
  const currentMonth = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const currentMonthCapitalized = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);

  // Real payments that represent unpaid / late / rejected rent
  const retardRealPayments = payments.filter(p => 
    p.status === "EN RETARD" || p.status === "IMPAYÉ" || p.status === "REJETÉ"
  );

  const overdueVirtualRows = leases
    .filter((lease: any) => {
      const hasAnyPayment = payments.some((p: any) => 
        ((p.tenant && lease.tenant && p.tenant.trim().toLowerCase() === lease.tenant.trim().toLowerCase()) ||
         (p.unit && lease.unit && p.unit.trim().toLowerCase() === lease.unit.trim().toLowerCase()))
      );

      const tenant = tenants.find((t: any) => 
        (t.name && lease.tenant && t.name.trim().toLowerCase() === lease.tenant.trim().toLowerCase()) ||
        (t.unit && lease.unit && t.unit.trim().toLowerCase() === lease.unit.trim().toLowerCase())
      );
      const isTenantOverdue = tenant && (tenant.status === "EN RETARD" || tenant.status === "IMPAYÉ");

      return isTenantOverdue || !hasAnyPayment;
    })
    .map((lease: any) => ({
      id: `RETARD-${lease.id}`,
      tenant: lease.tenant,
      unit: lease.unit,
      date: "-",
      period: currentMonthCapitalized,
      amount: lease.rent,
      method: "-",
      status: "EN RETARD",
      isVirtual: true,
      leaseId: lease.id,
    }));

  // ─── Filtre sur les paiements réels & virtuels ──────────────────────────────
  const isRetardFilter = statusFilter === "EN RETARD" || statusFilter === "En retard";

  const combinedPayments = isRetardFilter 
    ? [...retardRealPayments, ...overdueVirtualRows]
    : payments;

  const filteredPayments = combinedPayments.filter((payment) => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !searchTerm ||
      payment.id.toLowerCase().includes(term) ||
      payment.tenant.toLowerCase().includes(term) ||
      payment.unit.toLowerCase().includes(term);

    let matchMethod = true;
    if (!payment.isVirtual && methodFilter !== "Tous modes") {
      if (methodFilter === "Mobile Money (Wave/Orange)") {
        matchMethod = ["Wave", "Orange Money", "MTN Money", "MoMo", "Moov money"].includes(payment.method);
      } else {
        matchMethod = payment.method === methodFilter;
      }
    }

    let matchStatus = true;
    if (!isRetardFilter && statusFilter !== "Tous statuts") {
      if (statusFilter === "Payé") matchStatus = payment.status === "PAYÉ" || payment.status === "VALIDÉ";
      if (statusFilter === "Impayés") matchStatus = payment.status === "IMPAYÉ" || payment.status === "REJETÉ";
      if (statusFilter === "En attente") matchStatus = payment.status === "EN ATTENTE";
    }

    const matchOwner = ownerFilter === "Tous les propriétaires" || getOwnerForUnit(payment) === ownerFilter;
    const matchProperty = propertyFilter === "Tous les biens" || getPropertyForUnit(payment) === propertyFilter;

    return matchSearch && matchMethod && matchStatus && matchOwner && matchProperty;
  });

  const filteredBiens = ownerFilter === "Tous les propriétaires"
    ? biens
    : biens.filter(b => b.owner === ownerFilter);

  // Pré-remplir le formulaire Encaisser avec un locataire en retard
  const handleEncaisserRetard = (row: any) => {
    const lease = leases.find((l: any) => 
      (row.leaseId && l.id === row.leaseId) ||
      (row.unit && l.unit && l.unit.trim().toLowerCase() === row.unit.trim().toLowerCase()) ||
      (row.tenant && l.tenant && l.tenant.trim().toLowerCase() === row.tenant.trim().toLowerCase())
    );
    if (lease) {
      setModalOwnerFilter(getOwnerForUnit(lease.unit));
      setModalPropertyFilter(getPropertyForUnit(lease.unit));
      setNewLeaseId(lease.id);
      setNewAmount(lease.rent ? lease.rent.toString() : (row.amount ? row.amount.toString() : ""));
      const monthOpts = getLeaseMonthOptions(lease, payments);
      if (monthOpts.firstUnpaidPeriod) {
        setNewPeriod(monthOpts.firstUnpaidPeriod);
      }
    }
    setIsModalOpen(true);
  };

  const realFilteredPayments = filteredPayments.filter(p => !p.isVirtual);

  const toggleSelectPayment = (id: string) => {
    setSelectedPaymentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const realIds = realFilteredPayments.map(p => p.id);
    const isAllSelected = realIds.length > 0 && realIds.every(id => selectedPaymentIds.includes(id));
    if (isAllSelected) {
      setSelectedPaymentIds(prev => prev.filter(id => !realIds.includes(id)));
    } else {
      setSelectedPaymentIds(prev => Array.from(new Set([...prev, ...realIds])));
    }
  };

  const openDeleteModal = (ids: string[], isBulk = false, paymentItemOrLabel?: any) => {
    let label = "";
    let leaseCode = "";
    let tenant = "";
    let unit = "";

    const paymentObj = (paymentItemOrLabel && typeof paymentItemOrLabel === "object")
      ? paymentItemOrLabel
      : payments.find((p: any) => ids.length === 1 && p.id === ids[0]);

    if (paymentObj) {
      label = getPaymentDisplayCode(paymentObj);
      tenant = paymentObj.tenant || "";
      unit = paymentObj.unit || "";

      const matchedLease = leases.find((l: any) =>
        (paymentObj.leaseId && l.id === paymentObj.leaseId) ||
        (paymentObj.tenant && l.tenant && l.tenant.trim().toLowerCase() === paymentObj.tenant.trim().toLowerCase()) ||
        (paymentObj.unit && l.unit && l.unit.trim().toLowerCase() === paymentObj.unit.trim().toLowerCase())
      );

      if (matchedLease) {
        leaseCode = getLeaseDisplayCode(matchedLease);
      } else if (paymentObj.leaseId) {
        leaseCode = getLeaseDisplayCode(paymentObj.leaseId);
      }
    } else if (typeof paymentItemOrLabel === "string" && paymentItemOrLabel) {
      label = getPaymentDisplayCode(paymentItemOrLabel);
    } else if (ids.length === 1) {
      label = getPaymentDisplayCode(ids[0]);
    }

    setDeleteConfirmModal({
      isOpen: true,
      idsToDelete: ids,
      isBulk,
      label,
      leaseCode,
      tenant,
      unit
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmModal || deleteConfirmModal.idsToDelete.length === 0) return;

    const idsToRemove = new Set(deleteConfirmModal.idsToDelete);
    const updatedPayments = payments.filter((p: any) => !idsToRemove.has(p.id));

    setPayments(updatedPayments);
    localStorage.setItem("gestimmo_paiements", JSON.stringify(updatedPayments));

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("gestimmo_paiements_updated"));
    }

    for (const id of deleteConfirmModal.idsToDelete) {
      deletePayment(id).catch(console.error);
    }

    setSelectedPaymentIds(prev => prev.filter(id => !idsToRemove.has(id)));
    setDeleteConfirmModal(null);
  };

  if (!can("paiements", "view")) {
    return <AccessDeniedCard moduleName="Paiements & Reçus" />;
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 relative">
      {/* Modal Overlay : Encaisser un loyer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Encaisser un loyer</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Filtre 1 : Propriétaire */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                  value={modalOwnerFilter}
                  onChange={(e) => {
                    setModalOwnerFilter(e.target.value);
                    setModalPropertyFilter("Tous les biens");
                    setNewLeaseId("");
                    setNewAmount("");
                    setNewPeriod("");
                  }}
                >
                  <option value="Tous les propriétaires">Tous les propriétaires</option>
                  {Array.from(new Set(owners.filter((o: any) => o.name !== "Biens Propres").map((o: any) => o.name).filter(Boolean))).map((ownerName: string) => (
                    <option key={ownerName} value={ownerName}>{ownerName}</option>
                  ))}
                </select>
              </div>

              {/* Filtre 2 : Bien Immobilier (dépendant du Propriétaire) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bien immobilier</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                  value={modalPropertyFilter}
                  onChange={(e) => {
                    setModalPropertyFilter(e.target.value);
                    setNewLeaseId("");
                    setNewAmount("");
                    setNewPeriod("");
                  }}
                >
                  <option value="Tous les biens">Tous les biens</option>
                  {modalFilteredBiens.map((b: any) => (
                    <option key={b.id || b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Champ 3 : Locataire (Bail Actif) * (dépendant des filtres 1 et 2) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Locataire (Bail Actif) *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-semibold"
                  value={newLeaseId}
                  onChange={(e) => {
                    const leaseId = e.target.value;
                    setNewLeaseId(leaseId);
                    const selected = leases.find((l: any) => l.id === leaseId);
                    if (selected) {
                      setNewAmount(selected.rent.toString());
                      const monthOpts = getLeaseMonthOptions(selected, payments);
                      if (monthOpts.firstUnpaidPeriod) {
                        setNewPeriod(monthOpts.firstUnpaidPeriod);
                      }
                    }
                  }}
                >
                  <option value="" disabled>-- Sélectionner le locataire --</option>
                  {modalFilteredLeases.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.tenant} ({getPropertyForUnit(l.unit)} - {formatUnitDisplay(l.unit)})
                    </option>
                  ))}
                  {modalFilteredLeases.length === 0 && (
                    <option value="" disabled>Aucun locataire ne correspond à ces filtres</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de paiement *</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Période payée (Mois) *</label>
                {!newLeaseId ? (
                  <div className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-gray-50 text-gray-400 italic">
                    Veuillez d'abord sélectionner un locataire ci-dessus
                  </div>
                ) : (
                  (() => {
                    const selectedLease = leases.find((l: any) => l.id === newLeaseId);
                    const monthOpts = getLeaseMonthOptions(selectedLease, payments);
                    const prevCheck = checkPreviousMonthPaid(selectedLease, newPeriod, payments);

                    return (
                      <>
                        <select 
                          className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-medium" 
                          value={newPeriod}
                          onChange={(e) => setNewPeriod(e.target.value)}
                        >
                          <option value="" disabled>-- Sélectionner la période --</option>
                          {monthOpts.options.map((opt) => (
                            <option 
                              key={opt.key} 
                              value={opt.value} 
                              disabled={opt.disabled}
                              className={opt.disabled ? "bg-gray-100 text-gray-400 font-normal cursor-not-allowed" : "text-gray-900 font-semibold"}
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {prevCheck.isPrevMonthUnpaid && (
                          <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs shadow-sm">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-amber-900">Mois précédent non réglé ({prevCheck.missingPrevMonthLabel})</p>
                              <p className="text-amber-800 mt-0.5">
                                Le locataire doit d'abord régler le loyer du mois précédent (<strong>{prevCheck.missingPrevMonthLabel}</strong>) avant de pouvoir enregistrer ce paiement.
                              </p>
                            </div>
                          </div>
                        )}
                        {monthOpts.paidPeriodLabels.length > 0 ? (
                          <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mt-1 shrink-0" />
                            <span>
                              <strong>Périodes déjà réglées (grisées) :</strong> {monthOpts.paidPeriodLabels.join(", ")}
                            </span>
                          </p>
                        ) : (
                          <p className="text-xs text-green-600 mt-1.5">
                            ✓ Aucune période payée pour l'instant depuis le début du bail.
                          </p>
                        )}
                      </>
                    );
                  })()
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant encaissé (F CFA) *</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ex: 150000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                >
                  <option value="Virement">Virement</option>
                  <option value="Wave">Wave</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="MoMo">MoMo</option>
                  <option value="Moov money">Moov money</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Chèque">Chèque</option>
                </select>
              </div>

              {["Wave", "Orange Money", "MoMo", "Moov money"].includes(newMethod) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de transfert *</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    placeholder="Ex: CI230912..."
                    value={newTransferNumber}
                    onChange={(e) => setNewTransferNumber(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              {(() => {
                const selectedLease = leases.find((l: any) => l.id === newLeaseId);
                const prevCheck = checkPreviousMonthPaid(selectedLease, newPeriod, payments);
                const isSaveDisabled = !newLeaseId || !newPeriod || !newAmount || prevCheck.isPrevMonthUnpaid || (["Wave", "Orange Money", "MoMo", "Moov money"].includes(newMethod) && !newTransferNumber);

                return (
                  <button 
                    onClick={handleSavePayment}
                    disabled={isSaveDisabled}
                    title={prevCheck.isPrevMonthUnpaid ? `Le mois précédent (${prevCheck.missingPrevMonthLabel}) doit d'abord être réglé.` : ""}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" /> Enregistrer le paiement
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Encaissements &amp; Paiements</h1>
          <p className="text-sm text-gray-500 mt-1">Historique complet des paiements de loyers reçus.</p>
        </div>
        {can("paiements", "edit") && (
          <button onClick={handleOpenModal} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm w-fit">
            <CreditCard className="h-4 w-4 mr-2" /> Encaisser un loyer
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-app-border space-y-4">
          {selectedPaymentIds.length > 0 && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 animate-fadeIn">
              <span className="font-semibold flex items-center gap-2">
                <CheckSquare className="w-4.5 h-4.5 text-red-600" />
                {selectedPaymentIds.length} encaissement(s) sélectionné(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openDeleteModal(selectedPaymentIds, true)}
                  className="bg-red-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer la sélection
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentIds([])}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Rechercher (N° reçu, locataire)..." 
                className="pl-9 pr-4 py-2 border border-app-border rounded-lg text-sm w-full sm:w-80 outline-none focus:ring-2 focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={ownerFilter}
                onChange={(e) => {
                  setOwnerFilter(e.target.value);
                  setPropertyFilter("Tous les biens");
                }}
              >
                <option>Tous les propriétaires</option>
                {Array.from(new Set(owners.map(o => o.name).filter(Boolean))).map(ownerName => (
                  <option key={ownerName} value={ownerName}>{ownerName}</option>
                ))}
              </select>

              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
              >
                <option>Tous les biens</option>
                {filteredBiens.map(b => (
                  <option key={b.id || b.name} value={b.name}>{b.name}</option>
                ))}
              </select>

              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
              >
                <option>Tous modes</option>
                <option>Virement</option>
                <option>Mobile Money (Wave/Orange)</option>
                <option>Espèces</option>
                <option>Chèque</option>
              </select>
              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Tous statuts</option>
                <option>Payé</option>
                <option>Impayés</option>
                <option>En attente</option>
                <option value="EN RETARD">En retard</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                <th className="px-3 py-3.5 text-center w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    checked={realFilteredPayments.length > 0 && realFilteredPayments.every(p => selectedPaymentIds.includes(p.id))}
                    onChange={toggleSelectAll}
                    title="Tout sélectionner / désélectionner"
                  />
                </th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Reçu</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Date</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Locataire</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Propriétaire</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Période payée</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Montant</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Mode</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Statut</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filteredPayments.length > 0 ? filteredPayments.map((payment) => (
                <tr key={payment.id} className={`hover:bg-gray-50/50 transition-colors group ${payment.isVirtual ? 'bg-red-50/30' : selectedPaymentIds.includes(payment.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-3 py-4 text-center">
                    {!payment.isVirtual ? (
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        checked={selectedPaymentIds.includes(payment.id)}
                        onChange={() => toggleSelectPayment(payment.id)}
                      />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.isVirtual ? (
                      <span className="text-xs font-semibold text-red-500 bg-red-100 px-2 py-1 rounded-md">— NON PAYÉ —</span>
                    ) : payment.status === "VALIDÉ" || payment.status === "PAYÉ" ? (
                      <Link href={`/app/paiements/${payment.id}`} className="text-sm font-semibold text-primary hover:underline">
                        {getPaymentDisplayCode(payment)}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-gray-400 cursor-not-allowed">
                        {getPaymentDisplayCode(payment)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {payment.isVirtual ? (
                      <span className="text-red-400 font-medium text-xs">Échéance dépassée</span>
                    ) : payment.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{payment.tenant}</p>
                    <p className="text-xs text-gray-500">{formatUnitDisplay(payment.unit).toLowerCase().startsWith("studio") || formatUnitDisplay(payment.unit).toLowerCase().startsWith("appartement") || formatUnitDisplay(payment.unit).toLowerCase().startsWith("villa") || formatUnitDisplay(payment.unit).toLowerCase().startsWith("magasin") ? formatUnitDisplay(payment.unit) : `Appartement ${formatUnitDisplay(payment.unit)}`}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{getOwnerForUnit(payment)}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                    {payment.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                    {formatFCFA(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                    {payment.isVirtual ? (
                      <span className="text-gray-300">—</span>
                    ) : payment.method}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Badge dot variant={
                      payment.status === "EN RETARD" ? "alert" :
                      payment.status === "VALIDÉ" || payment.status === "PAYÉ" ? "success" :
                      payment.status === "EN ATTENTE" ? "warning" : "danger"
                    }>
                      {payment.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2 items-center">
                    {payment.isVirtual || payment.status === "EN RETARD" || payment.status === "IMPAYÉ" ? (
                      can("paiements", "edit") ? (
                        <button
                          onClick={() => handleEncaisserRetard(payment)}
                          className="text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <CreditCard className="w-3 h-3" /> Encaisser
                        </button>
                      ) : null
                    ) : payment.status === "VALIDÉ" || payment.status === "PAYÉ" ? (
                      <>
                        <Link
                          href={`/app/paiements/${payment.id}`}
                          className="text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors px-3 py-1.5 border border-app-border rounded-lg hover:bg-gray-50 inline-flex items-center"
                        >
                          Voir
                        </Link>
                        <Link
                          href={`/app/paiements/${payment.id}`}
                          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors p-1.5 border border-app-border rounded-lg hover:bg-gray-50 inline-flex items-center"
                          title="Consulter et télécharger la quittance"
                        >
                          <Download className="w-4 h-4" />
                        </Link>
                        {can("paiements", "delete") && (
                          <button
                            type="button"
                            onClick={() => openDeleteModal([payment.id], false, payment)}
                            className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors p-1.5 border border-red-200 rounded-lg hover:bg-red-50"
                            title="Supprimer cet encaissement"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button disabled className="text-xs font-medium text-gray-300 px-3 py-1.5 border border-gray-100 rounded-lg cursor-not-allowed">
                          Voir
                        </button>
                        <button disabled className="text-xs font-medium text-gray-300 p-1.5 border border-gray-100 rounded-lg cursor-not-allowed">
                          <Download className="w-4 h-4" />
                        </button>
                        {!payment.isVirtual && (
                          <button
                            type="button"
                            onClick={() => openDeleteModal([payment.id], false, payment)}
                            className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors p-1.5 border border-red-200 rounded-lg hover:bg-red-50"
                            title="Supprimer cet encaissement"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    {isRetardFilter ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 text-lg">✓</span>
                        </div>
                        <p className="text-sm font-medium text-gray-700">Aucun loyer en retard</p>
                        <p className="text-xs text-gray-400">Tous les locataires sont à jour ce mois-ci.</p>
                      </div>
                    ) : (
                      <span className="text-gray-500">Aucun paiement trouvé.</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmation de Suppression (Simple ou Multiple) */}
      {deleteConfirmModal && deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-app-border">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {deleteConfirmModal.isBulk ? "Suppression multiple d'encaissements" : "Confirmer la suppression"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Cette action est irréversible.</p>
                </div>
              </div>

              <div className="bg-red-50/50 border border-red-100 rounded-xl p-3 text-xs text-red-800">
                {deleteConfirmModal.isBulk ? (
                  <span>
                    Voulez-vous vraiment supprimer définitivement les <strong>{deleteConfirmModal.idsToDelete.length}</strong> encaissements sélectionnés ?
                  </span>
                ) : (
                  <span>
                    Voulez-vous vraiment supprimer définitivement l'encaissement N° <strong>{deleteConfirmModal.label || getPaymentDisplayCode(deleteConfirmModal.idsToDelete[0])}</strong>
                    {deleteConfirmModal.leaseCode && deleteConfirmModal.leaseCode !== "-" && (
                      <> (Bail N° <strong>{deleteConfirmModal.leaseCode}</strong>)</>
                    )}
                    {deleteConfirmModal.tenant && deleteConfirmModal.tenant !== "-" && (
                      <> pour <strong>{deleteConfirmModal.tenant}</strong>{deleteConfirmModal.unit && deleteConfirmModal.unit !== "-" ? ` (${formatUnitDisplay(deleteConfirmModal.unit)})` : ""}</>
                    )} ?
                  </span>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmModal(null)}
                  className="flex-1 bg-white border border-app-border text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>}>
      <PaymentsPageInner />
    </Suspense>
  );
}
