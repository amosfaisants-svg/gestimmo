"use client";

import { useState, useEffect } from "react";
import { Building2, Users, X, Home, CheckCircle2, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatFCFA } from "@/lib/utils";
import { getPortalSession } from "@/lib/authSession";
import { loadAllDataFromDatabase } from "@/lib/dataService";

interface PropertyDetail {
  id: string;
  name: string;
  location: string;
  type: string;
  units: number;
  occupied: number;
  occupancyRate: number;
  monthlyRent: number;
  grossRevenue: number;
  commission: number;
  netRevenue: number;
  commissionRate: number;
  logementsList: any[];
}

export default function ProprietaireBiensPage() {
  const [properties, setProperties] = useState<PropertyDetail[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyDetail | null>(null);

  useEffect(() => {
    const loadData = async () => {
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
      }

      if (ownerObj) {
        const ownerName = (ownerObj.name || ownerObj.full_name || "").trim();
        const ownerId = (ownerObj.id || "").trim();

        const storedBiens = localStorage.getItem("gestimmo_biens");
        const biens: any[] = storedBiens ? JSON.parse(storedBiens) : [];
        const myBiens = biens.filter(
          (b: any) =>
            (b.owner && ownerName && b.owner.trim().toUpperCase() === ownerName.toUpperCase()) ||
            (b.ownerId && ownerId && String(b.ownerId) === String(ownerId))
        );

        const storedLogements = localStorage.getItem("gestimmo_logements");
        const logements: any[] = storedLogements ? JSON.parse(storedLogements) : [];

        const storedBaux = localStorage.getItem("gestimmo_baux");
        const baux: any[] = storedBaux ? JSON.parse(storedBaux) : [];

        const storedPaiements = localStorage.getItem("gestimmo_paiements");
        const paiements: any[] = storedPaiements ? JSON.parse(storedPaiements) : [];

        const rawRate =
          ownerObj.commissionRate !== undefined && ownerObj.commissionRate !== null && ownerObj.commissionRate !== ""
            ? Number(ownerObj.commissionRate)
            : (ownerObj.commission_rate !== undefined && ownerObj.commission_rate !== null && ownerObj.commission_rate !== ""
              ? Number(ownerObj.commission_rate)
              : 0);
        const validRate = isNaN(rawRate) ? 0 : rawRate;

        const detailedProperties: PropertyDetail[] = myBiens.map((b) => {
          const propLogements = logements.filter(
            (l: any) =>
              (l.property && b.name && l.property.trim().toUpperCase() === b.name.trim().toUpperCase()) ||
              (l.propertyId && b.id && l.propertyId === b.id)
          );

          const propUnitsIds = propLogements.map((l: any) => l.id);
          const propUnitsLabels = propLogements
            .map((l: any) => (l.unit || l.unit_number || l.name || "").trim().toUpperCase())
            .filter(Boolean);

          const propBaux = baux.filter((lease: any) => {
            const isActif =
              (lease.status || "").trim().toUpperCase() === "ACTIF" ||
              (lease.status || "").trim().toUpperCase() === "EN PRÉAVIS";
            if (!isActif) return false;
            return (
              (lease.property && b.name && lease.property.trim().toUpperCase() === b.name.trim().toUpperCase()) ||
              (lease.propertyId && b.id && lease.propertyId === b.id) ||
              propUnitsIds.includes(lease.unitId) ||
              propUnitsIds.includes(lease.unit) ||
              propUnitsLabels.includes((lease.unit || "").trim().toUpperCase())
            );
          });

          const configuredUnits = Number(b.units || b.unitsCount || b.units_count || 0);
          const units = Math.max(configuredUnits, propLogements.length, 1);

          // Build enriched units list with live leases
          const enrichedLogements = propLogements.map((l: any) => {
            const label = (l.unit || l.unit_number || l.name || "").trim().toUpperCase();
            const matchingLease = propBaux.find(
              (lease: any) =>
                lease.unitId === l.id ||
                lease.unit === l.id ||
                (lease.unit && (lease.unit || "").trim().toUpperCase() === label)
            );

            const isOccupied =
              (l.status || "").trim().toLowerCase().includes("occup") ||
              (l.tenant && l.tenant !== "-" && l.tenant !== "—") ||
              !!matchingLease;

            const tenantName = matchingLease?.tenant || l.tenant || "-";
            const rentVal = Number(matchingLease?.rent || l.rent || 0);

            return {
              ...l,
              isOccupied,
              tenant: tenantName,
              rent: rentVal,
              displayStatus: isOccupied ? "Occupé" : "Vacant",
            };
          });

          const occupiedCount = enrichedLogements.filter((l) => l.isOccupied).length;
          const finalOccupied = Math.min(units, Math.max(occupiedCount, propBaux.length));
          const occupancyRate = units > 0 ? Math.round((finalOccupied / units) * 100) : 0;

          // Potential monthly rental revenue
          const bauxMonthlyRent = propBaux.reduce((sum, lease) => sum + (Number(lease.rent || lease.loyer) || 0), 0);
          const occupiedRentSum = enrichedLogements
            .filter((l) => l.isOccupied)
            .reduce((sum, l) => sum + (Number(l.rent) || 0), 0);
          const monthlyRent = bauxMonthlyRent > 0 ? bauxMonthlyRent : (occupiedRentSum > 0 ? occupiedRentSum : (Number(b.revenue) || 0));

          // Cumulative payments collected
          const propPaiements = paiements.filter(
            (p: any) =>
              (
                propUnitsIds.includes(p.unitId) ||
                propUnitsIds.includes(p.unit) ||
                propUnitsLabels.includes((p.unit || "").trim().toUpperCase()) ||
                (p.propertyId && b.id && p.propertyId === b.id) ||
                (p.property && b.name && p.property.trim().toUpperCase() === b.name.trim().toUpperCase()) ||
                propBaux.some((lease: any) => lease.tenant === p.tenant || lease.unit === p.unit)
              ) &&
              (p.status === "VALIDÉ" || p.status === "PAYÉ")
          );

          const grossRevenue = propPaiements.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const commission = Math.round(grossRevenue * (validRate / 100));
          const netRevenue = grossRevenue - commission;

          return {
            id: b.id,
            name: b.name,
            location: b.location || b.address || "Abidjan, Côte d'Ivoire",
            type: b.type || "Immeuble",
            units,
            occupied: finalOccupied,
            occupancyRate,
            monthlyRent,
            grossRevenue,
            commission,
            netRevenue,
            commissionRate: validRate,
            logementsList: enrichedLogements,
          };
        });

        setProperties(detailedProperties);
      }
    };

    loadData();
  }, []);

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes Biens Immobiliers</h1>
        <p className="text-sm text-gray-500 mt-1">Consultez la rentabilité et l'occupation exacte de votre parc en gestion.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {properties.length > 0 ? (
          properties.map((property) => (
            <div
              key={property.id}
              className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="p-6 border-b border-app-border flex items-start gap-4">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate" title={property.name}>
                    {property.name}
                  </h2>
                  <p className="text-sm text-gray-500 truncate">{property.location}</p>
                  <div className="inline-block mt-2 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                    {property.type}
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4 flex-1">
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Occupation
                  </p>
                  <p className="text-base font-bold text-gray-900">
                    {property.occupied}{" "}
                    <span className="text-sm font-normal text-gray-500">/ {property.units} logement(s)</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Taux</p>
                  <p
                    className={`text-base font-bold ${
                      property.occupancyRate >= 90
                        ? "text-green-600"
                        : property.occupancyRate > 0
                        ? "text-orange-500"
                        : "text-red-500"
                    }`}
                  >
                    {property.occupancyRate}%
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-6 border-t border-app-border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenus générés</p>
                    {property.monthlyRent > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Potentiel : <span className="font-semibold text-gray-800">{formatFCFA(property.monthlyRent)}/mois</span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProperty(property)}
                    className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Détails
                  </button>
                </div>
                <div className="flex justify-between items-end mt-2 pt-2 border-t border-gray-200/60">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Brut encaissé : {formatFCFA(property.grossRevenue)}</p>
                    <p className="text-lg font-bold text-gray-900">Net : {formatFCFA(property.netRevenue)}</p>
                  </div>
                  {property.commissionRate > 0 && (
                    <span className="text-xs text-gray-500">Com. {property.commissionRate}% incluse</span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 bg-white rounded-2xl border border-app-border p-12 text-center text-gray-500">
            Aucun bien immobilier enregistré pour votre compte.
          </div>
        )}
      </div>

      {/* Modal Détails du bien et de ses logements */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-app-border shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-app-border flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedProperty.name}</h2>
                  <p className="text-xs text-gray-500">{selectedProperty.location} • {selectedProperty.type}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProperty(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Quick KPIs */}
            <div className="p-6 bg-gray-50/70 border-b border-app-border grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">Occupation</p>
                <p className="text-base font-bold text-gray-900">
                  {selectedProperty.occupied} / {selectedProperty.units}
                </p>
                <Badge variant={selectedProperty.occupancyRate >= 90 ? "success" : "alert"} dot className="mt-1">
                  {selectedProperty.occupancyRate}%
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Loyer Mensuel</p>
                <p className="text-base font-bold text-gray-900">
                  {formatFCFA(selectedProperty.monthlyRent)}
                </p>
                <span className="text-[11px] text-gray-400">Total / mois</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Encaissé</p>
                <p className="text-base font-bold text-primary">
                  {formatFCFA(selectedProperty.netRevenue)}
                </p>
                <span className="text-[11px] text-gray-400">Net propriétaire</span>
              </div>
            </div>

            {/* Modal Logements Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" />
                Liste des Logements ({selectedProperty.logementsList.length})
              </h3>

              {selectedProperty.logementsList.length > 0 ? (
                <div className="border border-app-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-primary-50/40 text-xs text-gray-600 uppercase font-semibold border-b border-app-border">
                      <tr>
                        <th className="px-4 py-3">Logement</th>
                        <th className="px-4 py-3">Locataire en place</th>
                        <th className="px-4 py-3 text-right">Loyer</th>
                        <th className="px-4 py-3 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {selectedProperty.logementsList.map((logement: any, idx: number) => (
                        <tr key={logement.id || idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {logement.unit || logement.unit_number || `Logement ${idx + 1}`}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {logement.tenant && logement.tenant !== "-" ? (
                              <span className="font-medium text-gray-900">{logement.tenant}</span>
                            ) : (
                              <span className="text-gray-400 italic">Aucun locataire</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {formatFCFA(logement.rent)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={logement.isOccupied ? "success" : "default"} dot>
                              {logement.displayStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">
                  Aucun logement individuel enregistré pour cet immeuble.
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-app-border flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProperty(null)}
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
