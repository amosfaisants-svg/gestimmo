"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  Building2, 
  X, 
  Save, 
  Trash2, 
  AlertTriangle, 
  UserCheck, 
  CheckSquare, 
  Key, 
  Lock, 
  Shield, 
  Copy, 
  Eye, 
  CheckCircle2, 
  Check, 
  Power 
} from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { loadAllDataFromDatabase, createProfile, deleteProfile } from "@/lib/dataService";
import { formatUnitDisplay } from "@/lib/utils";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const initialManagers = [
  { 
    id: "M-001", 
    name: "Aron Levine", 
    role: "Super Admin", 
    phone: "+225 0102030405", 
    email: "aron@gestimmo.ci", 
    login: "aron@gestimmo.ci", 
    password: "Admin1234!", 
    status: "Actif", 
    propertiesCount: 5, 
    performance: 94, 
    collected: 8500000, 
    assignedLogements: ["A-102", "B-204", "C-101"],
    gerantPermissions: { canViewReceipts: true, canManageContracts: true, canManageDocuments: true, canManageLogements: true }
  },
  { 
    id: "M-002", 
    name: "Sarah Kone", 
    role: "Gérante", 
    phone: "+225 0708091011", 
    email: "sarah@gestimmo.ci", 
    login: "sarah@gestimmo.ci", 
    password: "Gerant5678!", 
    status: "Actif", 
    propertiesCount: 4, 
    performance: 82, 
    collected: 4200000, 
    assignedLogements: ["A-101", "V-001"],
    gerantPermissions: { canViewReceipts: true, canManageContracts: true, canManageDocuments: true, canManageLogements: true }
  },
  { 
    id: "M-003", 
    name: "Marc Dubois", 
    role: "Gérant", 
    phone: "+225 0506070809", 
    email: "marc@gestimmo.ci", 
    login: "marc@gestimmo.ci", 
    password: "Gerant9012!", 
    status: "Actif", 
    propertiesCount: 2, 
    performance: 100, 
    collected: 2100000, 
    assignedLogements: [],
    gerantPermissions: { canViewReceipts: true, canManageContracts: true, canManageDocuments: true, canManageLogements: true }
  },
];

const defaultLogements = [
  { id: "A-101", property: "Résidence Les Flamboyants", type: "3 Pièces", rent: 150000, tenant: "Cora Richards", status: "OCCUPÉ" },
  { id: "A-102", property: "Résidence Les Flamboyants", type: "4 Pièces", rent: 200000, tenant: "Bibi Shelton", status: "OCCUPÉ" },
  { id: "B-201", property: "Résidence Les Flamboyants", type: "3 Pièces", rent: 150000, tenant: "-", status: "NON OCCUPÉ" },
  { id: "B-204", property: "Résidence Les Flamboyants", type: "2 Pièces", rent: 3150000, tenant: "Alistair Dunlap", status: "OCCUPÉ" },
  { id: "V-001", property: "Villa Palmeraie", type: "Villa", rent: 800000, tenant: "Jean Dupont", status: "OCCUPÉ" },
  { id: "C-101", property: "Complexe Riviera", type: "Duplex", rent: 2100000, tenant: "Sery Paul", status: "OCCUPÉ" },
];

export default function GerantsPage() {
  const { can } = usePermissions();
  const [managers, setManagers] = useState<any[]>([]);
  const [baux, setBaux] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [allLogements, setAllLogements] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tous les rôles");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Credentials viewing modal
  const [viewedCredentials, setViewedCredentials] = useState<{ manager: any; isNew: boolean } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  // Modal form states pour ajout
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Gérant");

  // Fine-grained admin permissions for gérant
  const [canViewReceipts, setCanViewReceipts] = useState(true);
  const [canManageContracts, setCanManageContracts] = useState(true);
  const [canManageDocuments, setCanManageDocuments] = useState(true);
  const [canManageLogements, setCanManageLogements] = useState(true);

  // Modal de suppression & réattribution des biens
  const [deleteModalManager, setDeleteModalManager] = useState<any | null>(null);
  const [reassignOption, setReassignOption] = useState<"REASSIGN" | "UNASSIGN">("REASSIGN");
  const [targetGerantId, setTargetGerantId] = useState("");

  // Multi-selection & Bulk Delete states
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkReassignOption, setBulkReassignOption] = useState<"REASSIGN" | "UNASSIGN">("REASSIGN");
  const [bulkTargetGerantId, setBulkTargetGerantId] = useState("");

  useEffect(() => {
    const initData = async () => {
      const dbState = await loadAllDataFromDatabase();
      if (dbState && dbState.profiles) {
        const stored = localStorage.getItem("gestimmo_equipe");
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
        localStorage.setItem("gestimmo_equipe", JSON.stringify(mappedProfiles));
      } else {
        const storedManagers = localStorage.getItem("gestimmo_equipe");
        if (storedManagers) {
          setManagers(JSON.parse(storedManagers));
        } else {
          setManagers(initialManagers);
          localStorage.setItem("gestimmo_equipe", JSON.stringify(initialManagers));
        }
      }

      const storedLogements = localStorage.getItem("gestimmo_logements");
      if (storedLogements) {
        setAllLogements(JSON.parse(storedLogements));
      } else {
        setAllLogements(defaultLogements);
      }

      const storedBaux = localStorage.getItem("gestimmo_baux");
      if (storedBaux) setBaux(JSON.parse(storedBaux));

      const storedPaiements = localStorage.getItem("gestimmo_paiements");
      if (storedPaiements) setPaiements(JSON.parse(storedPaiements));
    };

    initData();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleToggleStatus = (manager: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextStatus = manager.status === "Actif" || !manager.status ? "Inactif" : "Actif";
    const updated = managers.map((m) => (m.id === manager.id ? { ...m, status: nextStatus } : m));
    setManagers(updated);
    localStorage.setItem("gestimmo_equipe", JSON.stringify(updated));
    showToast(`Statut de ${manager.name} passé à "${nextStatus}".`);
  };

  const handleSaveManager = async () => {
    const generatedLogin = newEmail.trim().toLowerCase() || `${newName.trim().toLowerCase().replace(/\s+/g, ".")}@gestimmo.ci`;
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const generatedPassword = `Gerant${randomDigits}!`;

    let dbRole = 'GESTIONNAIRE';
    const rUpper = newRole.toUpperCase();
    if (rUpper.includes('ADMIN') || rUpper.includes('SUPER')) dbRole = 'ADMINISTRATEUR';
    else if (rUpper.includes('COMPTABL')) dbRole = 'COMPTABLE';
    else if (rUpper.includes('AGENT')) dbRole = 'AGENT_TERRAIN';

    const dbCreated = await createProfile({
      full_name: newName.trim().toUpperCase(),
      email: newEmail.trim().toLowerCase() || generatedLogin,
      phone: newPhone.replace(/\D/g, ''),
      role: dbRole,
      permissions: {
        canViewReceipts,
        canManageContracts,
        canManageDocuments,
        canManageLogements,
      }
    });

    const newManagerId = dbCreated ? dbCreated.id : `M-00${managers.length + 1}`;

    const newManager = {
      id: newManagerId,
      name: newName.trim().toUpperCase(),
      role: newRole,
      phone: newPhone.replace(/\D/g, ''),
      email: newEmail.trim().toLowerCase(),
      login: generatedLogin,
      password: generatedPassword,
      status: "Actif",
      propertiesCount: 0,
      performance: 0,
      collected: 0,
      assignedLogements: [],
      gerantPermissions: {
        canViewReceipts,
        canManageContracts,
        canManageDocuments,
        canManageLogements,
      },
      dateAdded: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
    };
    
    const updatedManagers = [newManager, ...managers];
    setManagers(updatedManagers);
    localStorage.setItem("gestimmo_equipe", JSON.stringify(updatedManagers));
    
    setIsModalOpen(false);
    setViewedCredentials({ manager: newManager, isNew: true });

    // Reset Form
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewRole("Gérant");
    setCanViewReceipts(true);
    setCanManageContracts(true);
    setCanManageDocuments(true);
    setCanManageLogements(true);
  };

  const handlePrepareDeleteManager = (manager: any) => {
    const assigned = manager.assignedLogements || (manager.id === "M-002" ? ["A-101", "V-001"] : []);
    
    if (assigned.length === 0) {
      if (confirm(`Voulez-vous vraiment supprimer le gérant "${manager.name}" ? Cette action est irréversible.`)) {
        executeDeleteManager(manager.id, null);
      }
    } else {
      setDeleteModalManager(manager);
      setReassignOption("REASSIGN");
      const otherManagers = managers.filter(m => m.id !== manager.id);
      setTargetGerantId(otherManagers[0]?.id || "");
    }
  };

  const executeDeleteManager = async (managerId: string, targetGerantId: string | null) => {
    await deleteProfile(managerId);
    const managerToDelete = managers.find(m => m.id === managerId);
    const assigned = managerToDelete?.assignedLogements || (managerToDelete?.id === "M-002" ? ["A-101", "V-001"] : []);

    let updatedManagers = [...managers];

    // Si on réattribue à un autre gérant
    if (targetGerantId && assigned.length > 0) {
      updatedManagers = updatedManagers.map(m => {
        if (m.id === targetGerantId) {
          const existingAssigned = m.assignedLogements || [];
          const mergedAssigned = Array.from(new Set([...existingAssigned, ...assigned]));
          return { ...m, assignedLogements: mergedAssigned, propertiesCount: mergedAssigned.length };
        }
        return m;
      });
    }

    // Retirer le gérant supprimé
    updatedManagers = updatedManagers.filter(m => m.id !== managerId);

    setManagers(updatedManagers);
    localStorage.setItem("gestimmo_equipe", JSON.stringify(updatedManagers));

    setDeleteModalManager(null);
  };

  const managersWithDynamicData = managers.map(manager => {
    let propertiesCount = manager.assignedLogements ? manager.assignedLogements.length : 0;
    
    if (!manager.assignedLogements && manager.id === "M-002") {
      propertiesCount = 2; // "A-101", "V-001"
    }

    let calculatedTarget = 0;
    let calculatedCollected = 0;
    let calculatedPerformance = 0;

    const assignedLogements = manager.assignedLogements || (manager.id === "M-002" ? ["A-101", "V-001"] : []);

    if (assignedLogements.length > 0) {
      const activeLeases = baux.filter(b => b.status === "ACTIF" && assignedLogements.includes(b.unit));
      calculatedTarget = activeLeases.reduce((sum, lease) => sum + (lease.rent || 0), 0);

      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentMonthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toLowerCase();

      const currentMonthPayments = paiements.filter(p => {
        if (!assignedLogements.includes(p.unit)) return false;
        if (p.status !== "PAYÉ" && p.status !== "VALIDÉ") return false;
        
        const pPeriod = (p.period || "").toLowerCase();
        return pPeriod === currentMonthStr || pPeriod.includes(currentMonthName.split(' ')[0]);
      });

      calculatedCollected = currentMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      calculatedPerformance = calculatedTarget > 0 ? Math.round((calculatedCollected / calculatedTarget) * 100) : 0;
      if (calculatedPerformance > 100) calculatedPerformance = 100;
    }

    return {
      ...manager,
      propertiesCount: propertiesCount,
      collected: calculatedCollected,
      performance: calculatedPerformance
    };
  });

  const filteredManagers = managersWithDynamicData.filter((manager) => {
    const term = searchTerm.toLowerCase();
    const matchSearch = manager.name.toLowerCase().includes(term);
    
    let matchRole = true;
    if (roleFilter !== "Tous les rôles") {
      if (roleFilter === "Admin") matchRole = manager.role === "Super Admin" || manager.role === "Admin";
      if (roleFilter === "Gérant") matchRole = manager.role === "Gérant" || manager.role === "Gérante";
    }

    return matchSearch && matchRole;
  });

  const toggleSelectManager = (id: string) => {
    setSelectedManagerIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredManagers.map(m => m.id);
    const isAllSelected = filteredIds.length > 0 && filteredIds.every(id => selectedManagerIds.includes(id));
    if (isAllSelected) {
      setSelectedManagerIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedManagerIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const bulkSelectedManagers = managers.filter(m => selectedManagerIds.includes(m.id));
  const bulkAssignedUnits = Array.from(
    new Set(
      bulkSelectedManagers.flatMap(m => m.assignedLogements || (m.id === "M-002" ? ["A-101", "V-001"] : []))
    )
  );
  const remainingManagersForBulk = managers.filter(m => !selectedManagerIds.includes(m.id));

  const handlePrepareBulkDelete = () => {
    if (selectedManagerIds.length === 0) return;

    if (bulkAssignedUnits.length === 0) {
      if (confirm(`Voulez-vous vraiment supprimer les ${selectedManagerIds.length} collaborateur(s) sélectionné(s) ? Cette action est irréversible.`)) {
        executeBulkDeleteManager(null);
      }
    } else {
      setBulkReassignOption("REASSIGN");
      setBulkTargetGerantId(remainingManagersForBulk[0]?.id || "");
      setBulkDeleteModalOpen(true);
    }
  };

  const executeBulkDeleteManager = (targetGerantId: string | null) => {
    const selectedSet = new Set(selectedManagerIds);
    let updatedManagers = [...managers];

    if (targetGerantId && bulkAssignedUnits.length > 0) {
      updatedManagers = updatedManagers.map(m => {
        if (m.id === targetGerantId) {
          const existing = m.assignedLogements || [];
          const merged = Array.from(new Set([...existing, ...bulkAssignedUnits]));
          return { ...m, assignedLogements: merged, propertiesCount: merged.length };
        }
        return m;
      });
    }

    updatedManagers = updatedManagers.filter(m => !selectedSet.has(m.id));

    setManagers(updatedManagers);
    localStorage.setItem("gestimmo_equipe", JSON.stringify(updatedManagers));

    setSelectedManagerIds([]);
    setBulkDeleteModalOpen(false);
  };

  if (!can("parametres", "view")) {
    return <AccessDeniedCard moduleName="Gestion de l'équipe & Rôles" />;
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 relative">
      {/* Modal Ajout Collaborateur */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Nouveau collaborateur</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ex: Koffi Serge"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="Gérant">Gérant(e)</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input 
                  type="tel" 
                  inputMode="numeric"
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ex: 0102030405"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email professionnel / Identifiant de connexion</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ex: serge@gestimmo.ci"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              {/* Droits & Permissions définis par l'Administrateur */}
              <div className="pt-2 border-t border-app-border space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Droits &amp; Périmètre de gestion autorisés
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={canViewReceipts}
                      onChange={(e) => setCanViewReceipts(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-gray-800">Reçus &amp; Paiements</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={canManageContracts}
                      onChange={(e) => setCanManageContracts(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-gray-800">Contrats &amp; Baux</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={canManageDocuments}
                      onChange={(e) => setCanManageDocuments(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-gray-800">Documents Locataires</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={canManageLogements}
                      onChange={(e) => setCanManageLogements(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-gray-800">Appartements / Biens</span>
                  </label>
                </div>

                <div className="p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    Un <strong>identifiant</strong> et un <strong>mot de passe d'accès</strong> seront générés automatiquement.
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveManager}
                disabled={!newName || !newPhone}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression & Réattribution des biens sous gestion */}
      {deleteModalManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setDeleteModalManager(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-app-border" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-red-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Supprimer le gérant</h2>
                  <p className="text-xs text-gray-500">{deleteModalManager.name} ({deleteModalManager.role})</p>
                </div>
              </div>
              <button onClick={() => setDeleteModalManager(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Building2 className="w-4 h-4 text-amber-600" /> Logements sous sa gestion ({(deleteModalManager.assignedLogements || (deleteModalManager.id === "M-002" ? ["A-101", "V-001"] : [])).length})
                </p>
                <p className="text-amber-700">
                  Ce gérant a des logements attribués. Choisissez si vous souhaitez réattribuer la gestion de ces biens à un autre gérant.
                </p>
              </div>

              {/* Liste des logements concernés */}
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                {(deleteModalManager.assignedLogements || (deleteModalManager.id === "M-002" ? ["A-101", "V-001"] : [])).map((unitId: string) => {
                  const logement = allLogements.find((l: any) => l.id === unitId);
                  return (
                    <div key={unitId} className="flex justify-between items-center py-1.5 border-b border-gray-200 last:border-0 text-gray-700">
                      <span className="font-bold text-gray-900">🏠 {logement?.unit ? (logement.unit.toLowerCase().startsWith("studio") || logement.unit.toLowerCase().startsWith("appartement") || logement.unit.toLowerCase().startsWith("villa") ? logement.unit : `Appartement ${logement.unit}`) : formatUnitDisplay(unitId)}</span>
                      <span className="text-gray-500">{logement?.property || "Bien rattaché"}</span>
                    </div>
                  );
                })}
              </div>

              {/* Options de réattribution */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Choix du traitement des logements :</p>

                <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${reassignOption === "REASSIGN" ? "border-primary bg-primary-50/20" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input
                    type="radio"
                    name="reassignChoice"
                    className="mt-1 text-primary focus:ring-primary"
                    checked={reassignOption === "REASSIGN"}
                    onChange={() => setReassignOption("REASSIGN")}
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-gray-900 block mb-1">Attribuer la gestion à un autre gérant</span>
                    <select
                      className="w-full mt-1.5 px-3 py-2 border border-app-border rounded-lg text-xs bg-white font-medium text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      value={targetGerantId}
                      disabled={reassignOption !== "REASSIGN"}
                      onChange={(e) => setTargetGerantId(e.target.value)}
                    >
                      {managers.filter(m => m.id !== deleteModalManager.id).map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${reassignOption === "UNASSIGN" ? "border-amber-500 bg-amber-50/20" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input
                    type="radio"
                    name="reassignChoice"
                    className="mt-1 text-amber-600 focus:ring-amber-500"
                    checked={reassignOption === "UNASSIGN"}
                    onChange={() => setReassignOption("UNASSIGN")}
                  />
                  <div className="text-xs">
                    <span className="font-bold text-gray-900 block">Ne pas attribuer (laisser les logements sans gérant)</span>
                    <span className="text-gray-500">Les logements resteront disponibles pour attribution ultérieure.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalManager(null)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => executeDeleteManager(
                  deleteModalManager.id,
                  reassignOption === "REASSIGN" ? targetGerantId : null
                )}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Supprimer le gérant
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Suppression Multiple des collaborateurs */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setBulkDeleteModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-app-border" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-red-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Supprimer les gérants sélectionnés</h2>
                  <p className="text-xs text-gray-500">{selectedManagerIds.length} collaborateur(s) sélectionné(s)</p>
                </div>
              </div>
              <button onClick={() => setBulkDeleteModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Building2 className="w-4 h-4 text-amber-600" /> Logements rattachés aux gérants sélectionnés ({bulkAssignedUnits.length})
                </p>
                <p className="text-amber-700">
                  Les gérants sélectionnés gèrent au total {bulkAssignedUnits.length} logement(s). Choisissez si vous souhaitez réattribuer la gestion de ces biens à un autre collaborateur.
                </p>
              </div>

              {/* Liste des logements concernés */}
              {bulkAssignedUnits.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                  {bulkAssignedUnits.map((unitId: string) => {
                    const logement = allLogements.find((l: any) => l.id === unitId);
                    return (
                      <div key={unitId} className="flex justify-between items-center py-1.5 border-b border-gray-200 last:border-0 text-gray-700">
                        <span className="font-bold text-gray-900">🏠 {logement?.unit ? (logement.unit.toLowerCase().startsWith("studio") || logement.unit.toLowerCase().startsWith("appartement") || logement.unit.toLowerCase().startsWith("villa") ? logement.unit : `Appartement ${logement.unit}`) : formatUnitDisplay(unitId)}</span>
                        <span className="text-gray-500">{logement?.property || "Bien rattaché"}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Options de réattribution */}
              {remainingManagersForBulk.length > 0 && bulkAssignedUnits.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Choix du traitement des logements :</p>

                  <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${bulkReassignOption === "REASSIGN" ? "border-primary bg-primary-50/20" : "border-gray-200 hover:bg-gray-50"}`}>
                    <input
                      type="radio"
                      name="bulkReassignChoice"
                      className="mt-1 text-primary focus:ring-primary"
                      checked={bulkReassignOption === "REASSIGN"}
                      onChange={() => setBulkReassignOption("REASSIGN")}
                    />
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-gray-900 block mb-1">Attribuer la gestion à un autre gérant</span>
                      <select
                        className="w-full mt-1.5 px-3 py-2 border border-app-border rounded-lg text-xs bg-white font-medium text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                        value={bulkTargetGerantId}
                        disabled={bulkReassignOption !== "REASSIGN"}
                        onChange={(e) => setBulkTargetGerantId(e.target.value)}
                      >
                        {remainingManagersForBulk.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${bulkReassignOption === "UNASSIGN" ? "border-amber-500 bg-amber-50/20" : "border-gray-200 hover:bg-gray-50"}`}>
                    <input
                      type="radio"
                      name="bulkReassignChoice"
                      className="mt-1 text-amber-600 focus:ring-amber-500"
                      checked={bulkReassignOption === "UNASSIGN"}
                      onChange={() => setBulkReassignOption("UNASSIGN")}
                    />
                    <div className="text-xs">
                      <span className="font-bold text-gray-900 block">Ne pas attribuer (laisser les logements sans gérant)</span>
                      <span className="text-gray-500">Les logements resteront disponibles pour attribution ultérieure.</span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setBulkDeleteModalOpen(false)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => executeBulkDeleteManager(
                  bulkReassignOption === "REASSIGN" ? bulkTargetGerantId : null
                )}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Supprimer les gérants ({selectedManagerIds.length})
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipe &amp; Gérants</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les membres de votre équipe et suivez leurs performances de recouvrement.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm w-fit">
          <UserPlus className="h-4 w-4 mr-2" /> Ajouter un collaborateur
        </button>
      </div>

      {/* Bulk Selection Bar */}
      {selectedManagerIds.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span>{selectedManagerIds.length} gérant(s) sélectionné(s)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedManagerIds([])}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Désélectionner tout
            </button>
            <button
              onClick={handlePrepareBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> Supprimer la sélection ({selectedManagerIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-app-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Rechercher par nom..." 
                className="pl-9 pr-4 py-2 border border-app-border rounded-lg text-sm w-full sm:w-80 outline-none focus:ring-2 focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option>Tous les rôles</option>
                <option>Admin</option>
                <option>Gérant</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                <th className="px-3 py-3.5 text-center w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary cursor-pointer"
                    checked={filteredManagers.length > 0 && selectedManagerIds.length === filteredManagers.length}
                    onChange={toggleSelectAll}
                    title="Sélectionner tous les gérants"
                  />
                </th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Collaborateur</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Contact</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Biens assignés</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Encaissé (Mois)</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Taux recouvrement</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Statut</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filteredManagers.length > 0 ? filteredManagers.map((manager) => (
                <tr key={manager.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-3 py-4 text-center whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary cursor-pointer"
                      checked={selectedManagerIds.includes(manager.id)}
                      onChange={() => toggleSelectManager(manager.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(manager.name)}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <Link href={`/app/gerants/${manager.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary hover:underline">
                          {manager.name}
                        </Link>
                        <p className="text-xs text-gray-500">{manager.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600"><Phone className="w-3.5 h-3.5 mr-2 text-gray-400" /> {manager.phone}</div>
                      {manager.email && <div className="flex items-center text-sm text-gray-600"><Mail className="w-3.5 h-3.5 mr-2 text-gray-400" /> {manager.email}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{manager.propertiesCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                    {formatFCFA(manager.collected)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-medium text-gray-900 mb-1">{manager.performance}%</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${manager.performance >= 90 ? 'bg-green-500' : manager.performance >= 75 ? 'bg-orange-400' : 'bg-red-500'}`} style={{ width: `${manager.performance}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={(e) => handleToggleStatus(manager, e)}
                      className="inline-flex items-center gap-1.5 focus:outline-none"
                      title={`Cliquer pour ${manager.status === "Inactif" ? "activer" : "désactiver"} le compte`}
                    >
                      <Badge 
                        variant={manager.status === "Inactif" ? "danger" : "success"}
                        dot={true}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {manager.status === "Inactif" ? "Inactif" : "Actif"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewedCredentials({ manager, isNew: false })}
                        className="text-xs font-medium text-primary bg-primary/10 hover:bg-primary hover:text-white transition-colors px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
                        title="Voir les identifiants de connexion"
                      >
                        <Key className="w-3.5 h-3.5" /> Identifiants
                      </button>
                      <Link href={`/app/gerants/${manager.id}`}>
                        <button className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5 border border-app-border rounded-lg hover:bg-gray-50">
                          Profil
                        </button>
                      </Link>
                      <button
                        onClick={() => handlePrepareDeleteManager(manager)}
                        className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
                        title="Supprimer ce gérant"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Aucun collaborateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Affichage / Copie des identifiants d'accès */}
      {viewedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setViewedCredentials(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-app-border animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-primary-50/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {viewedCredentials.isNew ? "Compte créé avec succès !" : "Identifiants d'accès"}
                  </h2>
                  <p className="text-xs text-gray-500">{viewedCredentials.manager.name} ({viewedCredentials.manager.role})</p>
                </div>
              </div>
              <button onClick={() => setViewedCredentials(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {viewedCredentials.isNew && (
                <div className="p-3 bg-green-50 rounded-xl border border-green-200 text-xs text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span>Le gérant a été ajouté. Transmettez-lui ces identifiants pour qu'il puisse se connecter à son espace.</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Identifiant / Login de connexion
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={viewedCredentials.manager.login || viewedCredentials.manager.email}
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
                    value={viewedCredentials.manager.password || "Gerant1234!"}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-primary select-all font-bold outline-none"
                  />
                </div>
              </div>

              {/* Permissions Accordées */}
              <div className="pt-3 border-t border-app-border space-y-2">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Périmètre d'accès autorisé :</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span>Reçus &amp; Paiements</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span>Contrats &amp; Baux</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span>Documents Locataires</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span>Appartements rattachés</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-app-border bg-gray-50/50 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  const text = `Identifiant: ${viewedCredentials.manager.login || viewedCredentials.manager.email}\nMot de passe: ${viewedCredentials.manager.password || "Gerant1234!"}`;
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
                onClick={() => setViewedCredentials(null)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 border border-gray-800 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
    </div>
  );
}
