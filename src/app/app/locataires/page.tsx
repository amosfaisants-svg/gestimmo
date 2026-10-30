"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Plus, Search, Building2, Phone, Mail, X, Save, Pencil, Trash2, Key, Copy, Check, Power, FileWarning, FileCheck } from "lucide-react";
import Link from "next/link";
import { ensureTenantCredentials, TenantCredential } from "@/lib/tenantCredentials";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { loadAllDataFromDatabase, createTenant, updateTenant, deleteTenant } from "@/lib/dataService";
import { formatUnitDisplay, checkTenantHasImportedContract, calculateTenantDelay } from "@/lib/utils";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const initialTenants = [
  { id: "T-892", name: "Cora Richards", phone: "+225 0102030405", email: "cora@email.com", unit: "A-101", property: "Résidence Les Flamboyants", rent: 165000, status: "À JOUR", role: "Locataire", accountStatus: "Actif", registeredAt: "2026-01-10T08:00:00Z" },
  { id: "T-893", name: "Alistair Dunlap", phone: "+225 0506070809", email: "alistair@email.com", unit: "B-204", property: "Résidence Les Flamboyants", rent: 220000, status: "EN RETARD", role: "Locataire", accountStatus: "Actif", registeredAt: "2026-01-12T09:30:00Z" },
  { id: "T-894", name: "Bibi Shelton", phone: "+225 0708091011", email: "bibi@email.com", unit: "A-102", property: "Résidence Les Flamboyants", rent: 165000, status: "À JOUR", role: "Locataire", accountStatus: "Actif", registeredAt: "2026-01-15T11:00:00Z" },
  { id: "T-895", name: "Jean Dupont", phone: "+225 0910111213", email: "jean@email.com", unit: "V-001", property: "Villa Palmeraie", rent: 850000, status: "À JOUR", role: "Locataire", accountStatus: "Actif", registeredAt: "2026-01-20T14:15:00Z" },
  { id: "T-896", name: "Addie Bradford", phone: "+225 0203040506", email: "addie@email.com", unit: "B-205", property: "Résidence Les Flamboyants", rent: 220000, status: "IMPAYÉ", role: "Locataire", accountStatus: "Actif", registeredAt: "2026-02-01T10:00:00Z" },
  { id: "T-897", name: "Koffi Mensah", phone: "+225 0101010101", email: "koffi@email.com", unit: "-", property: "-", rent: 0, status: "EN ATTENTE", role: "Locataire", accountStatus: "Actif", registeredAt: "2026-02-05T09:00:00Z" },
  { id: "T-898", name: "Fatou Diop", phone: "+225 0202020202", email: "fatou@email.com", unit: "-", property: "-", rent: 0, status: "EN ATTENTE", role: "Locataire", accountStatus: "Actif", registeredAt: "2026-02-10T16:45:00Z" },
];

function LocatairesPageInner() {
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<any[]>([]);

  const [baux, setBaux] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous statuts");
  const [ownerFilter, setOwnerFilter] = useState("Tous les propriétaires");
  const [propertyFilter, setPropertyFilter] = useState("Tous les biens");
  const [sortFilter, setSortFilter] = useState("Plus récents");
  const [owners, setOwners] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<TenantCredential | null>(null);
  const [isCredModalOpen, setIsCredModalOpen] = useState(false);
  const [copiedState, setCopiedState] = useState(false);

  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);

  const handleShowCredentials = (tenant: any) => {
    const creds = ensureTenantCredentials(tenant.name, tenant.unit, tenant.property, tenant.rent);
    setSelectedCredential(creds);
    setIsCredModalOpen(true);
  };
  
  const handleToggleTenantAccountStatus = (tenant: any) => {
    const currentStatus = tenant.accountStatus || "Actif";
    const nextStatus = currentStatus === "Inactif" ? "Actif" : "Inactif";
    const updatedTenants = tenants.map((t: any) =>
      (t.id && t.id === tenant.id) || (t.name && t.name.trim().toUpperCase() === tenant.name?.trim().toUpperCase())
        ? { ...t, accountStatus: nextStatus }
        : t
    );
    setTenants(updatedTenants);
    localStorage.setItem("gestimmo_locataires", JSON.stringify(updatedTenants));
  };

  // Modal form states
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    const initData = async () => {
      const dbState = await loadAllDataFromDatabase();
      if (dbState) {
        setTenants(dbState.tenants);
        setBaux(dbState.leases);
        setPaiements(dbState.payments);
        setBiens(dbState.properties);
        setOwners(dbState.owners);
      } else {
        const storedTenants = localStorage.getItem("gestimmo_locataires");
        if (storedTenants) setTenants(JSON.parse(storedTenants));
        else setTenants(initialTenants);

        const storedBaux = localStorage.getItem("gestimmo_baux");
        if (storedBaux) setBaux(JSON.parse(storedBaux));

        const storedPaiements = localStorage.getItem("gestimmo_paiements");
        if (storedPaiements) setPaiements(JSON.parse(storedPaiements));

        const storedBiens = localStorage.getItem("gestimmo_biens");
        if (storedBiens) setBiens(JSON.parse(storedBiens));

        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        if (storedOwners) setOwners(JSON.parse(storedOwners));
      }
    };

    initData();

    // Handle URL query parameters
    const urlFilter = searchParams.get("filter");
    if (urlFilter && (urlFilter.toLowerCase().includes("contrat") || urlFilter.toLowerCase().includes("importer"))) {
      setStatusFilter("Contrats à importer");
    }

    const urlStatus = searchParams.get("status");
    if (urlStatus) {
      if (urlStatus.toLowerCase().includes("contrat") || urlStatus.toLowerCase().includes("importer")) {
        setStatusFilter("Contrats à importer");
      } else if (urlStatus.toLowerCase().includes("attente")) {
        setStatusFilter("En attente");
      } else if (urlStatus.toLowerCase().includes("pay")) {
        setStatusFilter("Payé");
      } else if (urlStatus.toLowerCase().includes("impay")) {
        setStatusFilter("Impayé");
      }
    }

    const urlSort = searchParams.get("sort");
    if (urlSort) {
      if (urlSort.toLowerCase().includes("enregistr") || urlSort.toLowerCase() === "asc") {
        setSortFilter("Ordre d'enregistrement");
      } else if (urlSort.toLowerCase().includes("recent")) {
        setSortFilter("Plus récents");
      } else if (urlSort.toLowerCase().includes("nom") || urlSort.toLowerCase().includes("alpha")) {
        setSortFilter("Nom (A-Z)");
      }
    }
  }, [searchParams]);


  const handleToggleSelectTenant = (id: string) => {
    setSelectedTenantIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allFilteredIds = sortedTenants.map((t) => t.id);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedTenantIds.includes(id));

    if (areAllSelected) {
      setSelectedTenantIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedTenantIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleEditTenant = (tenant: any) => {
    setEditingTenantId(tenant.id);
    setNewName(tenant.name);
    setNewPhone(tenant.phone);
    setNewEmail(tenant.email || "");
    setIsModalOpen(true);
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce locataire ?")) {
      await deleteTenant(tenantId);
      const allTenants = tenants.filter((t: any) => t.id !== tenantId);
      localStorage.setItem("gestimmo_locataires", JSON.stringify(allTenants));
      setTenants(allTenants);
      setSelectedTenantIds((prev) => prev.filter((id) => id !== tenantId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTenantIds.length === 0) return;
    const count = selectedTenantIds.length;
    const message = count === 1
      ? "Êtes-vous sûr de vouloir supprimer ce locataire ?"
      : `Êtes-vous sûr de vouloir supprimer les ${count} locataires sélectionnés ?`;

    if (window.confirm(message)) {
      for (const id of selectedTenantIds) {
        await deleteTenant(id);
      }
      const allTenants = tenants.filter((t: any) => !selectedTenantIds.includes(t.id));
      localStorage.setItem("gestimmo_locataires", JSON.stringify(allTenants));
      setTenants(allTenants);
      setSelectedTenantIds([]);
    }
  };

  const handleSaveTenant = async () => {
    if (!newName.trim()) return;
    const upperName = newName.trim().toUpperCase();
    const cleanPhone = newPhone.replace(/\D/g, '');
    let updatedTenants;

    if (editingTenantId) {
      await updateTenant(editingTenantId, {
        full_name: upperName,
        phone: cleanPhone,
        email: newEmail,
      });

      updatedTenants = tenants.map((t) => {
        if (t.id === editingTenantId) {
          return { ...t, name: upperName, phone: cleanPhone, email: newEmail };
        }
        return t;
      });
    } else {
      const dbCreated = await createTenant({
        full_name: upperName,
        phone: cleanPhone,
        email: newEmail,
      });

      const newId = dbCreated ? dbCreated.id : `T-${Math.floor(1000 + Math.random() * 9000)}`;
      const creds = ensureTenantCredentials(upperName, "-", "-", 0);
      const newTenant = {
        id: newId,
        name: upperName,
        phone: cleanPhone,
        email: newEmail,
        unit: "-",
        property: "-",
        rent: 0,
        status: "EN ATTENTE",
        login: creds.login,
        password: creds.password,
        role: "Locataire",
        accountStatus: "Actif",
        registeredAt: new Date().toISOString()
      };
      updatedTenants = [...tenants, newTenant];
    }
    
    setTenants(updatedTenants);
    localStorage.setItem("gestimmo_locataires", JSON.stringify(updatedTenants));
    
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setEditingTenantId(null);
    setIsModalOpen(false);
  };

  const tenantsWithDynamicData = tenants.map((tenant, index) => {
    // Find active lease
    const activeLease = baux.find(b => b.tenant && tenant.name && b.tenant.trim().toLowerCase() === tenant.name.trim().toLowerCase() && b.status === "ACTIF");
    const hasLease = !!activeLease;
    let dynamicUnit = "-";
    let dynamicProperty = "-";
    let dynamicRent = 0;
    let dynamicStatus = "EN ATTENTE";
    let unpaidMonths = 0;

    if (activeLease) {
      dynamicUnit = formatUnitDisplay(activeLease.unit, index + 1);
      dynamicProperty = activeLease.property;
      dynamicRent = activeLease.rent;
      
      const delayInfo = calculateTenantDelay(tenant, activeLease, paiements);
      unpaidMonths = delayInfo.unpaidMonths;

      if (unpaidMonths === 0) {
        dynamicStatus = "PAYÉ";
      } else {
        dynamicStatus = "IMPAYÉ";
      }
    } else {
      dynamicStatus = "EN ATTENTE";
      unpaidMonths = 0;
    }

    const hasImportedContract = checkTenantHasImportedContract(tenant, baux);

    return {
      ...tenant,
      registrationIndex: index + 1,
      hasLease,
      hasImportedContract,
      unit: dynamicUnit,
      property: dynamicProperty,
      rent: dynamicRent,
      status: dynamicStatus,
      unpaidMonths: unpaidMonths
    };
  });

  const filteredTenants = tenantsWithDynamicData.filter((tenant) => {
    const term = searchTerm.toLowerCase();
    const matchSearch = tenant.name.toLowerCase().includes(term) || 
                        tenant.phone.toLowerCase().includes(term) ||
                        tenant.id.toLowerCase().includes(term);
    
    let matchStatus = true;
    if (statusFilter !== "Tous statuts") {
      if (statusFilter === "Contrats à importer") matchStatus = !tenant.hasImportedContract;
      else if (statusFilter === "Payé") matchStatus = tenant.status === "PAYÉ";
      else if (statusFilter === "En attente" || statusFilter === "Sans bail") matchStatus = !tenant.hasLease || tenant.status === "EN ATTENTE";
      else if (statusFilter === "Impayé") matchStatus = tenant.status === "IMPAYÉ";
    }

    let matchOwner = true;
    if (ownerFilter !== "Tous les propriétaires") {
       const bien = biens.find(b => b.name === tenant.property);
       if (bien) {
         matchOwner = bien.owner === ownerFilter;
       } else {
         matchOwner = false;
       }
    }

    let matchProperty = true;
    if (propertyFilter !== "Tous les biens") {
       matchProperty = tenant.property === propertyFilter;
    }

    return matchSearch && matchStatus && matchOwner && matchProperty;
  });

  const sortedTenants = [...filteredTenants].sort((a, b) => {
    if (sortFilter === "Ordre d'enregistrement") {
      const dateA = a.registeredAt ? new Date(a.registeredAt).getTime() : a.registrationIndex;
      const dateB = b.registeredAt ? new Date(b.registeredAt).getTime() : b.registrationIndex;
      if (dateA !== dateB) return dateA - dateB;
      return a.registrationIndex - b.registrationIndex;
    } else if (sortFilter === "Nom (A-Z)") {
      return a.name.localeCompare(b.name);
    } else if (sortFilter === "Plus récents") {
      const dateA = a.registeredAt ? new Date(a.registeredAt).getTime() : a.registrationIndex;
      const dateB = b.registeredAt ? new Date(b.registeredAt).getTime() : b.registrationIndex;
      return dateB - dateA;
    }
    return 0;
  });

  const filteredBiens = ownerFilter === "Tous les propriétaires" 
    ? biens 
    : biens.filter(b => b.owner === ownerFilter);

  if (!can("locataires", "view")) {
    return <AccessDeniedCard moduleName="Locataires" />;
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 relative">
      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">{editingTenantId ? "Modifier le locataire" : "Nouveau locataire"}</h2>
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
                  placeholder="Ex: Amadou Diallo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.toUpperCase())}
                />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse Email</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ex: diallo@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
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
                onClick={handleSaveTenant}
                disabled={!newName || !newPhone}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Locataires</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary border border-primary/20 shadow-xs">
              {sortedTenants.length !== tenants.length
                ? `${sortedTenants.length} sur ${tenants.length} locataire${tenants.length > 1 ? "s" : ""}`
                : `${tenants.length} locataire${tenants.length > 1 ? "s" : ""}`}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Gérez vos {tenants.length > 0 ? `${tenants.length} ` : ""}locataires et le suivi de leurs paiements.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedTenantIds.length > 0 && can("locataires", "delete") && (
            <button 
              onClick={handleBulkDelete} 
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center shadow-sm"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer ({selectedTenantIds.length})
            </button>
          )}
          {can("locataires", "edit") && (
            <button 
              onClick={() => {
                setEditingTenantId(null);
                setNewName("");
                setNewPhone("");
                setNewEmail("");
                setIsModalOpen(true);
              }} 
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm w-fit"
            >
              <Plus className="h-4 w-4 mr-2" /> Nouveau locataire
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions banner */}
      {selectedTenantIds.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 text-red-900">
            <span className="font-semibold text-sm">
              {selectedTenantIds.length} locataire{selectedTenantIds.length > 1 ? "s" : ""} sélectionné{selectedTenantIds.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedTenantIds([])}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
            >
              Désélectionner tout
            </button>
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer la sélection ({selectedTenantIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Contrats à importer alert banner */}
      {statusFilter === "Contrats à importer" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5 sm:mt-0">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {sortedTenants.length} locataire{sortedTenants.length > 1 ? "s" : ""} identifié{sortedTenants.length > 1 ? "s" : ""} sans contrat de bail importé
              </p>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Consultez le dossier du locataire pour téléverser le contrat signé et les pièces administratives.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter("Tous statuts")}
            className="text-xs font-semibold px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap shadow-xs shrink-0 self-end sm:self-auto"
          >
            Afficher tous les locataires
          </button>
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
                placeholder="Rechercher par nom, téléphone..." 
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
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>

              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Tous statuts</option>
                <option value="Contrats à importer">Contrats à importer ({tenantsWithDynamicData.filter(t => !t.hasImportedContract && t.accountStatus !== "Inactif").length})</option>
                <option value="Payé">Payé</option>
                <option value="En attente">En attente (Sans bail)</option>
                <option value="Impayé">Impayé</option>
              </select>

              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value)}
              >
                <option value="Ordre d'enregistrement">Trier : Ordre d'enregistrement</option>
                <option value="Plus récents">Trier : Plus récents</option>
                <option value="Nom (A-Z)">Trier : Nom (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                <th className="px-4 py-3.5 md:px-6 md:py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                    checked={sortedTenants.length > 0 && sortedTenants.every((t) => selectedTenantIds.includes(t.id))}
                    onChange={handleToggleSelectAll}
                    title="Tout sélectionner / Tout désélectionner"
                  />
                </th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">N° Enregistrement</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Locataire ({sortedTenants.length})</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Contact</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Logement actuel</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Loyer global</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Mois impayés</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Statut paiement</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {sortedTenants.length > 0 ? sortedTenants.map((tenant) => {
                const isSelected = selectedTenantIds.includes(tenant.id);
                return (
                  <tr key={tenant.id} className={`hover:bg-gray-50/50 transition-colors group ${isSelected ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                        checked={isSelected}
                        onChange={() => handleToggleSelectTenant(tenant.id)}
                      />
                    </td>
                    <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        #{tenant.registrationIndex || 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 font-bold text-sm shrink-0">
                          {tenant.name.split(' ').map((n:string) => n[0]).join('').substring(0,2)}
                        </div>
                        <div>
                          <Link href={`/app/locataires/${tenant.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary hover:underline">
                            {tenant.name}
                          </Link>
                          <p className="text-xs text-gray-500">{tenant.profession || tenant.code || (tenant.id && tenant.id.length > 20 ? `LOC-${tenant.id.slice(0, 6).toUpperCase()}` : tenant.id)}</p>
                          <div className="mt-1">
                            {!tenant.hasImportedContract ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <FileWarning className="w-3 h-3 text-amber-600 shrink-0" /> Contrat à importer
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <FileCheck className="w-3 h-3 text-emerald-600 shrink-0" /> Contrat importé
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600"><Phone className="w-3.5 h-3.5 mr-2 text-gray-400 shrink-0" /> {tenant.phone}</div>
                        {tenant.email && <div className="flex items-center text-sm text-gray-600"><Mail className="w-3.5 h-3.5 mr-2 text-gray-400 shrink-0" /> {tenant.email}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap">
                      {tenant.unit !== "-" ? (
                        <div className="flex flex-col">
                          <Link href={`/app/logements/${tenant.unit}`} className="text-sm font-semibold text-gray-900 hover:text-primary hover:underline flex items-center">
                            <Building2 className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0" /> {formatUnitDisplay(tenant.unit)}
                          </Link>
                          <span className="text-xs text-gray-500 ml-5">{tenant.property}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Aucun</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                      {formatFCFA(tenant.rent)}
                    </td>
                    <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-sm font-bold text-center">
                      <span className={tenant.unpaidMonths > 0 ? "text-red-600" : "text-green-600"}>
                        {tenant.unpaidMonths}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-center">
                      <Badge dot variant={tenant.status === "PAYÉ" ? "success" : tenant.status === "EN ATTENTE" ? "warning" : "danger"}>
                        {tenant.status === "EN ATTENTE" ? "SANS BAIL" : tenant.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {can("locataires", "edit") && (
                          <button
                            onClick={() => handleToggleTenantAccountStatus(tenant)}
                            className={`p-1.5 rounded-lg transition-colors border ${
                              tenant.accountStatus === "Inactif"
                                ? "text-red-500 bg-red-50 hover:bg-emerald-50 hover:text-emerald-600 border-red-200 hover:border-emerald-200"
                                : "text-emerald-600 bg-emerald-50 hover:bg-red-50 hover:text-red-600 border-emerald-200 hover:border-red-200"
                            }`}
                            title={tenant.accountStatus === "Inactif" ? "Activer l'accès Espace Locataire" : "Désactiver l'accès Espace Locataire"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                        {can("locataires", "viewCredentials") && (
                          <button 
                            onClick={() => handleShowCredentials(tenant)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Voir les identifiants Espace Locataire"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                        )}
                        {can("locataires", "edit") && (
                          <button 
                            onClick={() => handleEditTenant(tenant)}
                            className="p-1.5 text-gray-400 hover:text-primary bg-gray-50 hover:bg-primary/10 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {can("locataires", "delete") && (
                          <button 
                            onClick={() => handleDeleteTenant(tenant.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Aucun locataire trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credential View Modal */}
      {isCredModalOpen && selectedCredential && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shrink-0">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Accès Espace Locataire</h3>
                  <p className="text-xs text-gray-500">Identifiants pour {selectedCredential.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCredModalOpen(false)} 
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Identifiant / Login :</label>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-primary select-all">
                  {selectedCredential.login}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Mot de passe :</label>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-emerald-600 select-all">
                  {selectedCredential.password}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => {
                  const textToCopy = `Bonjour ${selectedCredential.name},\nVoici vos accès Espace Locataire GESTIMMO :\nLogin: ${selectedCredential.login}\nMot de passe: ${selectedCredential.password}`;
                  navigator.clipboard.writeText(textToCopy);
                  setCopiedState(true);
                  setTimeout(() => setCopiedState(false), 3000);
                }}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
              >
                {copiedState ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : <Copy className="w-4 h-4 mr-2 text-gray-500" />}
                {copiedState ? "Copié !" : "Copier les accès"}
              </button>
              <button 
                onClick={() => setIsCredModalOpen(false)}
                className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
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

export default function LocatairesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-500">Chargement des locataires...</div>}>
      <LocatairesPageInner />
    </Suspense>
  );
}
