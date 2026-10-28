"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { 
  ArrowLeft, 
  Building2, 
  Phone, 
  Mail, 
  TrendingUp, 
  ShieldCheck, 
  X, 
  Check, 
  Save, 
  Home, 
  Key, 
  Power, 
  Copy, 
  CheckCircle2, 
  Shield,
  Clock,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { formatFCFA, isUUID, formatUnitDisplay } from "@/lib/utils";

const getLogementDisplayLabel = (l: any) => {
  if (!l) return "-";
  const unitNum = (l.unit || l.unit_number || "").toString().trim();
  if (unitNum && !isUUID(unitNum)) {
    return unitNum;
  }
  return formatUnitDisplay(l.unit || l.id, 1);
};

const defaultManagers = [
  { id: "M-001", name: "Aron Levine", role: "Super Admin", phone: "+225 0102030405", email: "aron@gestimmo.ci", performance: 94, collected: 8500000, target: 8900000, status: "Actif" },
  { id: "M-002", name: "Sarah Kone", role: "Gérante", phone: "+225 0708091011", email: "sarah@gestimmo.ci", performance: 82, collected: 4200000, target: 5120000, status: "Actif" },
  { id: "M-003", name: "Marc Dubois", role: "Gérant", phone: "+225 0506070809", email: "marc@gestimmo.ci", performance: 100, collected: 2100000, target: 2100000, status: "Actif" },
];

const defaultLogements = [
  { id: "A-101", property: "Résidence Les Flamboyants", type: "3 Pièces", rent: 150000, tenant: "Cora Richards", status: "OCCUPÉ" },
  { id: "A-102", property: "Résidence Les Flamboyants", type: "4 Pièces", rent: 200000, tenant: "Bibi Shelton", status: "OCCUPÉ" },
  { id: "B-201", property: "Résidence Les Flamboyants", type: "3 Pièces", rent: 150000, tenant: "-", status: "NON OCCUPÉ" },
  { id: "B-204", property: "Résidence Les Flamboyants", type: "2 Pièces", rent: 200000, tenant: "Alistair Dunlap", status: "OCCUPÉ" },
  { id: "V-001", property: "Villa Palmeraie", type: "Villa", rent: 800000, tenant: "Jean Dupont", status: "OCCUPÉ" },
];

import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { loadAllDataFromDatabase } from "@/lib/dataService";

export default function ManagerDetailsPage({ params }: { params: { id: string } }) {
  const { can } = usePermissions();
  const [manager, setManager] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableLogements, setAvailableLogements] = useState<any[]>([]);
  const [assignedLogementsGlobal, setAssignedLogementsGlobal] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [baux, setBaux] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [locataires, setLocataires] = useState<any[]>([]);
  const [assignOwnerFilter, setAssignOwnerFilter] = useState("Tous les propriétaires");
  const [assignBienFilter, setAssignBienFilter] = useState("Tous les biens");
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState("ALL");

  // Credentials & Toast states
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Permissions Admin states for this gérant
  const [canViewReceipts, setCanViewReceipts] = useState(true);
  const [canManageContracts, setCanManageContracts] = useState(true);
  const [canManageDocuments, setCanManageDocuments] = useState(true);
  const [canManageLogements, setCanManageLogements] = useState(true);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      const dbState = await loadAllDataFromDatabase();
      const stored = typeof window !== "undefined" ? localStorage.getItem("gestimmo_equipe") : null;
      const storedManagers = stored ? JSON.parse(stored) : [];

      let all: any[] = [];
      if (dbState && dbState.profiles && dbState.profiles.length > 0) {
        all = dbState.profiles.map((p) => {
          const localMatch = Array.isArray(storedManagers) 
            ? storedManagers.find((m: any) => m.id === p.id || m.email?.toLowerCase() === p.email?.toLowerCase()) 
            : null;
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
      } else if (storedManagers.length > 0) {
        all = storedManagers;
      } else {
        all = defaultManagers;
      }

      // Merge any default managers not present
      defaultManagers.forEach(dm => {
        if (!all.some(m => m.id === dm.id)) {
          all.push(dm);
        }
      });

      // Synchronize back to localStorage if needed
      if (typeof window !== "undefined" && all.length > 0) {
        localStorage.setItem("gestimmo_equipe", JSON.stringify(all));
      }

      const allAssigned = new Set<string>();
      all.forEach((m: any) => {
        if (!m.assignedLogements && m.id === "M-002") m.assignedLogements = ["A-101", "V-001"];
        if (m.assignedLogements) m.assignedLogements.forEach((l: string) => allAssigned.add(l));
      });
      setAssignedLogementsGlobal(Array.from(allAssigned));

      const targetId = (params.id || "").trim();
      const found = all.find((m: any) => {
        if (!m) return false;
        const mId = (m.id || "").toString().trim();
        if (mId === targetId || mId.toLowerCase() === targetId.toLowerCase()) return true;
        if (m.login && m.login.trim().toLowerCase() === targetId.toLowerCase()) return true;
        if (m.email && m.email.trim().toLowerCase() === targetId.toLowerCase()) return true;
        return false;
      });
      
      if (found) {
        if (!found.assignedLogements) {
          found.assignedLogements = found.id === "M-002" ? ["A-101", "V-001"] : [];
        }
        setManager(found);

        // Initialize permissions states
        const perms = found.gerantPermissions || {
          canViewReceipts: true,
          canManageContracts: true,
          canManageDocuments: true,
          canManageLogements: true,
        };
        setCanViewReceipts(perms.canViewReceipts ?? true);
        setCanManageContracts(perms.canManageContracts ?? true);
        setCanManageDocuments(perms.canManageDocuments ?? true);
        setCanManageLogements(perms.canManageLogements ?? true);
      }

      if (dbState) {
        setAvailableLogements(dbState.units || []);
        setBiens(dbState.properties || []);
        setOwners(dbState.owners || []);
        setBaux(dbState.leases || []);
        setPaiements(dbState.payments || []);
        setLocataires(dbState.tenants || []);
      } else {
        const storedLogements = localStorage.getItem("gestimmo_logements");
        const allLogements = storedLogements ? JSON.parse(storedLogements) : defaultLogements;
        setAvailableLogements(allLogements);

        const storedBiens = localStorage.getItem("gestimmo_biens");
        if (storedBiens) setBiens(JSON.parse(storedBiens));

        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        if (storedOwners) setOwners(JSON.parse(storedOwners));

        const storedBaux = localStorage.getItem("gestimmo_baux");
        if (storedBaux) setBaux(JSON.parse(storedBaux));

        const storedPaiements = localStorage.getItem("gestimmo_paiements");
        if (storedPaiements) setPaiements(JSON.parse(storedPaiements));

        const storedLocataires = localStorage.getItem("gestimmo_locataires");
        if (storedLocataires) setLocataires(JSON.parse(storedLocataires));
      }

      setIsLoading(false);
    };

    initData();
  }, [params.id]);

  const handleToggleStatus = () => {
    if (!manager) return;
    const nextStatus = manager.status === "Actif" || !manager.status ? "Inactif" : "Actif";
    const updatedManager = { ...manager, status: nextStatus };
    setManager(updatedManager);

    const stored = localStorage.getItem("gestimmo_equipe");
    if (stored) {
      const all = JSON.parse(stored);
      const updatedAll = all.map((m: any) => m.id === manager.id ? updatedManager : m);
      localStorage.setItem("gestimmo_equipe", JSON.stringify(updatedAll));
    }
    showToast(`Compte de ${manager.name} passé à "${nextStatus}".`);
  };

  const handleSavePermissions = () => {
    if (!manager) return;
    const updatedPermissions = {
      canViewReceipts,
      canManageContracts,
      canManageDocuments,
      canManageLogements,
    };
    const updatedManager = { ...manager, gerantPermissions: updatedPermissions };
    setManager(updatedManager);

    const stored = localStorage.getItem("gestimmo_equipe");
    if (stored) {
      const all = JSON.parse(stored);
      const updatedAll = all.map((m: any) => m.id === manager.id ? updatedManager : m);
      localStorage.setItem("gestimmo_equipe", JSON.stringify(updatedAll));
    }
    showToast("Droits et permissions du gérant mis à jour !");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500">Chargement du profil du gérant...</p>
      </div>
    );
  }

  if (!manager) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-app-border shadow-sm text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto">
          <X className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Profil introuvable</h2>
        <p className="text-sm text-gray-500">Le gérant ou collaborateur demandé est introuvable ou a été supprimé.</p>
        <Link href="/app/gerants">
          <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour à la liste des gérants
          </button>
        </Link>
      </div>
    );
  }

  const propertiesToDisplay = availableLogements.filter(l => manager.assignedLogements?.includes(l.id) || manager.assignedLogements?.includes(l.unit));
  const unassignedProperties = availableLogements.filter(l => !assignedLogementsGlobal.includes(l.id) && !assignedLogementsGlobal.includes(l.unit));
  
  const modalOwnersList = Array.from(new Set([
    ...owners.map(o => o.name),
    ...biens.map(b => b.owner).filter(Boolean)
  ]));

  const modalBiensList = assignOwnerFilter === "Tous les propriétaires"
    ? biens
    : biens.filter(b => b.owner === assignOwnerFilter);

  const filteredUnassignedProperties = unassignedProperties.filter(l => {
    const bienObj = biens.find(b => b.name === l.property);
    const ownerName = bienObj ? bienObj.owner : null;

    let matchOwner = true;
    if (assignOwnerFilter !== "Tous les propriétaires") {
      matchOwner = ownerName === assignOwnerFilter;
    }

    let matchBien = true;
    if (assignBienFilter !== "Tous les biens") {
      matchBien = l.property === assignBienFilter;
    }

    return matchOwner && matchBien;
  });

  const filteredUnassignedBiens = Array.from(new Set(filteredUnassignedProperties.map(p => p.property)));

  const handleUnassignProperty = (logementId: string) => {
    if (!confirm("Voulez-vous vraiment retirer ce logement de la gestion de ce gérant ?")) return;
    
    const updatedAssigned = manager.assignedLogements.filter((id: string) => id !== logementId);
    const updatedManager = { ...manager, assignedLogements: updatedAssigned, propertiesCount: updatedAssigned.length };
    
    setManager(updatedManager);
    setAssignedLogementsGlobal(prev => prev.filter(id => id !== logementId));
    
    const stored = localStorage.getItem("gestimmo_equipe");
    if (stored) {
      const all = JSON.parse(stored);
      const updatedAll = all.map((m: any) => m.id === manager.id ? updatedManager : m);
      localStorage.setItem("gestimmo_equipe", JSON.stringify(updatedAll));
    }
  };

  const handleAssignProperty = () => {
    if (!selectedProperty) return;
    
    let unitsToAssign: string[] = [];

    if (selectedProperty.startsWith("BIEN:")) {
      const bienName = selectedProperty.replace("BIEN:", "");
      const unitsInBien = unassignedProperties.filter(p => p.property === bienName).map(p => p.id);
      unitsToAssign = unitsInBien;
    } else {
      const selectedLogement = availableLogements.find(l => l.id === selectedProperty);
      if (
        manager.assignedLogements?.includes(selectedProperty) ||
        (selectedLogement && manager.assignedLogements?.includes(selectedLogement.unit))
      ) {
        alert("Ce logement est déjà géré par ce gérant.");
        return;
      }
      unitsToAssign = [selectedProperty];
    }

    const updatedAssigned = [...(manager.assignedLogements || []), ...unitsToAssign];
    const updatedManager = { ...manager, assignedLogements: updatedAssigned, propertiesCount: updatedAssigned.length };
    
    setManager(updatedManager);
    setAssignedLogementsGlobal(prev => [...prev, ...unitsToAssign]);
    
    const stored = localStorage.getItem("gestimmo_equipe");
    if (stored) {
      const all = JSON.parse(stored);
      const updatedAll = all.map((m: any) => m.id === manager.id ? updatedManager : m);
      localStorage.setItem("gestimmo_equipe", JSON.stringify(updatedAll));
    }
    
    setIsAssignModalOpen(false);
    setSelectedProperty("");
  };

  const openEditModal = () => {
    setEditName(manager.name);
    setEditRole(manager.role);
    setEditPhone(manager.phone);
    setEditEmail(manager.email);
    setIsEditModalOpen(true);
  };

  const handleUpdateManager = () => {
    const updatedManager = { 
      ...manager, 
      name: editName ? editName.trim().toUpperCase() : manager.name, 
      role: editRole, 
      phone: editPhone ? editPhone.replace(/\D/g, '') : manager.phone, 
      email: editEmail 
    };
    setManager(updatedManager);
    
    // Update local storage
    const stored = localStorage.getItem("gestimmo_equipe");
    if (stored) {
      const all = JSON.parse(stored);
      const updatedAll = all.map((m: any) => m.id === manager.id ? updatedManager : m);
      localStorage.setItem("gestimmo_equipe", JSON.stringify(updatedAll));
    }
    
    setIsEditModalOpen(false);
  };

  // Calculate dynamic stats
  let calculatedTarget = manager?.target || 0;
  let calculatedCollected = manager?.collected || 0;
  let calculatedPerformance = manager?.performance || 0;
  let retardsGerantCount = 0;
  let calculatedRetardsAmount = 0;
  const retardLogementIds = new Set<string>();

  if (manager && manager.assignedLogements) {
    const assignedUnitsList = manager.assignedLogements;
    const activeLeases = baux.filter(b => b.status === "ACTIF" && assignedUnitsList.includes(b.unit));
    calculatedTarget = activeLeases.reduce((sum, lease) => sum + (lease.rent || 0), 0);

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toLowerCase();

    const currentMonthPayments = paiements.filter(p => {
      if (!assignedUnitsList.includes(p.unit)) return false;
      if (p.status !== "PAYÉ" && p.status !== "VALIDÉ") return false;
      
      const pPeriod = (p.period || "").toLowerCase();
      return pPeriod === currentMonthStr || pPeriod.includes(currentMonthName.split(' ')[0]);
    });

    calculatedCollected = currentMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    calculatedPerformance = calculatedTarget > 0 ? Math.round((calculatedCollected / calculatedTarget) * 100) : 0;
    if (calculatedPerformance > 100) calculatedPerformance = 100;

    // Calcul des impayés & retards à relancer pour ce gérant
    const latePaymentsGerant = paiements.filter((p: any) => 
      assignedUnitsList.includes(p.unit) && 
      (p.status === "EN RETARD" || p.status === "IMPAYÉ" || p.status === "REJETÉ")
    );

    const gerantLateTenants = locataires.filter((t: any) => 
      (assignedUnitsList.includes(t.unit) || activeLeases.some((b: any) => b.tenant === t.name)) &&
      (t.status === "EN RETARD" || t.status === "IMPAYÉ")
    );

    latePaymentsGerant.forEach((p: any) => {
      if (p.unit) retardLogementIds.add(p.unit);
    });
    gerantLateTenants.forEach((t: any) => {
      if (t.unit) retardLogementIds.add(t.unit);
      const matchLease = activeLeases.find((b: any) => b.tenant === t.name);
      if (matchLease && matchLease.unit) retardLogementIds.add(matchLease.unit);
    });

    retardsGerantCount = Math.max(retardLogementIds.size, latePaymentsGerant.length, gerantLateTenants.length);
    
    calculatedRetardsAmount = latePaymentsGerant.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    if (calculatedRetardsAmount === 0 && retardsGerantCount > 0) {
      calculatedRetardsAmount = activeLeases
        .filter((b: any) => retardLogementIds.has(b.unit) || gerantLateTenants.some((t: any) => t.name === b.tenant))
        .reduce((sum: number, b: any) => sum + (Number(b.rent) || 0), 0);
    }
    if (calculatedRetardsAmount === 0 && calculatedTarget > calculatedCollected) {
      calculatedRetardsAmount = calculatedTarget - calculatedCollected;
    }
  }

  const filteredModalPayments = paiements
    .filter(p => manager?.assignedLogements?.includes(p.unit) && (p.status === "PAYÉ" || p.status === "VALIDÉ"))
    .filter(p => selectedPeriodFilter === "ALL" || p.period === selectedPeriodFilter)
    .sort((a, b) => new Date(b.date || b.paymentDate || new Date()).getTime() - new Date(a.date || a.paymentDate || new Date()).getTime());

  const totalModalAmount = filteredModalPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  if (!can("parametres", "view")) {
    return <AccessDeniedCard moduleName="Gestion de l'équipe & Rôles" />;
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 relative">
      {/* Modal d'attribution */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Attribuer un logement</h2>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              
              {/* Filtre Propriétaire */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-gray-700"
                  value={assignOwnerFilter}
                  onChange={(e) => {
                    setAssignOwnerFilter(e.target.value);
                    setAssignBienFilter("Tous les biens");
                    setSelectedProperty("");
                  }}
                >
                  <option>Tous les propriétaires</option>
                  {modalOwnersList.map(ownerName => (
                    <option key={ownerName} value={ownerName}>{ownerName}</option>
                  ))}
                </select>
              </div>

              {/* Filtre Bien */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bien immobilier</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-gray-700"
                  value={assignBienFilter}
                  onChange={(e) => {
                    setAssignBienFilter(e.target.value);
                    setSelectedProperty("");
                  }}
                >
                  <option>Tous les biens</option>
                  {modalBiensList.map(b => (
                    <option key={b.id || b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Sélection Logement ou Bien */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sélectionnez le logement ou le bien à assigner *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-gray-700"
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                >
                  <option value="" disabled>Choisir un logement ou un bien...</option>
                  
                  {filteredUnassignedBiens.length > 0 && (
                    <optgroup label="Biens complets (Tous les logements)">
                      {filteredUnassignedBiens.map(bien => (
                        <option key={`bien-${bien}`} value={`BIEN:${bien}`}>{bien}</option>
                      ))}
                    </optgroup>
                  )}

                  {filteredUnassignedProperties.length > 0 && (
                    <optgroup label="Logements individuels">
                      {filteredUnassignedProperties.map(p => (
                        <option key={p.id} value={p.id}>{getLogementDisplayLabel(p)} - {p.property} ({p.type})</option>
                      ))}
                    </optgroup>
                  )}

                  {filteredUnassignedProperties.length === 0 && (
                    <option value="" disabled>Aucun logement disponible</option>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  La sélection sera ajoutée à la liste des logements sous la gestion de {manager.name}.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsAssignModalOpen(false)} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleAssignProperty}
                disabled={!selectedProperty}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4 mr-2" /> Attribuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'historique des encaissements */}
      {isPerformanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900">Historique des encaissements</h2>
                <select 
                  className="px-3 py-1.5 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-gray-700"
                  value={selectedPeriodFilter}
                  onChange={(e) => setSelectedPeriodFilter(e.target.value)}
                >
                  <option value="ALL">Toutes les périodes</option>
                  {Array.from(new Set(
                    paiements
                      .filter(p => manager?.assignedLogements?.includes(p.unit) && (p.status === "PAYÉ" || p.status === "VALIDÉ"))
                      .map(p => p.period)
                  )).filter(Boolean).sort((a: any, b: any) => b.localeCompare(a)).map(period => (
                    <option key={period as string} value={period as string}>{period as string}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => setIsPerformanceModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 overflow-auto w-full flex-1">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border sticky top-0">
                  <tr>
                    <th className="px-6 py-4 font-medium">Période</th>
                    <th className="px-6 py-4 font-medium">Logement</th>
                    <th className="px-6 py-4 font-medium">Locataire</th>
                    <th className="px-6 py-4 font-medium text-right">Montant</th>
                    <th className="px-6 py-4 font-medium text-center">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredModalPayments.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{p.period}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.tenant}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatFCFA(p.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{new Date(p.date || p.paymentDate || new Date()).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                  {filteredModalPayments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                        Aucun encaissement trouvé pour ce gérant.
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredModalPayments.length > 0 && (
                  <tfoot className="bg-gray-50/50 font-bold border-t border-app-border">
                    <tr>
                      <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right uppercase tracking-wider">
                        Total
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary text-right">
                        {formatFCFA(totalModalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setIsPerformanceModalOpen(false)} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Modifier le profil</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  <option value="Gérant">Gérant(e)</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Gérant principal">Gérant principal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input 
                  type="tel" 
                  inputMode="numeric"
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ex: 0102030405"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email professionnel</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleUpdateManager}
                disabled={!editName || !editPhone}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/app/gerants">
            <button className="p-2 bg-white border border-app-border rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gray-200 overflow-hidden hidden sm:block border border-app-border">
              <img src={`https://ui-avatars.com/api/?name=${manager.name}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {manager.name}
                <Badge variant="default" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">{manager.role}</Badge>
                <Badge 
                  variant={manager.status === "Inactif" ? "danger" : "success"}
                  dot={true}
                >
                  {manager.status === "Inactif" ? "Compte Inactif" : "Compte Actif"}
                </Badge>
              </h1>
              <div className="flex items-center text-sm text-gray-500 gap-4 mt-2">
                <span className="flex items-center"><Phone className="w-4 h-4 mr-1.5" /> {manager.phone}</span>
                <span className="flex items-center"><Mail className="w-4 h-4 mr-1.5" /> {manager.email}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCredentialsModalOpen(true)}
            className="bg-primary/10 text-primary border border-primary/20 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-primary hover:text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Key className="w-4 h-4" /> Identifiants
          </button>
          <button 
            type="button" 
            onClick={handleToggleStatus} 
            className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              manager.status === "Inactif"
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
            }`}
          >
            <Power className="w-4 h-4" /> {manager.status === "Inactif" ? "Activer le compte" : "Désactiver le compte"}
          </button>
          <button type="button" onClick={openEditModal} className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center">
            Modifier le profil
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Performance */}
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="w-5 h-5 text-primary mr-2" />
                Performances du mois
              </h2>
              <button 
                onClick={() => setIsPerformanceModalOpen(true)}
                className="text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary hover:text-white transition-colors"
              >
                Historique des encaissements
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-app-border">
                <p className="text-xs text-gray-500 mb-1">Objectif de collecte</p>
                <p className="text-xl font-bold text-gray-900">{formatFCFA(calculatedTarget)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-app-border">
                <p className="text-xs text-gray-500 mb-1">Montant collecté</p>
                <p className="text-xl font-bold text-primary">{formatFCFA(calculatedCollected)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-app-border">
                <p className="text-xs text-gray-500 mb-1">Taux de recouvrement</p>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold text-gray-900">{calculatedPerformance}%</p>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${calculatedPerformance}%` }}></div>
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${retardsGerantCount > 0 ? "bg-red-50/70 border-red-200" : "bg-emerald-50/50 border-emerald-200"}`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-xs font-semibold ${retardsGerantCount > 0 ? "text-red-700" : "text-emerald-700"}`}>Retards à relancer</p>
                    <Badge variant={retardsGerantCount > 0 ? "alert" : "success"} dot className="text-[10px] py-0">
                      {retardsGerantCount > 0 ? `${retardsGerantCount} retard(s)` : "À jour"}
                    </Badge>
                  </div>
                  <p className={`text-xl font-bold ${retardsGerantCount > 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {retardsGerantCount > 0 ? formatFCFA(calculatedRetardsAmount) : "0 F CFA"}
                  </p>
                </div>
                {retardsGerantCount > 0 ? (
                  <Link 
                    href="/app/paiements?status=EN+RETARD"
                    className="text-[11px] font-semibold text-red-600 hover:text-red-800 hover:underline mt-2 flex items-center gap-1"
                  >
                    <span>Relancer les retards</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <p className="text-[11px] text-emerald-600 mt-2">Aucun impayé constaté</p>
                )}
              </div>
            </div>
          </div>

          {/* Biens assignés */}
          <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border">
              <h2 className="text-lg font-semibold text-gray-900 flex justify-between items-center">
                Logements sous sa gestion
                <button 
                  onClick={() => {
                    setAssignOwnerFilter("Tous les propriétaires");
                    setAssignBienFilter("Tous les biens");
                    setSelectedProperty("");
                    setIsAssignModalOpen(true);
                  }} 
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Attribuer un logement
                </button>
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {propertiesToDisplay.length > 0 ? propertiesToDisplay.map(logement => {
                const isOverdue = retardLogementIds.has(logement.id) || 
                  retardLogementIds.has(logement.unit) ||
                  (logement.tenant && locataires.some((t: any) => t.name === logement.tenant && (t.status === "EN RETARD" || t.status === "IMPAYÉ")));

                return (
                  <div 
                    key={logement.id} 
                    className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      isOverdue 
                        ? "border-red-200 bg-red-50/20 shadow-sm" 
                        : "border-app-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isOverdue ? "bg-red-100 text-red-600" : "bg-gray-50 text-gray-500"}`}>
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/app/logements/${logement.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary hover:underline">
                            {getLogementDisplayLabel(logement)} - {logement.property}
                          </Link>
                          {isOverdue && (
                            <Badge variant="alert" dot className="text-[10px] py-0">
                              Retard à relancer
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {logement.type} • {logement.tenant && logement.tenant !== "-" ? `Locataire: ${logement.tenant}` : logement.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Loyer Mensuel</p>
                        <p className={`text-sm font-bold ${isOverdue ? "text-red-700" : "text-gray-900"}`}>{formatFCFA(logement.rent)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOverdue && (
                          <Link
                            href="/app/paiements?status=EN+RETARD"
                            className="text-xs font-semibold bg-red-600 text-white px-2.5 py-1 rounded-md hover:bg-red-700 transition-colors shadow-xs"
                          >
                            Relancer
                          </Link>
                        )}
                        <button 
                          onClick={() => handleUnassignProperty(logement.id)}
                          className="text-xs text-red-500 hover:text-red-700 hover:underline font-medium"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-sm text-gray-500 text-center py-4">Aucun logement géré pour le moment.</p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Carte Droits & Permissions définis par l'Administrateur */}
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Droits &amp; Permissions
              </h2>
              <Badge variant="info">Définis par l'Admin</Badge>
            </div>

            <p className="text-xs text-gray-500">
              Définissez les modules et actions autorisés pour ce gérant dans son espace restreint.
            </p>

            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-gray-900 block">Reçus &amp; Paiements</span>
                  <span className="text-xs text-gray-500 block">Encaissement et édition des reçus de loyer</span>
                </div>
                <input
                  type="checkbox"
                  checked={canViewReceipts}
                  onChange={(e) => setCanViewReceipts(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-gray-900 block">Contrats &amp; Baux</span>
                  <span className="text-xs text-gray-500 block">Gestion et création des contrats de location</span>
                </div>
                <input
                  type="checkbox"
                  checked={canManageContracts}
                  onChange={(e) => setCanManageContracts(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-gray-900 block">Documents Locataires</span>
                  <span className="text-xs text-gray-500 block">Téléversement et consultation des pièces justificatives</span>
                </div>
                <input
                  type="checkbox"
                  checked={canManageDocuments}
                  onChange={(e) => setCanManageDocuments(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-gray-900 block">Appartements &amp; Biens</span>
                  <span className="text-xs text-gray-500 block">Consultation et gestion des logements attribués</span>
                </div>
                <input
                  type="checkbox"
                  checked={canManageLogements}
                  onChange={(e) => setCanManageLogements(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleSavePermissions}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" /> Enregistrer les droits
            </button>
          </div>

          {/* Carte Identifiants d'accès quick access */}
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" /> Identifiants de connexion
            </h3>
            <p className="text-xs text-gray-500">
              Visualisez et copiez les identifiants d'accès générés pour ce gérant.
            </p>
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-gray-500">Login:</span>
                <span className="font-mono font-bold text-gray-900">{manager.login || manager.email}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-gray-500">Mot de passe:</span>
                <span className="font-mono font-bold text-primary">{manager.password || "Gerant1234!"}</span>
              </div>
            </div>
            <button
              onClick={() => setIsCredentialsModalOpen(true)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" /> Voir les identifiants complets
            </button>
          </div>
        </div>
      </div>

      {/* Modal Identifiants d'accès */}
      {isCredentialsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsCredentialsModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-app-border animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-primary-50/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Identifiants d'accès</h2>
                  <p className="text-xs text-gray-500">{manager.name} ({manager.role})</p>
                </div>
              </div>
              <button onClick={() => setIsCredentialsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Identifiant / Login de connexion
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={manager.login || manager.email}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-900 select-all font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={manager.password || "Gerant1234!"}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-primary select-all font-bold outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-app-border space-y-2">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Périmètre d'accès autorisé :</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Check className={`w-3.5 h-3.5 ${canViewReceipts ? 'text-green-600' : 'text-gray-300'}`} />
                    <span className={canViewReceipts ? '' : 'line-through text-gray-400'}>Reçus &amp; Paiements</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className={`w-3.5 h-3.5 ${canManageContracts ? 'text-green-600' : 'text-gray-300'}`} />
                    <span className={canManageContracts ? '' : 'line-through text-gray-400'}>Contrats &amp; Baux</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className={`w-3.5 h-3.5 ${canManageDocuments ? 'text-green-600' : 'text-gray-300'}`} />
                    <span className={canManageDocuments ? '' : 'line-through text-gray-400'}>Documents Locataires</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className={`w-3.5 h-3.5 ${canManageLogements ? 'text-green-600' : 'text-gray-300'}`} />
                    <span className={canManageLogements ? '' : 'line-through text-gray-400'}>Appartements rattachés</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-app-border bg-gray-50/50 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  const text = `Identifiant: ${manager.login || manager.email}\nMot de passe: ${manager.password || "Gerant1234!"}`;
                  navigator.clipboard.writeText(text);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2500);
                  showToast("Identifiants copiés dans le presse-papier !");
                }}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                {isCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                {isCopied ? "Copié !" : "Copier les identifiants"}
              </button>
              <button
                onClick={() => setIsCredentialsModalOpen(false)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 border border-gray-800 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
    </div>
  );
}
