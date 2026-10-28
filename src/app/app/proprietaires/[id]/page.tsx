"use client";

import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Building2, Phone, Mail, FileText, ArrowRightLeft, Edit, Download, ExternalLink, Calendar, RefreshCw, Clock, Sliders } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchOwners } from "@/lib/dataService";
import { getGenericTemplate, getPdfTemplate, getReglementTemplate, getOrGenerateContratTemplate, getOrGenerateReglementTemplate } from "@/lib/storage";
import { formatFCFA, cn } from "@/lib/utils";
import { isPendingRentsVisibleForOwner, setOwnerPendingRentsVisibility } from "@/lib/portalSettings";

const formatPayoutDate = (rawDate?: string, period?: string) => {
  if (rawDate && rawDate !== "-" && rawDate !== "—") {
    try {
      const normalized = rawDate.includes("-") && !rawDate.includes("T") ? `${rawDate}T12:00:00` : rawDate;
      const d = new Date(normalized);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
      }
    } catch {}
    return rawDate;
  }
  return period || "—";
};

export default function OwnerDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const [owner, setOwner] = useState<any>(null);
  const [managedProperties, setManagedProperties] = useState<any[]>([]);
  const [ownerPayouts, setOwnerPayouts] = useState<any[]>([]);
  const [isRefreshingTemplates, setIsRefreshingTemplates] = useState(false);
  const [isOwnerPendingVisible, setIsOwnerPendingVisible] = useState(true);

  const handleToggleOwnerPendingRents = () => {
    if (!owner) return;
    const nextVal = !isOwnerPendingVisible;
    setIsOwnerPendingVisible(nextVal);
    setOwnerPendingRentsVisibility(owner.id, nextVal);
    setOwner((prev: any) => ({ ...prev, showPendingRents: nextVal }));
  };

  const loadOwner = async () => {
    let found: any = null;
    const storedOwners = localStorage.getItem("gestimmo_proprietaires");
    let ownersList: any[] = [];
    if (storedOwners) {
      try {
        ownersList = JSON.parse(storedOwners);
        found = ownersList.find((o: any) => o.id === id || String(o.id) === String(id));
      } catch {}
    }

    if (!found) {
      const dbOwners = await fetchOwners();
      const dbFound = dbOwners.find((o: any) => o.id === id || String(o.id) === String(id));
      if (dbFound) {
        const matchedLocal = ownersList.find((o: any) => 
          o.id === dbFound.id || 
          (o.name && dbFound.full_name && o.name.toLowerCase().trim() === dbFound.full_name.toLowerCase().trim())
        );
        found = {
          id: dbFound.id,
          code: dbFound.id_card_number || `PR-${dbFound.id.slice(0, 6)}`,
          type: matchedLocal?.type || "particulier",
          name: dbFound.full_name,
          phone: dbFound.phone || matchedLocal?.phone || "",
          email: dbFound.email || matchedLocal?.email || "",
          adresse: dbFound.address || matchedLocal?.adresse || "",
          commissionRate: (dbFound.commission_rate !== undefined && dbFound.commission_rate !== null) ? Number(dbFound.commission_rate) : (matchedLocal?.commissionRate ?? 10),
          modeReversement: matchedLocal?.modeReversement || "Virement Bancaire (Mensuel)",
          nomBanque: matchedLocal?.nomBanque || "",
          rib: matchedLocal?.rib || "",
          templates: matchedLocal?.templates,
        };
      }
    }

    if (found) {
      // Resolve templates comprehensively from all cached locations
      if (!found.templates) {
        try {
          const byOwnerId = localStorage.getItem(`gestimmo_owner_${found.id}_templates`);
          if (byOwnerId) found.templates = JSON.parse(byOwnerId);
        } catch {}
      }
      if (!found.templates && id) {
        try {
          const byParamId = localStorage.getItem(`gestimmo_owner_${id}_templates`);
          if (byParamId) found.templates = JSON.parse(byParamId);
        } catch {}
      }
      if (!found.templates && found.name) {
        const matchByName = ownersList.find((o: any) => o.name && o.name.trim().toLowerCase() === found.name.trim().toLowerCase());
        if (matchByName?.templates) {
          found.templates = matchByName.templates;
        }
      }

      setOwner(found);
      setIsOwnerPendingVisible(isPendingRentsVisibleForOwner(found));

      const storedBiens = localStorage.getItem("gestimmo_biens");
        if (storedBiens) {
          const allBiens = JSON.parse(storedBiens);
          const ownerBiens = allBiens.filter((b: any) => b.owner === found.name);
          
          const storedLogements = localStorage.getItem("gestimmo_logements");
          const logements = storedLogements ? JSON.parse(storedLogements) : [];
          
          const storedBaux = localStorage.getItem("gestimmo_baux");
          const baux = storedBaux ? JSON.parse(storedBaux) : [];
          
          const storedPaiements = localStorage.getItem("gestimmo_paiements");
          const paiements = storedPaiements ? JSON.parse(storedPaiements) : [];

          const biensWithStats = ownerBiens.map((bien: any) => {
            const propertyLogements = logements.filter((l: any) => (l.property && bien.name && l.property.trim().toLowerCase() === bien.name.trim().toLowerCase()) || l.propertyId === bien.id);
            const propertyUnitsIds = propertyLogements.map((l: any) => l.id);
            
            const propertyBaux = baux.filter((b: any) => (
              (b.property && bien.name && b.property.trim().toLowerCase() === bien.name.trim().toLowerCase()) || 
              propertyUnitsIds.includes(b.unit)
            ) && b.status === "ACTIF");

            const unitsCount = propertyLogements.length > 0 ? propertyLogements.length : (bien.units || 1);
            const occupiedCount = propertyBaux.length > 0 ? propertyBaux.length : (bien.occupied || 0);

            // Sum paid payments for this property / units
            const paidRevenue = paiements
              .filter((p: any) => (
                propertyUnitsIds.includes(p.unit) || 
                (p.property && bien.name && p.property.trim().toLowerCase() === bien.name.trim().toLowerCase()) ||
                propertyBaux.some((b: any) => b.tenant === p.tenant || b.unit === p.unit)
              ) && (p.status === "VALIDÉ" || p.status === "PAYÉ"))
              .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

            // Sum expected monthly rent of active baux
            const bauxMonthlyRent = propertyBaux.reduce((sum: number, b: any) => sum + (Number(b.rent) || 0), 0);

            // Revenue generated = paid payments if > 0, otherwise monthly rent of active baux, or initial bien.revenue
            const revenue = paidRevenue > 0 ? paidRevenue : (bauxMonthlyRent > 0 ? bauxMonthlyRent : (Number(bien.revenue) || 0));

            return { ...bien, units: unitsCount, occupied: occupiedCount, revenue };
          });

          setManagedProperties(biensWithStats);

          const storedRev = localStorage.getItem("gestimmo_reversements");
          if (storedRev) {
            try {
              const allRev = JSON.parse(storedRev);
              const matchedRev = allRev.filter((r: any) =>
                (r.ownerId && found.id && String(r.ownerId).trim() === String(found.id).trim()) ||
                (r.owner && found.name && r.owner.trim().toLowerCase() === found.name.trim().toLowerCase())
              );
              setOwnerPayouts(matchedRev);
            } catch (e) {}
          }
        }
      }
    };

  useEffect(() => {
    loadOwner();
  }, [id]);

  if (!owner) {
    return (
      <div className="pt-12 md:pt-0 flex flex-col items-center justify-center h-64">
        <p className="text-gray-500">Chargement des informations...</p>
        <Link href="/app/proprietaires" className="mt-4 text-primary hover:underline">
          Retour aux propriétaires
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/app/proprietaires">
            <button className="p-2 bg-white border border-app-border rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {owner.name}
              <Badge variant="default" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">
                {owner.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
              </Badge>
            </h1>
            <div className="flex items-center text-sm text-gray-500 gap-4 mt-2">
              <span className="flex items-center"><Phone className="w-4 h-4 mr-1.5" /> {owner.phone}</span>
              <span className="flex items-center"><Mail className="w-4 h-4 mr-1.5" /> {owner.email}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/app/proprietaires/nouveau?edit=${owner.id}`}>
            <button type="button" className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm cursor-pointer">
              <Edit className="h-4 w-4 mr-2 text-gray-500" /> Modifier le profil & modèles
            </button>
          </Link>
          <Link href="/app/reversements">
            <button type="button" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm cursor-pointer">
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Aller aux reversements
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Biens en gestion */}
          <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border">
              <h2 className="text-lg font-semibold text-gray-900">Biens en gestion ({managedProperties.length})</h2>
            </div>
            <div className="p-4 space-y-4">
              {managedProperties.length > 0 ? (
                managedProperties.map(property => (
                  <div key={property.id} className="border border-app-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg"><Building2 className="w-5 h-5 text-gray-500" /></div>
                      <div>
                        <Link href={`/app/biens/${property.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary hover:underline">
                          {property.name}
                        </Link>
                        <p className="text-xs text-gray-500 mt-1">ID: {property.id} • {property.occupied}/{property.units} logements occupés</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Revenus générés (mois)</p>
                      <p className="text-sm font-bold text-gray-900">{formatFCFA(property.revenue)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Aucun bien en gestion.</p>
              )}
            </div>
          </div>

          {/* Historique Reversements */}
          <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Derniers relevés & reversements</h2>
              <Link href="/app/reversements" className="text-sm font-medium text-primary hover:underline">
                Tout voir
              </Link>
            </div>
            <div className="overflow-x-auto w-full flex-1">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Relevé</th>
                    <th className="px-6 py-3 font-medium">Période</th>
                    <th className="px-6 py-3 font-medium text-center">Encaissé</th>
                    <th className="px-6 py-3 font-medium text-center">Net reversé</th>
                    <th className="px-6 py-3 font-medium text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {ownerPayouts.length > 0 ? (
                    ownerPayouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-1.5 font-medium text-gray-700">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{formatPayoutDate(payout.date || payout.created_at || payout.createdAt || payout.payout_date, payout.period)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <Link href="/app/reversements" className="text-sm font-semibold text-primary hover:underline flex items-center">
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            {payout.id && payout.id.length > 20 ? payout.id.slice(0, 8).toUpperCase() : payout.id}
                          </Link>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                          {payout.period}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                          {formatFCFA(payout.collected)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                          {formatFCFA(payout.amount)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <Badge dot variant={payout.status === "EFFECTUÉ" ? "success" : "warning"}>
                            {payout.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">
                        Aucun reversement encore enregistré pour ce propriétaire.
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
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Paramètres Financiers</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Taux de commission (GESTIMMO)</p>
                <p className="text-lg font-bold text-gray-900">
                  {owner.commissionRate !== undefined && owner.commissionRate !== null && owner.commissionRate !== ""
                    ? owner.commissionRate
                    : (owner.commission_rate !== undefined && owner.commission_rate !== null ? owner.commission_rate : 10)}%{" "}
                  <span className="text-sm font-normal text-gray-500">des loyers encaissés</span>
                </p>
              </div>
              <div className="pt-4 border-t border-app-border">
                <p className="text-xs text-gray-500 mb-1">Mode de reversement</p>
                <p className="text-sm text-gray-900 font-medium">{owner.modeReversement || "Virement Bancaire (Mensuel)"}</p>
                {owner.nomBanque && <p className="text-xs text-gray-500 mt-1">Banque: {owner.nomBanque}</p>}
                <p className="text-xs text-gray-500 mt-1">RIB: {owner.rib || "CI032 01001 00001234567 89"}</p>
              </div>
            </div>
          </div>

          {/* Options Espace Propriétaire */}
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-gray-500" /> Espace Propriétaire
              </h2>
              <Badge variant={isOwnerPendingVisible ? "success" : "default"} dot className="text-xs">
                {isOwnerPendingVisible ? "Actif" : "Masqué"}
              </Badge>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Contrôlez les onglets et informations accessibles par ce propriétaire lorsqu'il se connecte à son espace portail.
            </p>

            <div className="p-3.5 border border-app-border rounded-xl bg-gray-50/50 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-gray-900">Onglet « Loyers en attente »</p>
                </div>
                <p className="text-[11px] text-gray-500 pl-6">
                  {isOwnerPendingVisible
                    ? "Visible dans son menu latéral"
                    : "Masqué de son menu latéral"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleOwnerPendingRents}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isOwnerPendingVisible ? "bg-primary" : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    isOwnerPendingVisible ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Modèles de documents associés */}
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" /> Modèles de documents
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshingTemplates(true);
                    await loadOwner();
                    setTimeout(() => setIsRefreshingTemplates(false), 500);
                  }}
                  className="text-xs text-gray-500 hover:text-primary transition-colors flex items-center cursor-pointer"
                  title="Actualiser les modèles"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 mr-1", isRefreshingTemplates && "animate-spin")} />
                  Actualiser
                </button>
                <Link 
                  href={`/app/proprietaires/nouveau?edit=${owner.id}`} 
                  className="text-xs text-primary font-medium hover:underline flex items-center"
                >
                  Gérer <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Modèles juridiques et contractuels applicables à ce propriétaire. Les modèles personnalisés prévalent sur les modèles standards.
            </p>
            
            <div className="space-y-3">
              {/* Contrat */}
              {(() => {
                const hasCustomContrat = Boolean(owner.templates?.contratFileKey || (owner.templates?.contratFileName && !owner.templates.contratFileName.includes("modèle_contrat.pdf")));
                const cleanContratName = owner.templates?.contratFileName
                  ? owner.templates.contratFileName.replace(" (Sauvegardé)", "").replace(" (Actif)", "").trim()
                  : "Contrat_Bail_Standard_CI.pdf";

                return (
                  <div className="p-3 border border-app-border rounded-xl bg-gray-50/50 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="truncate mr-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-900 truncate">Modèle Contrat de Bail</p>
                        {hasCustomContrat ? (
                          <Badge variant="success" dot className="text-[10px] py-0 px-1.5">Personnalisé</Badge>
                        ) : (
                          <Badge variant="info" dot className="text-[10px] py-0 px-1.5">Standard Loi 2019-576</Badge>
                        )}
                      </div>
                      <p className={cn("text-[11px] font-medium truncate mt-0.5", hasCustomContrat ? "text-emerald-700" : "text-blue-700")}>
                        ✓ {cleanContratName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const base64 = await getOrGenerateContratTemplate(owner.name, owner.templates?.contratFileKey);
                          if (base64) {
                            const a = document.createElement("a");
                            a.href = base64;
                            const downloadName = hasCustomContrat 
                              ? (cleanContratName.endsWith(".pdf") ? cleanContratName : `${cleanContratName}.pdf`)
                              : `Contrat_Bail_${(owner.name || "Standard").replace(/\s+/g, '_')}.pdf`;
                            a.download = downloadName;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          } else {
                            alert("Erreur lors de la préparation du contrat.");
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Impossible de télécharger le modèle de contrat.");
                        }
                      }}
                      className="p-1.5 bg-white border border-app-border text-primary rounded-lg hover:bg-primary-50 transition-colors shadow-xs cursor-pointer shrink-0"
                      title="Télécharger le modèle de contrat en PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}

              {/* Règlement */}
              {(() => {
                const hasCustomReglement = Boolean(owner.templates?.reglementFileKey || (owner.templates?.reglementFileName && !owner.templates.reglementFileName.includes("modèle_règlement_intérieur.pdf")));
                const cleanReglementName = owner.templates?.reglementFileName
                  ? owner.templates.reglementFileName.replace(" (Sauvegardé)", "").replace(" (Actif)", "").trim()
                  : "Reglement_Interieur_Standard.pdf";

                return (
                  <div className="p-3 border border-app-border rounded-xl bg-gray-50/50 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="truncate mr-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-900 truncate">Modèle Règlement Intérieur</p>
                        {hasCustomReglement ? (
                          <Badge variant="success" dot className="text-[10px] py-0 px-1.5">Personnalisé</Badge>
                        ) : (
                          <Badge variant="info" dot className="text-[10px] py-0 px-1.5">Standard Copropriété</Badge>
                        )}
                      </div>
                      <p className={cn("text-[11px] font-medium truncate mt-0.5", hasCustomReglement ? "text-emerald-700" : "text-blue-700")}>
                        ✓ {cleanReglementName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const base64 = await getOrGenerateReglementTemplate(owner.name, owner.templates?.reglementFileKey);
                          if (base64) {
                            const a = document.createElement("a");
                            a.href = base64;
                            const downloadName = hasCustomReglement 
                              ? (cleanReglementName.endsWith(".pdf") ? cleanReglementName : `${cleanReglementName}.pdf`)
                              : `Reglement_Interieur_${(owner.name || "Standard").replace(/\s+/g, '_')}.pdf`;
                            a.download = downloadName;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          } else {
                            alert("Erreur lors de la préparation du règlement.");
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Impossible de télécharger le modèle de règlement.");
                        }
                      }}
                      className="p-1.5 bg-white border border-app-border text-primary rounded-lg hover:bg-primary-50 transition-colors shadow-xs cursor-pointer shrink-0"
                      title="Télécharger le modèle de règlement intérieur en PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}

              {/* Custom templates */}
              {owner.templates?.customTemplates && owner.templates.customTemplates.length > 0 && (
                owner.templates.customTemplates.map((tpl: any) => (
                  <div key={tpl.id} className="p-3 border border-app-border rounded-xl bg-gray-50/50 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="truncate mr-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-900 truncate">{tpl.title}</p>
                        <Badge variant="success" dot className="text-[10px] py-0 px-1.5">Personnalisé</Badge>
                      </div>
                      <p className="text-[11px] text-emerald-700 font-medium truncate mt-0.5">
                        ✓ {tpl.fileName ? tpl.fileName.replace(" (Sauvegardé)", "").trim() : "document.pdf"}
                      </p>
                      {tpl.description && (
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{tpl.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        let base64 = await getGenericTemplate(tpl.fileKey);
                        if (!base64 && typeof window !== "undefined") base64 = localStorage.getItem(tpl.fileKey);
                        if (base64) {
                          const a = document.createElement("a");
                          a.href = base64;
                          const cleanName = tpl.fileName ? tpl.fileName.replace(" (Sauvegardé)", "").trim() : "document.pdf";
                          a.download = cleanName.endsWith(".pdf") ? cleanName : `${cleanName}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        } else {
                          alert("Aucun fichier PDF disponible pour ce modèle.");
                        }
                      }}
                      className="p-1.5 bg-white border border-app-border text-primary rounded-lg hover:bg-primary-50 transition-colors shadow-xs cursor-pointer shrink-0"
                      title={`Télécharger ${tpl.title}`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
