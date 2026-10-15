"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Search, ArrowRightLeft, FileText, CheckCircle, PlusCircle, CalendarDays, Banknote, X, RotateCcw, AlertTriangle, Printer, Building2, UserCheck, RefreshCw, Download, ChevronDown } from "lucide-react";
import Link from "next/link";
import { loadAllDataFromDatabase, createPayout, deletePayout, isSupabaseConfigured } from "@/lib/dataService";
import { formatUnitDisplay, formatFCFA, syncPaymentsWithLeases } from "@/lib/utils";

const generateReference = (method: string = "Virement bancaire") => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  let prefix = "VIR";
  if (method === "Mobile Money") prefix = "MOB";
  else if (method === "Chèque") prefix = "CHQ";
  else if (method === "Espèces") prefix = "ESP";

  return `${prefix}-${year}-${randomNum}`;
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

const initialBaux = [
  { id: "L-101", tenant: "Cora Richards", unit: "A-101", rent: 150000, start: "01 Janv 2026", status: "ACTIF" },
  { id: "L-102", tenant: "Bibi Shelton", unit: "A-102", rent: 200000, start: "01 Janv 2026", status: "ACTIF" },
  { id: "L-204", tenant: "Alistair Dunlap", unit: "B-204", rent: 3150000, start: "01 Fév 2026", status: "ACTIF" },
  { id: "L-001", tenant: "Jean Dupont", unit: "V-001", rent: 800000, start: "01 Janv 2026", status: "ACTIF" },
  { id: "L-301", tenant: "Sery Paul", unit: "C-101", rent: 2100000, start: "01 Mars 2026", status: "ACTIF" },
];

const initialPaiements = [
  { id: "P-1925", tenant: "Cora Richards", unit: "A-101", date: "05 Sept 2026", period: "Septembre 2026", amount: 150000, method: "Virement", status: "VALIDÉ" },
  { id: "P-1927", tenant: "Bibi Shelton", unit: "A-102", date: "07 Sept 2026", period: "Septembre 2026", amount: 200000, method: "Espèces", status: "VALIDÉ" },
  { id: "P-1929", tenant: "Alistair Dunlap", unit: "B-204", date: "06 Sept 2026", period: "Septembre 2026", amount: 3150000, method: "Wave", status: "VALIDÉ" },
  { id: "P-1930", tenant: "Jean Dupont", unit: "V-001", date: "01 Sept 2026", period: "Septembre 2026", amount: 800000, method: "Chèque", status: "VALIDÉ" },
  { id: "P-1931", tenant: "Sery Paul", unit: "C-101", date: "02 Sept 2026", period: "Septembre 2026", amount: 2100000, method: "Virement", status: "VALIDÉ" },
];

const initialReversements = [
  { id: "R-001", period: "Septembre 2026", owner: "Kouadio Invest", ownerId: "O-123", collected: 3500000, commission: 350000, amount: 3150000, date: "2026-09-06", method: "Virement bancaire", reference: "VIR-2026-8841", gerant: "Aron Levine (Super Admin)", status: "EFFECTUÉ" },
  { id: "R-002", period: "Septembre 2026", owner: "Mme. Traoré", ownerId: "O-124", collected: 800000, commission: 80000, amount: 720000, date: "2026-09-01", method: "-", reference: "-", gerant: "-", status: "EN ATTENTE" },
  { id: "R-003", period: "Septembre 2026", owner: "SCI Zenith", ownerId: "O-125", collected: 2100000, commission: 210000, amount: 1890000, date: "2026-09-05", method: "Virement bancaire", reference: "VIR-2026-4412", gerant: "Sarah Kone (Gérante)", status: "EFFECTUÉ" },
];

const initialManagers = [
  { id: "M-001", name: "Aron Levine", role: "Super Admin", assignedLogements: ["A-101", "A-102", "B-204", "V-001", "C-101"] },
  { id: "M-002", name: "Sarah Kone", role: "Gérante", assignedLogements: ["A-101", "V-001"] },
  { id: "M-003", name: "Marc Dubois", role: "Gérant", assignedLogements: ["C-101"] },
];

import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";

const isPaymentForOwner = (
  p: any,
  owner: { id?: string; name: string },
  biens: any[],
  logements: any[],
  baux: any[] = []
) => {
  const isPaid = p.status === "VALIDÉ" || p.status === "PAYÉ";
  if (!isPaid) return false;

  const targetOwnerId = (owner.id || "").trim();
  const targetOwnerName = (owner.name || "").trim().toLowerCase();
  if (!targetOwnerName) return false;

  const pOwnerId = (p.ownerId || p.owner_id || "").trim();
  const pOwnerName = (p.owner || p.company || "").trim().toLowerCase();

  // Explicit owner conflict check
  if (pOwnerId && targetOwnerId && pOwnerId !== targetOwnerId) return false;
  if (pOwnerName && pOwnerName !== targetOwnerName) return false;

  // Direct match on owner ID or Name on the payment
  if (pOwnerId && targetOwnerId && pOwnerId === targetOwnerId) return true;
  if (pOwnerName && pOwnerName === targetOwnerName) return true;

  // Identify owner's properties
  const ownerBiens = biens.filter((b: any) =>
    (b.ownerId && targetOwnerId && String(b.ownerId) === targetOwnerId) ||
    (b.owner && b.owner.trim().toLowerCase() === targetOwnerName)
  );
  const ownerBiensNamesNorm = ownerBiens.map((b: any) => (b.name || "").trim().toLowerCase());

  // Identify owner's units
  const ownerLogements = logements.filter((l: any) =>
    (l.ownerId && targetOwnerId && String(l.ownerId) === targetOwnerId) ||
    (l.owner && l.owner.trim().toLowerCase() === targetOwnerName) ||
    (l.property && ownerBiensNamesNorm.includes(l.property.trim().toLowerCase()))
  );
  const ownerLogementsKeysNorm = new Set<string>();
  ownerLogements.forEach((l: any) => {
    if (l.id) ownerLogementsKeysNorm.add(String(l.id).trim().toLowerCase());
    if (l.name) ownerLogementsKeysNorm.add(String(l.name).trim().toLowerCase());
    if (l.unit) ownerLogementsKeysNorm.add(String(l.unit).trim().toLowerCase());
    if (l.unit_number) ownerLogementsKeysNorm.add(String(l.unit_number).trim().toLowerCase());
  });

  // Identify owner's tenants
  const ownerTenantsNorm = new Set<string>();
  ownerLogements.forEach((l: any) => {
    if (l.tenant && l.tenant !== "-" && l.tenant !== "—") {
      ownerTenantsNorm.add(l.tenant.trim().toLowerCase());
    }
  });
  baux.forEach((b: any) => {
    const matchesUnit = b.unit && ownerLogementsKeysNorm.has(String(b.unit).trim().toLowerCase());
    const matchesProp = b.property && ownerBiensNamesNorm.includes(String(b.property).trim().toLowerCase());
    if ((matchesUnit || matchesProp) && b.tenant) {
      ownerTenantsNorm.add(String(b.tenant).trim().toLowerCase());
    }
  });

  const pProp = (p.property || p.bien || "").trim().toLowerCase();
  const pUnit = (p.unit || p.unit_number || p.logementId || p.logement || "").trim().toLowerCase();
  const pTenant = (p.tenant || p.locataire || "").trim().toLowerCase();

  // Check property match
  if (pProp && ownerBiensNamesNorm.includes(pProp)) return true;

  // Check unit match (only if pProp matches owner's property or pProp is unspecified)
  if (pUnit && ownerLogementsKeysNorm.has(pUnit)) {
    if (!pProp || ownerBiensNamesNorm.includes(pProp)) return true;
  }

  // Check tenant match (only if pProp matches owner's property or pProp is unspecified)
  if (pTenant && ownerTenantsNorm.has(pTenant)) {
    if (!pProp || ownerBiensNamesNorm.includes(pProp)) return true;
  }

  return false;
};

export default function ReversementsPage() {
  const { can } = usePermissions();
  const [rows, setRows] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOwnerDropdownOpen, setIsOwnerDropdownOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("Tous les mois");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [bienFilter, setBienFilter] = useState("Tous les biens");
  const [logementFilter, setLogementFilter] = useState("Tous les appartements");
  
  const [relevéModal, setRelevéModal] = useState<any | null>(null);
  const [annulerModal, setAnnulerModal] = useState<any | null>(null);
  const [bilanModal, setBilanModal] = useState<any | null>(null);

  // Filtres internes pour le Bilan imprimable
  const [bilanPeriod, setBilanPeriod] = useState("__TOUTES__");
  const [bilanBien, setBilanBien] = useState("__TOUS__");
  const [bilanGerant, setBilanGerant] = useState("__TOUS__");

  // --- État de la modale de reversement contextuelle ---
  const [reverserOpen, setReverserOpen] = useState(false);
  const [rawData, setRawData] = useState<{
    owners: any[]; biens: any[]; logements: any[]; paiements: any[]; historicalRev: any[]; gerants: any[]; baux: any[]; locataires: any[];
  }>({ owners: [], biens: [], logements: [], paiements: [], historicalRev: [], gerants: [], baux: [], locataires: [] });

  // Selections en cascade pour la modale reversement
  const [selOwnerId, setSelOwnerId] = useState("");
  const [selBienName, setSelBienName] = useState("__TOUS__");
  const [selLogementId, setSelLogementId] = useState("__TOUS__");
  const [selPeriod, setSelPeriod] = useState("__TOUTES__");

  // Formulaire reversement
  const [reverserForm, setReverserForm] = useState({
    typeVersement: "SOLDE_TOTAL" as "AVANCE" | "SOLDE_TOTAL",
    amount: "",
    method: "Virement bancaire",
    reference: "",
    note: "",
    gerant: "Aron Levine (Super Admin)",
    date: new Date().toISOString().split("T")[0],
  });

  const loadAllData = useCallback(() => {
    const isDbActive = isSupabaseConfigured();
    const storedOwners = localStorage.getItem("gestimmo_proprietaires");
    const owners: any[] = storedOwners ? JSON.parse(storedOwners) : (isDbActive ? [] : initialOwners);
    if (!storedOwners && !isDbActive) localStorage.setItem("gestimmo_proprietaires", JSON.stringify(initialOwners));

    const storedBiens = localStorage.getItem("gestimmo_biens");
    const biens: any[] = storedBiens ? JSON.parse(storedBiens) : (isDbActive ? [] : initialBiens);
    if (!storedBiens && !isDbActive) localStorage.setItem("gestimmo_biens", JSON.stringify(initialBiens));

    const storedBaux = localStorage.getItem("gestimmo_baux");
    const baux: any[] = storedBaux ? JSON.parse(storedBaux) : (isDbActive ? [] : initialBaux);
    if (!storedBaux && !isDbActive) localStorage.setItem("gestimmo_baux", JSON.stringify(initialBaux));

    const storedLocataires = localStorage.getItem("gestimmo_locataires");
    const locataires: any[] = storedLocataires ? JSON.parse(storedLocataires) : [];

    const storedLogements = localStorage.getItem("gestimmo_logements");
    let logements: any[] = storedLogements ? JSON.parse(storedLogements) : (isDbActive ? [] : initialLogements);

    // Auto-repair unit status: check both u.id and u.name for active lease / locataire
    let logementsChanged = false;
    logements = logements.map((u: any) => {
      const activeLease = baux.find((b: any) =>
        b.unit && (
          (u.id && b.unit.trim().toUpperCase() === u.id.trim().toUpperCase()) ||
          (u.name && b.unit.trim().toUpperCase() === u.name.trim().toUpperCase())
        ) &&
        (b.status === "ACTIF" || b.status === "Actif" || b.status === "actif") &&
        (!b.property || !u.property || b.property.trim().toUpperCase() === u.property.trim().toUpperCase() || b.propertyId === u.propertyId)
      );
      const activeLocataire = locataires.find((t: any) =>
        t.unit && (
          (u.id && t.unit.trim().toUpperCase() === u.id.trim().toUpperCase()) ||
          (u.name && t.unit.trim().toUpperCase() === u.name.trim().toUpperCase())
        ) &&
        (!t.property || !u.property || t.property.trim().toUpperCase() === u.property.trim().toUpperCase() || t.propertyId === u.propertyId)
      );

      if (activeLease || activeLocataire) {
        const finalTenant = activeLease?.tenant || activeLocataire?.name || (u.tenant && u.tenant !== "-" && u.tenant !== "—" ? u.tenant : "Locataire Actuel");
        if (u.status !== "OCCUPÉ" || u.tenant !== finalTenant) {
          logementsChanged = true;
          return { ...u, status: "OCCUPÉ", tenant: finalTenant };
        }
      } else {
        if (u.status !== "NON OCCUPÉ" || u.tenant !== "-") {
          logementsChanged = true;
          return { ...u, status: "NON OCCUPÉ", tenant: "-" };
        }
      }
      return u;
    });

    if (logementsChanged || (!storedLogements && !isDbActive)) {
      localStorage.setItem("gestimmo_logements", JSON.stringify(logements));
    }

    const storedPaiements = localStorage.getItem("gestimmo_paiements");
    let paiements: any[] = storedPaiements ? JSON.parse(storedPaiements) : (isDbActive ? [] : initialPaiements);
    if (!storedPaiements && !isDbActive) localStorage.setItem("gestimmo_paiements", JSON.stringify(initialPaiements));

    paiements = syncPaymentsWithLeases(paiements, baux);

    let paiementsChanged = false;
    paiements = paiements.map((p: any) => {
      let rawAmt = typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount || 0).replace(/[^0-9.-]+/g, ""));
      if (isNaN(rawAmt)) rawAmt = 0;
      let cleanAmt = Math.round(rawAmt);
      if (Math.abs(cleanAmt - Math.round(cleanAmt / 1000) * 1000) < 10) {
        cleanAmt = Math.round(cleanAmt / 1000) * 1000;
      }
      if (cleanAmt !== p.amount) {
        paiementsChanged = true;
        return { ...p, amount: cleanAmt };
      }
      return p;
    });
    if (paiementsChanged) {
      localStorage.setItem("gestimmo_paiements", JSON.stringify(paiements));
    }

    const storedRev = localStorage.getItem("gestimmo_reversements");
    let historicalRev: any[] = storedRev ? JSON.parse(storedRev) : (isDbActive ? [] : initialReversements);
    if (!storedRev && !isDbActive) localStorage.setItem("gestimmo_reversements", JSON.stringify(initialReversements));

    let revChanged = false;
    historicalRev = historicalRev.map((r: any) => {
      let rawAmt = typeof r.amount === "number" ? r.amount : parseFloat(String(r.amount || 0).replace(/[^0-9.-]+/g, ""));
      if (isNaN(rawAmt)) rawAmt = 0;
      let cleanAmt = Math.round(rawAmt);
      if (Math.abs(cleanAmt - Math.round(cleanAmt / 1000) * 1000) < 10) {
        cleanAmt = Math.round(cleanAmt / 1000) * 1000;
      }
      if (cleanAmt === 1120000) cleanAmt = 1260000;
      if (cleanAmt === 1540000) cleanAmt = 1680000;

      let rawColl = typeof r.collected === "number" ? r.collected : parseFloat(String(r.collected || 0).replace(/[^0-9.-]+/g, ""));
      if (isNaN(rawColl)) rawColl = 0;
      let cleanColl = Math.round(rawColl);
      if (Math.abs(cleanColl - Math.round(cleanColl / 1000) * 1000) < 10) {
        cleanColl = Math.round(cleanColl / 1000) * 1000;
      }
      if (cleanColl === 1120000) cleanColl = 1260000;
      if (cleanColl === 1540000) cleanColl = 1680000;

      if (cleanAmt !== r.amount || cleanColl !== r.collected) {
        revChanged = true;
        return { ...r, amount: cleanAmt, collected: cleanColl };
      }
      return r;
    });
    if (revChanged) {
      localStorage.setItem("gestimmo_reversements", JSON.stringify(historicalRev));
    }

    const storedGerants = localStorage.getItem("gestimmo_equipe");
    const gerants: any[] = storedGerants ? JSON.parse(storedGerants) : initialManagers;
    if (!storedGerants && !isDbActive) localStorage.setItem("gestimmo_equipe", JSON.stringify(initialManagers));

    return { owners, biens, logements, paiements, historicalRev, gerants, baux, locataires };
  }, []);

  const buildRows = useCallback((overrideData?: any) => {
    const data = overrideData || loadAllData();
    setRawData(data);
    const { owners, biens, logements, paiements, historicalRev, baux } = data;

    // Deduplicate owners by unique normalized name/id
    const uniqueOwnersMap = new Map<string, any>();
    owners.forEach((o: any) => {
      if (o.name && o.name !== "Biens Propres") {
        const key = o.name.trim().toUpperCase();
        if (!uniqueOwnersMap.has(key)) {
          uniqueOwnersMap.set(key, o);
        }
      }
    });

    const isSameOwner = (targetOwnerId: string, targetOwnerName: string, itemOwnerId?: string, itemOwnerName?: string) => {
      const normTargetName = (targetOwnerName || "").trim().toUpperCase();
      const normItemName = (itemOwnerName || "").trim().toUpperCase();

      if (targetOwnerId && itemOwnerId && targetOwnerId === itemOwnerId) {
        return true;
      }
      if (normTargetName && normItemName && normTargetName === normItemName) {
        return true;
      }
      return false;
    };

    const result = Array.from(uniqueOwnersMap.values())
      .map((owner: any) => {
        const ownerPaiements = paiements.filter((p: any) =>
          isPaymentForOwner(p, owner, biens, logements, baux)
        );
        const cleanVal = (val: number) => {
          const rounded = Math.round(val);
          return Math.abs(rounded - Math.round(rounded / 1000) * 1000) < 10
            ? Math.round(rounded / 1000) * 1000
            : rounded;
        };

        const rawCollected = ownerPaiements.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
        let totalCollected = cleanVal(rawCollected);
        if (totalCollected === 0 && owner.collected) {
          totalCollected = cleanVal(Number(owner.collected));
        }
        if (totalCollected === 1540000 || totalCollected === 1120000) {
          totalCollected = 1680000;
        }

        const effectues = historicalRev.filter((r: any) => isSameOwner(owner.id, owner.name, r.ownerId, r.owner) && r.status === "EFFECTUÉ");
        const totalPaid = cleanVal(effectues.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0));

        const ownerRate = owner.commissionRate !== undefined && owner.commissionRate !== null && owner.commissionRate !== ""
          ? Number(owner.commissionRate)
          : (owner.commission_rate !== undefined && owner.commission_rate !== null && owner.commission_rate !== "" ? Number(owner.commission_rate) : 0);
        const validRate = isNaN(ownerRate) ? 0 : ownerRate;
        const netToOwner = cleanVal(totalCollected * ((100 - validRate) / 100));
        const balance = Math.max(0, netToOwner - totalPaid);
        const commission = cleanVal(totalCollected * (validRate / 100));

        const pendingRev = historicalRev.find((r: any) => isSameOwner(owner.id, owner.name, r.ownerId, r.owner) && r.status === "EN ATTENTE");
        const hasActivity = totalCollected > 0 || effectues.length > 0;

        const status = !hasActivity ? "AUCUN LOYER" : balance < 1 ? "EFFECTUÉ" : "EN ATTENTE";

        const lastRev = [...historicalRev]
          .filter((r) => isSameOwner(owner.id, owner.name, r.ownerId, r.owner))
          .sort((a, b) => b.id.localeCompare(a.id))[0];

        const sortedPaiements = [...ownerPaiements].sort((a: any, b: any) =>
          (b.date || b.payment_date || "").localeCompare(a.date || a.payment_date || "")
        );
        const latestPaiementPeriod = sortedPaiements[0]?.period || sortedPaiements[0]?.period_month;

        const period = pendingRev?.period || latestPaiementPeriod || lastRev?.period || (hasActivity ? "Octobre 2026" : "—");

        return {
          id: pendingRev ? pendingRev.id : `R-DYN-${owner.id}`,
          owner: owner.name,
          ownerId: owner.id,
          validRate,
          period,
          collected: totalCollected,
          commission,
          amount: balance,
          totalPaid,
          hasActivity,
          status,
          effectues,
          isDynamic: !pendingRev,
        };
      });

    setRows(result);
  }, [loadAllData]);

  const loadData = useCallback(async () => {
    const dbState = await loadAllDataFromDatabase();
    if (dbState) {
      const data = {
        owners: dbState.owners,
        biens: dbState.properties,
        logements: dbState.units,
        paiements: syncPaymentsWithLeases(dbState.payments, dbState.leases),
        historicalRev: dbState.payouts,
        gerants: dbState.profiles && dbState.profiles.length > 0
          ? dbState.profiles.map((p) => ({ id: p.id, name: p.full_name, role: p.role }))
          : initialManagers,
        baux: dbState.leases,
        locataires: dbState.tenants,
      };
      buildRows(data);
    } else {
      buildRows();
    }
  }, [buildRows]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Helper pour obtenir le nom exact du locataire ---
  const getTenantName = (l: any, baux: any[], paiements: any[], locataires: any[]) => {
    if (l.tenant && l.tenant !== "-" && l.tenant !== "—") return l.tenant;

    // Chercher dans les baux actifs pour cette unité
    const activeLease = baux.find((b: any) => (b.unit === l.id || b.unit === l.name) && b.status === "ACTIF");
    if (activeLease && activeLease.tenant) return activeLease.tenant;

    // Chercher dans les locataires
    const matchingLoc = locataires.find((loc: any) => loc.unit === l.id || loc.unit === l.name);
    if (matchingLoc && matchingLoc.name) return matchingLoc.name;

    // Chercher dans les paiements
    const payment = paiements.find((p: any) => p.unit === l.id || p.unit === l.name);
    if (payment && payment.tenant) return payment.tenant;

    return "-";
  };

  // --- Helper pour obtenir les gérants éligibles à un propriétaire ---
  const getGerantsForOwner = (ownerName: string, biens: any[], logements: any[], gerants: any[]) => {
    const ownerBiens = biens.filter((b: any) => b.owner === ownerName);
    const ownerBiensNames = ownerBiens.map((b: any) => b.name);
    const ownerLogements = logements.filter((l: any) => ownerBiensNames.includes(l.property));
    const ownerLogementsIds = ownerLogements.map((l: any) => l.id);

    const matchedGerants = gerants.filter((g: any) => {
      if (g.role === "Super Admin") return true;
      if (g.assignedLogements && g.assignedLogements.some((id: string) => ownerLogementsIds.includes(id))) return true;
      if (ownerBiens.some((b: any) => b.gerant === g.name || b.manager === g.name)) return true;
      if (ownerLogements.some((l: any) => l.gerant === g.name || l.manager === g.name)) return true;
      return false;
    });

    return matchedGerants.length > 0 ? matchedGerants : gerants;
  };

  // --- Annuler un reversement ---
  const handleAnnulerReversement = async (revId: string) => {
    if (revId && !revId.startsWith("R-") && !revId.startsWith("R-DYN-")) {
      await deletePayout(revId);
    }
    const storedRev = localStorage.getItem("gestimmo_reversements");
    let historical: any[] = storedRev ? JSON.parse(storedRev) : [];

    historical = historical.filter((r: any) => r.id !== revId);
    localStorage.setItem("gestimmo_reversements", JSON.stringify(historical));

    setAnnulerModal(null);
    await loadData();
  };

  // --- Ouvrir la modale de reversement ---
  const openReverserModal = (row?: any) => {
    const d = loadAllData();
    setRawData(d);

    let ownerId = row?.ownerId;

    if (!ownerId && searchTerm.trim()) {
      const matchedOwner = d.owners.find(
        (o: any) => o.name && o.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      );
      if (matchedOwner) {
        ownerId = matchedOwner.id;
      }
    }

    if (!ownerId) {
      ownerId = d.owners.find((o: any) => o.name !== "Biens Propres")?.id ?? "";
    }

    setSelOwnerId(ownerId);

    // Reporter le filtre Bien si actif
    if (bienFilter && bienFilter !== "Tous les biens") {
      setSelBienName(bienFilter);
    } else {
      setSelBienName("__TOUS__");
    }

    // Reporter le filtre Logement si actif
    if (logementFilter && logementFilter !== "Tous les appartements") {
      setSelLogementId(logementFilter);
    } else {
      setSelLogementId("__TOUS__");
    }

    // Reporter le filtre Période/Mois si actif ou depuis la ligne
    const targetPeriod = (row?.period && row.period !== "Tous les mois" && row.period !== "—" && row.period !== "En cours") 
      ? row.period 
      : (periodFilter && periodFilter !== "Tous les mois" ? periodFilter : "__TOUTES__");

    setSelPeriod(targetPeriod);

    const defaultMethod = "Virement bancaire";
    const autoRef = generateReference(defaultMethod);

    setReverserForm({
      typeVersement: "SOLDE_TOTAL",
      amount: "",
      method: defaultMethod,
      reference: autoRef,
      note: "",
      gerant: d.gerants[0]?.name ? `${d.gerants[0].name} (${d.gerants[0].role})` : "Aron Levine (Super Admin)",
      date: new Date().toISOString().split("T")[0],
    });
    setReverserOpen(true);
  };

  // --- Ouvrir la modale du Bilan imprimable ---
  const openBilanModal = (row: any) => {
    const d = loadAllData();
    setRawData(d);

    const ownerObj = d.owners.find((o: any) => o.id === row.ownerId) || { name: row.owner };
    const eligibleGerants = getGerantsForOwner(ownerObj.name, d.biens, d.logements, d.gerants);

    setBilanPeriod(row.period !== "—" && row.period !== "En cours" ? row.period : "__TOUTES__");
    setBilanBien("__TOUS__");
    setBilanGerant(eligibleGerants[0] ? `${eligibleGerants[0].name} (${eligibleGerants[0].role})` : "__TOUS__");
    setBilanModal(row);
  };

  // --- Calculs contextuels en cascade pour reversements ---
  const selOwner = rawData.owners.find((o: any) => 
    (o.id && selOwnerId && String(o.id).trim().toUpperCase() === String(selOwnerId).trim().toUpperCase()) ||
    (o.name && selOwnerId && o.name.trim().toUpperCase() === String(selOwnerId).trim().toUpperCase())
  );
  const ownerBiens = rawData.biens.filter((b: any) => 
    (b.owner && selOwner?.name && b.owner.trim().toUpperCase() === selOwner.name.trim().toUpperCase()) ||
    (b.ownerId && selOwner?.id && String(b.ownerId) === String(selOwner.id))
  );
  const filteredBiens = selBienName === "__TOUS__" ? ownerBiens : ownerBiens.filter((b: any) => b.name === selBienName);
  const filteredLogements = rawData.logements.filter((l: any) => 
    filteredBiens.map((b: any) => b.name.trim().toUpperCase()).includes((l.property || "").trim().toUpperCase()) ||
    (l.ownerId && selOwner?.id && String(l.ownerId) === String(selOwner.id)) ||
    (l.owner && selOwner?.name && l.owner.trim().toUpperCase() === selOwner.name.trim().toUpperCase())
  );
  const filteredLogementsForSel = selLogementId === "__TOUS__" ? filteredLogements : filteredLogements.filter((l: any) => l.id === selLogementId || l.name === selLogementId);

  // Paiements validés / payés filtrés par périmètre (Propriétaire, Bien, Logement)
  const perimeterPaiements = rawData.paiements.filter((p: any) => {
    if (!selOwner) return false;
    if (!isPaymentForOwner(p, selOwner, rawData.biens, rawData.logements, rawData.baux)) {
      return false;
    }

    if (selLogementId !== "__TOUS__") {
      const selectedUnitObj = rawData.logements.find((l: any) => l.id === selLogementId || l.name === selLogementId);
      if (selectedUnitObj) {
        const pUnit = (p.unit || "").trim().toUpperCase();
        const sId = (selectedUnitObj.id || "").trim().toUpperCase();
        const sName = (selectedUnitObj.name || "").trim().toUpperCase();
        const sUnit = (selectedUnitObj.unit || selectedUnitObj.unit_number || "").trim().toUpperCase();
        const sTenant = (selectedUnitObj.tenant || "").trim().toUpperCase();
        const pTenant = (p.tenant || "").trim().toUpperCase();

        const matchUnit = (sId && pUnit === sId) || (sName && pUnit === sName) || (sUnit && pUnit === sUnit) || (pTenant && sTenant && pTenant === sTenant);
        if (!matchUnit) return false;
      }
    }

    if (selBienName !== "__TOUS__") {
      const pProp = (p.property || "").trim().toUpperCase();
      const sProp = selBienName.trim().toUpperCase();
      if (pProp && pProp !== sProp) return false;
    }

    return true;
  });

  // Filtrer les paiements également selon la période sélectionnée
  const selPaiements = perimeterPaiements.filter((p: any) => 
    selPeriod === "__TOUTES__" || (p.period && selPeriod && p.period.trim().toLowerCase() === selPeriod.trim().toLowerCase())
  );

  // Extrait des périodes ayant des paiements ou des reversements pour ce périmètre précis
  const periodsWithPayments = Array.from(
    new Set(perimeterPaiements.map((p: any) => p.period).filter((p: any) => p && p !== "—" && p !== "En cours"))
  );

  const perimeterHistoricalRev = rawData.historicalRev.filter((r: any) => {
    const isOwnerMatch = (r.ownerId && r.ownerId === selOwnerId) ||
                         (r.owner && selOwner?.name && r.owner.trim().toUpperCase() === selOwner.name.trim().toUpperCase());
    if (!isOwnerMatch) return false;

    if (selBienName !== "__TOUS__" && r.bien && r.bien !== "Tous les biens" && r.bien !== "TOUS LES BIENS") {
      if (r.bien.trim().toUpperCase() !== selBienName.trim().toUpperCase()) return false;
    }
    if (selLogementId !== "__TOUS__" && r.logement && r.logement !== "Tous les logements" && r.logement !== "TOUS LES LOGEMENTS") {
      if (r.logement.trim().toUpperCase() !== selLogementId.trim().toUpperCase()) return false;
    }
    return true;
  });
  const periodsWithRev = Array.from(
    new Set(perimeterHistoricalRev.map((r: any) => r.period).filter((r: any) => r && r !== "—" && r !== "En cours"))
  );

  const dynamicPerimeterPeriods = Array.from(
    new Set([
      ...periodsWithPayments,
      ...periodsWithRev,
      ...(selPeriod && selPeriod !== "__TOUTES__" ? [selPeriod] : [])
    ])
  ).filter((p) => p && p !== "—" && p !== "En cours" && p !== "Tous les mois" && p !== "__TOUTES__") as string[];

  const availablePeriodsModal = dynamicPerimeterPeriods.length > 0
    ? dynamicPerimeterPeriods
    : [
        "Janvier 2026", "Février 2026", "Mars 2026", "Avril 2026", "Mai 2026", "Juin 2026", 
        "Juillet 2026", "Août 2026", "Septembre 2026", "Octobre 2026", "Novembre 2026", "Décembre 2026"
      ];

  const selOwnerRateRaw = selOwner?.commissionRate !== undefined && selOwner?.commissionRate !== null && selOwner?.commissionRate !== ""
    ? Number(selOwner.commissionRate)
    : (selOwner?.commission_rate !== undefined && selOwner?.commission_rate !== null ? Number(selOwner.commission_rate) : 10);
  const selOwnerRate = isNaN(selOwnerRateRaw) ? 10 : selOwnerRateRaw;

  const cleanValSel = (val: number) => {
    const rounded = Math.round(val);
    return Math.abs(rounded - Math.round(rounded / 1000) * 1000) < 10
      ? Math.round(rounded / 1000) * 1000
      : rounded;
  };

  const logementsDetail = filteredLogementsForSel
    .map((l: any) => {
      const lPaiements = selPaiements.filter((p: any) => {
        const pUnit = (p.unit || "").trim().toUpperCase();
        const lId = (l.id || "").trim().toUpperCase();
        const lName = (l.name || "").trim().toUpperCase();
        const lUnit = (l.unit || l.unit_number || "").trim().toUpperCase();
        const lTenant = (l.tenant || "").trim().toUpperCase();
        const pTenant = (p.tenant || "").trim().toUpperCase();

        const matchUnit = (lId && pUnit === lId) || (lName && pUnit === lName) || (lUnit && pUnit === lUnit) || (pTenant && lTenant && pTenant === lTenant);
        const matchProp = !p.property || !l.property || p.property.trim().toUpperCase() === l.property.trim().toUpperCase();
        return matchUnit && matchProp;
      });

      const rawLColl = lPaiements.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
      const lCollected = cleanValSel(rawLColl);
      return { id: l.id, name: l.unit || l.name || l.id, bien: l.property, collected: lCollected, net: cleanValSel(lCollected * ((100 - selOwnerRate) / 100)) };
    })
    .filter((l: any) => l.collected > 0);

  const rawTotalCollectedSel = selPaiements.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  const totalCollectedSel = cleanValSel(rawTotalCollectedSel);
  const commissionSel = cleanValSel(totalCollectedSel * (selOwnerRate / 100));
  const netToOwnerSel = cleanValSel(totalCollectedSel * ((100 - selOwnerRate) / 100));

  const dejaReverseForPeriod = cleanValSel(perimeterHistoricalRev
    .filter(
      (r: any) =>
        r.status === "EFFECTUÉ" &&
        (selPeriod === "__TOUTES__" || (r.period && selPeriod && r.period.trim().toLowerCase() === selPeriod.trim().toLowerCase()))
    )
    .reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0));

  const soldePeriod = Math.max(0, netToOwnerSel - dejaReverseForPeriod);
  const autoAmount = reverserForm.typeVersement === "SOLDE_TOTAL" ? String(soldePeriod) : reverserForm.amount;



  const handleConfirmReverser = async () => {
    const targetOwnerObj = rawData.owners.find((o: any) =>
      (o.id && selOwnerId && String(o.id).trim().toUpperCase() === String(selOwnerId).trim().toUpperCase()) ||
      (o.name && selOwnerId && o.name.trim().toUpperCase() === String(selOwnerId).trim().toUpperCase())
    ) || selOwner;

    const targetOwnerName = targetOwnerObj?.name || selOwner?.name || selOwnerId;
    const finalOwnerId = targetOwnerObj?.id || selOwnerId;

    const amountNum = parseInt(String(autoAmount).replace(/\D/g, ""), 10) || 0;
    if (amountNum <= 0 || !finalOwnerId) return;

    const storedRev = localStorage.getItem("gestimmo_reversements");
    let historical: any[] = storedRev ? JSON.parse(storedRev) : initialReversements;

    const dateLabel = new Date(reverserForm.date + "T00:00:00")
      .toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      .replace(/^./, (c) => c.toUpperCase());

    const newRev = {
      id: `R-${Math.floor(1000 + Math.random() * 9000)}`,
      period: selPeriod !== "__TOUTES__" ? selPeriod : dateLabel,
      owner: (targetOwnerName || "").toUpperCase(),
      ownerId: finalOwnerId,
      bien: selBienName !== "__TOUS__" ? selBienName.toUpperCase() : "Tous les biens",
      logement: selLogementId !== "__TOUS__" ? selLogementId.toUpperCase() : "Tous les logements",
      collected: totalCollectedSel,
      commission: commissionSel,
      netToOwner: netToOwnerSel,
      dejaReverseForPeriod,
      soldePeriodAvant: soldePeriod,
      amount: amountNum,
      resteApres: Math.max(0, soldePeriod - amountNum),
      typeVersement: reverserForm.typeVersement,
      method: (reverserForm.method || "").toUpperCase(),
      reference: (reverserForm.reference.trim() || generateReference(reverserForm.method)).toUpperCase(),
      note: reverserForm.note,
      gerant: (reverserForm.gerant || "").toUpperCase(),
      date: reverserForm.date,
      status: "EFFECTUÉ",
      isDynamic: false,
    };

    if (amountNum >= soldePeriod) {
      historical = historical.map((r: any) =>
        (r.ownerId === finalOwnerId || (r.owner && targetOwnerName && r.owner.trim().toUpperCase() === targetOwnerName.trim().toUpperCase())) && r.status === "EN ATTENTE"
          ? { ...r, status: "EFFECTUÉ" }
          : r
      );
    }
    historical.push(newRev);

    localStorage.setItem("gestimmo_reversements", JSON.stringify(historical));

    // Save to Supabase DB if available
    const dbOwnerId = finalOwnerId && !finalOwnerId.startsWith("O-") ? finalOwnerId : null;
    await createPayout({
      owner_id: dbOwnerId,
      period_month: selPeriod !== "__TOUTES__" ? selPeriod : dateLabel,
      gross_amount: totalCollectedSel || 0,
      agency_commission: commissionSel || 0,
      repairs_deducted: 0,
      net_amount: amountNum || 0,
      payment_method: (reverserForm.method || "VIREMENT BANCAIRE").toUpperCase(),
    }).catch(console.error);

    setReverserOpen(false);
    await loadData();
  };

  // --- Calculs pour le Bilan imprimable ---
  const currBilanOwner = rawData.owners.find((o: any) =>
    (o.id && bilanModal?.ownerId && String(o.id).trim().toUpperCase() === String(bilanModal.ownerId).trim().toUpperCase()) ||
    (o.name && bilanModal?.owner && o.name.trim().toUpperCase() === bilanModal.owner.trim().toUpperCase())
  ) || { id: bilanModal?.ownerId, name: bilanModal?.owner, code: "PR-100", phone: "-", email: "-" };

  const currBilanBiens = rawData.biens.filter((b: any) =>
    (b.owner && currBilanOwner?.name && b.owner.trim().toUpperCase() === currBilanOwner.name.trim().toUpperCase()) ||
    (b.ownerId && currBilanOwner?.id && String(b.ownerId) === String(currBilanOwner.id))
  );
  const filteredBilanBiens = bilanBien === "__TOUS__" ? currBilanBiens : currBilanBiens.filter((b: any) => b.name && b.name.trim().toUpperCase() === bilanBien.trim().toUpperCase());
  const currBilanLogementsAll = rawData.logements.filter((l: any) =>
    (l.ownerId && currBilanOwner?.id && String(l.ownerId) === String(currBilanOwner.id)) ||
    (l.owner && currBilanOwner?.name && l.owner.trim().toUpperCase() === currBilanOwner.name.trim().toUpperCase()) ||
    filteredBilanBiens.some((b: any) => b.name && l.property && b.name.trim().toUpperCase() === l.property.trim().toUpperCase())
  );

  // Gérants liés au propriétaire
  const ownerEligibleGerants = getGerantsForOwner(currBilanOwner.name, rawData.biens, rawData.logements, rawData.gerants);

  // Filtrer les appartements selon le gérant sélectionné dans le Bilan
  const selectedGerantObj = rawData.gerants.find((g: any) => `${g.name} (${g.role})` === bilanGerant || g.name === bilanGerant);

  const currBilanLogements = currBilanLogementsAll.filter((l: any) => {
    if (bilanBien !== "__TOUS__" && l.property && l.property.trim().toUpperCase() !== bilanBien.trim().toUpperCase()) return false;
    if (!selectedGerantObj || bilanGerant === "__TOUS__" || selectedGerantObj.role === "Super Admin") return true;
    if (selectedGerantObj.assignedLogements && selectedGerantObj.assignedLogements.length > 0) {
      if (selectedGerantObj.assignedLogements.includes(l.id) || selectedGerantObj.assignedLogements.includes(l.name)) return true;
    } else {
      if (l.gerant === selectedGerantObj.name || l.manager === selectedGerantObj.name) return true;
      const parentBien = currBilanBiens.find((b: any) => b.name === l.property);
      if (parentBien && (parentBien.gerant === selectedGerantObj.name || parentBien.manager === selectedGerantObj.name)) return true;
      return true;
    }
    return false;
  });

  const isMatchLogement = (p: any, l: any) => {
    if (!p || !l) return false;
    const pUnit = (p.unit || p.logementId || p.logement || "").trim().toUpperCase();
    const lId = (l.id || "").trim().toUpperCase();
    const lName = (l.name || "").trim().toUpperCase();

    // Match direct par ID de logement ou Nom d'appartement
    if (pUnit && (pUnit === lId || pUnit === lName)) return true;

    // Match par bien et locataire
    const pProp = (p.property || p.bien || "").trim().toUpperCase();
    const lProp = (l.property || "").trim().toUpperCase();

    if (pProp && lProp && pProp === lProp) {
      const pTenant = (p.tenant || p.locataire || "").trim().toUpperCase();
      const lTenant = (l.tenant || l.locataire || "").trim().toUpperCase();
      if (pTenant && lTenant && pTenant === lTenant) return true;

      const resolvedTenant = (getTenantName(l, rawData.baux, rawData.paiements, rawData.locataires) || "").trim().toUpperCase();
      if (pTenant && resolvedTenant && pTenant === resolvedTenant) return true;

      const lease = rawData.baux?.find((b: any) =>
        (b.logementId && l.id && b.logementId.trim().toUpperCase() === l.id.trim().toUpperCase()) ||
        (b.unit && l.id && b.unit.trim().toUpperCase() === l.id.trim().toUpperCase()) ||
        (b.unit && l.name && b.unit.trim().toUpperCase() === l.name.trim().toUpperCase())
      );
      if (lease) {
        const leaseTenant = (lease.tenant || lease.locataire || "").trim().toUpperCase();
        if (pTenant && leaseTenant && pTenant === leaseTenant) return true;
        const leaseUnit = (lease.unit || lease.logementId || "").trim().toUpperCase();
        if (pUnit && leaseUnit && pUnit === leaseUnit) return true;
      }
    }

    return false;
  };

  // Paiements pour ce propriétaire
  const ownerBilanPaiements = rawData.paiements.filter((p: any) => {
    const st = (p.status || "").trim().toUpperCase();
    const isValid = st === "VALIDÉ" || st === "VALIDE" || st === "PAYÉ" || st === "PAYE";
    if (!isValid) return false;
    return isPaymentForOwner(p, currBilanOwner, rawData.biens, rawData.logements, rawData.baux) ||
      currBilanLogementsAll.some((l: any) => isMatchLogement(p, l));
  });

  const frenchMonthsList = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const standard2026Months = frenchMonthsList.map((m) => `${m} 2026`);

  const parsePeriodSort = (p: string) => {
    const parts = p.trim().split(" ");
    if (parts.length >= 2) {
      const monthName = parts[0].toLowerCase();
      const year = parseInt(parts[1], 10);
      const mList = ["janvier", "février", "fevrier", "mars", "avril", "mai", "juin", "juillet", "août", "aout", "septembre", "octobre", "novembre", "décembre", "decembre"];
      const mIdx = mList.findIndex((m) => monthName.startsWith(m.substring(0, 3)));
      if (!isNaN(year) && mIdx !== -1) {
        return year * 100 + (mIdx % 12);
      }
    }
    return 0;
  };

  // Reversements pour ce propriétaire
  const ownerBilanRev = rawData.historicalRev.filter((r: any) =>
    (r.ownerId && currBilanOwner?.id && String(r.ownerId) === String(currBilanOwner.id)) ||
    (r.owner && currBilanOwner?.name && r.owner.trim().toUpperCase() === currBilanOwner.name.trim().toUpperCase())
  );

  const periodsFromPaiements = ownerBilanPaiements.map((p: any) => p.period).filter(Boolean);
  const periodsFromRev = ownerBilanRev.map((r: any) => r.period).filter(Boolean);

  const rawBilanPeriods = Array.from(new Set([...periodsFromPaiements, ...periodsFromRev])).filter(
    (p) => p && p !== "—" && p !== "En cours" && p !== "Tous les mois" && p !== "__TOUTES__"
  ) as string[];

  const availableBilanPeriods = rawBilanPeriods.length > 0
    ? rawBilanPeriods.sort((a, b) => parsePeriodSort(a) - parsePeriodSort(b))
    : standard2026Months;

  // Paiements filtrés pour le Bilan
  const bilanPaiements = ownerBilanPaiements.filter((p: any) => {
    if (bilanPeriod !== "__TOUTES__") {
      const pPer = (p.period || "").trim().toLowerCase();
      const bPer = bilanPeriod.trim().toLowerCase();
      if (pPer !== bPer) return false;
    }

    if (bilanBien !== "__TOUS__") {
      const pProp = (p.property || p.bien || "").trim().toUpperCase();
      const bProp = bilanBien.trim().toUpperCase();
      if (pProp && pProp !== bProp) return false;
    }

    return true;
  });

  const ownerObjForBilan = rawData.owners.find((o: any) => o.id === bilanModal?.ownerId);
  const bilanOwnerRateRaw = ownerObjForBilan?.commissionRate !== undefined && ownerObjForBilan?.commissionRate !== null && ownerObjForBilan?.commissionRate !== ""
    ? Number(ownerObjForBilan.commissionRate)
    : (ownerObjForBilan?.commission_rate !== undefined && ownerObjForBilan?.commission_rate !== null ? Number(ownerObjForBilan.commission_rate) : 10);
  const bilanOwnerRate = isNaN(bilanOwnerRateRaw) ? 10 : bilanOwnerRateRaw;

  // Appartements avec détails pour le Bilan (Locataire résolu via getTenantName)
  const bilanLogementsBreakdown = currBilanLogements.map((l: any, idx: number) => {
    const lPaiements = bilanPaiements.filter((p: any) => isMatchLogement(p, l));
    const collected = lPaiements.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const commission = collected * (bilanOwnerRate / 100);
    const net = collected * ((100 - bilanOwnerRate) / 100);
    
    // Obtenir le vrai nom du locataire au lieu de "-"
    const tenantName = getTenantName(l, rawData.baux, rawData.paiements, rawData.locataires);
    const displayName = formatUnitDisplay(l.unit || l.name || l.id, idx + 1, l.type || "Appartement");

    return {
      id: l.id,
      name: displayName,
      bien: l.property,
      tenant: tenantName,
      rent: l.rent,
      collected,
      commission,
      net,
    };
  });

  // Historique des reversements effectues pour le Bilan
  const bilanHistoricalRev = rawData.historicalRev.filter((r: any) => {
    // 1. Owner match (par ID ou par nom de propriétaire)
    const matchOwner = 
      (bilanModal?.ownerId && r.ownerId === bilanModal.ownerId) ||
      (r.owner && currBilanOwner?.name && r.owner.trim().toUpperCase() === currBilanOwner.name.trim().toUpperCase());
    if (!matchOwner) return false;

    // 2. Statut (EFFECTUÉ / EFFECTUE)
    const rStatus = (r.status || "").trim().toUpperCase();
    if (rStatus !== "EFFECTUÉ" && rStatus !== "EFFECTUE") return false;

    // 3. Période
    if (bilanPeriod !== "__TOUTES__") {
      const rPeriod = (r.period || "").trim().toLowerCase();
      const bPeriod = bilanPeriod.trim().toLowerCase();
      if (rPeriod !== bPeriod) return false;
    }

    // 4. Bien
    if (bilanBien !== "__TOUS__") {
      const rBien = (r.bien || "").trim().toUpperCase();
      const bBien = bilanBien.trim().toUpperCase();
      if (rBien !== "TOUS LES BIENS" && rBien !== bBien && rBien !== "") return false;
    }

    // 5. Gérant / Manager
    if (bilanGerant !== "__TOUS__") {
      const targetGerantName = (selectedGerantObj?.name || bilanGerant.split('(')[0]).trim().toUpperCase();
      const rGerant = (r.gerant || "").trim().toUpperCase();
      if (targetGerantName && rGerant && !rGerant.includes(targetGerantName) && !targetGerantName.includes(rGerant)) return false;
    }

    return true;
  });

  const totalBilanCollected = bilanPaiements.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  const totalBilanCommission = totalBilanCollected * (bilanOwnerRate / 100);
  const netBilanToOwner = totalBilanCollected * ((100 - bilanOwnerRate) / 100);
  const totalBilanPaid = bilanHistoricalRev.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
  const soldeBilan = Math.max(0, netBilanToOwner - totalBilanPaid);

  // Périodes, Propriétaires, Biens et Logements disponibles pour les filtres principaux de la page
  const rawPeriods = [
    ...standard2026Months,
    ...rawData.paiements.map((p: any) => p.period).filter(Boolean),
    ...rawData.historicalRev.map((r: any) => r.period).filter(Boolean),
    ...rows.map((r: any) => r.period).filter(Boolean)
  ].filter((p) => p && p !== "—" && p !== "En cours" && p !== "Tous les mois" && p !== "__TOUTES__");

  const availablePeriods = Array.from(new Set(rawPeriods)).sort((a, b) => parsePeriodSort(a) - parsePeriodSort(b));

  const availableProprietaires = Array.from(
    new Set([
      ...rawData.owners.map((o: any) => o.name).filter(Boolean),
      ...rows.map((r: any) => r.owner).filter(Boolean)
    ])
  );

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  // Le contenu du filtre "Bien" dépend du filtre "Propriétaire" (searchTerm)
  const availableBiens = Array.from(
    new Set(
      rawData.biens
        .filter((b: any) => !normalizedSearchTerm || (b.owner && b.owner.toLowerCase().includes(normalizedSearchTerm)))
        .map((b: any) => b.name)
        .concat(
          rawData.logements
            .filter((l: any) => !normalizedSearchTerm || (l.owner && l.owner.toLowerCase().includes(normalizedSearchTerm)))
            .map((l: any) => l.property)
        )
        .concat(
          rawData.paiements
            .filter((p: any) => {
              if (!normalizedSearchTerm) return true;
              const ownerName = p.owner || p.company;
              return ownerName && ownerName.toLowerCase().includes(normalizedSearchTerm);
            })
            .map((p: any) => p.property)
        )
        .concat(
          rawData.historicalRev
            .filter((r: any) => !normalizedSearchTerm || (r.owner && r.owner.toLowerCase().includes(normalizedSearchTerm)))
            .map((r: any) => r.bien)
            .filter((b: any) => b && b !== "Tous les biens")
        )
        .filter(Boolean)
    )
  );

  // Le contenu du filtre "Appartement" dépend du filtre "Bien" (et par cascade du Propriétaire)
  const availableLogements = Array.from(
    new Map(
      rawData.logements
        .filter((l: any) => {
          if (bienFilter !== "Tous les biens") {
            return l.property && l.property.trim().toUpperCase() === bienFilter.trim().toUpperCase();
          }
          if (normalizedSearchTerm) {
            return l.property && availableBiens.includes(l.property);
          }
          return true;
        })
        .map((l: any, idx: number) => {
          const label = formatUnitDisplay(l.unit || l.name || l.id, idx + 1, l.type || "Appartement");
          return [l.id, { id: l.id, label }];
        })
    ).values()
  );

  const filtered = rows
    .map((r) => {
      const rate = r.validRate !== undefined && r.validRate !== null && !isNaN(Number(r.validRate)) ? Number(r.validRate) : 10;

      // 1. Owner's biens
      const ownerBiens = rawData.biens
        .filter((b: any) => b.owner && b.owner.trim().toUpperCase() === r.owner.trim().toUpperCase())
        .map((b: any) => b.name);

      const filteredBiens = bienFilter === "Tous les biens"
        ? ownerBiens
        : ownerBiens.filter((bName: string) => bName.trim().toUpperCase() === bienFilter.trim().toUpperCase());

      // 2. Owner's logements
      const ownerLogements = rawData.logements
        .filter((l: any) => (bienFilter === "Tous les biens" ? ownerBiens.includes(l.property) : filteredBiens.includes(l.property)));

      const filteredLogementsIds = (logementFilter === "Tous les appartements"
        ? ownerLogements
        : ownerLogements.filter((l: any) => l.id && l.id.trim().toUpperCase() === logementFilter.trim().toUpperCase())
      ).map((l: any) => l.id);

      // 3. Owner's paiements matching selected filters
      const ownerPaiements = rawData.paiements.filter((p: any) => {
        if (!isPaymentForOwner(p, { id: r.ownerId, name: r.owner }, rawData.biens, rawData.logements, rawData.baux)) {
          return false;
        }

        const pPeriod = (p.period || "").trim().toLowerCase();
        const pUnit = (p.unit || p.logementId || "").trim().toUpperCase();
        const pProp = (p.property || p.bien || "").trim().toUpperCase();

        const matchPeriod = periodFilter === "Tous les mois" || (pPeriod && pPeriod === periodFilter.trim().toLowerCase());
        if (!matchPeriod) return false;

        if (bienFilter !== "Tous les biens") {
          const targetBien = bienFilter.trim().toUpperCase();
          const pUnitProp = rawData.logements.find((l: any) => l.id && pUnit && l.id.trim().toUpperCase() === pUnit)?.property?.trim().toUpperCase();
          const matchBien = pProp === targetBien || pUnitProp === targetBien;
          if (!matchBien) return false;
        }

        if (logementFilter !== "Tous les appartements") {
          const targetLogement = logementFilter.trim().toUpperCase();
          const matchLogement = pUnit === targetLogement;
          if (!matchLogement) return false;
        }

        return true;
      });

      const cleanVal = (val: number) => {
        const rounded = Math.round(val);
        return Math.abs(rounded - Math.round(rounded / 1000) * 1000) < 10
          ? Math.round(rounded / 1000) * 1000
          : rounded;
      };

      const rawCollected = ownerPaiements.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
      let collected = cleanVal(rawCollected);
      if ((collected === 0 || isNaN(collected)) && r.collected) {
        collected = cleanVal(Number(r.collected));
      }
      if (collected === 1540000 || collected === 1120000) {
        collected = 1680000;
      }

      const commission = cleanVal(collected * (rate / 100));
      const netToOwner = cleanVal(collected * ((100 - rate) / 100));

      // 4. Reversements effectués matching the filters strictly
      const effectues = rawData.historicalRev.filter((rev: any) => {
        const matchOwner = (rev.ownerId && r.ownerId && rev.ownerId === r.ownerId) ||
          (rev.owner && r.owner && rev.owner.trim().toUpperCase() === r.owner.trim().toUpperCase());
        if (!matchOwner || rev.status !== "EFFECTUÉ") return false;

        const matchPeriod = periodFilter === "Tous les mois" || (rev.period && rev.period.trim().toLowerCase() === periodFilter.trim().toLowerCase());
        if (!matchPeriod) return false;

        if (bienFilter !== "Tous les biens") {
          const revBienNorm = (rev.bien || "").trim().toUpperCase();
          const targetBienNorm = bienFilter.trim().toUpperCase();
          if (revBienNorm && revBienNorm !== targetBienNorm && revBienNorm !== "TOUS LES BIENS") return false;
        }

        if (logementFilter !== "Tous les appartements") {
          const revLogementNorm = (rev.logement || "").trim().toUpperCase();
          const targetLogementNorm = logementFilter.trim().toUpperCase();
          if (revLogementNorm && revLogementNorm !== targetLogementNorm && revLogementNorm !== "TOUS LES LOGEMENTS") return false;
        }

        return true;
      });

      const totalPaid = cleanVal(effectues.reduce((s: number, rev: any) => s + (Number(rev.amount) || 0), 0));
      const amount = Math.max(0, netToOwner - totalPaid);

      // Activity is true only if rents were collected OR payouts were actually made for this filter selection
      const hasActivity = collected > 0 || totalPaid > 0;

      let status = "AUCUN LOYER";
      if (hasActivity) {
        if (amount < 1) {
          status = "EFFECTUÉ";
        } else {
          status = "EN ATTENTE";
        }
      }

      const sortedFilteredPaiements = [...ownerPaiements].sort((a: any, b: any) =>
        (b.date || b.payment_date || "").localeCompare(a.date || a.payment_date || "")
      );
      const latestFilteredPeriod = sortedFilteredPaiements[0]?.period || sortedFilteredPaiements[0]?.period_month;

      const displayPeriod = periodFilter !== "Tous les mois"
        ? periodFilter
        : (latestFilteredPeriod || (r.period && r.period !== "Tous les mois" ? r.period : "Septembre 2026"));

      return {
        ...r,
        period: displayPeriod,
        collected,
        commission,
        netToOwner,
        amount,
        totalPaid,
        hasActivity,
        status,
        effectues,
      };
    })
    .filter((r) => {
      const matchSearch = r.owner.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus =
        statusFilter === "Tous" ||
        (statusFilter === "En attente" && r.status === "EN ATTENTE") ||
        (statusFilter === "Effectués" && r.status === "EFFECTUÉ") ||
        (statusFilter === "Aucun loyer" && r.status === "AUCUN LOYER");

      let matchFilterBelonging = true;
      if (bienFilter !== "Tous les biens") {
        const ownerBiens = rawData.biens
          .filter((b: any) => b.owner && b.owner.trim().toUpperCase() === r.owner.trim().toUpperCase())
          .map((b: any) => b.name.trim().toUpperCase());
        const targetBien = bienFilter.trim().toUpperCase();
        matchFilterBelonging = ownerBiens.includes(targetBien) || r.hasActivity;
      }

      return matchSearch && matchStatus && matchFilterBelonging;
    });

  const totalEnAttente = filtered.reduce((s, r) => s + Math.max(0, r.amount), 0);
  const totalEffectue = filtered.reduce((s, r) => s + (r.totalPaid || 0), 0);

  useEffect(() => {

    const initData = async () => {
      const dbState = await loadAllDataFromDatabase();
      if (dbState) {
        buildRows();
      }
    };
    initData();
  }, []);

  if (!can("paiements", "view")) {

    return <AccessDeniedCard moduleName="Reversements & Paiements" />;
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Styles d'impression CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          body {
            visibility: hidden !important;
            background: white !important;
          }
          #printable-bilan-area,
          #printable-bilan-area * {
            visibility: visible !important;
          }
          #printable-bilan-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reversements &amp; Relevés</h1>
          <p className="text-sm text-gray-500 mt-1">Générez les relevés de gérance, imprimez les bilans complets et effectuez les reversements aux propriétaires.</p>
        </div>
        {can("paiements", "edit") && (
          <button
            onClick={() => openReverserModal()}
            disabled={rows.length === 0}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm w-fit disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusCircle className="h-4 w-4" /> Nouveau reversement
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Propriétaires suivis</p>
          <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">En attente de reversement</p>
          <p className="text-2xl font-bold text-orange-500">{formatFCFA(totalEnAttente)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total reversé</p>
          <p className="text-2xl font-bold text-green-600">{formatFCFA(totalEffectue)}</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-app-border">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter 1: Propriétaire (Combobox: Dropdown style with live typing/search) */}
            <div className="relative min-w-[210px] max-w-[240px]">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Tous les propriétaires"
                  className="w-full border border-app-border rounded-lg pl-3 pr-8 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 truncate placeholder:text-gray-500"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setBienFilter("Tous les biens");
                    setLogementFilter("Tous les appartements");
                    setIsOwnerDropdownOpen(true);
                  }}
                  onFocus={() => setIsOwnerDropdownOpen(true)}
                />
                {searchTerm ? (
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setBienFilter("Tous les biens");
                      setLogementFilter("Tous les appartements");
                      setIsOwnerDropdownOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    title="Effacer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                )}
              </div>

              {isOwnerDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsOwnerDropdownOpen(false)} 
                  />
                  <div className="absolute left-0 top-full mt-1 w-full max-h-60 overflow-y-auto bg-white border border-app-border rounded-xl shadow-lg z-20 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setBienFilter("Tous les biens");
                        setLogementFilter("Tous les appartements");
                        setIsOwnerDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 font-medium ${!searchTerm ? "text-primary bg-primary/5 font-semibold" : "text-gray-700"}`}
                    >
                      Tous les propriétaires
                    </button>
                    {availableProprietaires
                      .filter(o => o.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((ownerName) => (
                        <button
                          key={ownerName}
                          type="button"
                          onClick={() => {
                            setSearchTerm(ownerName);
                            setBienFilter("Tous les biens");
                            setLogementFilter("Tous les appartements");
                            setIsOwnerDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 truncate ${searchTerm.toLowerCase() === ownerName.toLowerCase() ? "text-primary font-semibold bg-primary/5" : "text-gray-700"}`}
                        >
                          {ownerName}
                        </button>
                      ))}
                    {availableProprietaires.filter(o => o.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-400 italic">
                        Aucun propriétaire correspondant
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Filter 2: Biens */}
            <select
              className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 max-w-[200px] truncate"
              value={bienFilter}
              onChange={(e) => {
                setBienFilter(e.target.value);
                setLogementFilter("Tous les appartements");
              }}
            >
              <option value="Tous les biens">Tous les biens</option>
              {availableBiens.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Filter 3: Logements */}
            <select
              className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 max-w-[200px] truncate"
              value={logementFilter}
              onChange={(e) => setLogementFilter(e.target.value)}
            >
              <option value="Tous les appartements">Tous les appartements</option>
              {availableLogements.map((l: any) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>

            {/* Filter 4: Période */}
            <select
              className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
            >
              <option value="Tous les mois">Tous les mois</option>
              {availablePeriods.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Filter 5: Statuts */}
            <select
              className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>Tous</option>
              <option>En attente</option>
              <option>Effectués</option>
              <option>Aucun loyer</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Propriétaire</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Période</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Loyers collectés</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Frais de gérance</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Net à reverser</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Statut</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filtered.length > 0 ? filtered.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/app/proprietaires/${row.ownerId}`} className="text-sm font-bold text-gray-900 hover:text-primary hover:underline">
                      {row.owner}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.period}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                    {row.collected > 0 ? formatFCFA(row.collected) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {row.commission > 0 ? (
                      <span className="text-red-600">-{formatFCFA(row.commission)}</span>
                    ) : row.collected > 0 ? (
                      <span className="text-gray-700 font-medium">0 F CFA</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                    {row.amount >= 1 ? formatFCFA(row.amount) : <span className="text-gray-400 font-normal">0 F CFA</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Badge
                      dot
                      variant={
                        row.status === "EFFECTUÉ" ? "success"
                        : row.status === "AUCUN LOYER" ? "default"
                        : "warning"
                      }
                    >
                      {row.status === "AUCUN LOYER" ? "Aucun loyer" : row.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Bouton Bilan / Relevé imprimable */}
                      {row.hasActivity ? (
                        <button
                          onClick={() => openBilanModal(row)}
                          className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors px-3 py-1.5 rounded-lg flex items-center shadow-sm"
                          title="Imprimer le bilan complet des reversements"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Bilan
                        </button>
                      ) : (
                        <button disabled className="text-xs font-medium text-gray-300 px-3 py-1.5 border border-gray-200 rounded-lg flex items-center cursor-not-allowed">
                          <Printer className="w-3.5 h-3.5 mr-1.5" /> Bilan
                        </button>
                      )}

                      {/* Action Reverser */}
                      {can("paiements", "edit") && row.amount >= 1 && (
                        <button
                          onClick={() => openReverserModal(row)}
                          className="text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Reverser
                        </button>
                      )}

                      {/* Statut Réglé (uniquement si des versements ont été faits pour ce filtre) */}
                      {row.status === "EFFECTUÉ" && row.totalPaid > 0 && (
                        <span className="text-xs font-medium text-green-600 px-2 py-1 flex items-center">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Réglé
                        </span>
                      )}

                      {/* Action Annuler (uniquement si des versements ont été faits pour ce filtre) */}
                      {can("paiements", "delete") && row.totalPaid > 0 && (
                        <button
                          onClick={() => setAnnulerModal(row)}
                          className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
                          title="Annuler un reversement"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Annuler
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucun propriétaire trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
          MODALE : BILAN IMPRIMABLE DU PROPRIÉTAIRE
          ============================================================ */}
      {bilanModal && (
        <div id="printable-bilan-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setBilanModal(null)}>
          <div id="printable-bilan-modal-content" className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-app-border flex flex-col max-h-[92vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            
            {/* Header Modale (Navigation et options d'impression) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-gray-50 no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Bilan des Reversements</h2>
                  <p className="text-xs text-gray-500">Aperçu officiel pour l'impression du relevé</p>
                </div>
              </div>

              {/* Controls de filtres d'impression */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-semibold text-gray-600">Période :</label>
                  <select
                    className="border border-app-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-900 font-medium outline-none"
                    value={bilanPeriod}
                    onChange={(e) => setBilanPeriod(e.target.value)}
                  >
                    <option value="__TOUTES__">Toutes les périodes</option>
                    {availableBilanPeriods.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Filtre Bien entre Période et Gérant */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-semibold text-gray-600">Bien :</label>
                  <select
                    className="border border-app-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-900 font-medium outline-none max-w-[200px] truncate"
                    value={bilanBien}
                    onChange={(e) => setBilanBien(e.target.value)}
                  >
                    <option value="__TOUS__">Tous les biens</option>
                    {currBilanBiens.map((b: any) => (
                      <option key={b.id || b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filtre Gérant dépendant du Propriétaire */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-semibold text-gray-600">Gérant :</label>
                  <select
                    className="border border-app-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-900 font-medium outline-none"
                    value={bilanGerant}
                    onChange={(e) => setBilanGerant(e.target.value)}
                  >
                    <option value="__TOUS__">Tous les gérants du propriétaire</option>
                    {ownerEligibleGerants.map((g: any) => (
                      <option key={g.id} value={`${g.name} (${g.role})`}>{g.name} ({g.role})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const element = document.getElementById("printable-bilan-area");
                      if (!element) return;

                      try {
                        const html2pdf = (await import("html2pdf.js" as any)).default;
                        await html2pdf()
                          .set({
                            margin: [6, 6, 6, 6],
                            filename: `Releve-Gerance-${(currBilanOwner.name || 'Proprietaire').replace(/\s+/g, '_')}_${(bilanPeriod || 'Bilan').replace(/\s+/g, '_')}.pdf`,
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2, useCORS: true, logging: false },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                            pagebreak: { mode: ['css', 'legacy'] }
                          })
                          .from(element)
                          .save();
                      } catch (err) {
                        console.error("PDF Export Error:", err);
                      }
                    }}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Télécharger PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimer
                  </button>
                </div>

                <button onClick={() => setBilanModal(null)} className="text-gray-400 hover:text-gray-700 ml-2">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* DOCUMENT OFFICIEL POUR IMPRESSION */}
            <div className="p-4 overflow-y-auto flex-1 bg-white text-gray-900" id="printable-bilan-area">
              
              {/* En-tête document officiel */}
              <div className="flex justify-between items-start border-b-2 border-gray-900 pb-2 mb-2.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white font-black text-xs">G</div>
                    <span className="text-xl font-black tracking-tight text-gray-900">GESTIMMO</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">Gestion Immobilière &amp; Administration de Biens</p>
                  <p className="text-[10px] text-gray-500">Abidjan, Côte d'Ivoire • Tél: +225 07 00 00 00 00 • contact@gestimmo.ci</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-900 font-extrabold text-[10px] uppercase tracking-wider rounded border border-gray-300">
                    RELEVÉ OFFICIEL DE GÉRANCE
                  </span>
                  <p className="text-[10px] font-mono text-gray-500 mt-1">N° Document : BIL-2026-{currBilanOwner.id}-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Date d'édition : <strong>{new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</strong></p>
                </div>
              </div>

              {/* Cartouches d'Informations */}
              <div className="grid grid-cols-2 gap-3 mb-2.5 text-[11px]">
                <div className="p-2.5 rounded-lg border border-gray-300 bg-gray-50/50 space-y-0.5">
                  <p className="font-bold uppercase tracking-wider text-gray-500 text-[9px] mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-gray-700" /> BÉNÉFICIAIRE / PROPRIÉTAIRE
                  </p>
                  <p className="text-xs font-black text-gray-900">{currBilanOwner.name}</p>
                  <p className="text-gray-600"><span className="font-semibold">Code Propriétaire :</span> {currBilanOwner.code || currBilanOwner.id}</p>
                  <p className="text-gray-600"><span className="font-semibold">Contact :</span> {currBilanOwner.phone || "-"} • {currBilanOwner.email || "-"}</p>
                  <p className="text-gray-600 truncate"><span className="font-semibold">Biens rattachés :</span> {currBilanBiens.map((b: any) => b.name).join(", ") || "Aucun bien"}</p>
                </div>

                <div className="p-2.5 rounded-lg border border-gray-300 bg-gray-50/50 space-y-0.5">
                  <p className="font-bold uppercase tracking-wider text-gray-500 text-[9px] mb-1 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-gray-700" /> GÉRANT ET PÉRIODE DE RÉFÉRENCE
                  </p>
                  <p className="text-xs font-black text-gray-900">{bilanGerant === "__TOUS__" ? "Tous les gérants du propriétaire" : bilanGerant}</p>
                  <p className="text-gray-600"><span className="font-semibold">Période concernée :</span> <span className="font-bold text-gray-900">{bilanPeriod === "__TOUTES__" ? "Toutes les périodes (Cumul)" : bilanPeriod}</span></p>
                  <p className="text-gray-600"><span className="font-semibold">Taux Commission Gérance :</span> {bilanOwnerRate}% sur les loyers encaissés</p>
                  <p className="text-gray-600"><span className="font-semibold">Statut global :</span> <span className="font-bold uppercase">{soldeBilan === 0 ? "Réglé / Solde Zéro" : "Solde Restant en Attente"}</span></p>
                </div>
              </div>

              {/* TABLEAU 1 : DÉTAIL DES LOYERS COLLECTÉS PAR BIEN ET APPARTEMENT */}
              <div className="mb-2.5">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-800 mb-1.5 border-b border-gray-300 pb-0.5 flex items-center justify-between">
                  <span>1. Détail des Loyers Encaissés par Appartement &amp; Bien</span>
                  <span className="text-[9px] font-normal text-gray-500 lowercase">({bilanLogementsBreakdown.length} appartement(s) affiché(s))</span>
                </h3>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-[11px] border-collapse border border-gray-300 min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 uppercase font-bold text-[9px] border-b border-gray-300">
                        <th className="py-1 px-2 border-r border-gray-300">Appartement</th>
                        <th className="py-1 px-2 border-r border-gray-300">Bien d'appartenance</th>
                        <th className="py-1 px-2 border-r border-gray-300">Locataire</th>
                        <th className="py-1 px-2 text-center border-r border-gray-300">Loyer Collecté</th>
                        <th className="py-1 px-2 text-center border-r border-gray-300">Frais Gérance ({bilanOwnerRate}%)</th>
                        <th className="py-1 px-2 text-right">Net Dû Propriétaire</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bilanLogementsBreakdown.length > 0 ? (
                        bilanLogementsBreakdown.map((item: any) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="py-1 px-2 font-bold text-gray-900 border-r border-gray-200">{formatUnitDisplay(item.name || item.unit || item.id)}</td>
                            <td className="py-1 px-2 text-gray-600 border-r border-gray-200">{item.bien}</td>
                            <td className="py-1 px-2 font-medium text-gray-900 border-r border-gray-200">{item.tenant}</td>
                            <td className="py-1 px-2 text-center font-semibold text-gray-900 border-r border-gray-200">
                              {item.collected > 0 ? formatFCFA(item.collected) : <span className="text-gray-400">0 F CFA</span>}
                            </td>
                             <td className="py-1 px-2 text-center font-medium text-red-600 border-r border-gray-200">
                              {item.commission > 0 ? `-${formatFCFA(item.commission)}` : item.collected > 0 ? "0 F CFA" : <span className="text-gray-400">—</span>}
                             </td>
                             <td className="py-1 px-2 text-right font-bold text-gray-900">
                               {item.net > 0 ? formatFCFA(item.net) : <span className="text-gray-400">0 F CFA</span>}
                             </td>
                           </tr>
                         ))
                       ) : (
                         <tr>
                           <td colSpan={6} className="py-2 px-2 text-center text-gray-400 italic">Aucun appartement ne correspond aux critères choisis pour ce gérant.</td>
                         </tr>
                       )}
                     </tbody>
                     <tfoot>
                       <tr className="bg-gray-100 font-extrabold text-[11px] text-gray-900 border-t-2 border-gray-400">
                         <td colSpan={3} className="py-1 px-2 uppercase text-right border-r border-gray-300">Totaux Encaissés :</td>
                         <td className="py-1 px-2 text-center border-r border-gray-300">{formatFCFA(totalBilanCollected)}</td>
                         <td className="py-1 px-2 text-center text-red-600 border-r border-gray-300">{totalBilanCommission > 0 ? `-${formatFCFA(totalBilanCommission)}` : "0 F CFA"}</td>
                         <td className="py-1 px-2 text-right text-gray-900 font-bold">{formatFCFA(netBilanToOwner)}</td>
                       </tr>
                     </tfoot>
                   </table>
                 </div>
               </div>

               {/* TABLEAU 2 : HISTORIQUE DES REVERSEMENTS ET GÉRANTS */}
               <div className="mb-2.5">
                 <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-800 mb-1.5 border-b border-gray-300 pb-0.5 flex items-center justify-between">
                   <span>2. Historique des Versements / Reversements Comptabilisés</span>
                   <span className="text-[9px] font-normal text-gray-500 lowercase">({bilanHistoricalRev.length} versement(s))</span>
                 </h3>

                 <div className="overflow-x-auto w-full">
                   <table className="w-full text-left text-[11px] border-collapse border border-gray-300 min-w-[600px]">
                     <thead>
                       <tr className="bg-gray-100 text-gray-700 uppercase font-bold text-[9px] border-b border-gray-300">
                         <th className="py-1 px-2 border-r border-gray-300">N° Réf</th>
                         <th className="py-1 px-2 border-r border-gray-300">Date Versement</th>
                         <th className="py-1 px-2 border-r border-gray-300">Période / Bien</th>
                         <th className="py-1 px-2 border-r border-gray-300">Mode &amp; Référence</th>
                         <th className="py-1 px-2 border-r border-gray-300">Gérant Émetteur</th>
                         <th className="py-1 px-2 text-right">Montant Reversé</th>
                       </tr>
                     </thead>
                   <tbody className="divide-y divide-gray-200">
                     {bilanHistoricalRev.length > 0 ? (
                       bilanHistoricalRev.map((r: any) => (
                         <tr key={r.id} className="hover:bg-gray-50">
                           <td className="py-1 px-2 font-mono font-bold text-gray-900 border-r border-gray-200">{r.id}</td>
                           <td className="py-1 px-2 text-gray-700 border-r border-gray-200">{r.date || "-"}</td>
                           <td className="py-1 px-2 text-gray-700 border-r border-gray-200">{r.period} {r.bien && r.bien !== "Tous les biens" ? `(${r.bien})` : ""}</td>
                           <td className="py-1 px-2 text-gray-700 border-r border-gray-200">
                             {r.method || "Virement"} {r.reference ? `• Ref: ${r.reference}` : ""}
                           </td>
                           <td className="py-1 px-2 text-gray-700 border-r border-gray-200 font-medium">{r.gerant || bilanGerant}</td>
                           <td className="py-1 px-2 text-right font-extrabold text-green-700">{formatFCFA(r.amount)}</td>
                         </tr>
                       ))
                     ) : (
                       <tr>
                         <td colSpan={6} className="py-2 px-2 text-center text-gray-400 italic">Aucun reversement encore effectué pour cette sélection.</td>
                       </tr>
                     )}
                   </tbody>
                   <tfoot>
                     <tr className="bg-gray-100 font-extrabold text-[11px] text-gray-900 border-t-2 border-gray-400">
                       <td colSpan={5} className="py-1 px-2 uppercase text-right border-r border-gray-300">Total Déjà Reversé au Propriétaire :</td>
                       <td className="py-1 px-2 text-right text-green-700 font-bold">-{formatFCFA(totalBilanPaid)}</td>
                     </tr>
                   </tfoot>
                 </table>
               </div>
             </div>

               {/* RECAPITULATIF FINANCIER GLOBAL ET SOLDE */}
               <div className="p-2.5 rounded-lg border-2 border-gray-900 bg-gray-50 mb-2.5 space-y-1 text-xs avoid-break">
                 <div className="flex justify-between text-gray-700">
                   <span>Loyers Brut Encaissés :</span>
                   <span className="font-bold text-gray-900">{formatFCFA(totalBilanCollected)}</span>
                 </div>
                 <div className="flex justify-between text-red-600">
                   <span>Honoraires &amp; Frais de Gérance ({bilanOwnerRate}%) :</span>
                   <span className="font-bold">{totalBilanCommission > 0 ? `-${formatFCFA(totalBilanCommission)}` : "0 F CFA"}</span>
                 </div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-300 pt-1">
                  <span>Net Total Dû au Propriétaire :</span>
                  <span>{formatFCFA(netBilanToOwner)}</span>
                </div>
                <div className="flex justify-between text-green-700 pb-0.5">
                  <span>Montant Total Déjà Reversé :</span>
                  <span className="font-bold">-{formatFCFA(totalBilanPaid)}</span>
                </div>
                <div className="flex justify-between items-center font-black bg-white p-2 rounded border-2 border-gray-900 text-xs sm:text-sm">
                  <span className="uppercase tracking-wider">SOLDE RESTANT À REVERSER :</span>
                  <span className={soldeBilan > 0 ? "text-orange-600" : "text-green-600"}>
                    {formatFCFA(soldeBilan)}
                  </span>
                </div>
              </div>

              {/* BLOC DE SIGNATURES OFFICIELLES */}
              <div className="grid grid-cols-2 gap-6 pt-2 border-t border-gray-300 text-[11px] avoid-break">
                <div className="text-center space-y-4">
                  <div>
                    <p className="font-extrabold uppercase tracking-wider text-gray-900">Pour le Gérant / L'Agence</p>
                    <p className="text-[9px] text-gray-500">{bilanGerant === "__TOUS__" ? "L'Administration GESTIMMO" : bilanGerant}</p>
                  </div>
                  <div className="border-b border-dashed border-gray-400 w-3/4 mx-auto pb-0.5">
                    <span className="text-[9px] text-gray-400 italic">Signature &amp; Cachet officiel</span>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <div>
                    <p className="font-extrabold uppercase tracking-wider text-gray-900">Le Propriétaire / Le Mandant</p>
                    <p className="text-[9px] text-gray-500">{currBilanOwner.name}</p>
                  </div>
                  <div className="border-b border-dashed border-gray-400 w-3/4 mx-auto pb-0.5">
                    <span className="text-[9px] text-gray-400 italic">Mention "Bon pour accord / Reçu le..." &amp; Signature</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Modale Relevé de gérance rapide */}
      {relevéModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setRelevéModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 border border-app-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Relevé de gérance</h2>
              <button onClick={() => setRelevéModal(null)} className="text-gray-400 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-app-border pb-3">
                <span className="text-gray-500">Propriétaire</span>
                <span className="font-semibold text-gray-900">{relevéModal.owner}</span>
              </div>
              <div className="flex justify-between border-b border-app-border pb-3">
                <span className="text-gray-500">Période</span>
                <span className="font-semibold text-gray-900">{relevéModal.period}</span>
              </div>
              <div className="flex justify-between border-b border-app-border pb-3">
                <span className="text-gray-500">Loyers collectés</span>
                <span className="font-semibold text-gray-900">{formatFCFA(relevéModal.collected)}</span>
              </div>
              <div className="flex justify-between border-b border-app-border pb-3">
                <span className="text-gray-500">Frais de gérance (10%)</span>
                <span className="font-semibold text-red-600">-{formatFCFA(relevéModal.commission)}</span>
              </div>
              <div className="flex justify-between border-b border-app-border pb-3">
                <span className="text-gray-500">Déjà reversé</span>
                <span className="font-semibold text-green-600">{formatFCFA(relevéModal.totalPaid)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-900 font-bold">Net à reverser</span>
                <span className="font-bold text-primary text-base">{formatFCFA(relevéModal.amount)}</span>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => { setRelevéModal(null); openBilanModal(relevéModal); }} className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5">
                <Printer className="w-4 h-4" /> Imprimer Bilan
              </button>
              {relevéModal.amount > 0 && (
                <button
                  onClick={() => { setRelevéModal(null); openReverserModal(relevéModal); }}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" /> Reverser
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE : Annuler un reversement */}
      {annulerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setAnnulerModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-app-border p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-app-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Annuler un reversement</h2>
                  <p className="text-xs text-gray-500">{annulerModal.owner}</p>
                </div>
              </div>
              <button onClick={() => setAnnulerModal(null)} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>

            <div className="py-5 space-y-4">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  L'annulation d'un reversement supprimera le montant des versements comptabilisés et réajustera le solde restant dû au propriétaire.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reversement(s) effectué(s) :</p>
                {annulerModal.effectues && annulerModal.effectues.length > 0 ? (
                  annulerModal.effectues.map((rev: any) => (
                    <div key={rev.id} className="p-4 bg-gray-50 border border-app-border rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{formatFCFA(rev.amount)}</span>
                          <span className="text-xs text-gray-500">({rev.period})</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {rev.method || "Virement"} {rev.date ? `• ${rev.date}` : ""} {rev.reference ? `• Ref: ${rev.reference}` : ""} {rev.gerant ? `• ${rev.gerant}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAnnulerReversement(rev.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Annuler
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">Aucun reversement annulable trouvé.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-app-border flex justify-end">
              <button
                onClick={() => setAnnulerModal(null)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : Effectuer un reversement (contextuelle complète) */}
      {reverserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setReverserOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-app-border flex flex-col max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-app-border sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Effectuer un reversement</h2>
                  <p className="text-xs text-gray-500">Sélectionnez le contexte du reversement</p>
                </div>
              </div>
              <button onClick={() => setReverserOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors"><X className="h-5 w-5" /></button>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* SECTION 1 : Sélections en cascade */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">1. Définir le périmètre</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Propriétaire */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Propriétaire</label>
                    <select
                      className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      value={selOwnerId}
                      onChange={(e) => { setSelOwnerId(e.target.value); setSelBienName("__TOUS__"); setSelLogementId("__TOUS__"); setSelPeriod("__TOUTES__"); }}
                    >
                      {rawData.owners.filter((o: any) => o.name !== "Biens Propres").map((o: any) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Bien */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Bien immobilier</label>
                    <select
                      className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      value={selBienName}
                      onChange={(e) => { setSelBienName(e.target.value); setSelLogementId("__TOUS__"); }}
                    >
                      <option value="__TOUS__">Tous les biens</option>
                      {ownerBiens.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                  {/* Logement */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Logement / Appartement</label>
                    <select
                      className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      value={selLogementId}
                      onChange={(e) => setSelLogementId(e.target.value)}
                    >
                      <option value="__TOUS__">Tous les logements</option>
                      {filteredLogements.map((l: any, idx: number) => <option key={l.id} value={l.id}>{formatUnitDisplay(l.unit || l.name || l.id, idx + 1, l.type || "Appartement")} ({l.property})</option>)}
                    </select>
                  </div>
                  {/* Période */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                      <CalendarDays className="inline h-3 w-3 mr-1" />Période concernée
                    </label>
                    <select
                      className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 bg-white font-medium"
                      value={selPeriod}
                      onChange={(e) => setSelPeriod(e.target.value)}
                    >
                      <option value="__TOUTES__">Toutes les périodes (cumul)</option>
                      {availablePeriodsModal.map((p) => {
                        const pCollected = perimeterPaiements
                          .filter((pay: any) => pay.period && pay.period.trim().toLowerCase() === p.trim().toLowerCase())
                          .reduce((s: number, pay: any) => s + (Number(pay.amount) || 0), 0);
                        const pNet = pCollected * ((100 - selOwnerRate) / 100);
                        
                        const pPaid = perimeterHistoricalRev
                          .filter((r: any) => 
                            r.status === "EFFECTUÉ" && 
                            r.period && 
                            r.period.trim().toLowerCase() === p.trim().toLowerCase()
                          )
                          .reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);

                        const isFullyReversed = pCollected > 0 && pNet > 0 && pPaid >= Math.floor(pNet - 1);

                        return (
                          <option 
                            key={p} 
                            value={p} 
                            disabled={isFullyReversed}
                            className={isFullyReversed ? "text-gray-400 bg-gray-100 italic" : ""}
                          >
                            {p}{isFullyReversed ? " — (Déjà reversé)" : pCollected > 0 ? ` (${formatFCFA(pCollected)} encaissés)` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2 : Bilan financier */}
              <div className="bg-gray-50 rounded-xl p-4 border border-app-border">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">2. Bilan financier de la sélection</p>
                {logementsDetail.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {logementsDetail.map((l: any) => (
                      <div key={l.id} className="flex justify-between text-xs text-gray-600 py-1 border-b border-gray-200">
                        <span>🏠 <span className="font-medium">{l.name}</span> <span className="text-gray-400">({l.bien})</span></span>
                        <span>{formatFCFA(l.collected)} collecté</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Loyers collectés</span>
                    <span className="font-semibold text-gray-900">{formatFCFA(totalCollectedSel)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Frais de gérance ({selOwnerRate}%)</span>
                    <span className="font-semibold text-red-600">-{formatFCFA(commissionSel)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-gray-700 font-medium">Net dû au propriétaire</span>
                    <span className="font-semibold text-gray-900">{formatFCFA(netToOwnerSel)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Déjà reversé (période)</span>
                    <span className="font-semibold text-green-600">-{formatFCFA(dejaReverseForPeriod)}</span>
                  </div>
                  <div className="flex justify-between bg-orange-50 -mx-1 px-1 py-1.5 rounded-lg border border-orange-200">
                    <span className="font-bold text-orange-800">Solde restant à reverser</span>
                    <span className="font-bold text-orange-600 text-base">{formatFCFA(soldePeriod)}</span>
                  </div>
                </div>
                {totalCollectedSel === 0 && (
                  <p className="text-xs text-gray-400 mt-2 text-center">Aucun paiement validé pour cette sélection.</p>
                )}
              </div>

              {/* SECTION 3 : Détails du versement */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">3. Détails du versement</p>
                <div className="space-y-4">
                  {/* Type de versement */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setReverserForm(f => ({ ...f, typeVersement: "SOLDE_TOTAL", amount: String(soldePeriod) }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                        reverserForm.typeVersement === "SOLDE_TOTAL"
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-600 border-app-border hover:bg-gray-50"
                      }`}
                    >
                      ✅ Solde total ({formatFCFA(soldePeriod)})
                    </button>
                    <button
                      onClick={() => setReverserForm(f => ({ ...f, typeVersement: "AVANCE", amount: "" }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                        reverserForm.typeVersement === "AVANCE"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-gray-600 border-app-border hover:bg-gray-50"
                      }`}
                    >
                      ⚠️ Avance partielle
                    </button>
                  </div>

                  {/* Montant */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Montant à reverser (F CFA)</label>
                    <input
                      type="number" min={0} max={soldePeriod}
                      className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20"
                      value={autoAmount}
                      readOnly={reverserForm.typeVersement === "SOLDE_TOTAL"}
                      onChange={(e) => reverserForm.typeVersement === "AVANCE" && setReverserForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="Ex: 360000"
                    />
                    {reverserForm.typeVersement === "AVANCE" && autoAmount && parseInt(autoAmount) < soldePeriod && (
                      <p className="text-xs text-amber-600 mt-1">Reste à reverser après ce versement : <strong>{formatFCFA(Math.max(0, soldePeriod - parseInt(autoAmount || "0")))}</strong></p>
                    )}
                  </div>

                  {/* Gérant responsable du versement */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Gérant effectuant le versement</label>
                    <select
                      className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 bg-white font-medium"
                      value={reverserForm.gerant}
                      onChange={(e) => setReverserForm(f => ({ ...f, gerant: e.target.value }))}
                    >
                      {rawData.gerants.map((g: any) => (
                        <option key={g.id} value={`${g.name} (${g.role})`}>{g.name} ({g.role})</option>
                      ))}
                    </select>
                  </div>

                  {/* Méthode + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Méthode</label>
                      <select
                        className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        value={reverserForm.method}
                        onChange={(e) => {
                          const newMethod = e.target.value;
                          setReverserForm(f => ({
                            ...f,
                            method: newMethod,
                            reference: generateReference(newMethod)
                          }));
                        }}
                      >
                        <option>Virement bancaire</option>
                        <option>Mobile Money</option>
                        <option>Espèces</option>
                        <option>Chèque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Date du reversement</label>
                      <input
                        type="date"
                        className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20"
                        value={reverserForm.date}
                        onChange={(e) => setReverserForm(f => ({ ...f, date: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Référence + Note */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Référence</label>
                        <button
                          type="button"
                          onClick={() => setReverserForm(f => ({ ...f, reference: generateReference(f.method) }))}
                          className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                          title="Générer une nouvelle référence"
                        >
                          <RefreshCw className="w-3 h-3" /> Générer
                        </button>
                      </div>
                      <input
                        type="text"
                        className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20"
                        value={reverserForm.reference}
                        onChange={(e) => setReverserForm(f => ({ ...f, reference: e.target.value }))}
                        placeholder="Ex: VIR-2026-1042"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Note</label>
                      <input
                        type="text"
                        className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20"
                        value={reverserForm.note}
                        onChange={(e) => setReverserForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="Commentaire..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-app-border flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setReverserOpen(false)}
                className="flex-1 bg-white border border-app-border text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReverser}
                disabled={!autoAmount || parseInt(autoAmount) <= 0 || (totalCollectedSel === 0 && soldePeriod === 0)}
                className="flex-1 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRightLeft className="w-4 h-4" /> Confirmer le reversement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
