"use client";

import { useState, useEffect, Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Plus, Search, Building2, X, Save, Trash2, Pencil, CheckSquare } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { loadAllDataFromDatabase, createUnit, updateUnit, deleteUnit } from "@/lib/dataService";
import { formatUnitDisplay } from "@/lib/utils";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const initialUnits = [
  { id: "A-101", property: "Résidence Les Flamboyants", type: "3 Pièces", rent: 150000, tenant: "Cora Richards", status: "OCCUPÉ" },
  { id: "A-102", property: "Résidence Les Flamboyants", type: "4 Pièces", rent: 200000, tenant: "Bibi Shelton", status: "OCCUPÉ" },
  { id: "B-201", property: "Résidence Les Flamboyants", type: "3 Pièces", rent: 150000, tenant: "-", status: "NON OCCUPÉ" },
  { id: "B-204", property: "Résidence Les Flamboyants", type: "2 Pièces", rent: 200000, tenant: "Alistair Dunlap", status: "OCCUPÉ" },
  { id: "V-001", property: "Villa Palmeraie", type: "Villa", rent: 800000, tenant: "Jean Dupont", status: "OCCUPÉ" },
];

function LogementsPageInner() {
  const { can } = usePermissions();
  const searchParams = useSearchParams();

  const [units, setUnits] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [baux, setBaux] = useState<any[]>([]);
  const [preavisList, setPreavisList] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous statuts");
  const [ownerFilter, setOwnerFilter] = useState("Tous les propriétaires");
  const [propertyFilter, setPropertyFilter] = useState("Tous les biens");
  const [owners, setOwners] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // Bulk deletion states
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  
  // Modal form states
  const [modalOwner, setModalOwner] = useState("");
  const [newNomenclature, setNewNomenclature] = useState("");
  const [newProperty, setNewProperty] = useState("");
  const [newType, setNewType] = useState("Studio");
  const [newRent, setNewRent] = useState("");

  useEffect(() => {
    const initData = async () => {
      const dbState = await loadAllDataFromDatabase();
      if (dbState) {
        setUnits(dbState.units);
        setBiens(dbState.properties);
        setOwners(dbState.owners);
        setBaux(dbState.leases);
        setPreavisList(dbState.leaseNotices || []);
      } else {
        const storedBiens = localStorage.getItem("gestimmo_biens");
        setBiens(storedBiens ? JSON.parse(storedBiens) : []);
        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        setOwners(storedOwners ? JSON.parse(storedOwners) : []);
        const storedBaux = localStorage.getItem("gestimmo_baux");
        setBaux(storedBaux ? JSON.parse(storedBaux) : []);
        const storedPreavis = localStorage.getItem("gestimmo_preavis");
        setPreavisList(storedPreavis ? JSON.parse(storedPreavis) : []);
        const storedUnits = localStorage.getItem("gestimmo_logements");
        setUnits(storedUnits ? JSON.parse(storedUnits) : initialUnits);
      }
    };

    initData();

    window.addEventListener("storage", initData);
    window.addEventListener("gestimmo_logements_updated", initData);
    window.addEventListener("gestimmo_preavis_updated", initData);
    return () => {
      window.removeEventListener("storage", initData);
      window.removeEventListener("gestimmo_logements_updated", initData);
      window.removeEventListener("gestimmo_preavis_updated", initData);
    };
  }, []);

  // Listen to URL status filter (Occupés, Non occupés, En préavis)
  useEffect(() => {
    const rawStatus = searchParams.get("status") || searchParams.get("statut");
    if (rawStatus) {
      const lower = rawStatus.toLowerCase().trim();
      if (lower.includes("occup") && !lower.includes("non")) {
        setStatusFilter("Occupés");
      } else if (lower.includes("non") || lower.includes("vacant")) {
        setStatusFilter("Non occupés");
      } else if (lower.includes("preavis") || lower.includes("préavis")) {
        setStatusFilter("En préavis");
      }
    }
  }, [searchParams]);


  const handleDeleteLogement = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer ce logement ? Attention, cette action est irréversible.")) {
      await deleteUnit(id);
      const updatedUnits = units.filter(u => u.id !== id);
      setUnits(updatedUnits);
      localStorage.setItem("gestimmo_logements", JSON.stringify(updatedUnits));
      setSelectedUnitIds(prev => prev.filter(item => item !== id));
    }
  };

  const toggleSelectUnit = (id: string) => {
    setSelectedUnitIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (filteredUnits.length === 0) return;
    const allFilteredIds = filteredUnits.map(u => u.id);
    const allSelected = allFilteredIds.every(id => selectedUnitIds.includes(id));
    if (allSelected) {
      setSelectedUnitIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedUnitIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleExecuteBulkDelete = async () => {
    for (const id of selectedUnitIds) {
      await deleteUnit(id);
    }
    const updatedUnits = units.filter(u => !selectedUnitIds.includes(u.id));
    setUnits(updatedUnits);
    localStorage.setItem("gestimmo_logements", JSON.stringify(updatedUnits));
    setSelectedUnitIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const handleEditLogement = (unit: any) => {
    setEditingUnitId(unit.id);
    const bienObj = biens.find(b => b.name === unit.property || b.id === unit.propertyId);
    setModalOwner(bienObj ? bienObj.owner : "");
    setNewProperty(unit.property);
    setNewNomenclature(unit.unit || unit.id);
    setNewType(unit.type);
    setNewRent(unit.rent.toString());
    setIsModalOpen(true);
  };

  const handleSaveLogement = async () => {
    if (!canSubmit) return;

    const oldUnit = units.find(u => u.id === editingUnitId);
    const oldNomenclature = oldUnit ? (oldUnit.unit || oldUnit.id || "") : "";
    const cleanNomenclature = (newNomenclature.trim() || editingUnitId || "").toUpperCase();

    const upperProp = newProperty.trim();
    const upperType = newType.trim();
    const bienObj = biens.find(b => (b.name || "").trim().toUpperCase() === upperProp.toUpperCase());
    const propertyId = bienObj ? bienObj.id : (oldUnit?.propertyId || null);
    const propertyName = bienObj ? bienObj.name : upperProp;
    const ownerName = modalOwner || (bienObj ? bienObj.owner : (oldUnit?.owner || "-"));
    const ownerId = bienObj ? bienObj.ownerId : (oldUnit?.ownerId || "");
    const rentAmount = parseInt(newRent) || 0;

    let dbType: 'APPARTEMENT' | 'STUDIO' | 'VILLA' | 'MAGASIN' | 'BUREAU' = 'APPARTEMENT';
    const tUpper = upperType.toUpperCase();
    if (tUpper.includes('STUDIO')) dbType = 'STUDIO';
    else if (tUpper.includes('VILLA')) dbType = 'VILLA';
    else if (tUpper.includes('MAGASIN') || tUpper.includes('LOCAL') || tUpper.includes('BOUTIQUE')) dbType = 'MAGASIN';
    else if (tUpper.includes('BUREAU')) dbType = 'BUREAU';
    else dbType = 'APPARTEMENT';

    const existingRawDesc = (oldUnit?.description || "").replace(/^\[TYPE:\s*[^\]]+\]\s*/, '').trim();
    const encodedDesc = existingRawDesc ? `[TYPE:${upperType}] ${existingRawDesc}` : `[TYPE:${upperType}]`;

    let updatedUnits;
    if (editingUnitId) {
      try {
        await updateUnit(editingUnitId, {
          unit_number: cleanNomenclature,
          property_id: propertyId,
          type: dbType,
          rent_amount: rentAmount,
          description: encodedDesc,
        });
      } catch (err) {
        console.error("Error updating unit in Supabase:", err);
      }

      updatedUnits = units.map(u => {
        if (u.id === editingUnitId) {
          return {
            ...u,
            unit: cleanNomenclature,
            unit_number: cleanNomenclature,
            property: propertyName,
            propertyId: propertyId || u.propertyId,
            owner: ownerName,
            ownerId: ownerId,
            type: upperType,
            rent: rentAmount,
            description: existingRawDesc,
          };
        }
        return u;
      });

      // Synchroniser également les baux rattachés à ce logement
      const storedBaux = localStorage.getItem("gestimmo_baux");
      if (storedBaux) {
        try {
          const bauxList = JSON.parse(storedBaux);
          const updatedBaux = bauxList.map((b: any) => {
            const isMatch = (b.unit && oldNomenclature && b.unit.trim().toUpperCase() === oldNomenclature.trim().toUpperCase()) ||
                            (b.unit && editingUnitId && b.unit.trim().toUpperCase() === editingUnitId.trim().toUpperCase()) ||
                            (b.unitId && b.unitId === editingUnitId);
            if (isMatch) {
              return {
                ...b,
                unit: cleanNomenclature,
                property: propertyName,
                rent: rentAmount
              };
            }
            return b;
          });
          setBaux(updatedBaux);
          localStorage.setItem("gestimmo_baux", JSON.stringify(updatedBaux));
        } catch (e) {
          console.error(e);
        }
      }

      // Synchroniser les locataires rattachés
      const storedLoc = localStorage.getItem("gestimmo_locataires");
      if (storedLoc) {
        try {
          const locList = JSON.parse(storedLoc);
          const updatedLoc = locList.map((t: any) => {
            const isMatch = (t.unit && oldNomenclature && t.unit.trim().toUpperCase() === oldNomenclature.trim().toUpperCase()) ||
                            (t.unit && editingUnitId && t.unit.trim().toUpperCase() === editingUnitId.trim().toUpperCase()) ||
                            (t.unitId && t.unitId === editingUnitId);
            if (isMatch) {
              return {
                ...t,
                unit: cleanNomenclature,
                property: propertyName,
                rent: rentAmount
              };
            }
            return t;
          });
          localStorage.setItem("gestimmo_locataires", JSON.stringify(updatedLoc));
        } catch (e) {
          console.error(e);
        }
      }

      // Synchroniser les paiements rattachés
      const storedPay = localStorage.getItem("gestimmo_paiements");
      if (storedPay) {
        try {
          const payList = JSON.parse(storedPay);
          const updatedPay = payList.map((p: any) => {
            const isMatch = (p.unit && oldNomenclature && p.unit.trim().toUpperCase() === oldNomenclature.trim().toUpperCase()) ||
                            (p.unit && editingUnitId && p.unit.trim().toUpperCase() === editingUnitId.trim().toUpperCase()) ||
                            (p.unitId && p.unitId === editingUnitId);
            if (isMatch) {
              return {
                ...p,
                unit: cleanNomenclature,
                property: propertyName
              };
            }
            return p;
          });
          localStorage.setItem("gestimmo_paiements", JSON.stringify(updatedPay));
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      const createdUnitsArr: any[] = [];
      const encodedDescription = `[TYPE:${upperType}]`;
      for (const nom of nomenclatureList) {
        const created = await createUnit({
          unit_number: nom.toUpperCase(),
          property_id: propertyId,
          type: dbType,
          rent_amount: parseInt(newRent) || 0,
          description: encodedDescription,
          status: 'VACANT',
        });
        if (created) {
          createdUnitsArr.push({
            id: created.id,
            unit: created.unit_number,
            property: bienObj ? bienObj.name : upperProp,
            propertyId: bienObj ? bienObj.id : "",
            owner: bienObj ? bienObj.owner : "-",
            type: upperType,
            rent: parseInt(newRent) || 0,
            charges: 0,
            tenant: "-",
            status: "Vacant",
            description: "",
          });
        } else {
          createdUnitsArr.push({
            id: nom.toUpperCase(),
            unit: nom.toUpperCase(),
            property: bienObj ? bienObj.name : upperProp,
            propertyId: bienObj ? bienObj.id : undefined,
            type: upperType,
            rent: parseInt(newRent) || 0,
            tenant: "-",
            status: "Vacant",
            description: "",
          });
        }
      }
      updatedUnits = [...createdUnitsArr, ...units];
    }

    setUnits(updatedUnits);
    localStorage.setItem("gestimmo_logements", JSON.stringify(updatedUnits));
    
    // Recharger depuis la base Supabase pour garantir l'intégrité de la persistance
    try {
      const freshDb = await loadAllDataFromDatabase();
      if (freshDb && freshDb.units) {
        setUnits(freshDb.units);
        if (freshDb.properties) setBiens(freshDb.properties);
        if (freshDb.leases) setBaux(freshDb.leases);
      }
    } catch (e) {
      console.error(e);
    }

    // Déclencher les évènements de stockage et de notification
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("gestimmo_logements_updated"));

    // Reset and close
    setEditingUnitId(null);
    setModalOwner("");
    setNewNomenclature("");
    setNewProperty("");
    setNewType("Studio");
    setNewRent("");
    setIsModalOpen(false);
  };

  const selectedBienObj = biens.find(b => b.name === newProperty);
  const existingCount = units.filter(u => u.property === newProperty && u.id !== editingUnitId).length;
  const remainingSlots = selectedBienObj ? Math.max(0, selectedBienObj.units - existingCount) : Infinity;

  // Parse nomenclatures: split by comma, trim, filter empty
  const nomenclatureList = newNomenclature
    .split(",")
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);
  const toAddCount = nomenclatureList.length;
  const isLimitReached = selectedBienObj && !editingUnitId ? toAddCount > remainingSlots : false;
  const isLimitExact = selectedBienObj && !editingUnitId ? existingCount >= selectedBienObj.units : false;
  const canSubmit = editingUnitId 
    ? newNomenclature.trim() !== "" && newProperty !== "" && newRent !== ""
    : newNomenclature.trim() !== "" && newProperty !== "" && newRent !== "" && !isLimitReached && !isLimitExact;

  const unitsWithDynamicStatus = units.map(unit => {
    const unitNomenclature = (unit.unit || unit.id || "").toString();

    // Check if unit is in preavis
    const hasActiveNotice = preavisList.some((p: any) => 
      (p.status === "EN PRÉAVIS" || p.status === "En préavis") && (
        (p.unit && p.unit.trim().toUpperCase() === unitNomenclature.trim().toUpperCase()) ||
        (p.unitId && p.unitId === unit.id) ||
        (p.unit && unit.id && p.unit.trim().toUpperCase() === unit.id.trim().toUpperCase())
      )
    );

    // Check if there is an active lease for this unit AND specific property
    const activeLease = baux.find(b => 
      b.unit && (
        b.unit.trim().toUpperCase() === unitNomenclature.trim().toUpperCase() ||
        b.unit.trim().toUpperCase() === (unit.id || "").trim().toUpperCase()
      ) &&
      (b.status === "ACTIF" || b.status === "Actif" || b.status === "actif" || b.status === "EN PRÉAVIS") &&
      ((!b.property || !unit.property) || b.property.trim().toUpperCase() === unit.property.trim().toUpperCase())
    );

    const isPreavis = hasActiveNotice || activeLease?.status === "EN PRÉAVIS" || unit.status === "EN PRÉAVIS";

    if (isPreavis) {
      return { 
        ...unit, 
        status: "EN PRÉAVIS", 
        tenant: activeLease?.tenant || unit.tenant || "-" 
      };
    }

    if (activeLease) {
      return { ...unit, status: "OCCUPÉ", tenant: activeLease.tenant };
    }
    return { ...unit, status: "NON OCCUPÉ", tenant: "-" };
  });

  const filteredUnits = unitsWithDynamicStatus.filter((unit) => {
    const term = searchTerm.toLowerCase();
    const unitNomenclature = (unit.unit || unit.id || "").toString();
    const matchSearch = unitNomenclature.toLowerCase().includes(term) || 
                        unit.id.toLowerCase().includes(term) || 
                        unit.property.toLowerCase().includes(term) ||
                        unit.tenant.toLowerCase().includes(term);
    
    let matchStatus = true;
    if (statusFilter === "Occupés") {
      matchStatus = unit.status === "OCCUPÉ";
    } else if (statusFilter === "Non occupés") {
      matchStatus = unit.status === "NON OCCUPÉ" || unit.status === "VACANT" || unit.status === "Vacant";
    } else if (statusFilter === "En préavis") {
      matchStatus = unit.status === "EN PRÉAVIS";
    }

    let matchOwner = true;
    if (ownerFilter !== "Tous les propriétaires") {
       const bienObj = biens.find(b => 
         (b.name && unit.property && b.name.trim().toUpperCase() === unit.property.trim().toUpperCase()) ||
         (b.id && unit.propertyId && b.id === unit.propertyId)
       );
       if (bienObj) {
         matchOwner = (bienObj.owner || "").trim().toUpperCase() === ownerFilter.trim().toUpperCase();
       } else {
         matchOwner = false;
       }
    }

    let matchProperty = true;
    if (propertyFilter !== "Tous les biens") {
       matchProperty = (unit.property && unit.property.trim().toUpperCase() === propertyFilter.trim().toUpperCase()) ||
                       (unit.propertyId && biens.find(b => b.name === propertyFilter)?.id === unit.propertyId);
    }

    return matchSearch && matchStatus && matchOwner && matchProperty;
  });

  const filteredBiens = ownerFilter === "Tous les propriétaires" 
    ? biens 
    : biens.filter(b => b.owner === ownerFilter);

  const allModalOwners = Array.from(new Set([
    ...owners.map(o => o.name),
    ...biens.map(b => b.owner).filter(Boolean)
  ]));

  const modalFilteredBiens = modalOwner
    ? biens.filter(b => b.owner === modalOwner)
    : [];

  if (!can("biens", "view")) {
    return <AccessDeniedCard moduleName="Appartements & Logements" />;
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 relative">
      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">{editingUnitId ? "Modifier le logement" : "Ajouter un nouveau logement"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">

              {/* Propriétaire en premier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={modalOwner}
                  onChange={(e) => {
                    setModalOwner(e.target.value);
                    setNewProperty("");
                    if (!editingUnitId) setNewNomenclature("");
                  }}
                >
                  <option value="">-- Sélectionner le propriétaire --</option>
                  {allModalOwners.map(ownerName => (
                    <option key={ownerName} value={ownerName}>{ownerName}</option>
                  ))}
                </select>
              </div>

              {/* Bien immobilier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bien immobilier *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-400"
                  value={newProperty}
                  disabled={!modalOwner}
                  onChange={(e) => {
                    setNewProperty(e.target.value);
                    if (!editingUnitId) setNewNomenclature("");
                  }}
                >
                  <option value="" disabled>
                    {!modalOwner ? "-- Sélectionner d'abord un propriétaire --" : "-- Sélectionner le bien rattaché --"}
                  </option>
                  {modalFilteredBiens.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                  {modalOwner && modalFilteredBiens.length === 0 && (
                    <option value="" disabled>Aucun bien pour ce propriétaire</option>
                  )}
                </select>
                {selectedBienObj && (
                  <p className={`text-xs font-medium mt-1 ${
                    isLimitExact ? 'text-red-500' : remainingSlots <= 3 ? 'text-orange-500' : 'text-green-600'
                  }`}>
                    {isLimitExact
                      ? `Capacité maximale atteinte (${selectedBienObj.units} logements)`
                      : `${remainingSlots} place(s) disponible(s) sur ${selectedBienObj.units}`
                    }
                  </p>
                )}
              </div>

              {/* Nomenclature avec support multi-valeurs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomenclature *
                  <span className="ml-1 text-xs font-normal text-gray-400">(plusieurs ? séparez par des virgules)</span>
                </label>
                <input 
                  type="text" 
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                    isLimitReached
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-app-border focus:ring-primary/20'
                  }`}
                  placeholder={selectedBienObj && !isLimitExact
                    ? remainingSlots === 1 ? "Ex: A-101" : "Ex: A-101, A-102, B-201"
                    : "Sélectionnez d'abord un bien"}
                  value={newNomenclature}
                  disabled={!newProperty || (isLimitExact && !editingUnitId)}
                  onChange={(e) => setNewNomenclature(e.target.value)}
                />
                {/* Feedback dynamique */}
                {newNomenclature.trim() !== "" && selectedBienObj && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    {isLimitReached ? (
                      <p className="text-xs text-red-500 font-medium">
                        ⚠️ Vous tentez d&apos;ajouter {toAddCount} logement(s) mais seulement {remainingSlots} place(s) disponible(s).
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 font-medium">
                        {editingUnitId ? `✓ Nomenclature : ${newNomenclature.trim()}` : `✓ ${toAddCount} logement(s) à créer : ${nomenclatureList.join(" • ")}`}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de logement *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="Studio">Studio</option>
                  <option value="Appartement">Appartement</option>
                  <option value="2 Pièces">2 Pièces</option>
                  <option value="3 Pièces">3 Pièces</option>
                  <option value="4 Pièces">4 Pièces</option>
                  <option value="Villa">Villa</option>
                  <option value="Bureau">Bureau</option>
                  <option value="Boutique">Boutique</option>
                  <option value="Magasin">Magasin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loyer de base (F CFA) *</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ex: 150000"
                  value={newRent}
                  onChange={(e) => setNewRent(e.target.value)}
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
                onClick={handleSaveLogement}
                disabled={!canSubmit}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingUnitId ? "Enregistrer les modifications" : toAddCount > 1 ? `Créer ${toAddCount} logements` : "Créer le logement"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <h3 className="text-lg font-bold text-gray-900">Supprimer {selectedUnitIds.length} logement(s)</h3>
                  <p className="text-xs text-red-600 font-medium">Action irréversible</p>
                </div>
              </div>
              <button onClick={() => setIsBulkDeleteModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Êtes-vous sûr de vouloir supprimer définitivement les <strong>{selectedUnitIds.length} logement(s)</strong> sélectionnés ?
              </p>
              <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                {units.filter(u => selectedUnitIds.includes(u.id)).map((u, idx) => (
                  <div key={u.id} className="text-xs text-gray-700 flex justify-between items-center py-1 border-b border-gray-100 last:border-none">
                    <span className="font-semibold text-gray-900">{formatUnitDisplay(u.unit || u.id, idx + 1)}</span>
                    <span className="text-gray-500">{u.property} ({u.type})</span>
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
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Confirmer la suppression ({selectedUnitIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logements</h1>
          <p className="text-sm text-gray-500 mt-1">Liste complète des appartements, bureaux et villas.</p>
        </div>
        {can("biens", "edit") && (
          <button 
            onClick={() => {
              setModalOwner("");
              setNewProperty("");
              setNewNomenclature("");
              setNewType("Studio");
              setNewRent("");
              setIsModalOpen(true);
            }} 
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm w-fit"
          >
            <Plus className="h-4 w-4 mr-2" /> Ajouter un logement
          </button>
        )}
      </div>

      {/* Bulk Selection Bar */}
      {selectedUnitIds.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span>{selectedUnitIds.length} logement(s) sélectionné(s)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedUnitIds([])}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Désélectionner tout
            </button>
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> Supprimer la sélection ({selectedUnitIds.length})
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
                placeholder="Rechercher (nomenclature, bien, locataire)..." 
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
                  setPropertyFilter("Tous les biens"); // Reset property filter
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
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="Tous statuts">Tous statuts</option>
                <option value="Occupés">Occupés</option>
                <option value="Non occupés">Vacants / Non occupés</option>
                <option value="En préavis">En préavis</option>
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
                    checked={filteredUnits.length > 0 && selectedUnitIds.length === filteredUnits.length}
                    onChange={toggleSelectAll}
                    title="Sélectionner tous les logements"
                  />
                </th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Nomenclature</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Bien</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Type</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Loyer de base</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Statut</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Locataire</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filteredUnits.length > 0 ? (
                filteredUnits.map((unit, idx) => (
                  <tr key={unit.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary cursor-pointer"
                        checked={selectedUnitIds.includes(unit.id)}
                        onChange={() => toggleSelectUnit(unit.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">{formatUnitDisplay(unit.unit || unit.id, idx + 1)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{unit.property}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                      {unit.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                      {formatFCFA(unit.rent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge 
                        dot 
                        variant={unit.status === "OCCUPÉ" ? "success" : unit.status === "EN PRÉAVIS" ? "warning" : "default"} 
                        className={unit.status === "NON OCCUPÉ" ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border-none" : ""}
                      >
                        {unit.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {unit.tenant !== "-" ? (
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2 text-[10px] font-semibold text-gray-600">
                            {unit.tenant.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span className="font-medium text-gray-900">{unit.tenant}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Aucun</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      {unit.status === "NON OCCUPÉ" && can("baux", "edit") && (
                        <Link href={`/app/baux?unit=${unit.id}`}>
                          <button className="text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors">
                            Créer un bail
                          </button>
                        </Link>
                      )}
                      <Link href={`/app/logements/${unit.id}`}>
                        <button className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors px-3 py-1.5 border border-app-border rounded-lg hover:bg-gray-50">
                          Détails
                        </button>
                      </Link>
                      {can("biens", "edit") && (
                        <button 
                          onClick={() => handleEditLogement(unit)}
                          className="text-xs font-medium text-gray-400 hover:text-primary transition-colors p-1.5 border border-app-border rounded-lg hover:bg-primary/10"
                          title="Modifier ce logement"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {can("biens", "delete") && (
                        <button 
                          onClick={() => handleDeleteLogement(unit.id)}
                          className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors p-1.5 border border-red-200 rounded-lg hover:bg-red-50"
                          title="Supprimer ce logement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Aucun logement trouvé pour cette recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function LogementsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Chargement des logements...</div>}>
      <LogementsPageInner />
    </Suspense>
  );
}
