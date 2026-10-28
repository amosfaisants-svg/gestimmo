"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { 
  ArrowRight, 
  Bell, 
  ChevronDown, 
  Plus, 
  Wallet, 
  Clock, 
  FileSignature, 
  Landmark, 
  ArrowUpRight, 
  ArrowDownRight, 
  UserCheck, 
  AlertTriangle, 
  Eye, 
  Video, 
  MessageSquare, 
  X,
  Shield,
  Building,
  CreditCard,
  FileText,
  Users,
  Home,
  Trash2,
  Download,
  Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import { loadAllDataFromDatabase, deleteIncident, updateIncident } from "@/lib/dataService";
import { formatUnitDisplay, isUUID, cn, syncPaymentsWithLeases, sortPaymentsDesc, comparePaymentsDesc, formatPaymentDateDisplay, getIncidentDisplayCode, checkTenantHasImportedContract } from "@/lib/utils";
import { getPortalSession } from "@/lib/authSession";
import { isImageFile, getFileSource, compressImageFile } from "@/lib/imageCompressor";
import { IncidentDetailModal } from "@/components/ui/IncidentDetailModal";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const defaultInitialIncidents = [
  {
    id: "INC-1042",
    tenant: "Cora Richards",
    unit: "A-101",
    property: "Résidence Les Flamboyants",
    type: "Plomberie (Fuite, Canalisation bouchée...)",
    description: "Fuite d'eau au niveau du robinet de la salle de bain depuis ce matin. L'eau coule abondamment.",
    isUrgent: true,
    files: [{ name: "fuite_douche.jpg", size: "1.2 MB", type: "image/jpeg", dataUrl: "" }],
    status: "EN ATTENTE",
    createdAt: new Date().toISOString(),
    dateStr: "01 Oct 2026 à 10:15"
  },
  {
    id: "INC-0988",
    tenant: "Alistair Dunlap",
    unit: "B-204",
    property: "Résidence Les Flamboyants",
    type: "Climatisation (Ne refroidit plus, Bruit...)",
    description: "La climatisation du salon fait un bruit anormal et ne produit plus d'air frais.",
    isUrgent: false,
    files: [],
    status: "EN COURS",
    createdAt: new Date().toISOString(),
    dateStr: "28 Sept 2026 à 16:40"
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "PAYÉ": 
    case "VALIDÉ":
    case "EFFECTUÉ": return "success";
    case "NON PAYÉ": 
    case "IMPAYÉ": return "danger";
    case "EN RETARD": return "alert";
    case "PAYÉ D'AVANCE": return "info";
    case "EN ATTENTE": return "warning";
    default: return "default";
  }
};

const defaultProprietaires = [
  { id: "O-123", name: "Kouadio Invest", type: "entreprise", commissionRate: 10 },
  { id: "O-124", name: "Mme. Traoré", type: "particulier", commissionRate: 10 },
  { id: "O-125", name: "SCI Zenith", type: "entreprise", commissionRate: 10 },
];

const defaultBiens = [
  { id: "B-001", name: "Résidence Les Flamboyants", owner: "Kouadio Invest" },
  { id: "B-002", name: "Villa Palmeraie", owner: "Mme. Traoré" },
  { id: "B-004", name: "Complexe Riviera", owner: "SCI Zenith" },
];

const defaultLogements = [
  { id: "A-101", unit: "A-101", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", rent: 150000, status: "Occupé" },
  { id: "B-204", unit: "B-204", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", rent: 3150000, status: "Occupé" },
  { id: "A-102", unit: "A-102", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", rent: 200000, status: "Occupé" },
  { id: "V-001", unit: "V-001", property: "Villa Palmeraie", owner: "Mme. Traoré", rent: 800000, status: "Occupé" },
  { id: "C-101", unit: "C-101", property: "Complexe Riviera", owner: "SCI Zenith", rent: 2100000, status: "Occupé" },
  { id: "B-205", unit: "B-205", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", rent: 250000, status: "Vacant" },
  { id: "C-201", unit: "C-201", property: "Complexe Riviera", owner: "SCI Zenith", rent: 300000, status: "En préavis" },
];

const defaultBaux = [
  { id: "BX-001", tenant: "Cora Richards", unit: "A-101", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", rent: 150000, status: "ACTIF", startDate: "2026-01-01" },
  { id: "BX-002", tenant: "Alistair Dunlap", unit: "B-204", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", rent: 3150000, status: "ACTIF", startDate: "2026-01-01" },
  { id: "BX-003", tenant: "Bibi Shelton", unit: "A-102", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", rent: 200000, status: "ACTIF", startDate: "2026-01-01" },
  { id: "BX-004", tenant: "Jean Dupont", unit: "V-001", property: "Villa Palmeraie", owner: "Mme. Traoré", rent: 800000, status: "ACTIF", startDate: "2026-01-01" },
  { id: "BX-005", tenant: "Sery Paul", unit: "C-101", property: "Complexe Riviera", owner: "SCI Zenith", rent: 2100000, status: "ACTIF", startDate: "2026-01-01" },
  { id: "BX-006", tenant: "Addie Bradford", unit: "B-205", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", rent: 250000, status: "EN ATTENTE", startDate: "2026-09-15" },
  { id: "BX-007", tenant: "Koffi Mensah", unit: "C-201", property: "Complexe Riviera", owner: "SCI Zenith", rent: 300000, status: "EN PREAVIS", startDate: "2025-05-01" },
];

const defaultReversements = [
  { id: "R-001", period: "Septembre 2026", owner: "Kouadio Invest", ownerId: "O-123", property: "Résidence Les Flamboyants", collected: 3500000, commission: 350000, amount: 3150000, status: "EFFECTUÉ" },
  { id: "R-002", period: "Septembre 2026", owner: "Mme. Traoré", ownerId: "O-124", property: "Villa Palmeraie", collected: 800000, commission: 80000, amount: 720000, status: "EN ATTENTE" },
  { id: "R-003", period: "Septembre 2026", owner: "SCI Zenith", ownerId: "O-125", property: "Complexe Riviera", collected: 2100000, commission: 210000, amount: 1890000, status: "EFFECTUÉ" },
];

const defaultPaiements = [
  { id: "P-1925", tenant: "Cora Richards", unit: "A-101", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", date: "05 Sept 2026", period: "Septembre 2026", amount: 150000, method: "Virement", status: "VALIDÉ" },
  { id: "P-1926", tenant: "Alistair Dunlap", unit: "B-204", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", date: "06 Sept 2026", period: "Septembre 2026", amount: 3150000, method: "Wave", status: "EN RETARD" },
  { id: "P-1927", tenant: "Bibi Shelton", unit: "A-102", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", date: "07 Sept 2026", period: "Septembre 2026", amount: 200000, method: "Espèces", status: "VALIDÉ" },
  { id: "P-1928", tenant: "Jean Dupont", unit: "V-001", property: "Villa Palmeraie", owner: "Mme. Traoré", date: "01 Sept 2026", period: "Septembre 2026", amount: 800000, method: "Chèque", status: "EN ATTENTE" },
  { id: "P-1929", tenant: "Sery Paul", unit: "C-101", property: "Complexe Riviera", owner: "SCI Zenith", date: "02 Sept 2026", period: "Septembre 2026", amount: 2100000, method: "Virement", status: "VALIDÉ" },
];

const defaultLocataires = [
  { id: "T-892", name: "Cora Richards", unit: "A-101", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", status: "À JOUR" },
  { id: "T-893", name: "Alistair Dunlap", unit: "B-204", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", status: "EN RETARD" },
  { id: "T-894", name: "Bibi Shelton", unit: "A-102", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", status: "À JOUR" },
  { id: "T-895", name: "Jean Dupont", unit: "V-001", property: "Villa Palmeraie", owner: "Mme. Traoré", status: "À JOUR" },
  { id: "T-896", name: "Sery Paul", unit: "C-101", property: "Complexe Riviera", owner: "SCI Zenith", status: "À JOUR" },
  { id: "T-897", name: "Addie Bradford", unit: "B-205", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", status: "IMPAYÉ" },
  { id: "T-898", name: "Koffi Mensah", unit: "-", property: "-", status: "EN ATTENTE" },
  { id: "T-899", name: "Fatou Diop", unit: "-", property: "-", status: "EN ATTENTE" },
];

const defaultEquipe = [
  { id: "M-001", name: "Aron Levine", assignedLogements: ["A-101", "A-102", "B-204"] },
  { id: "M-002", name: "Sarah Kone", assignedLogements: ["V-001"] },
  { id: "M-003", name: "Marc Dubois", assignedLogements: ["C-101", "C-201"] },
];

export default function Dashboard() {
  const { isGerant, assignedLogements, gerantPermissions } = usePermissions();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [baux, setBaux] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [logements, setLogements] = useState<any[]>([]);
  const [reversements, setReversements] = useState<any[]>([]);
  const [proprietaires, setProprietaires] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [locataires, setLocataires] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncidentDetail, setSelectedIncidentDetail] = useState<any | null>(null);
  const [selectedIncidentIds, setSelectedIncidentIds] = useState<string[]>([]);
  const [incidentToDelete, setIncidentToDelete] = useState<string[] | null>(null);
  const [isDeletingIncidents, setIsDeletingIncidents] = useState(false);
  const [previewIncidentImage, setPreviewIncidentImage] = useState<{ src: string; title: string } | null>(null);

  const now = new Date();
  const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedPeriod, setSelectedPeriod] = useState(currentYYYYMM);
  const [selectedEntreprise, setSelectedEntreprise] = useState("Toutes les entreprises");
  const [selectedBien, setSelectedBien] = useState("Tous les biens");
  const [loyersStatusFilter, setLoyersStatusFilter] = useState("Tous");
  const [loyersSortOrder, setLoyersSortOrder] = useState<"recent" | "ancien">("recent");
  const [reversementFilter, setReversementFilter] = useState("Tous");

  const isSamePeriod = (pPeriod: string, targetYYYYMM: string) => {
    if (!pPeriod) return false;
    if (pPeriod === targetYYYYMM) return true;
    if (pPeriod.includes(" ")) {
      const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
      const parts = pPeriod.toLowerCase().split(" ");
      const monthIndex = months.findIndex(m => m.startsWith(parts[0].substring(0, 3)));
      if (monthIndex !== -1 && parts[1]) {
        const normalized = `${parts[1]}-${String(monthIndex + 1).padStart(2, '0')}`;
        return normalized === targetYYYYMM;
      }
    }
    return false;
  };

  const getMonthName = (yyyymm: string) => {
    if (!yyyymm) return "";
    const [year, month] = yyyymm.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  useEffect(() => {
    const adminUser = getPortalSession("ADMIN");
    if (adminUser) {
      setCurrentUser(adminUser);
    } else {
      const storedUser = localStorage.getItem("gestimmo_current_user");
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch (e) {
          console.error(e);
        }
      }
    }

    // 1. Instant local render (0ms) from cache to eliminate loading delay
    try {
      const l_baux = JSON.parse(localStorage.getItem("gestimmo_baux") || "[]");
      const l_paiements = JSON.parse(localStorage.getItem("gestimmo_paiements") || "[]");
      const l_logements = JSON.parse(localStorage.getItem("gestimmo_logements") || "[]");
      const l_reversements = JSON.parse(localStorage.getItem("gestimmo_reversements") || "[]");
      const l_proprietaires = JSON.parse(localStorage.getItem("gestimmo_proprietaires") || "[]");
      const l_biens = JSON.parse(localStorage.getItem("gestimmo_biens") || "[]");
      const l_locataires = JSON.parse(localStorage.getItem("gestimmo_locataires") || "[]");
      const l_incidents = JSON.parse(localStorage.getItem("gestimmo_incidents") || "[]");
      const l_equipe = JSON.parse(localStorage.getItem("gestimmo_equipe") || "[]");

      if (l_baux.length > 0 || l_paiements.length > 0 || l_logements.length > 0) {
        setBaux(l_baux);
        setPaiements(syncPaymentsWithLeases(l_paiements, l_baux));
        setLogements(l_logements);
        setReversements(l_reversements);
        setProprietaires(l_proprietaires);
        setBiens(l_biens);
        setLocataires(l_locataires);
        setIncidents(l_incidents);
        setManagers(l_equipe);
      }
    } catch (e) {
      console.warn("Instant cache load error:", e);
    }

    // 2. Background revalidation from Supabase
    const initData = async () => {
      const dbState = await loadAllDataFromDatabase();
      if (dbState) {
        setBaux(dbState.leases);
        setPaiements(syncPaymentsWithLeases(dbState.payments, dbState.leases));
        setLogements(dbState.units);
        setReversements(dbState.payouts);
        setProprietaires(dbState.owners);
        setBiens(dbState.properties);
        setLocataires(dbState.tenants);
        setIncidents(dbState.incidents);
        if (dbState.profiles) {
          const stored = typeof window !== "undefined" ? localStorage.getItem("gestimmo_equipe") : null;
          const existingList = stored ? JSON.parse(stored) : [];
          const mappedProfiles = dbState.profiles.map((p) => {
            const localMatch = Array.isArray(existingList) ? existingList.find((m: any) => m.id === p.id || m.email?.toLowerCase() === p.email?.toLowerCase()) : null;
            return {
              id: p.id,
              name: p.full_name,
              role: p.role === 'ADMINISTRATEUR' ? 'Super Admin' : p.role === 'COMPTABLE' ? 'Comptable' : p.role === 'AGENT_TERRAIN' ? 'Agent de terrain' : 'Gérant',
              phone: p.phone || '',
              email: p.email,
              login: p.email,
              password: '••••••••',
              status: localMatch?.status || 'Actif',
              propertiesCount: localMatch?.propertiesCount || (localMatch?.assignedLogements?.length || 0),
              performance: localMatch?.performance || 0,
              collected: localMatch?.collected || 0,
              assignedLogements: localMatch?.assignedLogements || [],
              gerantPermissions: localMatch?.gerantPermissions || p.permissions || { canViewReceipts: true, canManageContracts: true, canManageDocuments: true, canManageLogements: true }
            };
          });
          setManagers(mappedProfiles);
          if (typeof window !== "undefined") {
            localStorage.setItem("gestimmo_equipe", JSON.stringify(mappedProfiles));
          }
        }
      } else {
        const l_baux = JSON.parse(localStorage.getItem("gestimmo_baux") || "[]");
        const l_paiements = JSON.parse(localStorage.getItem("gestimmo_paiements") || "[]");
        const l_logements = JSON.parse(localStorage.getItem("gestimmo_logements") || "[]");
        const l_reversements = JSON.parse(localStorage.getItem("gestimmo_reversements") || "[]");
        const l_proprietaires = JSON.parse(localStorage.getItem("gestimmo_proprietaires") || "[]");
        const l_biens = JSON.parse(localStorage.getItem("gestimmo_biens") || "[]");
        const l_locataires = JSON.parse(localStorage.getItem("gestimmo_locataires") || "[]");
        const l_incidents = JSON.parse(localStorage.getItem("gestimmo_incidents") || "[]");
        
        const syncedPaiements = syncPaymentsWithLeases(l_paiements, l_baux);

        setBaux(l_baux);
        setPaiements(syncedPaiements);
        setLogements(l_logements);
        setReversements(l_reversements);
        setProprietaires(l_proprietaires);
        setBiens(l_biens);
        setLocataires(l_locataires);
        setIncidents(l_incidents);

        if (typeof window !== "undefined" && syncedPaiements.length > 0) {
          localStorage.setItem("gestimmo_paiements", JSON.stringify(syncedPaiements));
        }
      }
      if (!dbState?.profiles) {
        const l_equipe = JSON.parse(localStorage.getItem("gestimmo_equipe") || "[]");
        setManagers(l_equipe);
      }
    };

    initData();
  }, []);

  // Détection automatique de l'incident ciblé depuis l'URL ou la session (ex: depuis les notifications)
  useEffect(() => {
    if (incidents.length === 0 || typeof window === "undefined") return;

    const checkAndOpenIncidentFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      let targetParam = urlParams.get("incident") || urlParams.get("incidentId");

      if (!targetParam) {
        targetParam = sessionStorage.getItem("gestimmo_target_incident");
        if (targetParam) {
          sessionStorage.removeItem("gestimmo_target_incident");
        }
      }

      if (targetParam) {
        const cleanTarget = targetParam.trim().toLowerCase();
        const matched = incidents.find((i: any) => 
          (i.id && i.id.toLowerCase() === cleanTarget) ||
          (i.id && i.id.toLowerCase().includes(cleanTarget)) ||
          (cleanTarget.includes(i.id.toLowerCase())) ||
          (getIncidentDisplayCode(i.id).toLowerCase() === cleanTarget)
        );
        if (matched) {
          setSelectedIncidentDetail(matched);
          setTimeout(() => {
            const el = document.getElementById("incidents");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }, 150);
        }
      } else if (window.location.hash === "#incidents") {
        setTimeout(() => {
          const el = document.getElementById("incidents");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    };

    checkAndOpenIncidentFromUrl();
    window.addEventListener("popstate", checkAndOpenIncidentFromUrl);
    window.addEventListener("hashchange", checkAndOpenIncidentFromUrl);
    return () => {
      window.removeEventListener("popstate", checkAndOpenIncidentFromUrl);
      window.removeEventListener("hashchange", checkAndOpenIncidentFromUrl);
    };
  }, [incidents]);

  const handleUpdateIncidentStatus = async (id: string, newStatus: string) => {
    const updated = incidents.map((inc) => inc.id === id ? { ...inc, status: newStatus } : inc);
    setIncidents(updated);
    await updateIncident(id, { status: newStatus });
  };

  const handleAddIncidentFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedIncidentDetail) return;
    const filesList = Array.from(e.target.files);
    const newProcessed: any[] = [];
    for (const f of filesList) {
      try {
        const compressed = await compressImageFile(f);
        newProcessed.push(compressed);
      } catch (err) {
        console.error("Erreur ajout fichier:", err);
      }
    }
    if (newProcessed.length === 0) return;

    const currentFiles = selectedIncidentDetail.files || [];
    const updatedFiles = [...currentFiles, ...newProcessed];
    const updatedIncident = { ...selectedIncidentDetail, files: updatedFiles };

    setSelectedIncidentDetail(updatedIncident);
    setIncidents((prev) => prev.map((inc) => (inc.id === selectedIncidentDetail.id ? updatedIncident : inc)));
    await updateIncident(selectedIncidentDetail.id, { files: updatedFiles });
    e.target.value = "";
  };

  const handleRemoveIncidentFile = async (indexToRemove: number) => {
    if (!selectedIncidentDetail) return;
    const currentFiles = selectedIncidentDetail.files || [];
    const updatedFiles = currentFiles.filter((_: any, idx: number) => idx !== indexToRemove);
    const updatedIncident = { ...selectedIncidentDetail, files: updatedFiles };

    setSelectedIncidentDetail(updatedIncident);
    setIncidents((prev) => prev.map((inc) => (inc.id === selectedIncidentDetail.id ? updatedIncident : inc)));
    await updateIncident(selectedIncidentDetail.id, { files: updatedFiles });
  };

  const toggleSelectIncident = (id: string) => {
    setSelectedIncidentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllIncidents = () => {
    if (selectedIncidentIds.length === incidents.length) {
      setSelectedIncidentIds([]);
    } else {
      setSelectedIncidentIds(incidents.map((i) => i.id));
    }
  };

  const confirmDeleteIncidents = async () => {
    if (!incidentToDelete || incidentToDelete.length === 0) return;
    setIsDeletingIncidents(true);

    const idsToRemove = incidentToDelete;
    const updated = incidents.filter((inc) => !idsToRemove.includes(inc.id));

    setIncidents(updated);
    localStorage.setItem("gestimmo_incidents", JSON.stringify(updated));

    for (const id of idsToRemove) {
      try {
        await deleteIncident(id);
      } catch (e) {
        console.error("Error deleting incident in DB:", e);
      }
    }

    setSelectedIncidentIds((prev) => prev.filter((id) => !idsToRemove.includes(id)));
    setIncidentToDelete(null);
    setIsDeletingIncidents(false);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("gestimmo_incidents_updated"));
    }
  };

  const rawProprietaires = proprietaires;
  const uniqueProprietairesMap = new Map<string, any>();
  rawProprietaires.forEach((o: any) => {
    if (o.name) {
      const key = o.name.trim().toUpperCase();
      if (!uniqueProprietairesMap.has(key)) {
        uniqueProprietairesMap.set(key, o);
      }
    }
  });
  const activeProprietaires = Array.from(uniqueProprietairesMap.values());
  const activeBiens = biens;
  const activeLogements = logements;
  const activeBaux = baux;
  const activePaiements = paiements;
  const activeReversements = reversements;
  const activeLocataires = locataires;
  const activeManagers = managers;

  const availableBiens = selectedEntreprise === "Toutes les entreprises"
    ? activeBiens
    : activeBiens.filter((b: any) => b.owner?.toLowerCase() === selectedEntreprise.toLowerCase());

  // Dynamic matching helpers
  const getOwnerOfItem = (item: any): string => {
    if (item.owner) return item.owner;
    if (item.ownerName) return item.ownerName;
    if (item.company) return item.company;
    if (item.companyName) return item.companyName;
    if (item.ownerId) {
      const found = activeProprietaires.find((o: any) => o.id === item.ownerId);
      if (found && found.name) return found.name;
    }
    if (item.propertyId) {
      const bien = activeBiens.find((b: any) => b.id === item.propertyId);
      if (bien && bien.owner) return bien.owner;
    }
    if (item.property) {
      const bien = activeBiens.find((b: any) => b.name?.toLowerCase() === item.property?.toLowerCase());
      if (bien && bien.owner) return bien.owner;
    }
    if (item.unit) {
      const log = activeLogements.find((l: any) => l.id === item.unit || l.unit === item.unit);
      if (log && log.owner) return log.owner;
      if (log && log.property) {
        const bien = activeBiens.find((b: any) => b.name?.toLowerCase() === log.property?.toLowerCase());
        if (bien && bien.owner) return bien.owner;
      }
    }
    return "";
  };

  const getPropertyOfItem = (item: any): string => {
    if (item.property) return item.property;
    if (item.propertyName) return item.propertyName;
    if (item.propertyId) {
      const bien = activeBiens.find((b: any) => b.id === item.propertyId);
      if (bien && bien.name) return bien.name;
    }
    if (item.unit) {
      const log = activeLogements.find((l: any) => l.id === item.unit || l.unit === item.unit);
      if (log && log.property) return log.property;
    }
    return "";
  };

  const matchesEntreprise = (item: any) => {
    if (selectedEntreprise === "Toutes les entreprises") return true;
    const owner = getOwnerOfItem(item);
    return owner.toLowerCase() === selectedEntreprise.toLowerCase();
  };

  const matchesBien = (item: any) => {
    if (selectedBien === "Tous les biens") return true;
    const prop = getPropertyOfItem(item);
    return prop.toLowerCase() === selectedBien.toLowerCase();
  };

  const matchesPeriod = (item: any) => {
    if (!item.period) return true;
    return isSamePeriod(item.period, selectedPeriod);
  };

  const matchesAllFilters = (item: any, checkPeriod = false) => {
    if (!matchesEntreprise(item)) return false;
    if (!matchesBien(item)) return false;
    if (checkPeriod && !matchesPeriod(item)) return false;
    return true;
  };

  // 1. Filtered Datasets
  const filteredBaux = activeBaux.filter((b: any) => matchesAllFilters(b, false));
  const filteredLogements = activeLogements.filter((l: any) => matchesAllFilters(l, false));
  const filteredPaiementsPeriod = activePaiements.filter((p: any) => matchesAllFilters(p, true));
  const filteredPaiementsAllPeriods = activePaiements.filter((p: any) => matchesAllFilters(p, false));

  // 2. Metrics calculation
  // Helper to check if a lease is active in selected period
  const isLeaseActiveInPeriod = (lease: any, targetYYYYMM: string) => {
    if (!lease) return false;
    const status = (lease.status || "").toUpperCase();
    if (status !== "ACTIF" && status !== "EN PREAVIS" && status !== "EN_PRÉAVIS" && status !== "EN PRÉAVIS") {
      return false;
    }
    
    // Check start date (YYYY-MM-DD or French format)
    const rawStart = lease.startDate || lease.start_date || lease.start;
    if (rawStart) {
      let startYM = "";
      if (typeof rawStart === "string" && rawStart.match(/^\d{4}-\d{2}/)) {
        startYM = rawStart.substring(0, 7);
      } else {
        const d = new Date(rawStart);
        if (!isNaN(d.getTime())) {
          startYM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      }
      if (startYM && startYM > targetYYYYMM) {
        return false;
      }
    }

    // Check end date
    const rawEnd = lease.endDate || lease.end_date || lease.end;
    if (rawEnd) {
      let endYM = "";
      if (typeof rawEnd === "string" && rawEnd.match(/^\d{4}-\d{2}/)) {
        endYM = rawEnd.substring(0, 7);
      } else {
        const d = new Date(rawEnd);
        if (!isNaN(d.getTime())) {
          endYM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      }
      if (endYM && endYM < targetYYYYMM) {
        return false;
      }
    }

    return true;
  };

  // Card 1: Loyer à Encaisser (Active baux rent sum active during selected period)
  const activeLeasesInPeriod = filteredBaux.filter((b: any) => isLeaseActiveInPeriod(b, selectedPeriod));
  const loyerAEncaisser = activeLeasesInPeriod.reduce((sum: number, b: any) => sum + Number(b.rent || b.loyer || 0), 0);

  // Card 2: Loyer Encaissé (Paiements validés/payés for selected period & filters)
  const validPaiementsPeriod = filteredPaiementsPeriod.filter((p: any) => p.status === "VALIDÉ" || p.status === "PAYÉ");
  const loyerEncaisse = validPaiementsPeriod.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

  // Dynamically calculate trend for Loyer Encaissé compared to previous month
  const [currYear, currMonth] = selectedPeriod.split("-").map(Number);
  const prevDate = new Date(currYear, currMonth - 2, 1);
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const validPaiementsPrev = activePaiements.filter((p: any) => 
    matchesAllFilters(p, false) && 
    isSamePeriod(p.period, prevPeriod) && 
    (p.status === "VALIDÉ" || p.status === "PAYÉ")
  );
  const loyerEncaissePrev = validPaiementsPrev.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  let encaisseTrend = "";
  if (loyerEncaissePrev > 0) {
    const diff = Math.round(((loyerEncaisse - loyerEncaissePrev) / loyerEncaissePrev) * 100);
    encaisseTrend = diff >= 0 ? `+${diff}%` : `${diff}%`;
  } else if (loyerAEncaisser > 0 && loyerEncaisse >= loyerAEncaisser) {
    encaisseTrend = "+100%";
  }

  // Card 3: Total Impayés for selected period & filters
  const unpaidPaiementsPeriod = filteredPaiementsPeriod.filter((p: any) => p.status === "EN RETARD" || p.status === "IMPAYÉ" || p.status === "REJETÉ");
  const directUnpaidSum = unpaidPaiementsPeriod.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const totalImpayes = directUnpaidSum > 0 ? directUnpaidSum : Math.max(0, loyerAEncaisser - loyerEncaisse);

  // Card 4 & 5: Total Appartements & Taux d'Occupation
  const activeLeasesFiltered = filteredBaux.filter((b: any) => b.status === "ACTIF");
  let totalAppartements = filteredLogements.length;
  if (totalAppartements === 0) {
    const uniqueUnitsFromBaux = new Set(filteredBaux.map((b: any) => b.unit));
    totalAppartements = uniqueUnitsFromBaux.size;
  }
  const totalOccupes = activeLeasesFiltered.length;
  const tauxOccupation = totalAppartements > 0 ? Math.round((totalOccupes / totalAppartements) * 100) : (totalOccupes > 0 ? 100 : 0);
  const totalVacants = Math.max(0, totalAppartements - totalOccupes);

  // 3. Propriétaires Tiers Reversements List & Summary
  const reversementsList: any[] = [];
  let totalCommissions = 0;

  activeProprietaires.forEach((owner: any) => {
    if (owner.name === "Biens Propres") return;
    if (selectedEntreprise !== "Toutes les entreprises" && owner.name.toLowerCase() !== selectedEntreprise.toLowerCase()) return;
    
    const ownerBiens = activeBiens.filter((b: any) => b.owner?.toLowerCase() === owner.name?.toLowerCase());
    const ownerBiensFiltered = selectedBien === "Tous les biens"
      ? ownerBiens
      : ownerBiens.filter((b: any) => b.name?.toLowerCase() === selectedBien.toLowerCase());
      
    if (selectedBien !== "Tous les biens" && ownerBiensFiltered.length === 0) return;

    const ownerBiensNames = ownerBiensFiltered.map((b: any) => b.name);
    const propertyLabel = ownerBiensNames.length > 0 ? ownerBiensNames.join(", ") : (owner.property || "Bien non spécifié");

    const ownerPaiementsPeriod = activePaiements.filter((p: any) => 
      matchesAllFilters(p, true) && 
      getOwnerOfItem(p).toLowerCase() === owner.name?.toLowerCase() &&
      (p.status === "VALIDÉ" || p.status === "PAYÉ")
    );
    
    const totalCollected = ownerPaiementsPeriod.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    
    const rateRaw = owner.commissionRate !== undefined && owner.commissionRate !== null && owner.commissionRate !== ""
      ? Number(owner.commissionRate)
      : (owner.commission_rate !== undefined && owner.commission_rate !== null ? Number(owner.commission_rate) : 10);
    const rate = isNaN(rateRaw) ? 10 : rateRaw;
    const netFactor = (100 - rate) / 100;
    const commFactor = rate / 100;

    const netToOwner = totalCollected * netFactor;
    const commission = totalCollected * commFactor;

    const ownerHistorical = activeReversements.filter((r: any) => 
      (r.ownerId === owner.id || r.owner?.toLowerCase() === owner.name?.toLowerCase()) && 
      r.status === "EFFECTUÉ" &&
      isSamePeriod(r.period, selectedPeriod)
    );
    const totalPaid = ownerHistorical.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
    
    const balance = Math.max(0, netToOwner - totalPaid);
    
    let status = "EN ATTENTE";
    let displayAmount = balance;
    let displayCommission = commission;

    if (totalPaid > 0 && balance === 0) {
      status = "EFFECTUÉ";
      displayAmount = totalPaid;
    } else if (totalCollected === 0 && totalPaid === 0) {
      const historicalRev = activeReversements.find((r: any) => 
        (r.ownerId === owner.id || r.owner?.toLowerCase() === owner.name?.toLowerCase()) &&
        isSamePeriod(r.period, selectedPeriod)
      );
      if (historicalRev) {
        status = historicalRev.status;
        displayAmount = Number(historicalRev.amount || 0);
        displayCommission = Number(historicalRev.commission || 0);
      } else {
        status = "EN ATTENTE";
        displayAmount = 0;
        displayCommission = 0;
      }
    }

    totalCommissions += displayCommission;

    reversementsList.push({
      id: `R-${owner.id}`,
      owner: owner.name,
      ownerId: owner.id,
      property: propertyLabel,
      commission: displayCommission,
      amount: displayAmount,
      status: status
    });
  });

  const tousReversementsCount = reversementsList.length;
  const enAttenteReversementsCount = reversementsList.filter((r: any) => r.status === "EN ATTENTE").length;
  const effectuesReversementsCount = reversementsList.filter((r: any) => r.status === "EFFECTUÉ").length;
  const totalReversementsEnAttente = reversementsList.filter((r: any) => r.status === "EN ATTENTE").reduce((sum: number, r: any) => sum + r.amount, 0);

  const filteredReversementsList = reversementsList.filter((r: any) => {
    if (reversementFilter === "Tous") return true;
    if (reversementFilter === "EN ATTENTE") return r.status === "EN ATTENTE";
    if (reversementFilter === "EFFECTUÉ") return r.status === "EFFECTUÉ";
    return true;
  });

  const statCards = [
    { title: "Loyer à Encaisser", amount: loyerAEncaisser, subtitle: `Total attendu (${getMonthName(selectedPeriod)})`, trend: "" },
    { title: "Loyer Encaissé", amount: loyerEncaisse, subtitle: getMonthName(selectedPeriod), trend: encaisseTrend },
    { title: "Total Impayés", amount: totalImpayes, subtitle: totalImpayes > 0 ? "Dettes en cours" : "Aucun impayé", trend: totalImpayes > 0 ? "-2.5%" : "" },
    { title: "Taux d'Occupation", amount: `${tauxOccupation}%`, subtitle: `Sur ${totalAppartements} appartements` },
    { title: "Total Appart.", amount: totalAppartements.toString(), subtitle: `Dont ${totalVacants} vacants` },
  ];

  // RENDER DÉDIÉ : ESPACE GÉRANT RESTREINT
  if (isGerant) {
    const managedLogements = activeLogements.filter((l: any) => 
      assignedLogements.includes(l.id) || 
      assignedLogements.includes(l.unit) || 
      (l.property && assignedLogements.includes(l.property))
    );
    const managedUnitKeys = new Set([
      ...assignedLogements,
      ...managedLogements.map((l: any) => l.id),
      ...managedLogements.map((l: any) => l.unit)
    ]);
    const gerantBauxList = assignedLogements.length > 0 
      ? activeBaux.filter(b => isLeaseActiveInPeriod(b, currentYYYYMM) && managedUnitKeys.has(b.unit))
      : [];
    const gerantPaiementsList = assignedLogements.length > 0 
      ? activePaiements.filter(p => managedUnitKeys.has(p.unit))
      : [];
    
    const targetRentMonth = gerantBauxList.reduce((sum, b) => sum + (Number(b.rent || b.loyer) || 0), 0);
    
    const currentMonthPayments = gerantPaiementsList.filter(p => (p.status === "PAYÉ" || p.status === "VALIDÉ") && isSamePeriod(p.period, currentYYYYMM));
    const collectedMonth = currentMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    let recoveryRate = 0;
    if (assignedLogements.length > 0 && targetRentMonth > 0) {
      recoveryRate = Math.min(100, Math.round((collectedMonth / targetRentMonth) * 100));
    } else if (assignedLogements.length > 0 && collectedMonth > 0) {
      recoveryRate = 100;
    }

    // Calcul des impayés et retards du gérant
    const gerantLatePayments = gerantPaiementsList.filter((p: any) => 
      p.status === "EN RETARD" || p.status === "IMPAYÉ" || p.status === "REJETÉ"
    );
    const gerantLateTenants = activeLocataires.filter((t: any) => 
      (managedUnitKeys.has(t.unit) || gerantBauxList.some((b: any) => b.tenant === t.name)) &&
      (t.status === "EN RETARD" || t.status === "IMPAYÉ")
    );
    const gerantOverdueUnits = new Set([
      ...gerantLatePayments.map((p: any) => p.unit),
      ...gerantLateTenants.map((t: any) => t.unit),
    ]);
    const gerantRetardsCount = Math.max(gerantOverdueUnits.size, gerantLatePayments.length, gerantLateTenants.length);
    let gerantRetardsAmount = gerantLatePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    if (gerantRetardsAmount === 0 && gerantRetardsCount > 0) {
      gerantRetardsAmount = gerantBauxList
        .filter((b: any) => gerantOverdueUnits.has(b.unit) || gerantLateTenants.some((t: any) => t.name === b.tenant))
        .reduce((sum, b) => sum + (Number(b.rent || b.loyer) || 0), 0);
    }
    if (gerantRetardsAmount === 0 && targetRentMonth > collectedMonth) {
      gerantRetardsAmount = targetRentMonth - collectedMonth;
    }

    return (
      <div className="space-y-6 pt-12 md:pt-0 pb-12">
        {/* Header Banner Espace Gérant */}
        <div className="bg-slate-900 border border-slate-800 text-white p-6 sm:p-8 rounded-2xl shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-primary/20 text-primary border border-primary/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Espace Gérant Restreint
                </span>
                <Badge variant={currentUser?.status === "Inactif" ? "danger" : "success"} dot={true}>
                  {currentUser?.status === "Inactif" ? "Compte Inactif" : "Compte Actif"}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Bienvenue, {currentUser?.name || "Gérant"} !
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl">
                Consultez et gérez uniquement vos locataires, baux, reçus et appartements attribués sous votre gestion.
              </p>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-xl shrink-0 flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-primary/20 text-primary rounded-xl shrink-0">
                <Building className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Logements attribués</p>
                <p className="text-2xl font-bold text-white">{assignedLogements.length} bien(s)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cartes Métriques Gérant */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-2">
            <div className="flex justify-between items-center text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Objectif de collecte</span>
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatFCFA(targetRentMonth)}</p>
            <p className="text-xs text-gray-500">Sur vos {gerantBauxList.length} baux actifs</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-2">
            <div className="flex justify-between items-center text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Montant encaissé</span>
              <Landmark className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{formatFCFA(collectedMonth)}</p>
            <p className="text-xs text-gray-500">Encaissements validés ce mois</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-2">
            <div className="flex justify-between items-center text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Taux de recouvrement</span>
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold text-gray-900">{recoveryRate}%</p>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${recoveryRate}%` }}></div>
              </div>
            </div>
            <p className="text-xs text-gray-500">Performance individuelle</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-2">
            <div className="flex justify-between items-center text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-600">Retards à relancer</span>
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">{formatFCFA(gerantRetardsAmount)}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{gerantRetardsCount} loyer(s) en retard</p>
              {gerantRetardsCount > 0 && (
                <Link href="/app/paiements?status=EN+RETARD" className="text-xs text-red-600 font-semibold hover:underline">
                  Relancer &rarr;
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-2">
            <div className="flex justify-between items-center text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Locataires gérés</span>
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{gerantBauxList.length}</p>
            <p className="text-xs text-gray-500">Rattachés à vos appartements</p>
          </div>
        </div>

        {/* Block Droits & Autorisations + Actions Rapides */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Quick Navigation & Authorizations */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Droits &amp; Périmètre autorisés par l'Administrateur
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl border flex items-center justify-between ${gerantPermissions.canViewReceipts ? 'bg-green-50/50 border-green-200 text-green-900' : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'}`}>
                  <span className="font-bold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" /> Reçus &amp; Paiements
                  </span>
                  <Badge variant={gerantPermissions.canViewReceipts ? "success" : "default"}>
                    {gerantPermissions.canViewReceipts ? "Autorisé" : "Non autorisé"}
                  </Badge>
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between ${gerantPermissions.canManageContracts ? 'bg-green-50/50 border-green-200 text-green-900' : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'}`}>
                  <span className="font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Contrats &amp; Baux
                  </span>
                  <Badge variant={gerantPermissions.canManageContracts ? "success" : "default"}>
                    {gerantPermissions.canManageContracts ? "Autorisé" : "Non autorisé"}
                  </Badge>
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between ${gerantPermissions.canManageDocuments ? 'bg-green-50/50 border-green-200 text-green-900' : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'}`}>
                  <span className="font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Documents Locataires
                  </span>
                  <Badge variant={gerantPermissions.canManageDocuments ? "success" : "default"}>
                    {gerantPermissions.canManageDocuments ? "Autorisé" : "Non autorisé"}
                  </Badge>
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between ${gerantPermissions.canManageLogements ? 'bg-green-50/50 border-green-200 text-green-900' : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'}`}>
                  <span className="font-bold flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary" /> Appartements rattachés
                  </span>
                  <Badge variant={gerantPermissions.canManageLogements ? "success" : "default"}>
                    {gerantPermissions.canManageLogements ? "Autorisé" : "Non autorisé"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Action shortcuts */}
            <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Accès rapide à vos modules</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {gerantPermissions.canManageLogements && (
                  <Link href="/app/logements" className="p-4 rounded-xl border border-app-border bg-gray-50 hover:bg-primary-50/40 hover:border-primary/30 transition-all flex flex-col items-center text-center gap-2 group">
                    <Building className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-gray-900">Mes Appartements</span>
                  </Link>
                )}
                {gerantPermissions.canManageDocuments && (
                  <Link href="/app/locataires" className="p-4 rounded-xl border border-app-border bg-gray-50 hover:bg-primary-50/40 hover:border-primary/30 transition-all flex flex-col items-center text-center gap-2 group">
                    <Users className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-gray-900">Mes Locataires</span>
                  </Link>
                )}
                {gerantPermissions.canManageContracts && (
                  <Link href="/app/baux" className="p-4 rounded-xl border border-app-border bg-gray-50 hover:bg-primary-50/40 hover:border-primary/30 transition-all flex flex-col items-center text-center gap-2 group">
                    <FileText className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-gray-900">Mes Baux / Contrats</span>
                  </Link>
                )}
                {gerantPermissions.canViewReceipts && (
                  <Link href="/app/paiements" className="p-4 rounded-xl border border-app-border bg-gray-50 hover:bg-primary-50/40 hover:border-primary/30 transition-all flex flex-col items-center text-center gap-2 group">
                    <CreditCard className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-gray-900">Reçus &amp; Paiements</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Right Col: List of assigned apartments */}
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
              <span>Appartements sous votre gestion</span>
              <span className="text-xs font-semibold text-gray-500">{assignedLogements.length} bien(s)</span>
            </h2>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-96 pr-1">
              {assignedLogements.length > 0 ? assignedLogements.map((unitId) => {
                const logement = activeLogements.find((l: any) => l.id === unitId || l.unit === unitId);
                const lease = activeBaux.find((b: any) => (b.unit === unitId || (logement && b.unit === logement.unit)) && b.status === "ACTIF");
                const isOverdue = gerantOverdueUnits.has(unitId) || 
                  (logement && (gerantOverdueUnits.has(logement.id) || gerantOverdueUnits.has(logement.unit))) ||
                  (lease && (gerantOverdueUnits.has(lease.unit) || gerantLateTenants.some((t: any) => t.name === lease.tenant)));

                return (
                  <div 
                    key={unitId} 
                    className={`p-3 rounded-xl border space-y-2 transition-all ${
                      isOverdue 
                        ? "bg-red-50/30 border-red-200 shadow-xs" 
                        : "bg-gray-50 border-gray-200 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-gray-900">🏠 {formatUnitDisplay(unitId)} - {logement?.property || "Bien rattaché"}</span>
                      <div className="flex items-center gap-1.5">
                        {isOverdue && (
                          <Badge variant="alert" dot className="text-[10px] py-0">
                            Retard à relancer
                          </Badge>
                        )}
                        <Badge variant={lease ? "success" : "default"} className="text-[10px]">
                          {lease ? "Occupé" : "Disponible"}
                        </Badge>
                      </div>
                    </div>
                    {lease ? (
                      <div className="text-[11px] text-gray-600 flex justify-between items-center pt-0.5">
                        <span>Locataire: <strong>{lease.tenant}</strong></span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isOverdue ? "text-red-700" : "text-gray-900"}`}>{formatFCFA(lease.rent)}/mois</span>
                          {isOverdue && (
                            <Link
                              href="/app/paiements?status=EN+RETARD"
                              className="text-[10px] font-semibold bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700 transition-colors"
                            >
                              Relancer
                            </Link>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400">Aucun bail actif pour cet appartement.</p>
                    )}
                  </div>
                );
              }) : (
                <p className="text-xs text-gray-500 text-center py-6">Aucun appartement ne vous est attribué pour le moment.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header & Global Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 mr-2">Dashboard</h1>
          
          {/* 1. Filtre Période */}
          <div className="flex items-center gap-1.5 bg-white border border-app-border rounded-lg px-3 py-2 text-sm shadow-sm">
            <span className="font-semibold text-gray-500 text-xs">Période :</span>
            <input 
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
            />
          </div>

          {/* 2. Filtre Entreprise */}
          <div className="flex items-center gap-1.5 bg-white border border-app-border rounded-lg px-3 py-2 text-sm shadow-sm">
            <span className="font-semibold text-gray-500 text-xs">Entreprise :</span>
            <select 
              value={selectedEntreprise}
              onChange={(e) => {
                setSelectedEntreprise(e.target.value);
                setSelectedBien("Tous les biens");
              }}
              className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
            >
              <option value="Toutes les entreprises">Toutes les entreprises</option>
              {activeProprietaires.map((owner: any) => (
                <option key={owner.id} value={owner.name}>{owner.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Filtre Biens */}
          <div className="flex items-center gap-1.5 bg-white border border-app-border rounded-lg px-3 py-2 text-sm shadow-sm">
            <span className="font-semibold text-gray-500 text-xs">Bien :</span>
            <select 
              value={selectedBien}
              onChange={(e) => setSelectedBien(e.target.value)}
              className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
            >
              <option value="Tous les biens">Tous les biens</option>
              {availableBiens.map((bien: any) => (
                <option key={bien.id} value={bien.name}>{bien.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/app/locataires">
            <button className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center">
              <Plus className="h-4 w-4 mr-2" /> Locataires
            </button>
          </Link>
          <Link href="/app/paiements">
            <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm">
              <Wallet className="h-4 w-4 mr-2" /> Encaisser un loyer
            </button>
          </Link>
          
          <div className="flex items-center gap-3 ml-2 pl-4 border-l border-app-border">
            <button className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-app-border relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center space-x-3 bg-white p-1.5 pr-3 rounded-xl border border-app-border cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                {(currentUser?.name || "Kouassi Jean-Philippe").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{currentUser?.name || "Kouassi Jean-Philippe"}</p>
                <p className="text-xs text-gray-500">{currentUser?.role || "Administrateur"}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Bandeau Propriétaires Tiers (Global Summary) */}
      <div className="bg-gray-50 border border-app-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-sm">
          <span className="font-semibold text-gray-900">Propriétaires Tiers ({getMonthName(selectedPeriod)}) :</span>
          <span className="text-gray-600">Commissions : <strong className="text-gray-900">{formatFCFA(totalCommissions)}</strong></span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">Reversements en attente : <strong className="text-gray-900">{formatFCFA(totalReversementsEnAttente)}</strong></span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-4 xl:p-6 rounded-2xl border border-app-border shadow-sm flex flex-col items-center text-center justify-center relative overflow-hidden group hover:shadow-md transition-shadow">
            <h3 className="text-xs xl:text-sm font-medium text-gray-500 mb-1 leading-tight min-h-[32px] flex items-center justify-center">{stat.title}</h3>
            {stat.trend && (
              <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {stat.trend}
              </span>
            )}
            <p className="text-base xl:text-xl font-bold text-gray-900 my-2 w-full px-1" title={typeof stat.amount === "number" ? formatFCFA(stat.amount) : stat.amount}>
              {typeof stat.amount === "number" ? formatFCFA(stat.amount) : stat.amount}
            </p>
            <p className="text-[11px] xl:text-xs text-gray-400 mt-auto truncate w-full px-2">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Top Widgets Grid (À traiter, Occupation, Recouvrement) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* À traiter */}
        {(() => {
          // Tous les paiements réels en retard ou impayés (toutes périodes confondues avec filtre bien/entreprise)
          const latePaiementsAll = activePaiements.filter((p: any) => 
            matchesAllFilters(p, false) && 
            (p.status === "EN RETARD" || p.status === "IMPAYÉ" || p.status === "REJETÉ")
          );

          // Tous les locataires marqués EN RETARD ou IMPAYÉ
          const lateLocatairesAll = activeLocataires.filter((t: any) => 
            matchesAllFilters(t, false) && 
            (t.status === "EN RETARD" || t.status === "IMPAYÉ")
          );

          // Baux actifs en retard ou associés à un locataire/paiement en retard
          const lateBauxAll = filteredBaux.filter((b: any) => 
            b.status === "EN RETARD" ||
            lateLocatairesAll.some((t: any) => t.name && b.tenant && t.name.trim().toLowerCase() === b.tenant.trim().toLowerCase()) ||
            latePaiementsAll.some((p: any) => p.tenant && b.tenant && p.tenant.trim().toLowerCase() === b.tenant.trim().toLowerCase())
          );

          const retardsKeys = new Set([
            ...latePaiementsAll.map((p: any) => p.id || p.tenant),
            ...lateLocatairesAll.map((t: any) => t.id || t.name),
            ...lateBauxAll.map((b: any) => b.id || b.tenant),
          ]);
          const retardsCount = Math.max(retardsKeys.size, latePaiementsAll.length, lateLocatairesAll.length);
          const retardsTotalMontant = latePaiementsAll.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) ||
            lateBauxAll.reduce((sum: number, b: any) => sum + (Number(b.rent || b.loyer) || 0), 0);

          const locatairesSansContrat = activeLocataires.filter((t: any) => {
            if (!matchesAllFilters(t, false)) return false;
            if (t.accountStatus === "Inactif") return false;
            return !checkTenantHasImportedContract(t, filteredBaux);
          });
          const contratsManquantsCount = locatairesSansContrat.length;
          
          const reversementsEnAttenteCount = reversementsList.filter((r: any) => r.status === "EN ATTENTE").length;
          
          const locatairesEnAttenteCount = activeLocataires.filter((t: any) => {
            if (!matchesAllFilters(t, false)) return false;
            const hasActiveLease = filteredBaux.some((b: any) => 
              (b.tenantId && b.tenantId === t.id) || 
              (b.tenant && t.name && b.tenant.trim().toLowerCase() === t.name.trim().toLowerCase())
            );
            return !hasActiveLease;
          }).length;

          const totalATraiter = retardsCount + contratsManquantsCount + reversementsEnAttenteCount + locatairesEnAttenteCount;

          return (
            <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                À traiter <Badge variant="destructive" className="ml-2 px-1.5 py-0">{totalATraiter}</Badge>
              </h2>
              <div className="space-y-4 flex-1">
                <Link href="/app/paiements?status=EN+RETARD" className="flex items-start justify-between group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-50 rounded-lg text-red-600 mt-0.5"><Clock className="w-4 h-4" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">Retards à relancer</p>
                        {retardsCount > 0 && (
                          <Badge variant="alert" dot className="text-[10px] py-0">
                            {retardsCount} à relancer
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {retardsCount} loyer{retardsCount > 1 ? 's' : ''} en retard {retardsTotalMontant > 0 ? `(${formatFCFA(retardsTotalMontant)})` : ''}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                </Link>
                <Link href="/app/locataires?filter=contrat-a-importer" className="flex items-start justify-between group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600 mt-0.5"><FileSignature className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">Contrats à importer</p>
                      <p className="text-xs text-gray-500">{contratsManquantsCount} locataire{contratsManquantsCount > 1 ? 's' : ''} sans contrat</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                </Link>
                <Link href="/app/reversements" className="flex items-start justify-between group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mt-0.5"><Landmark className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">Reversements</p>
                      <p className="text-xs text-gray-500">{reversementsEnAttenteCount} reversement{reversementsEnAttenteCount > 1 ? 's' : ''} en attente</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                </Link>
                <Link href="/app/locataires?status=En+attente&sort=enregistrement" className="flex items-start justify-between group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600 mt-0.5"><UserCheck className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">Locataires sans bail</p>
                      <p className="text-xs text-gray-500">{locatairesEnAttenteCount} locataire{locatairesEnAttenteCount > 1 ? 's' : ''} sans contrat</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Occupation */}
        {(() => {
          const occupesCount = filteredBaux.filter(b => b.status === "ACTIF").length;
          const preavisCount = filteredBaux.filter(b => b.status === "EN PREAVIS" || b.status === "RÉSILIÉ").length;
          const totalUnits = Math.max(filteredLogements.length, occupesCount + preavisCount);
          const vacantsCount = Math.max(0, totalUnits - occupesCount - preavisCount);

          const pctOccupes = totalUnits > 0 ? Math.round((occupesCount / totalUnits) * 100) : 0;
          const pctPreavis = totalUnits > 0 ? Math.round((preavisCount / totalUnits) * 100) : 0;
          const pctVacants = totalUnits > 0 ? Math.max(0, 100 - pctOccupes - pctPreavis) : 0;

          const activeBauxSorted = [...filteredBaux].filter(b => b.status === "ACTIF");
          const preavisBauxSorted = [...filteredBaux].filter(b => b.status === "EN PREAVIS" || b.status === "RÉSILIÉ");

          const recentEntree = activeBauxSorted.length > 0 
            ? { unit: formatUnitDisplay(activeBauxSorted[0].unit), time: "Actif" } 
            : { unit: "Aucune entrée récente", time: "-" };

          const recentSortie = preavisBauxSorted.length > 0 
            ? { unit: formatUnitDisplay(preavisBauxSorted[0].unit), time: "En cours" } 
            : { unit: "Aucune sortie récente", time: "-" };

          return (
            <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Occupation</h2>
              <div className="flex h-4 rounded-full overflow-hidden mb-4 bg-gray-100">
                <div className="bg-green-500 transition-all duration-300" style={{ width: `${pctOccupes}%` }} title={`Occupés: ${pctOccupes}%`}></div>
                <div className="bg-orange-400 transition-all duration-300" style={{ width: `${pctPreavis}%` }} title={`Préavis: ${pctPreavis}%`}></div>
                <div className="bg-gray-300 transition-all duration-300" style={{ width: `${pctVacants}%` }} title={`Vacants: ${pctVacants}%`}></div>
              </div>
              <div className="flex justify-between text-xs mb-6 border-b border-app-border pb-4">
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>{occupesCount} Occupés</div>
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-orange-400 mr-1.5"></div>{preavisCount} Préavis</div>
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-gray-300 mr-1.5"></div>{vacantsCount} Vacants</div>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Mouvements récents</h3>
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-gray-900">{recentEntree.unit}</span>
                    <span className="text-gray-500">Entrée</span>
                  </div>
                  <span className="text-xs text-gray-400">{recentEntree.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-gray-900">{recentSortie.unit}</span>
                    <span className="text-gray-500">Sortie</span>
                  </div>
                  <span className="text-xs text-gray-400">{recentSortie.time}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Recouvrement par gérant */}
        {(() => {
          return (
            <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recouvrement par gérant</h2>
                <span className="text-xs text-gray-400">{getMonthName(selectedPeriod)}</span>
              </div>
              <div className="space-y-4 flex-1">
                {activeManagers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Aucun membre d&apos;équipe enregistré.</p>
                ) : (
                  activeManagers.map((m: any, idx: number) => {
                    const assignedList: string[] = Array.isArray(m.assignedLogements) ? m.assignedLogements : [];
                    const assignedCount = assignedList.length;

                    // Si le gérant n'a AUCUN bien en gestion attribué
                    if (assignedCount === 0) {
                      return (
                        <div key={m.id || idx}>
                          <div className="flex justify-between items-center text-sm mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{m.name}</span>
                              <span className="text-xs text-gray-400">({m.role || "Gérant"})</span>
                            </div>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                              Aucun bien en gestion
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-200 rounded-full" style={{ width: "0%" }}></div>
                          </div>
                        </div>
                      );
                    }

                    // Pour les gérants avec des biens assignés
                    const managedUnits = activeLogements.filter((l: any) => 
                      assignedList.includes(l.id) || 
                      assignedList.includes(l.unit) || 
                      (l.property && assignedList.includes(l.property))
                    );
                    const managedKeys = new Set([
                      ...assignedList, 
                      ...managedUnits.map((l: any) => l.id), 
                      ...managedUnits.map((l: any) => l.unit)
                    ]);

                    const managerLeases = filteredBaux.filter((b: any) => 
                      managedKeys.has(b.unit) && isLeaseActiveInPeriod(b, selectedPeriod)
                    );
                    const targetRent = managerLeases.reduce((sum: number, b: any) => sum + Number(b.rent || b.loyer || 0), 0);

                    const managerPayments = filteredPaiementsPeriod.filter((p: any) => 
                      managedKeys.has(p.unit) && (p.status === "PAYÉ" || p.status === "VALIDÉ")
                    );
                    const collectedRent = managerPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

                    let perf = 0;
                    if (targetRent > 0) {
                      perf = Math.min(100, Math.round((collectedRent / targetRent) * 100));
                    } else if (collectedRent > 0) {
                      perf = 100;
                    } else if (m.performance !== undefined && m.performance !== null && Number(m.performance) > 0) {
                      perf = Number(m.performance);
                    }

                    const barColor = perf === 100 ? "bg-green-500" : perf >= 75 ? "bg-primary" : perf > 0 ? "bg-amber-500" : "bg-gray-300";

                    return (
                      <div key={m.id || idx}>
                        <div className="flex justify-between items-center text-sm mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{m.name}</span>
                            <span className="text-xs text-gray-400">
                              ({assignedCount} {assignedCount > 1 ? "lots" : "lot"})
                            </span>
                          </div>
                          <span className="font-semibold text-gray-900">{perf}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${barColor} rounded-full transition-all duration-300`} 
                            style={{ width: `${Math.min(100, Math.max(0, perf))}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Section Incidents & Signalements Locataires */}
      <div id="incidents" className="bg-white rounded-2xl border border-app-border shadow-sm p-6 space-y-4 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Signalements & Incidents locataires
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Problèmes techniques et déclarations transmises par les locataires.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIncidentIds.length > 0 && (
              <button
                onClick={() => setIncidentToDelete(selectedIncidentIds)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer ({selectedIncidentIds.length})
              </button>
            )}
            {incidents.length > 0 && (
              <button
                onClick={toggleSelectAllIncidents}
                className="text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors border border-app-border"
              >
                {selectedIncidentIds.length === incidents.length ? "Tout décocher" : "Tout sélectionner"}
              </button>
            )}
            <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200/60">
              {incidents.filter((i) => i.status !== "RÉSOLU").length} en cours / attente
            </span>
          </div>
        </div>

        {incidents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...incidents]
              .sort((a: any, b: any) => {
                const timeA = a.createdAt || a.created_at ? new Date(a.createdAt || a.created_at).getTime() : 0;
                const timeB = b.createdAt || b.created_at ? new Date(b.createdAt || b.created_at).getTime() : 0;
                return timeB - timeA;
              })
              .map((inc) => {
              const displayTenant = inc.tenant && inc.tenant !== "Inconnu" ? inc.tenant : "Locataire Inconnu";
              const tenantInitials = (displayTenant || "L").split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
              const matchedLoc = locataires.find((l: any) => (l.name || "").trim().toLowerCase() === (inc.tenant || "").trim().toLowerCase());
              const locId = matchedLoc ? matchedLoc.id : null;
              const formattedUnit = formatUnitDisplay(inc.unit);
              const displayUnit = formattedUnit.toLowerCase().startsWith("studio") || formattedUnit.toLowerCase().startsWith("appartement") || formattedUnit.toLowerCase().startsWith("villa") || formattedUnit.toLowerCase().startsWith("magasin") ? formattedUnit : `Appartement ${formattedUnit}`;
              const displayProp = inc.property && !isUUID(inc.property) ? inc.property : "Résidence";
              const displayId = getIncidentDisplayCode(inc.id);
              const isSelected = selectedIncidentIds.includes(inc.id);

              return (
                <div
                  key={inc.id}
                  className={cn(
                    "border rounded-xl p-4 transition-all space-y-3 shadow-2xs relative flex flex-col justify-between",
                    isSelected
                      ? "bg-red-50/40 border-red-300 ring-1 ring-red-400"
                      : "bg-gray-50/50 border-app-border hover:bg-white"
                  )}
                >
                  <div className="space-y-3">
                    {/* Header locataire */}
                    <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectIncident(inc.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                          title="Sélectionner pour la suppression"
                        />
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {tenantInitials}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 truncate max-w-[130px]">{displayTenant}</p>
                          <p className="text-[11px] font-medium text-gray-500">{displayUnit} — {displayProp}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-bold text-gray-700">{displayId}</span>
                        {inc.isUrgent && (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Urgence
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Problème & Description */}
                    <div>
                      <span className="text-xs font-bold text-gray-900 block mb-1">{inc.title || inc.type}</span>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed bg-white p-2.5 rounded-lg border border-app-border/60">
                        {inc.description}
                      </p>
                    </div>

                    {/* Pièces jointes & Date */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                      <span>{inc.dateStr || "Récemment"}</span>
                      {inc.files && inc.files.length > 0 && (
                        <span className="text-primary font-medium flex items-center gap-1">
                          📎 {inc.files.length} fichier(s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={inc.status}
                        onChange={(e) => handleUpdateIncidentStatus(inc.id, e.target.value)}
                        className="text-xs font-semibold px-2 py-1 border border-app-border rounded-lg bg-white text-gray-800 shadow-2xs cursor-pointer"
                      >
                        <option value="EN ATTENTE">EN ATTENTE</option>
                        <option value="EN COURS">EN COURS</option>
                        <option value="RÉSOLU">RÉSOLU</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedIncidentDetail(inc)}
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium"
                        title="Voir les détails"
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir
                      </button>
                      {locId && (
                        <Link href={`/app/locataires/${locId}`}>
                          <span className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5">
                            Fiche <ArrowRight className="w-3 h-3" />
                          </span>
                        </Link>
                      )}
                      <button
                        onClick={() => setIncidentToDelete([inc.id])}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium"
                        title="Supprimer cet incident"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Aucun incident ou signalement en cours.</p>
        )}
      </div>

      {/* Modal Détails Incident Réutilisable */}
      <IncidentDetailModal
        incident={selectedIncidentDetail}
        isOpen={Boolean(selectedIncidentDetail)}
        onClose={() => setSelectedIncidentDetail(null)}
        onStatusChange={async (id, newStatus) => {
          await handleUpdateIncidentStatus(id, newStatus);
        }}
        onIncidentUpdated={(updated) => {
          setSelectedIncidentDetail(updated);
          setIncidents((prev) => prev.map((inc) => (inc.id === updated.id ? updated : inc)));
        }}
      />

      {/* Modal Confirmation Suppression Incident */}
      {incidentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {incidentToDelete.length > 1 ? `Supprimer ${incidentToDelete.length} incidents` : "Supprimer l'incident"}
                </h3>
                <p className="text-xs text-gray-500">Cette action est irréversible.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {incidentToDelete.length > 1
                ? `Êtes-vous sûr de vouloir supprimer ces ${incidentToDelete.length} incidents sélectionnés ? Ils seront également retirés de l'espace locataire.`
                : "Êtes-vous sûr de vouloir supprimer cet incident ? Il sera également retiré de l'espace locataire."}
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-app-border">
              <button
                disabled={isDeletingIncidents}
                onClick={() => setIncidentToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-app-border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={isDeletingIncidents}
                onClick={confirmDeleteIncidents}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {isDeletingIncidents ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tables */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Table Situation des loyers */}
        <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-app-border space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Situation des loyers · {getMonthName(selectedPeriod)}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Filtres actifs : Période ({getMonthName(selectedPeriod)}), Entreprise ({selectedEntreprise}), Bien ({selectedBien})
                </p>
              </div>

              {/* Controls bar in table header */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-gray-50 border border-app-border rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-semibold text-gray-500">Période :</span>
                  <input 
                    type="month"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-gray-900 outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-gray-50 border border-app-border rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-semibold text-gray-500">Entreprise :</span>
                  <select 
                    value={selectedEntreprise}
                    onChange={(e) => {
                      setSelectedEntreprise(e.target.value);
                      setSelectedBien("Tous les biens");
                    }}
                    className="bg-transparent text-xs font-semibold text-gray-900 outline-none cursor-pointer"
                  >
                    <option value="Toutes les entreprises">Toutes les entreprises</option>
                    {activeProprietaires.map((owner: any) => (
                      <option key={owner.id} value={owner.name}>{owner.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-gray-50 border border-app-border rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-semibold text-gray-500">Bien :</span>
                  <select 
                    value={selectedBien}
                    onChange={(e) => setSelectedBien(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-gray-900 outline-none cursor-pointer"
                  >
                    <option value="Tous les biens">Tous les biens</option>
                    {availableBiens.map((b: any) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-gray-50 border border-app-border rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-semibold text-gray-500">Tri :</span>
                  <select 
                    value={loyersSortOrder}
                    onChange={(e) => setLoyersSortOrder(e.target.value as "recent" | "ancien")}
                    className="bg-transparent text-xs font-semibold text-gray-900 outline-none cursor-pointer"
                  >
                    <option value="recent">Du plus récent au plus ancien</option>
                    <option value="ancien">Du plus ancien au plus récent</option>
                  </select>
                </div>
              </div>
            </div>

            {(() => {
              const countTous = filteredPaiementsPeriod.length;
              const countPayes = filteredPaiementsPeriod.filter((p: any) => p.status === "PAYÉ" || p.status === "VALIDÉ").length;
              const countRetard = filteredPaiementsPeriod.filter((p: any) => p.status === "EN RETARD").length;
              const countImpayes = filteredPaiementsPeriod.filter((p: any) => p.status === "IMPAYÉ" || p.status === "REJETÉ" || p.status === "EN ATTENTE").length;

              return (
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 border-t border-app-border/60">
                  <button 
                    onClick={() => setLoyersStatusFilter("Tous")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${loyersStatusFilter === "Tous" ? "bg-gray-200 text-gray-900 font-semibold" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    Tous ({countTous})
                  </button>
                  <button 
                    onClick={() => setLoyersStatusFilter("Payés")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${loyersStatusFilter === "Payés" ? "bg-green-100 text-green-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                    Payés ({countPayes})
                  </button>
                  <button 
                    onClick={() => setLoyersStatusFilter("En retard")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${loyersStatusFilter === "En retard" ? "bg-red-100 text-red-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                    En retard ({countRetard})
                  </button>
                  <button 
                    onClick={() => setLoyersStatusFilter("Impayés")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${loyersStatusFilter === "Impayés" ? "bg-orange-100 text-orange-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                    Impayés/En attente ({countImpayes})
                  </button>
                </div>
              );
            })()}
          </div>

          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                  <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Locataire</th>
                  <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Appt.</th>
                  <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Montant</th>
                  <th 
                    onClick={() => setLoyersSortOrder(loyersSortOrder === "recent" ? "ancien" : "recent")}
                    className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center cursor-pointer hover:text-gray-900 select-none group"
                    title="Cliquer pour inverser le tri"
                  >
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      <span>Date d'encaissement</span>
                      <span className="text-xs font-bold text-primary group-hover:scale-110 transition-transform">
                        {loyersSortOrder === "recent" ? "↓" : "↑"}
                      </span>
                    </div>
                  </th>
                  <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Statut</th>
                  <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {(() => {
                  const basePayments = filteredPaiementsPeriod.filter((p: any) => {
                    if (loyersStatusFilter === "Tous") return true;
                    if (loyersStatusFilter === "Payés") return p.status === "PAYÉ" || p.status === "VALIDÉ";
                    if (loyersStatusFilter === "En retard") return p.status === "EN RETARD";
                    if (loyersStatusFilter === "Impayés") return p.status === "IMPAYÉ" || p.status === "REJETÉ" || p.status === "EN ATTENTE";
                    return true;
                  });

                  const filteredPaymentsTable = [...basePayments].sort((a, b) => {
                    if (loyersSortOrder === "ancien") {
                      return comparePaymentsDesc(b, a);
                    }
                    return comparePaymentsDesc(a, b);
                  });

                  if (filteredPaymentsTable.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                          Aucun loyer enregistré pour les critères sélectionnés.
                        </td>
                      </tr>
                    );
                  }

                  return filteredPaymentsTable.map((payment: any) => {
                    const isLateOrUnpaid = payment.status === "NON PAYÉ" || payment.status === "EN RETARD" || payment.status === "EN ATTENTE";
                    return (
                      <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 text-xs font-semibold text-gray-600 shrink-0">
                              {payment.tenant ? payment.tenant.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : "XX"}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{payment.tenant}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-600 text-center font-medium">
                          {formatUnitDisplay(payment.unit)}
                        </td>
                        <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                          {formatFCFA(payment.amount)}
                        </td>
                        <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatPaymentDateDisplay(payment.payment_date || payment.date || payment.created_at)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Période : {payment.period || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-center">
                          <Badge dot variant={getStatusBadge(payment.status) as any}>
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-right">
                          {isLateOrUnpaid ? (
                            <Link href={`/app/paiements`}>
                              <button className="text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary hover:text-white transition-colors">
                                Encaisser
                              </button>
                            </Link>
                          ) : (
                            <Link href={`/app/paiements/${payment.id}`} className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors px-3 py-1.5 inline-block">
                              Détails
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table Reversements propriétaires */}
        <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-app-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Reversements propriétaires · {getMonthName(selectedPeriod)}
              </h2>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                <button 
                  onClick={() => setReversementFilter("Tous")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    reversementFilter === "Tous" ? "bg-primary text-white font-semibold shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Tous ({tousReversementsCount})
                </button>
                <button 
                  onClick={() => setReversementFilter("EN ATTENTE")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    reversementFilter === "EN ATTENTE" ? "bg-primary text-white font-semibold shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  En attente ({enAttenteReversementsCount})
                </button>
                <button 
                  onClick={() => setReversementFilter("EFFECTUÉ")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    reversementFilter === "EFFECTUÉ" ? "bg-primary text-white font-semibold shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Effectués ({effectuesReversementsCount})
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                  <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Propriétaire</th>
                  <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Bien</th>
                  <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Commission</th>
                  <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">À Reverser</th>
                  <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Statut</th>
                  <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredReversementsList.length > 0 ? (
                  filteredReversementsList.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{payout.owner}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center font-medium">
                        {payout.property}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {formatFCFA(payout.commission)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                        {formatFCFA(payout.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge dot variant={getStatusBadge(payout.status) as any}>
                          {payout.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link href="/app/reversements">
                          {payout.status === "EN ATTENTE" ? (
                            <button className="text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm">
                              Reverser
                            </button>
                          ) : (
                            <button className="text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary hover:text-white transition-colors">
                              Détails
                            </button>
                          )}
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                      Aucun reversement propriétaire pour les filtres sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

