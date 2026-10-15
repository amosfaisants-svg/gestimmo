"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, MapPin, Pencil, Trash2, Home, FileText, Calendar, Key, X, Save } from "lucide-react";
import Link from "next/link";
import { formatUnitDisplay, getLeaseDisplayCode } from "@/lib/utils";
import { updateUnit, loadAllDataFromDatabase } from "@/lib/dataService";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const defaultUnits = [
  { id: "A-101", property: "Résidence Les Flamboyants", propertyId: "B-001", type: "3 Pièces", floor: "RDC", rent: 150000, charges: 15000, status: "OCCUPÉ", description: "Magnifique appartement de 3 pièces situé au RDC, avec une cour privative et accès direct à la piscine." },
  { id: "A-102", property: "Résidence Les Flamboyants", propertyId: "B-001", type: "4 Pièces", floor: "RDC", rent: 200000, charges: 20000, status: "OCCUPÉ", description: "Grand appartement 4 pièces." },
];

const defaultTenant = {
  id: "T-892",
  name: "Cora Richards",
  phone: "+225 01 02 03 04 05",
  email: "cora.richards@email.com",
};

const defaultHistory = [
  { id: 1, type: "Entrée", tenant: "Cora Richards", date: "12 Août 2026", note: "Bail de 1 an" },
  { id: 2, type: "Sortie", tenant: "Marc Antoine", date: "30 Juin 2026", note: "Fin de bail" },
  { id: 3, type: "Entrée", tenant: "Marc Antoine", date: "01 Juillet 2024", note: "Bail de 2 ans" },
];

export default function UnitDetailsPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [unit, setUnit] = useState<any>(null);
  const [activeLease, setActiveLease] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editType, setEditType] = useState("");
  const [editRent, setEditRent] = useState("");
  const [editCharges, setEditCharges] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("gestimmo_logements");
    const all = stored ? JSON.parse(stored) : defaultUnits;
    const found = all.find((u: any) => u.id && u.id.trim().toUpperCase() === params.id.trim().toUpperCase());
    
    let currentUnitStatus = found ? found.status : "NON OCCUPÉ";

    const storedBaux = localStorage.getItem("gestimmo_baux");
    const allBaux = storedBaux ? JSON.parse(storedBaux) : [];
    const unitBaux = allBaux.filter((b: any) => b.unit && b.unit.trim().toUpperCase() === params.id.trim().toUpperCase());
    
    const historyData = unitBaux.map((b: any, index: number) => ({
      id: b.id,
      type: b.status === "ACTIF" ? "Entrée" : "Sortie",
      tenant: b.tenant,
      date: b.status === "ACTIF" ? b.start : (b.end || b.start),
      note: b.status === "ACTIF" ? "Bail en cours" : "Fin de bail",
      tenantId: b.tenantId
    }));
    setHistory(historyData);

    const active = unitBaux.find((b: any) => b.status === "ACTIF" || b.status === "Actif" || b.status === "actif");

    const storedTenants = localStorage.getItem("gestimmo_locataires");
    const allTenants = storedTenants ? JSON.parse(storedTenants) : [];

    const storedPaiements = localStorage.getItem("gestimmo_paiements");
    const allPaiements = storedPaiements ? JSON.parse(storedPaiements) : [];

    // Search tenant by lease, unitId, or payment
    let foundTenant = null;
    if (active) {
      foundTenant = allTenants.find((t: any) => t.id === active.tenantId || (t.name && active.tenant && t.name.trim().toUpperCase() === active.tenant.trim().toUpperCase()));
    }
    if (!foundTenant) {
      foundTenant = allTenants.find((t: any) => t.unit && t.unit.trim().toUpperCase() === params.id.trim().toUpperCase());
    }
    if (!foundTenant && found && found.tenant && found.tenant !== "-" && found.tenant !== "—") {
      foundTenant = allTenants.find((t: any) => t.name && t.name.trim().toUpperCase() === found.tenant.trim().toUpperCase());
    }
    if (!foundTenant) {
      const pMatch = allPaiements.find((p: any) => p.unit && p.unit.trim().toUpperCase() === params.id.trim().toUpperCase() && p.tenant);
      if (pMatch) {
        foundTenant = { name: pMatch.tenant, phone: "Non renseigné", email: "Non renseigné", id: "T-PAY" };
      }
    }

    const tenantName = foundTenant?.name || active?.tenant || (found?.tenant && found.tenant !== "-" && found.tenant !== "—" ? found.tenant : null);

    if (tenantName) {
      currentUnitStatus = "OCCUPÉ";
      if (active) setActiveLease(active);
      setTenant(foundTenant || { name: tenantName, phone: "Non renseigné", email: "Non renseigné", id: active?.tenantId || "T-GEN" });

      if (found && (found.status !== "OCCUPÉ" || found.tenant !== tenantName)) {
        const updatedAll = all.map((u: any) => u.id === found.id ? { ...u, status: "OCCUPÉ", tenant: tenantName } : u);
        localStorage.setItem("gestimmo_logements", JSON.stringify(updatedAll));
      }
    } else {
      currentUnitStatus = "NON OCCUPÉ";
    }

    if (found) {
      setUnit({ ...found, status: currentUnitStatus, tenant: tenantName || found.tenant });
    } else {
      setUnit({
        id: params.id,
        property: "Résidence Les Flamboyants",
        propertyId: "B-001",
        type: "3 Pièces",
        floor: "RDC",
        rent: 150000,
        charges: 15000,
        status: currentUnitStatus,
        tenant: tenantName || "-",
        description: `Logement ${params.id}`
      });
    }
  }, [params.id]);

  if (!unit) return <div className="p-8 text-center text-gray-500">Logement introuvable ou en cours de chargement...</div>;

  const openEditModal = () => {
    setEditType(unit.type || "");
    setEditRent(unit.rent?.toString() || "0");
    setEditCharges(unit.charges?.toString() || "0");
    setEditDescription(unit.description || "");
    setEditImage(unit.image || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateUnit = async () => {
    let dbType: 'APPARTEMENT' | 'STUDIO' | 'VILLA' | 'MAGASIN' | 'BUREAU' = 'APPARTEMENT';
    const tUpper = editType.toUpperCase();
    if (tUpper.includes('STUDIO')) dbType = 'STUDIO';
    else if (tUpper.includes('VILLA')) dbType = 'VILLA';
    else if (tUpper.includes('MAGASIN') || tUpper.includes('LOCAL') || tUpper.includes('BOUTIQUE')) dbType = 'MAGASIN';
    else if (tUpper.includes('BUREAU')) dbType = 'BUREAU';
    else dbType = 'APPARTEMENT';

    const parsedRent = parseInt(editRent) || 0;
    const parsedCharges = parseInt(editCharges) || 0;

    const rawDesc = (editDescription || "").replace(/^\[TYPE:\s*[^\]]+\]\s*/, '').trim();
    const encodedDesc = rawDesc ? `[TYPE:${editType}] ${rawDesc}` : `[TYPE:${editType}]`;

    const updatedUnit = {
      ...unit,
      type: editType,
      rent: parsedRent,
      charges: parsedCharges,
      description: rawDesc,
      image: editImage
    };
    setUnit(updatedUnit);

    const stored = localStorage.getItem("gestimmo_logements");
    if (stored) {
      try {
        const all = JSON.parse(stored);
        const updatedAll = all.map((u: any) => u.id === unit.id ? updatedUnit : u);
        localStorage.setItem("gestimmo_logements", JSON.stringify(updatedAll));
      } catch (e) {
        console.error(e);
      }
    }

    try {
      await updateUnit(unit.id, {
        type: dbType,
        rent_amount: parsedRent,
        charges_amount: parsedCharges,
        description: encodedDesc
      });
      await loadAllDataFromDatabase();
    } catch (e) {
      console.error("Error updating unit in Supabase:", e);
    }

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("gestimmo_logements_updated"));
    setIsEditModalOpen(false);
  };

  if (!unit) return <div className="p-8 text-center text-gray-500">Logement introuvable ou en cours de chargement...</div>;

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/app/logements">
            <button className="p-2 bg-white border border-app-border rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{formatUnitDisplay(unit.unit || unit.name || unit.id, 1, unit.type || "Appartement")}</h1>
              <Badge dot variant={unit.status === "OCCUPÉ" ? "success" : "default"} className={unit.status === "NON OCCUPÉ" ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border-none" : ""}>
                {unit.status}
              </Badge>
            </div>
            <div className="flex items-center text-sm text-gray-500 gap-4">
              <span className="flex items-center">
                <Home className="w-4 h-4 mr-1.5" /> 
                <Link href={`/app/biens/${unit.propertyId}`} className="hover:text-primary hover:underline">{unit.property}</Link>
              </span>
              <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> Étage: {unit.floor}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unit.status === "NON OCCUPÉ" && (
            <Link href={`/app/baux?unit=${unit.id}`}>
              <button type="button" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center">
                <Key className="h-4 w-4 mr-2" /> Louer
              </button>
            </Link>
          )}
          <button type="button" onClick={openEditModal} className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center">
            <Pencil className="h-4 w-4 mr-2" /> Modifier
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
          onClick={() => setActiveTab("tenant")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === "tenant" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Contrat & Locataire
        </button>
        <button 
          onClick={() => setActiveTab("history")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === "history" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Historique d'occupation
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          
          {activeTab !== "history" && (
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails financiers</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-app-border">
                <p className="text-xs text-gray-500 mb-1">Loyer de base</p>
                <p className="text-xl font-bold text-gray-900">{formatFCFA(unit.rent || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-app-border">
                <p className="text-xs text-gray-500 mb-1">Charges forfaitaires</p>
                <p className="text-xl font-bold text-gray-900">{formatFCFA(unit.charges || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-app-border">
                <p className="text-xs text-gray-500 mb-1">Total Mensuel</p>
                <p className="text-xl font-bold text-primary">{formatFCFA((unit.rent || 0) + (unit.charges || 0))}</p>
              </div>
            </div>
          </div>
          )}

          {/* Historique Table */}
          {activeTab !== "tenant" && (
          <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border">
              <h2 className="text-lg font-semibold text-gray-900">Historique d'occupation</h2>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Locataire</th>
                    <th className="px-6 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {history.length > 0 ? history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-sm">
                        <span className={`font-medium ${item.type === "Entrée" ? "text-green-600" : "text-red-600"}`}>{item.type}</span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {item.date}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.tenant}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        {item.note}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                        Aucun historique pour ce logement.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Locataire Actuel */}
          {activeTab !== "history" && (
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Locataire actuel</h2>
            {unit.status === "OCCUPÉ" && tenant ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {tenant?.name?.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <Link href={`/app/locataires/${tenant?.id}`} className="text-base font-bold text-gray-900 hover:text-primary hover:underline">
                      {tenant?.name}
                    </Link>
                    <Link href={`/app/baux/${activeLease?.id}`} className="block text-sm font-medium text-primary hover:underline mt-0.5">
                      Bail N° {getLeaseDisplayCode(activeLease)}
                    </Link>
                  </div>
                </div>
                <div className="pt-4 border-t border-app-border space-y-2">
                  <p className="text-sm text-gray-600 flex items-center"><span className="w-20 text-gray-400">Téléphone:</span> {tenant?.phone}</p>
                  <p className="text-sm text-gray-600 flex items-center"><span className="w-20 text-gray-400">Email:</span> {tenant?.email}</p>
                </div>
                <Link href={`/app/locataires/${tenant?.id}/contrat`}>
                  <button type="button" className="w-full bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center mt-2">
                    <FileText className="h-4 w-4 mr-2" /> Voir le contrat
                  </button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-4">Ce logement est actuellement inoccupé.</p>
                <Link href={`/app/baux?unit=${unit.id}`}>
                  <button type="button" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    Créer un bail
                  </button>
                </Link>
              </div>
            )}
          </div>
          )}

          {/* Info Card */}
          {activeTab !== "tenant" && (
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
            {unit.image && (
              <div className="mb-4 h-48 w-full rounded-xl overflow-hidden border border-app-border">
                <img src={unit.image} alt="Logement" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Type de bien</p>
                <p className="text-sm font-medium text-gray-900">{unit.type}</p>
              </div>
              <div className="pt-3 border-t border-app-border">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-900">{unit.description || "Aucune description"}</p>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Modal d'édition */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Modifier le logement {formatUnitDisplay(unit.unit || unit.name || unit.id, 1, unit.type || "Appartement")}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de bien *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loyer de base *</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    value={editRent}
                    onChange={(e) => setEditRent(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Charges</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    value={editCharges}
                    onChange={(e) => setEditCharges(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]" 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image du logement</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditImage(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" 
                />
                {editImage && (
                  <div className="mt-2 h-32 w-full rounded-lg overflow-hidden border border-app-border relative group">
                    <img src={editImage} alt="Aperçu" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setEditImage("")} className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
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
                onClick={handleUpdateUnit}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm"
              >
                <Save className="h-4 w-4 mr-2" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
