"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Building2, MapPin, Pencil, Trash2, Search, Plus, Home, X, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatUnitDisplay } from "@/lib/utils";
import { loadAllDataFromDatabase, updateProperty, deleteProperty } from "@/lib/dataService";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const defaultProperties = [
  { id: "B-001", name: "Résidence Les Flamboyants", type: "Immeuble", address: "Rue des Jardins, Cocody, Abidjan", owner: "Kouadio Invest", unitsCount: 24, occupiedCount: 22, revenue: 3500000, unpaid: 150000, description: "Immeuble R+4 de haut standing comprenant 24 appartements (3 et 4 pièces) avec parking souterrain et sécurité 24/7.", commission: 10 },
  { id: "B-002", name: "Villa Palmeraie", type: "Villa", address: "Palmeraie, Cocody", owner: "Jean Dupont", unitsCount: 1, occupiedCount: 1, revenue: 850000, unpaid: 0, description: "Villa duplex 6 pièces avec piscine.", commission: 8 },
];

const defaultUnits = [
  { id: "A-101", type: "3 Pièces", floor: "RDC", tenant: "Cora Richards", rent: 150000, status: "OCCUPÉ" },
  { id: "A-102", type: "4 Pièces", floor: "RDC", tenant: "Bibi Shelton", rent: 200000, status: "OCCUPÉ" },
  { id: "B-201", type: "3 Pièces", floor: "1er", tenant: "-", rent: 150000, status: "NON OCCUPÉ" },
  { id: "B-202", type: "4 Pièces", floor: "1er", tenant: "Alistair Dunlap", rent: 200000, status: "OCCUPÉ" },
];

export default function PropertyDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [property, setProperty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [logements, setLogements] = useState<any[]>([]);
  const [baux, setBaux] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [locataires, setLocataires] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("Immeuble");
  const [editAddress, setEditAddress] = useState("");
  const [editCommission, setEditCommission] = useState(10);
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openEditModal = () => {
    if (!property) return;
    setEditName(property.name || "");
    setEditType(property.type || "Immeuble");
    setEditAddress(property.address || "");
    setEditCommission(property.commission !== undefined && property.commission !== null ? property.commission : 10);
    setEditDescription(property.description || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!property || !editName.trim()) return;
    setIsSaving(true);
    try {
      const updatedFields = {
        name: editName.trim(),
        type: editType,
        address: editAddress.trim(),
        commission: Number(editCommission) || 10,
        description: editDescription.trim(),
      };
      await updateProperty(property.id, updatedFields);

      const updatedProp = { ...property, ...updatedFields };
      setProperty(updatedProp);

      const stored = localStorage.getItem("gestimmo_biens");
      if (stored) {
        const list = JSON.parse(stored);
        const idx = list.findIndex((p: any) => p.id === property.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...updatedFields };
          localStorage.setItem("gestimmo_biens", JSON.stringify(list));
        }
      }
      setIsEditModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!property) return;
    setIsDeleting(true);
    try {
      await deleteProperty(property.id);
      const stored = localStorage.getItem("gestimmo_biens");
      if (stored) {
        const list = JSON.parse(stored).filter((p: any) => p.id !== property.id);
        localStorage.setItem("gestimmo_biens", JSON.stringify(list));
      }
      router.push("/app/biens");
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const dbState = await loadAllDataFromDatabase();
      if (dbState) {
        const found = dbState.properties.find((p: any) => p.id === params.id || p.name === params.id);
        setProperty(found);
        setLogements(dbState.units);
        setBaux(dbState.leases);
        setPaiements(dbState.payments);
        setLocataires(dbState.tenants);
        setOwners(dbState.owners || []);
      } else {
        const stored = localStorage.getItem("gestimmo_biens");
        const all = stored ? JSON.parse(stored) : defaultProperties;
        const found = all.find((p: any) => p.id === params.id || p.name === params.id);
        setProperty(found);

        const storedLogements = localStorage.getItem("gestimmo_logements");
        if (storedLogements) setLogements(JSON.parse(storedLogements));

        const storedBaux = localStorage.getItem("gestimmo_baux");
        if (storedBaux) setBaux(JSON.parse(storedBaux));

        const storedPaiements = localStorage.getItem("gestimmo_paiements");
        if (storedPaiements) setPaiements(JSON.parse(storedPaiements));
        
        const storedLocataires = localStorage.getItem("gestimmo_locataires");
        if (storedLocataires) setLocataires(JSON.parse(storedLocataires));

        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        if (storedOwners) setOwners(JSON.parse(storedOwners));
      }
    };

    loadData();

    window.addEventListener("storage", loadData);
    window.addEventListener("gestimmo_logements_updated", loadData);
    return () => {
      window.removeEventListener("storage", loadData);
      window.removeEventListener("gestimmo_logements_updated", loadData);
    };
  }, [params.id]);

  if (!property) return <div className="p-8 text-center text-gray-500">Bien introuvable ou en cours de chargement...</div>;

  const propertyLogements = logements.filter(l => (
    (l.property && property.name && l.property.trim().toUpperCase() === property.name.trim().toUpperCase()) ||
    (l.propertyId && property.id && l.propertyId === property.id)
  ));

  // Compute dynamic status & tenant from active leases, locataires, or paiements scoped strictly by property
  const propertyLogementsWithDynamicStatus = propertyLogements.map(unit => {
    const isPropertyMatch = (record: any) => {
      if (!record) return false;
      if (record.propertyId && property.id) return record.propertyId === property.id;
      if (record.property && property.name) return record.property.trim().toUpperCase() === property.name.trim().toUpperCase();
      return false;
    };

    const unitNomenclature = (unit.unit || unit.id || "").toString();
    const activeLease = baux.find((b: any) => {
      const isStatusActive = (b.status || "").trim().toUpperCase() === "ACTIF";
      if (!isStatusActive) return false;
      const isUnitMatch = (b.unitId && unit.id && b.unitId === unit.id) ||
        (b.unit && (b.unit.trim().toUpperCase() === unitNomenclature.trim().toUpperCase() || b.unit.trim().toUpperCase() === (unit.id || "").trim().toUpperCase()));
      return isUnitMatch && isPropertyMatch(b);
    });

    const activeLocataire = locataires.find((t: any) => 
      t.unit && 
      (t.unit.trim().toUpperCase() === unitNomenclature.trim().toUpperCase() || t.unit.trim().toUpperCase() === (unit.id || "").trim().toUpperCase()) &&
      isPropertyMatch(t)
    );

    if (activeLease || activeLocataire) {
      const matchedTenant = activeLease?.tenant || activeLocataire?.name || unit.tenant;
      return { ...unit, status: "OCCUPÉ", tenant: matchedTenant && matchedTenant !== "-" ? matchedTenant : "Locataire Actuel" };
    }
    return { ...unit, status: "NON OCCUPÉ", tenant: "-" };
  });

  const configuredUnits = Number(property.units || property.unitsCount || property.units_count || 0);
  const unitsCount = Math.max(configuredUnits, propertyLogementsWithDynamicStatus.length, 1);
  const occupiedCount = Math.min(unitsCount, propertyLogementsWithDynamicStatus.filter(l => l.status === "OCCUPÉ").length);
  const occupationRate = unitsCount > 0 ? Math.round((occupiedCount / unitsCount) * 100) : 0;
  
  const propertyUnitsIds = propertyLogementsWithDynamicStatus.map(l => l.id);
  const propertyUnitsLabels = propertyLogementsWithDynamicStatus.map(l => (l.unit || "").toString().trim().toLowerCase()).filter(Boolean);

  const propertyBaux = baux.filter((b: any) => {
    const isStatusActive = (b.status || "").trim().toUpperCase() === "ACTIF";
    if (!isStatusActive) return false;
    const isPropMatch = (b.propertyId && property.id && b.propertyId === property.id) ||
      (b.property && property.name && b.property.trim().toLowerCase() === property.name.trim().toLowerCase());
    const isUnitMatch = (b.unitId && propertyUnitsIds.includes(b.unitId)) ||
      (b.unit && (propertyUnitsIds.includes(b.unit) || propertyUnitsLabels.includes(b.unit.toString().trim().toLowerCase())));
    return isPropMatch || isUnitMatch;
  });

  const bauxMonthlyRent = propertyBaux.reduce((sum: number, b: any) => sum + (Number(b.rent || b.loyer) || 0), 0);
  const occupiedLogementsRent = propertyLogementsWithDynamicStatus
    .filter(l => l.status === "OCCUPÉ")
    .reduce((sum: number, l: any) => sum + (Number(l.rent) || 0), 0);
  const fallbackRevenue = Number(property.revenue) || 0;

  const revenue = bauxMonthlyRent > 0 ? bauxMonthlyRent : (occupiedLogementsRent > 0 ? occupiedLogementsRent : fallbackRevenue);
  
  // Calculate unpaid by looking at tenants who have an active lease in this property
  const activeLeases = baux.filter(b => b.property === property.name && b.status === "ACTIF");
  let unpaid = 0;
  if (activeLeases.length > 0 && locataires.length > 0) {
    activeLeases.forEach(lease => {
      const tenant = locataires.find(t => t.name === lease.tenant);
      if (tenant && tenant.debt && tenant.debt > 0) {
        unpaid += tenant.debt;
      } else if (tenant && tenant.status === "IMPAYÉ") {
        unpaid += lease.rent * 2; // Approximation from initial data logic
      } else if (tenant && tenant.status === "EN RETARD") {
        unpaid += lease.rent;
      }
    });
  }
  if (unpaid === 0) unpaid = property.unpaid || 0;

  const unitsToDisplay = property.id === "B-001" && propertyLogementsWithDynamicStatus.length === 0 ? defaultUnits : propertyLogementsWithDynamicStatus;

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/app/biens">
            <button type="button" className="p-2 bg-white border border-app-border rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
              <Badge variant="default" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">{property.type}</Badge>
            </div>
            <div className="flex items-center text-sm text-gray-500 gap-4">
              <span className="flex items-center"><Building2 className="w-4 h-4 mr-1.5" /> ID: {property.id}</span>
              <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> {property.address || "-"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openEditModal} className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm cursor-pointer">
            <Pencil className="h-4 w-4 mr-2" /> Modifier
          </button>
          <button type="button" onClick={() => setIsDeleteModalOpen(true)} className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center shadow-sm cursor-pointer">
            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-app-border overflow-x-auto scrollbar-none">
        <button 
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === "overview" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Vue d'ensemble
        </button>
        <button 
          onClick={() => setActiveTab("logements")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === "logements" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Logements ({unitsCount})
        </button>
        <button 
          onClick={() => setActiveTab("finances")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === "finances" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Finances & Relevés
        </button>
        <button 
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === "documents" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Documents
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-app-border shadow-sm flex flex-col">
              <h3 className="text-xs font-medium text-gray-500 mb-1">Occupation</h3>
              <p className="text-xl font-bold text-gray-900 mb-2">{occupationRate}%</p>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${occupationRate >= 90 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${occupationRate}%` }}></div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-app-border shadow-sm flex flex-col">
              <h3 className="text-xs font-medium text-gray-500 mb-1">Logements</h3>
              <p className="text-xl font-bold text-gray-900">{occupiedCount} <span className="text-sm font-normal text-gray-400">/ {unitsCount}</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-app-border shadow-sm flex flex-col">
              <h3 className="text-xs font-medium text-gray-500 mb-1">Revenus attendus</h3>
              <p className="text-xl font-bold text-gray-900">{formatFCFA(revenue)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-app-border shadow-sm flex flex-col">
              <h3 className="text-xs font-medium text-gray-500 mb-1">Impayés actuels</h3>
              <p className="text-xl font-bold text-red-600">{formatFCFA(unpaid)}</p>
            </div>
          </div>

          {/* Logements Preview Table */}
          <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Aperçu des logements</h2>
              <button 
                type="button" 
                onClick={() => setActiveTab("logements")} 
                className="text-sm font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                Voir tout
              </button>
            </div>
            <div className="overflow-x-auto w-full flex-1">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                    <th className="px-6 py-3 font-medium">Appartement</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium text-center">Loyer</th>
                    <th className="px-6 py-3 font-medium text-center">Statut</th>
                    <th className="px-6 py-3 font-medium">Locataire</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {unitsToDisplay.map((unit: any, idx: number) => (
                    <tr key={unit.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <Link href={`/app/logements/${unit.id}`} className="text-sm font-semibold text-primary hover:underline">
                          {formatUnitDisplay(unit.unit || unit.name || unit.id, idx + 1, unit.type || "Appartement")}
                        </Link>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {unit.type}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                        {formatFCFA(unit.rent)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-center">
                        <Badge dot variant={unit.status === "OCCUPÉ" ? "success" : "default"} className={unit.status === "NON OCCUPÉ" ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border-none" : ""}>
                          {unit.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {unit.tenant}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right space-x-2">
                        {unit.status === "NON OCCUPÉ" && (
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
                      </td>
                    </tr>
                  ))}
                  {unitsToDisplay.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                        Aucun logement enregistré pour ce bien.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
            <div className="aspect-video w-full rounded-xl bg-gray-100 mb-6 overflow-hidden flex items-center justify-center border border-app-border">
               <Building2 className="w-12 h-12 text-gray-300" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-900">{property.description || "Aucune description fournie."}</p>
              </div>
              <div className="pt-4 border-t border-app-border">
                <p className="text-xs text-gray-500 mb-1">Propriétaire</p>
                {property.owner ? (
                  <Link 
                    href={
                      owners.find((o: any) => 
                        (property.ownerId && o.id === property.ownerId) ||
                        (o.name && o.name.trim().toUpperCase() === property.owner.trim().toUpperCase())
                      )?.id 
                        ? `/app/proprietaires/${owners.find((o: any) => (property.ownerId && o.id === property.ownerId) || (o.name && o.name.trim().toUpperCase() === property.owner.trim().toUpperCase()))?.id}`
                        : `/app/proprietaires`
                    } 
                    className="text-sm font-semibold text-primary hover:underline flex items-center"
                  >
                    {property.owner}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-400">Non assigné</span>
                )}
              </div>
              <div className="pt-4 border-t border-app-border">
                <p className="text-xs text-gray-500 mb-1">Commission GESTIMMO</p>
                <p className="text-sm font-semibold text-gray-900">{property.commission !== undefined && property.commission !== null ? property.commission : 10}% des encaissements</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === "logements" && (
        <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900">Tous les logements ({unitsCount})</h2>
            <Link href={`/app/logements?bien=${encodeURIComponent(property.name)}`}>
              <button className="text-sm font-medium text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors flex items-center shadow-sm cursor-pointer">
                <Plus className="w-4 h-4 mr-2" /> Ajouter un logement
              </button>
            </Link>
          </div>
          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                  <th className="px-6 py-4 font-medium">Appartement</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium text-center">Loyer</th>
                  <th className="px-6 py-4 font-medium text-center">Statut</th>
                  <th className="px-6 py-4 font-medium">Locataire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {unitsToDisplay.map((unit: any, idx: number) => (
                  <tr key={unit.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/app/logements/${unit.id}`} className="text-sm font-semibold text-primary hover:underline">
                        {formatUnitDisplay(unit.unit || unit.id, idx + 1)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {unit.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                      {formatFCFA(unit.rent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge dot variant={unit.status === "OCCUPÉ" ? "success" : "default"} className={unit.status === "NON OCCUPÉ" ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border-none" : ""}>
                        {unit.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {unit.tenant}
                    </td>
                  </tr>
                ))}
                {unitsToDisplay.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                      Aucun logement enregistré pour ce bien.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "finances" && (
        <div className="bg-white p-12 rounded-2xl border border-app-border shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Finances & Relevés</h3>
          <p className="text-sm text-gray-500 max-w-md">L'historique des encaissements et les relevés financiers de ce bien seront affichés ici prochainement.</p>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="bg-white p-12 rounded-2xl border border-app-border shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Documents du bien</h3>
          <p className="text-sm text-gray-500 max-w-md">Titres de propriété, plans, et autres documents relatifs à ce bien apparaîtront dans cette section.</p>
        </div>
      )}

      {/* MODAL MODIFIER LE BIEN */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-app-border space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-app-border">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Pencil className="w-5 h-5 mr-2 text-primary" /> Modifier le bien
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du bien / Résidence</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Type de bien</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                  >
                    <option value="Immeuble">Immeuble</option>
                    <option value="Villa">Villa</option>
                    <option value="Résidence fermée">Résidence fermée</option>
                    <option value="Complexe commercial">Complexe commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Commission Agence (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editCommission}
                    onChange={(e) => setEditCommission(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Adresse physique / Quartier</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Remarques</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-app-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-app-border text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSaving || !editName.trim()}
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 text-sm font-semibold flex items-center disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRIMER LE BIEN */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-app-border space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Supprimer ce bien ?</h3>
              <p className="text-sm text-gray-600 mt-2">
                Êtes-vous sûr de vouloir supprimer définitivement <strong className="text-gray-900">{property.name}</strong> ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-app-border text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-semibold flex items-center justify-center disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
