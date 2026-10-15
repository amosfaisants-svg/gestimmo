"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Search, UserPlus, Phone, Mail, Building2, Trash2, Key, Copy, Check, ShieldCheck, CheckCircle2, Power, CheckSquare, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ensureOwnerCredentials, OwnerCredential } from "@/lib/ownerCredentials";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { fetchOwners, deleteOwner, loadAllDataFromDatabase } from "@/lib/dataService";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const initialOwners = [
  { id: "O-123", code: "PR-KI-100123", type: "entreprise", name: "Kouadio Invest", phone: "+225 0102030405", email: "contact@kouadio-invest.com", role: "Propriétaire", accountStatus: "Actif", propertiesCount: 2, totalCollected: 3500000, balance: 3150000 },
  { id: "O-124", code: "PR-MT-100124", type: "particulier", name: "Mme. Traoré", phone: "+225 0708091011", email: "traore@email.com", role: "Propriétaire", accountStatus: "Actif", propertiesCount: 1, totalCollected: 800000, balance: 720000 },
  { id: "O-125", code: "PR-SZ-100125", type: "entreprise", name: "SCI Zenith", phone: "+225 0506070809", email: "gestion@scizenith.com", role: "Propriétaire", accountStatus: "Actif", propertiesCount: 3, totalCollected: 2100000, balance: 1890000 },
];

export default function ProprietairesPage() {
  const { can } = usePermissions();
  const router = useRouter();
  const [owners, setOwners] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [logements, setLogements] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [reversements, setReversements] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [selectedCredential, setSelectedCredential] = useState<OwnerCredential | null>(null);
  const [isCredModalOpen, setIsCredModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Bulk deletion states
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const handleShowCredentials = (owner: any) => {
    const creds = ensureOwnerCredentials(owner.name, owner.type, owner.email, owner.phone, owner.code);
    setSelectedCredential(creds);
    setIsCredModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteOwner(id);
    const updated = owners.filter((o) => o.id !== id);
    setOwners(updated);
    localStorage.setItem("gestimmo_proprietaires", JSON.stringify(updated));
    setSelectedOwnerIds(prev => prev.filter(item => item !== id));
    setConfirmDeleteId(null);
  };

  const toggleSelectOwner = (id: string) => {
    setSelectedOwnerIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (filteredOwners.length === 0) return;
    const allFilteredIds = filteredOwners.map(o => o.id);
    const allSelected = allFilteredIds.every(id => selectedOwnerIds.includes(id));
    if (allSelected) {
      setSelectedOwnerIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedOwnerIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleExecuteBulkDelete = async () => {
    for (const id of selectedOwnerIds) {
      await deleteOwner(id);
    }
    const updatedOwners = owners.filter(o => !selectedOwnerIds.includes(o.id));
    setOwners(updatedOwners);
    localStorage.setItem("gestimmo_proprietaires", JSON.stringify(updatedOwners));
    setSelectedOwnerIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const handleToggleOwnerAccountStatus = (owner: any) => {
    const currentStatus = owner.accountStatus || "Actif";
    const nextStatus = currentStatus === "Inactif" ? "Actif" : "Inactif";
    const updatedOwners = owners.map((o) =>
      (o.id && o.id === owner.id) || (o.name && o.name.trim().toUpperCase() === owner.name?.trim().toUpperCase())
        ? { ...o, accountStatus: nextStatus }
        : o
    );
    setOwners(updatedOwners);
    localStorage.setItem("gestimmo_proprietaires", JSON.stringify(updatedOwners));
  };

  useEffect(() => {
    const loadData = async () => {
      const dbState = await loadAllDataFromDatabase();
      if (dbState) {
        setOwners(dbState.owners);
        setBiens(dbState.properties);
        setLogements(dbState.units);
        setPaiements(dbState.payments);
        setReversements(dbState.payouts);
      } else {
        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        if (storedOwners) {
          setOwners(JSON.parse(storedOwners));
        } else {
          setOwners(initialOwners);
        }
        const storedBiens = localStorage.getItem("gestimmo_biens");
        if (storedBiens) setBiens(JSON.parse(storedBiens));
        const storedLogements = localStorage.getItem("gestimmo_logements");
        if (storedLogements) setLogements(JSON.parse(storedLogements));
        const storedPaiements = localStorage.getItem("gestimmo_paiements");
        if (storedPaiements) setPaiements(JSON.parse(storedPaiements));
        const storedReversements = localStorage.getItem("gestimmo_reversements");
        if (storedReversements) setReversements(JSON.parse(storedReversements));
      }
    };

    loadData();
  }, []);


  const ownersWithStats = owners.map(owner => {
    const ownerBiens = biens.filter(b => 
      (b.ownerId && owner.id && b.ownerId === owner.id) ||
      (b.owner && owner.name && b.owner.trim().toLowerCase() === owner.name.trim().toLowerCase())
    );
    const ownerBiensIds = ownerBiens.map(b => b.id);
    const ownerBiensNames = ownerBiens.map(b => (b.name || "").trim().toLowerCase()).filter(Boolean);

    const ownerLogements = logements.filter(l => 
      (l.ownerId && owner.id && l.ownerId === owner.id) ||
      (l.propertyId && ownerBiensIds.includes(l.propertyId)) ||
      (l.property && ownerBiensNames.includes(l.property.trim().toLowerCase()))
    );
    const ownerLogementsIds = ownerLogements.map(l => l.id);
    const ownerLogementsLabels = ownerLogements.map(l => (l.unit || "").toString().trim().toLowerCase()).filter(Boolean);
    
    const ownerPaiements = paiements.filter(p => {
      const isValid = p.status === "VALIDÉ" || p.status === "PAYÉ";
      if (!isValid) return false;

      const matchOwner = (p.ownerId && owner.id && p.ownerId === owner.id) ||
                         (p.owner && owner.name && p.owner.trim().toLowerCase() === owner.name.trim().toLowerCase());
      const matchUnit = (p.unitId && ownerLogementsIds.includes(p.unitId)) ||
                        (p.unit && (ownerLogementsIds.includes(p.unit) || ownerLogementsLabels.includes(p.unit.toString().trim().toLowerCase())));
      const matchProp = (p.propertyId && ownerBiensIds.includes(p.propertyId)) ||
                        (p.property && ownerBiensNames.includes(p.property.trim().toLowerCase()));

      return matchOwner || matchUnit || matchProp;
    });

    const totalCollected = ownerPaiements.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    const rate = owner.commissionRate !== undefined && owner.commissionRate !== null && owner.commissionRate !== ""
      ? Number(owner.commissionRate)
      : (owner.commission_rate !== undefined && owner.commission_rate !== null ? Number(owner.commission_rate) : 10);
    const netToOwner = totalCollected * ((100 - (isNaN(rate) ? 10 : rate)) / 100);
    const ownerReversements = reversements.filter(r => (r.ownerId === owner.id || (r.owner && owner.name && r.owner.trim().toLowerCase() === owner.name.trim().toLowerCase())) && r.status === "EFFECTUÉ");
    const totalPaid = ownerReversements.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    
    const balance = Math.max(0, netToOwner - totalPaid);

    return {
      ...owner,
      propertiesCount: ownerBiens.length,
      totalCollected: totalCollected,
      balance: balance
    };
  });

  const filteredOwners = ownersWithStats.filter((owner) => 
    owner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!can("biens", "view")) {
    return <AccessDeniedCard moduleName="Propriétaires" />;
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propriétaires</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les propriétaires tiers et leurs biens en gestion.</p>
        </div>
        {can("biens", "edit") && (
          <Link href="/app/proprietaires/nouveau">
            <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm w-fit">
              <UserPlus className="h-4 w-4 mr-2" /> Nouveau propriétaire
            </button>
          </Link>
        )}
      </div>

      {/* Bulk Selection Bar */}
      {selectedOwnerIds.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span>{selectedOwnerIds.length} propriétaire(s) sélectionné(s)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedOwnerIds([])}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Désélectionner tout
            </button>
            {can("biens", "delete") && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Supprimer la sélection ({selectedOwnerIds.length})
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
                placeholder="Rechercher par nom ou code..." 
                className="pl-9 pr-4 py-2 border border-app-border rounded-lg text-sm w-full sm:w-80 outline-none focus:ring-2 focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                    checked={filteredOwners.length > 0 && filteredOwners.every(o => selectedOwnerIds.includes(o.id))}
                    onChange={toggleSelectAll}
                    title="Sélectionner tous les propriétaires"
                  />
                </th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Propriétaire</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Code</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Contact</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Biens en gestion</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Encaissé ce mois</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Solde à reverser</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filteredOwners.map((owner) => (
                <tr 
                  key={owner.id} 
                  className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                  onDoubleClick={() => router.push(`/app/proprietaires/nouveau?edit=${owner.id}`)}
                >
                  <td className="px-3 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary cursor-pointer"
                      checked={selectedOwnerIds.includes(owner.id)}
                      onChange={() => toggleSelectOwner(owner.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mr-3 font-bold text-sm">
                        {owner.name ? owner.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : "XX"}
                      </div>
                      <div>
                        <Link href={`/app/proprietaires/${owner.id}`} onClick={(e) => e.stopPropagation()} className="text-sm font-semibold text-gray-900 hover:text-primary hover:underline">
                          {owner.name}
                        </Link>
                        <p className="text-xs text-gray-500">{owner.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">{owner.code}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600"><Phone className="w-3.5 h-3.5 mr-2 text-gray-400" /> {owner.phone}</div>
                      <div className="flex items-center text-sm text-gray-600"><Mail className="w-3.5 h-3.5 mr-2 text-gray-400" /> {owner.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {biens.filter((b) => b.owner === owner.name).length} bien(s)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                    {formatFCFA(owner.totalCollected || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                    {formatFCFA(owner.balance || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {can("biens", "edit") && (
                        <button
                          onClick={() => handleToggleOwnerAccountStatus(owner)}
                          className={`p-1.5 rounded-lg transition-colors border ${
                            owner.accountStatus === "Inactif"
                              ? "text-red-500 bg-red-50 hover:bg-emerald-50 hover:text-emerald-600 border-red-200 hover:border-emerald-200"
                              : "text-emerald-600 bg-emerald-50 hover:bg-red-50 hover:text-red-600 border-emerald-200 hover:border-red-200"
                          }`}
                          title={owner.accountStatus === "Inactif" ? "Activer l'accès Espace Propriétaire" : "Désactiver l'accès Espace Propriétaire"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                      {can("biens", "viewCredentials") && (
                        <button
                          onClick={() => handleShowCredentials(owner)}
                          className="text-xs font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
                          title="Voir les identifiants Espace Propriétaire"
                        >
                          <Key className="h-3.5 w-3.5" />
                          Accès
                        </button>
                      )}
                      {can("biens", "edit") && (
                        <Link href={`/app/proprietaires/nouveau?edit=${owner.id}`}>
                          <button className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 border border-app-border rounded-lg hover:bg-gray-50">
                            Modifier
                          </button>
                        </Link>
                      )}
                      {can("biens", "delete") && (
                        <button
                          onClick={() => setConfirmDeleteId(owner.id)}
                          className="text-xs font-medium text-red-400 hover:text-white hover:bg-red-500 transition-colors px-3 py-1.5 border border-red-200 hover:border-red-500 rounded-lg flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOwners.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Aucun propriétaire trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modale de confirmation de suppression */}
      {confirmDeleteId && (() => {
        const owner = owners.find((o) => o.id === confirmDeleteId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 border border-app-border">
              <div className="flex items-center justify-center w-14 h-14 bg-red-50 rounded-full mx-auto mb-4">
                <Trash2 className="h-7 w-7 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Supprimer le propriétaire</h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                Voulez-vous vraiment supprimer <span className="font-semibold text-gray-900">{owner?.name}</span> ? Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal d'affichage des accès propriétaire */}
      {isCredModalOpen && selectedCredential && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 border border-app-border animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 border-b border-app-border pb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Identifiants Espace Propriétaire</h3>
                <p className="text-xs text-gray-500">Accès sécurisé pour la consultation des relevés et biens</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Bénéficiaire :</span>
                <span className="font-bold text-gray-900">{selectedCredential.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Type de compte :</span>
                <span className="font-semibold text-primary uppercase">{selectedCredential.type || "PARTICULIER"}</span>
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Identifiant / Login :</label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-primary select-all">
                    {selectedCredential.login}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Mot de passe temporaire :</label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-emerald-600 select-all">
                    {selectedCredential.password}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center text-xs text-gray-600 bg-amber-50 text-amber-900 p-3 rounded-xl border border-amber-200">
              <CheckCircle2 className="w-4 h-4 text-amber-600 mr-2 shrink-0" />
              Transmettez ces identifiants au propriétaire afin qu'il puisse accéder à son espace.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => {
                  const textToCopy = `Bonjour ${selectedCredential.name},\nVoici vos accès Espace Propriétaire GESTIMMO :\nIdentifiant: ${selectedCredential.login}\nMot de passe: ${selectedCredential.password}`;
                  navigator.clipboard.writeText(textToCopy);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 3000);
                }}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
              >
                {isCopied ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : <Copy className="w-4 h-4 mr-2 text-gray-500" />}
                {isCopied ? "Copié !" : "Copier les accès"}
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
                  <h3 className="text-lg font-bold text-gray-900">Supprimer {selectedOwnerIds.length} propriétaire(s)</h3>
                  <p className="text-xs text-red-600 font-medium">Action irréversible</p>
                </div>
              </div>
              <button onClick={() => setIsBulkDeleteModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Êtes-vous sûr de vouloir supprimer définitivement les <strong>{selectedOwnerIds.length} propriétaire(s)</strong> sélectionnés ?
              </p>
              <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                {owners.filter(o => selectedOwnerIds.includes(o.id)).map(o => (
                  <div key={o.id} className="text-xs text-gray-700 flex justify-between items-center py-1 border-b border-gray-100 last:border-none">
                    <span className="font-semibold text-gray-900">{o.name}</span>
                    <span className="text-gray-500">{o.code} ({o.phone})</span>
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
                Supprimer la sélection ({selectedOwnerIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
