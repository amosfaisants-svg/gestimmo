"use client";

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { 
  Clock, 
  Wallet, 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  FileText,
  BadgePercent,
  Banknote,
  RotateCcw
} from "lucide-react";
import Link from "next/link";
import { formatUnitDisplay, formatFCFA, isUUID } from "@/lib/utils";
import { getPortalSession } from "@/lib/authSession";
import { loadAllDataFromDatabase } from "@/lib/dataService";
import { isPendingRentsVisibleForOwner } from "@/lib/portalSettings";

export default function LoyersEnAttentePage() {
  const [currentOwner, setCurrentOwner] = useState<any>(null);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("__TOUTES__");
  const [selectedBien, setSelectedBien] = useState<string>("__TOUS__");
  const [isLoading, setIsLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [isFeatureAllowed, setIsFeatureAllowed] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadAllDataFromDatabase();

      let ownerObj: any = getPortalSession("PROPRIETAIRE");
      if (!ownerObj) {
        const storedUser = localStorage.getItem("gestimmo_current_user");
        if (storedUser) {
          try {
            ownerObj = JSON.parse(storedUser);
          } catch (e) {}
        }
      }

      const storedOwners = localStorage.getItem("gestimmo_proprietaires");
      if (storedOwners) {
        try {
          const owners = JSON.parse(storedOwners);
          if (ownerObj?.id || ownerObj?.name) {
            const found = owners.find(
              (o: any) =>
                (ownerObj.id && o.id === ownerObj.id) ||
                (ownerObj.name && o.name && o.name.trim().toUpperCase() === ownerObj.name.trim().toUpperCase())
            );
            if (found) ownerObj = found;
          }
          if (!ownerObj && owners.length > 0) ownerObj = owners[0];
        } catch {}
      }

      setCurrentOwner(ownerObj);

      // Check if feature is allowed by administrator
      const allowed = isPendingRentsVisibleForOwner(ownerObj);
      setIsFeatureAllowed(allowed);

      if (ownerObj) {
        const ownerName = (ownerObj.name || ownerObj.full_name || "").trim().toUpperCase();
        const ownerId = (ownerObj.id || "").trim();

        // 1. Commission rate
        const rawRate =
          ownerObj.commissionRate !== undefined && ownerObj.commissionRate !== null && ownerObj.commissionRate !== ""
            ? Number(ownerObj.commissionRate)
            : (ownerObj.commission_rate !== undefined && ownerObj.commission_rate !== null && ownerObj.commission_rate !== ""
              ? Number(ownerObj.commission_rate)
              : 0);
        const validRate = isNaN(rawRate) ? 0 : rawRate;
        setCommissionRate(validRate);

        // 2. Load Biens
        const storedBiens = localStorage.getItem("gestimmo_biens");
        const biens: any[] = storedBiens ? JSON.parse(storedBiens) : [];
        const myBiens = biens.filter(
          (b: any) =>
            (b.ownerId && ownerId && String(b.ownerId) === String(ownerId)) ||
            (b.owner && ownerName && b.owner.trim().toUpperCase() === ownerName)
        );
        const myBiensIds = myBiens.map((b: any) => String(b.id));
        const myBiensNames = myBiens.map((b: any) => (b.name || "").trim().toUpperCase());

        // 3. Load Logements
        const storedLogements = localStorage.getItem("gestimmo_logements");
        const logements: any[] = storedLogements ? JSON.parse(storedLogements) : [];
        const myLogements = logements.filter(
          (l: any) =>
            (l.ownerId && ownerId && String(l.ownerId) === String(ownerId)) ||
            (l.owner && ownerName && l.owner.trim().toUpperCase() === ownerName) ||
            (l.propertyId && myBiensIds.includes(String(l.propertyId))) ||
            (l.property && myBiensNames.includes((l.property || "").trim().toUpperCase()))
        );
        const myLogementsIds = myLogements.map((l: any) => String(l.id).toLowerCase());
        const myLogementsNames = myLogements
          .map((l: any) => (l.unit || l.name || l.unit_number || "").trim().toLowerCase())
          .filter(Boolean);

        // 4. Load Paiements
        const storedPaiements = localStorage.getItem("gestimmo_paiements");
        const paiements: any[] = storedPaiements ? JSON.parse(storedPaiements) : [];
        const myPaiements = paiements.filter((p: any) => {
          const isPaid = p.status === "VALIDÉ" || p.status === "PAYÉ";
          if (!isPaid) return false;

          const pOwnerId = String(p.ownerId || p.owner_id || "").trim();
          const pOwner = String(p.owner || "").trim().toUpperCase();
          if (pOwnerId && ownerId && pOwnerId === ownerId) return true;
          if (pOwner && ownerName && pOwner === ownerName) return true;

          const pUnit = String(p.unitId || p.unit_id || p.unit || "").trim().toLowerCase();
          if (pUnit && (myLogementsIds.includes(pUnit) || myLogementsNames.includes(pUnit))) return true;

          const pProp = String(p.propertyId || p.property || p.bien || "").trim().toUpperCase();
          if (pProp && (myBiensIds.includes(pProp) || myBiensNames.includes(pProp))) return true;

          return false;
        });

        // 5. Load Reversements
        const storedReversements = localStorage.getItem("gestimmo_reversements");
        const reversements: any[] = storedReversements ? JSON.parse(storedReversements) : [];
        const myRev = reversements.filter(
          (r: any) =>
            ((r.ownerId && ownerId && String(r.ownerId) === String(ownerId)) ||
              (r.owner && ownerName && r.owner.trim().toUpperCase() === ownerName)) &&
            (r.status === "EFFECTUÉ" || r.status === "EFFECTUE")
        );

        // 6. Identifier les paiements déjà reversés vs non encore reversés
        // Groupement par période
        const paymentsByPeriod: Record<string, any[]> = {};
        myPaiements.forEach((p: any) => {
          const pPeriodKey = (p.period || p.period_month || "Période courante").trim();
          const normKey = pPeriodKey.toLowerCase();
          if (!paymentsByPeriod[normKey]) {
            paymentsByPeriod[normKey] = {
              displayName: pPeriodKey,
              items: [],
            } as any;
          }
          (paymentsByPeriod[normKey] as any).items.push(p);
        });

        const pendingItems: any[] = [];

        Object.keys(paymentsByPeriod).forEach((normKey) => {
          const { displayName, items } = paymentsByPeriod[normKey] as any;

          // Trier les paiements de cette période par ordre chronologique
          items.sort((a: any, b: any) => {
            const tA = new Date(a.payment_date || a.date || a.created_at || 0).getTime();
            const tB = new Date(b.payment_date || b.date || b.created_at || 0).getTime();
            return tA - tB;
          });

          // Trouver les reversements déjà exécutés pour cette période
          const matchingRevs = myRev.filter((r: any) => {
            const rPer = (r.period || r.period_month || "").trim().toLowerCase();
            return rPer === normKey || rPer.includes(normKey) || normKey.includes(rPer);
          });

          // Montant total brut déjà reversé pour cette période
          const totalAlreadyReversed = matchingRevs.reduce((sum: number, r: any) => {
            return sum + (Number(r.collected) || Number(r.amount) || 0);
          }, 0);

          let coveredSum = 0;

          items.forEach((p: any, idx: number) => {
            const amt = Number(p.amount) || 0;

            if (coveredSum + amt <= totalAlreadyReversed) {
              // Ce paiement a déjà été entièrement reversé
              coveredSum += amt;
            } else {
              // Ce paiement (ou solde) n'a pas encore été reversé !
              const unreversedAmt = Math.max(0, (coveredSum + amt) - totalAlreadyReversed);
              coveredSum += amt;

              const pUnitRaw = p.unitId || p.unit_id || p.unit;
              const foundLogement = myLogements.find((l: any) =>
                (l.id && pUnitRaw && String(l.id).toLowerCase() === String(pUnitRaw).toLowerCase()) ||
                (l.unit && p.unit && String(l.unit).toLowerCase() === String(p.unit).toLowerCase()) ||
                (l.name && p.unit && String(l.name).toLowerCase() === String(p.unit).toLowerCase())
              );

              let unitName = "";
              if (foundLogement) {
                unitName = formatUnitDisplay(foundLogement, idx + 1, foundLogement.type || "Studio");
              } else if (p.unit && !isUUID(p.unit)) {
                unitName = formatUnitDisplay(p.unit, idx + 1);
              } else {
                unitName = `Logement ${idx + 1}`;
              }

              const propName = p.property || p.bien || foundLogement?.property || myBiens[0]?.name || "Patrimoine";
              const tenantName = p.tenant || p.locataire || foundLogement?.tenant || "Locataire";

              const rawType = (p.type || p.objet || p.typePaiement || p.motif || "").toLowerCase();
              const rawPer = (p.period_month || "").toLowerCase();
              const isCaution = rawType.includes("caution") || rawPer.includes("caution");
              const isAvance = rawType.includes("avance") || rawPer.includes("avance");
              const displayType = isCaution ? "Caution" : isAvance ? "Avance Loyer" : "Loyer";

              const itemGross = amt;
              const itemCommission = validRate > 0 ? Math.round(itemGross * (validRate / 100)) : 0;
              const itemNet = itemGross - itemCommission;

              pendingItems.push({
                id: p.id || `PND-${idx}`,
                date: p.payment_date || (p.created_at ? p.created_at.slice(0, 10) : p.date || "-"),
                unit: unitName,
                property: propName,
                tenant: tenantName,
                type: displayType,
                period: p.period || p.period_month || displayName,
                method: p.payment_method || p.method || "Espèces",
                amount: itemGross,
                commission: itemCommission,
                net: itemNet,
                reference: p.receipt_number || p.receiptNumber || p.transaction_ref || "-",
              });
            }
          });
        });

        // Trier les loyers en attente par date décroissante
        pendingItems.sort((a, b) => {
          const tA = new Date(a.date).getTime() || 0;
          const tB = new Date(b.date).getTime() || 0;
          return tB - tA;
        });

        setPendingPayments(pendingItems);
      }
      setIsLoading(false);
    };

    loadData();

    const handleSettingsUpdate = () => {
      loadData();
    };

    window.addEventListener("gestimmo_portal_settings_updated", handleSettingsUpdate);
    window.addEventListener("storage", handleSettingsUpdate);

    return () => {
      window.removeEventListener("gestimmo_portal_settings_updated", handleSettingsUpdate);
      window.removeEventListener("storage", handleSettingsUpdate);
    };
  }, []);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return pendingPayments.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        item.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.period.toLowerCase().includes(searchTerm.toLowerCase());

      const matchPeriod =
        selectedPeriod === "__TOUTES__" ||
        item.period.trim().toLowerCase() === selectedPeriod.trim().toLowerCase();

      const matchBien =
        selectedBien === "__TOUS__" ||
        item.property.trim().toLowerCase() === selectedBien.trim().toLowerCase();

      return matchSearch && matchPeriod && matchBien;
    });
  }, [pendingPayments, searchTerm, selectedPeriod, selectedBien]);

  // Financial totals
  const totalGrossPending = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  const totalCommissionPending = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.commission) || 0), 0);
  }, [filteredPayments]);

  const totalNetPending = useMemo(() => {
    return totalGrossPending - totalCommissionPending;
  }, [totalGrossPending, totalCommissionPending]);

  // Distinct periods & properties for filter dropdowns
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    pendingPayments.forEach((p) => {
      if (p.period) set.add(p.period);
    });
    return Array.from(set);
  }, [pendingPayments]);

  const availableBiens = useMemo(() => {
    const set = new Set<string>();
    pendingPayments.forEach((p) => {
      if (p.property) set.add(p.property);
    });
    return Array.from(set);
  }, [pendingPayments]);

  // Access restricted by administrator screen
  if (!isLoading && !isFeatureAllowed) {
    return (
      <div className="pt-12 md:pt-0 max-w-3xl mx-auto py-12">
        <div className="bg-white p-8 rounded-2xl border border-app-border shadow-sm text-center space-y-5">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Module non activé</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
              La consultation des loyers en attente de reversement a été désactivée par votre gestionnaire ou votre administrateur d'agence.
            </p>
          </div>
          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              href="/proprietaire"
              className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-2"
            >
              Retour au tableau de bord
            </Link>
            <Link
              href="/proprietaire/releves"
              className="bg-white border border-app-border text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              Consulter mes relevés (CRG)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="w-7 h-7 text-primary" />
            Loyers en attente de reversement
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualisez les loyers et charges réglés par vos locataires en attente de virement sur votre compte bancaire.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/proprietaire/releves"
            className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <FileText className="w-4 h-4 text-gray-500" />
            Historique des relevés (CRG)
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Brut En Attente */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Encaissé (Brut)</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">{formatFCFA(totalGrossPending)}</h3>
            <p className="text-xs text-gray-500 mt-1">Réglé par les locataires</p>
          </div>
        </div>

        {/* Commission Estimée */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Honoraires Agence ({commissionRate}%)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <BadgePercent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">{formatFCFA(totalCommissionPending)}</h3>
            <p className="text-xs text-gray-500 mt-1">Déduction de gestion GESTIMMO</p>
          </div>
        </div>

        {/* Net Estimé à Reverser */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Estimé à Reverser</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-emerald-600">{formatFCFA(totalNetPending)}</h3>
            <p className="text-xs text-emerald-700/80 mt-1 font-medium">À créditer lors du prochain virement</p>
          </div>
        </div>

        {/* Nombre de Paiements */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Encaissements</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">{filteredPayments.length}</h3>
            <p className="text-xs text-gray-500 mt-1">Loyer(s) en attente de traitement</p>
          </div>
        </div>
      </div>

      {/* Main Content & Table */}
      <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
        {/* Filters Header */}
        <div className="p-6 border-b border-app-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par locataire, logement, bien..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Period */}
            {availablePeriods.length > 0 && (
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-app-border rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="__TOUTES__">Toutes les périodes</option>
                {availablePeriods.map((per) => (
                  <option key={per} value={per}>
                    {per}
                  </option>
                ))}
              </select>
            )}

            {/* Filter by Bien */}
            {availableBiens.length > 1 && (
              <select
                value={selectedBien}
                onChange={(e) => setSelectedBien(e.target.value)}
                className="border border-app-border rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="__TOUS__">Tous les biens</option>
                {availableBiens.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}

            {(searchTerm || selectedPeriod !== "__TOUTES__" || selectedBien !== "__TOUS__") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedPeriod("__TOUTES__");
                  setSelectedBien("__TOUS__");
                }}
                className="text-xs text-gray-500 hover:text-primary transition-colors flex items-center gap-1 px-2 py-2"
                title="Réinitialiser les filtres"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                <th className="px-6 py-4 font-medium">Date d'encaissement</th>
                <th className="px-6 py-4 font-medium">Logement &amp; Bien</th>
                <th className="px-6 py-4 font-medium">Locataire</th>
                <th className="px-6 py-4 font-medium">Période</th>
                <th className="px-6 py-4 font-medium">Mode</th>
                <th className="px-6 py-4 font-medium text-right">Montant Brut</th>
                <th className="px-6 py-4 font-medium text-right">Commission</th>
                <th className="px-6 py-4 font-medium text-right">Net à Reverser</th>
                <th className="px-6 py-4 font-medium text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {item.unit}
                      {item.property && (
                        <span className="block text-xs font-normal text-gray-500 mt-0.5">
                          {item.property}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {item.tenant}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md text-xs font-semibold">
                        {item.period}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 uppercase font-medium">
                      {item.method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                      {formatFCFA(item.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 text-right">
                      {item.commission > 0 ? `-${formatFCFA(item.commission)}` : "0 F CFA"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-emerald-600 text-right">
                      {formatFCFA(item.net)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge dot variant="warning">
                        En attente
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">Aucun loyer en attente de reversement</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Tous les loyers réglés par vos locataires ont déjà fait l'objet d'un virement de reversement officiel (CRG).
                      </p>
                      <div className="pt-2">
                        <Link
                          href="/proprietaire/releves"
                          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Consulter mes relevés de reversement <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
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
