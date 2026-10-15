"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Plus, Search, Building2, Home, X, Save, Pencil, Trash2, CheckSquare } from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { fetchProperties, fetchOwners, createProperty, updateProperty, deleteProperty, loadAllDataFromDatabase } from "@/lib/dataService";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const initialProperties = [
  { id: "B-001", name: "Résidence Les Flamboyants", type: "Immeuble", owner: "Kouadio Invest", units: 24, occupied: 22, revenue: 3500000 },
  { id: "B-002", name: "Villa Palmeraie", type: "Villa", owner: "Mme. Traoré", units: 1, occupied: 1, revenue: 800000 },
  { id: "B-003", name: "Immeuble Horizon", type: "Immeuble", owner: "Biens Propres", units: 40, occupied: 38, revenue: 5200000 },
  { id: "B-004", name: "Complexe Riviera", type: "Résidence fermée", owner: "SCI Zenith", units: 15, occupied: 12, revenue: 2100000 },
];

export default function BiensPage() {
  const { can } = usePermissions();

  const [properties, setProperties] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous types");
  const [ownerFilter, setOwnerFilter] = useState("Tous propriétaires");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  
  // Modal form states
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Immeuble");
  const [newOwner, setNewOwner] = useState("");
  const [newUnits, setNewUnits] = useState("");

  const [logements, setLogements] = useState<any[]>([]);
  const [baux, setBaux] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);

  // Bulk deletion states
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const dbState = await loadAllDataFromDatabase();
      if (dbState) {
        setProperties(dbState.properties);
        setOwners(dbState.owners);
        setLogements(dbState.units);
        setBaux(dbState.leases);
        setPaiements(dbState.payments);
      } else {
        const storedProperties = localStorage.getItem("gestimmo_biens");
        if (storedProperties) setProperties(JSON.parse(storedProperties));
        else setProperties(initialProperties);

        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        if (storedOwners) setOwners(JSON.parse(storedOwners));

        const storedLogements = localStorage.getItem("gestimmo_logements");
        if (storedLogements) setLogements(JSON.parse(storedLogements));

        const storedBaux = localStorage.getItem("gestimmo_baux");
        if (storedBaux) setBaux(JSON.parse(storedBaux));

        const storedPaiements = localStorage.getItem("gestimmo_paiements");
        if (storedPaiements) setPaiements(JSON.parse(storedPaiements));
      }
    };

    loadData();
  }, []);


  if (!can("biens", "view")) {
    return <AccessDeniedCard moduleName="Biens & Logements" />;
  }

  const handleEditProperty = (property: any) => {
    setEditingPropertyId(property.id);
    setNewName(property.name);
    setNewType(property.type);
    setNewOwner(property.owner);
    setNewUnits(property.units?.toString() || "");
    setIsModalOpen(true);
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce bien ?")) {
      await deleteProperty(propertyId);
      const allProperties = properties.filter((p: any) => p.id !== propertyId);
      localStorage.setItem("gestimmo_biens", JSON.stringify(allProperties));
      setProperties(allProperties);
      setSelectedPropertyIds(prev => prev.filter(id => id !== propertyId));
    }
  };

  const toggleSelectProperty = (id: string) => {
    setSelectedPropertyIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (filteredProperties.length === 0) return;
    const allFilteredIds = filteredProperties.map(p => p.id);
    const allSelected = allFilteredIds.every(id => selectedPropertyIds.includes(id));
    if (allSelected) {
      setSelectedPropertyIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedPropertyIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleExecuteBulkDelete = async () => {
    for (const id of selectedPropertyIds) {
      await deleteProperty(id);
    }
    const updatedProperties = properties.filter(p => !selectedPropertyIds.includes(p.id));
    setProperties(updatedProperties);
    localStorage.setItem("gestimmo_biens", JSON.stringify(updatedProperties));
    setSelectedPropertyIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const handleSaveProperty = async () => {
    let updatedProperties;
    let oldPropName: string | null = null;
    const trimmedNewName = newName.trim().toUpperCase();
    const countUnits = parseInt(newUnits) || 1;

    // Find owner_id if available
    const ownerObj = owners.find((o: any) => o.name === newOwner || o.full_name === newOwner);
    const ownerId = ownerObj ? ownerObj.id : null;

    if (editingPropertyId) {
      const existingProp = properties.find((p) => p.id === editingPropertyId);
      if (existingProp) {
        oldPropName = existingProp.name;
      }

      await updateProperty(editingPropertyId, {
        name: trimmedNewName,
        type: newType.toUpperCase(),
        units_count: countUnits,
        owner_id: ownerId,
      });

      updatedProperties = properties.map((p) => {
        if (p.id === editingPropertyId) {
          return {
            ...p,
            name: trimmedNewName,
            type: newType,
            owner: newOwner || "Biens Propres",
            units: countUnits,
          };
        }
        return p;
      });
    } else {
      const dbCreated = await createProperty({
        name: trimmedNewName,
        type: newType.toUpperCase() as any,
        units_count: countUnits,
        owner_id: ownerId,
        city: 'Abidjan',
        address: trimmedNewName,
      });

      const newPropId = dbCreated ? dbCreated.id : `B-${Math.floor(100 + Math.random() * 900)}`;
      const newProperty = {
        id: newPropId,
        name: trimmedNewName,
        type: newType,
        owner: newOwner || "Biens Propres",
        units: countUnits,
        occupied: 0,
        revenue: 0,
      };
      updatedProperties = [newProperty, ...properties];
    }
    
    setProperties(updatedProperties);
    localStorage.setItem("gestimmo_biens", JSON.stringify(updatedProperties));
    
    // Cascade update: If property name was modified, update linked records in localStorage
    if (oldPropName && oldPropName !== trimmedNewName) {
      // 1. Logements
      const storedLogements = localStorage.getItem("gestimmo_logements");
      if (storedLogements) {
        const allLogements = JSON.parse(storedLogements);
        const updatedLogements = allLogements.map((l: any) =>
          l.property === oldPropName ? { ...l, property: trimmedNewName } : l
        );
        localStorage.setItem("gestimmo_logements", JSON.stringify(updatedLogements));
        setLogements(updatedLogements);
      }

      // 2. Baux
      const storedBaux = localStorage.getItem("gestimmo_baux");
      if (storedBaux) {
        const allBaux = JSON.parse(storedBaux);
        const updatedBaux = allBaux.map((b: any) =>
          b.property === oldPropName ? { ...b, property: trimmedNewName } : b
        );
        localStorage.setItem("gestimmo_baux", JSON.stringify(updatedBaux));
        setBaux(updatedBaux);
      }

      // 3. Gerants
      const storedGerants = localStorage.getItem("gestimmo_gerants");
      if (storedGerants) {
        const allGerants = JSON.parse(storedGerants);
        const updatedGerants = allGerants.map((g: any) => ({
          ...g,
          biens: (g.biens || []).map((bName: string) => bName === oldPropName ? trimmedNewName : bName)
        }));
        localStorage.setItem("gestimmo_gerants", JSON.stringify(updatedGerants));
      }
    }

    // Reset and close
    setNewName("");
    setNewType("Immeuble");
    setNewOwner("");
    setNewUnits("");
    setEditingPropertyId(null);
    setIsModalOpen(false);
  };

  const propertiesWithDynamicStats = properties.map(property => {
    // 1. Logements rattachés au bien (par ID ou par nom)
    const propertyLogements = logements.filter(l => 
      (l.propertyId && property.id && l.propertyId === property.id) ||
      (l.property && property.name && l.property.trim().toLowerCase() === property.name.trim().toLowerCase())
    );
    const propertyUnitsIds = propertyLogements.map(l => l.id);
    const propertyUnitsLabels = propertyLogements.map(l => (l.unit || "").toString().trim().toLowerCase()).filter(Boolean);

    // 2. Nombre total de logements / lots
    // Priorité à la capacité configurée du bien (property.units / units_count), ou au nombre de logements créés
    const configuredUnits = Number(property.units || property.units_count || 0);
    const unitsCount = Math.max(configuredUnits, propertyLogements.length, 1);

    // 3. Baux actifs pour ce bien
    const propertyBaux = baux.filter(b => {
      const isStatusActive = (b.status || "").trim().toUpperCase() === "ACTIF";
      if (!isStatusActive) return false;

      const isPropertyMatch = (b.propertyId && property.id && b.propertyId === property.id) ||
        (b.property && property.name && b.property.trim().toLowerCase() === property.name.trim().toLowerCase());

      const isUnitMatch = (b.unitId && propertyUnitsIds.includes(b.unitId)) ||
        (b.unit && (propertyUnitsIds.includes(b.unit) || propertyUnitsLabels.includes(b.unit.toString().trim().toLowerCase())));

      return isPropertyMatch || isUnitMatch;
    });

    // 4. Nombre de logements occupés
    // Comptabiliser les logements avec un bail actif ou marqués explicitement "Occupé"
    const occupiedUnitsCount = propertyLogements.filter(l => {
      const hasActiveLease = propertyBaux.some(b => 
        (b.unitId && b.unitId === l.id) || 
        (b.unit && (b.unit.toString().trim().toLowerCase() === (l.unit || "").toString().trim().toLowerCase() || b.unit === l.id))
      );
      const isMarkedOccupied = (l.status || "").trim().toLowerCase().includes("occup");
      return hasActiveLease || isMarkedOccupied;
    }).length;

    const occupiedCount = Math.min(
      unitsCount,
      Math.max(occupiedUnitsCount, propertyBaux.length, Number(property.occupied) || 0)
    );

    // 5. Revenus locatifs mensuels
    // Somme des loyers mensuels des baux actifs du bien
    const bauxMonthlyRent = propertyBaux.reduce((sum, b) => sum + (Number(b.rent || b.loyer) || 0), 0);
    
    // Repli : loyer des logements occupés créés
    const occupiedLogementsRent = propertyLogements
      .filter(l => (l.status || "").trim().toLowerCase().includes("occup"))
      .reduce((sum, l) => sum + (Number(l.rent) || 0), 0);

    const fallbackRevenue = Number(property.revenue) || 0;

    const revenue = bauxMonthlyRent > 0 
      ? bauxMonthlyRent 
      : (occupiedLogementsRent > 0 ? occupiedLogementsRent : fallbackRevenue);

    return {
      ...property,
      units: unitsCount,
      occupied: occupiedCount,
      revenue: revenue
    };
  });

  const filteredProperties = propertiesWithDynamicStats.filter((property) => {
    const matchSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        property.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchType = true;
    if (typeFilter !== "Tous types") {
      matchType = property.type === typeFilter;
    }

    let matchOwner = true;
    if (ownerFilter !== "Tous propriétaires") {
      matchOwner = property.owner === ownerFilter;
    }

    return matchSearch && matchType && matchOwner;
  });

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 relative">
      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">{editingPropertyId ? "Modifier le bien" : "Ajouter un nouveau bien"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du bien *</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ex: Résidence Les Cocotiers"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de bien *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="Immeuble">Immeuble</option>
                  <option value="Villa">Villa</option>
                  <option value="Résidence fermée">Résidence fermée</option>
                  <option value="Terrain">Terrain</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                >
                  <option value="" disabled>-- Sélectionner un propriétaire --</option>
                  <option value="Biens Propres">Biens Propres (Mon entreprise)</option>
                  {Array.from(new Set(owners.map(o => o.name).filter(Boolean))).map(ownerName => (
                    <option key={ownerName} value={ownerName}>{ownerName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de logements / unités *</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ex: 12"
                  value={newUnits}
                  onChange={(e) => setNewUnits(e.target.value)}
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
                onClick={handleSaveProperty}
                disabled={!newName || !newType || !newOwner || !newUnits}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" /> Créer le bien
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biens immobiliers</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez l'ensemble de vos immeubles, villas et résidences.</p>
        </div>
        {can("biens", "edit") && (
          <button 
            onClick={() => {
              setEditingPropertyId(null);
              setNewName("");
              setNewType("Immeuble");
              setNewOwner("");
              setNewUnits("");
              setIsModalOpen(true);
            }} 
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm w-fit"
          >
            <Plus className="h-4 w-4 mr-2" /> Ajouter un bien
          </button>
        )}
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-app-border shadow-sm flex flex-col items-center text-center justify-center">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-medium text-gray-500 mb-1">Total Biens</h3>
          <p className="text-xl font-bold text-gray-900">{propertiesWithDynamicStats.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-app-border shadow-sm flex flex-col items-center text-center justify-center">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <Home className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-medium text-gray-500 mb-1">Logements</h3>
          <p className="text-xl font-bold text-gray-900">{propertiesWithDynamicStats.reduce((sum, p) => sum + p.units, 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-app-border shadow-sm flex flex-col items-center text-center justify-center">
          <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xs font-medium text-gray-500 mb-1">Occupation</h3>
          <p className="text-xl font-bold text-gray-900">
            {propertiesWithDynamicStats.length > 0 && propertiesWithDynamicStats.reduce((sum, p) => sum + p.units, 0) > 0 ? Math.round((propertiesWithDynamicStats.reduce((sum, p) => sum + p.occupied, 0) / propertiesWithDynamicStats.reduce((sum, p) => sum + p.units, 0)) * 100) : 0}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-app-border shadow-sm flex flex-col items-center text-center justify-center">
          <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xs font-medium text-gray-500 mb-1">Revenus mensuels</h3>
          <p className="text-xl font-bold text-gray-900">{formatFCFA(propertiesWithDynamicStats.reduce((sum, p) => sum + p.revenue, 0))}</p>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedPropertyIds.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span>{selectedPropertyIds.length} bien(s) sélectionné(s)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedPropertyIds([])}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Désélectionner tout
            </button>
            {can("biens", "delete") && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Supprimer la sélection ({selectedPropertyIds.length})
              </button>
            )}
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
                placeholder="Rechercher un bien..." 
                className="pl-9 pr-4 py-2 border border-app-border rounded-lg text-sm w-full sm:w-64 outline-none focus:ring-2 focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option>Tous types</option>
                <option>Immeuble</option>
                <option>Villa</option>
                <option>Résidence fermée</option>
              </select>
              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              >
                <option value="Tous propriétaires">Tous propriétaires</option>
                {Array.from(new Set(owners.map(o => o.name).filter(Boolean))).map(ownerName => (
                  <option key={ownerName} value={ownerName}>{ownerName}</option>
                ))}
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
                    checked={filteredProperties.length > 0 && filteredProperties.every(p => selectedPropertyIds.includes(p.id))}
                    onChange={toggleSelectAll}
                    title="Sélectionner tous les biens"
                  />
                </th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Nom du bien</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Type</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Propriétaire</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Logements</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Occupation</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Revenus</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filteredProperties.length > 0 ? (
                filteredProperties.map((property) => {
                  const occupationRate = property.units > 0 ? Math.round((property.occupied / property.units) * 100) : 0;
                  return (
                    <tr key={property.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-3 py-4 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary cursor-pointer"
                          checked={selectedPropertyIds.includes(property.id)}
                          onChange={() => toggleSelectProperty(property.id)}
                        />
                      </td>
                      <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mr-3 shrink-0">
                            {property.type === "Villa" ? <Home className="h-5 w-5 text-gray-500" /> : <Building2 className="h-5 w-5 text-gray-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{property.name}</p>
                            <p className="text-xs text-gray-500">{property.code || (property.id && property.id.length > 20 ? `BIEN-${property.id.slice(0, 6).toUpperCase()}` : property.id)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                        {property.type}
                      </td>
                      <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {property.owner}
                      </td>
                      <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                        {property.units}
                      </td>
                      <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-medium text-gray-900">{property.occupied}/{property.units}</span>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full rounded-full ${occupationRate >= 90 ? 'bg-green-500' : occupationRate >= 75 ? 'bg-orange-400' : 'bg-red-500'}`} style={{ width: `${occupationRate}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                        {formatFCFA(property.revenue)}
                      </td>
                      <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <Link href={`/app/biens/${property.id}`}>
                            <button className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors px-3 py-1.5 border border-app-border rounded-lg hover:bg-gray-50">
                              Détails
                            </button>
                          </Link>
                          {can("biens", "edit") && (
                            <button 
                              onClick={() => handleEditProperty(property)}
                              className="p-1.5 text-gray-400 hover:text-primary bg-gray-50 hover:bg-primary/10 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {can("biens", "delete") && (
                            <button 
                              onClick={() => handleDeleteProperty(property.id)}
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
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Aucun bien trouvé pour cette recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-red-50/50">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Supprimer {selectedPropertyIds.length} bien(s)</h3>
                  <p className="text-xs text-red-600 font-medium">Action irréversible</p>
                </div>
              </div>
              <button onClick={() => setIsBulkDeleteModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Êtes-vous sûr de vouloir supprimer définitivement les <strong>{selectedPropertyIds.length} bien(s)</strong> sélectionnés ?
              </p>
              <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                {properties.filter(p => selectedPropertyIds.includes(p.id)).map(p => (
                  <div key={p.id} className="text-xs text-gray-700 flex justify-between items-center py-1 border-b border-gray-100 last:border-none">
                    <span className="font-semibold text-gray-900">{p.name}</span>
                    <span className="text-gray-500">{p.type} ({p.owner})</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleExecuteBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Supprimer la sélection ({selectedPropertyIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
