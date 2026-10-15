"use client";

import { useState, useEffect } from "react";
import { Building2, Users } from "lucide-react";
import Link from "next/link";
import { getPortalSession } from "@/lib/authSession";
import { loadAllDataFromDatabase } from "@/lib/dataService";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

export default function ProprietaireBiensPage() {
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      await loadAllDataFromDatabase();

      let ownerObj: any = getPortalSession("PROPRIETAIRE");
    if (!ownerObj) {
      const storedUser = localStorage.getItem("gestimmo_current_user");
      if (storedUser) {
        try { ownerObj = JSON.parse(storedUser); } catch (e) {}
      }
    }

    const storedOwners = localStorage.getItem("gestimmo_proprietaires");
    if (storedOwners) {
      const owners = JSON.parse(storedOwners);
      if (ownerObj?.id || ownerObj?.name) {
        const found = owners.find((o: any) =>
          (ownerObj.id && o.id === ownerObj.id) ||
          (ownerObj.name && o.name && o.name.trim().toUpperCase() === ownerObj.name.trim().toUpperCase())
        );
        if (found) ownerObj = found;
      }
      if (!ownerObj && owners.length > 0) ownerObj = owners[0];
    }

    if (ownerObj) {
      const ownerName = ownerObj.name || "";

      const storedBiens = localStorage.getItem("gestimmo_biens");
      const biens: any[] = storedBiens ? JSON.parse(storedBiens) : [];
      const myBiens = biens.filter((b: any) => b.owner && ownerName && b.owner.trim().toUpperCase() === ownerName.trim().toUpperCase());

      const storedLogements = localStorage.getItem("gestimmo_logements");
      const logements: any[] = storedLogements ? JSON.parse(storedLogements) : [];

      const storedPaiements = localStorage.getItem("gestimmo_paiements");
      const paiements: any[] = storedPaiements ? JSON.parse(storedPaiements) : [];

      const rawRate = ownerObj.commissionRate !== undefined && ownerObj.commissionRate !== null && ownerObj.commissionRate !== ""
        ? Number(ownerObj.commissionRate)
        : (ownerObj.commission_rate !== undefined && ownerObj.commission_rate !== null && ownerObj.commission_rate !== ""
          ? Number(ownerObj.commission_rate)
          : 10);
      const validRate = isNaN(rawRate) ? 10 : rawRate;

      const detailedProperties = myBiens.map((b) => {
        const propLogements = logements.filter((l: any) => l.property && b.name && l.property.trim().toUpperCase() === b.name.trim().toUpperCase());
        const units = propLogements.length > 0 ? propLogements.length : (b.units || 1);
        const occupied = propLogements.filter((l: any) => l.status === "OCCUPÉ" || (l.tenant && l.tenant !== "-")).length;

        const propUnitsIds = propLogements.map((l: any) => l.id);
        const propPaiements = paiements.filter((p: any) =>
          (propUnitsIds.includes(p.unit) || (p.property && b.name && p.property.trim().toUpperCase() === b.name.trim().toUpperCase())) &&
          (p.status === "VALIDÉ" || p.status === "PAYÉ")
        );
        const grossRevenue = propPaiements.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const commission = Math.round(grossRevenue * (validRate / 100));

        return {
          id: b.id,
          name: b.name,
          location: b.location || "Abidjan, Côte d'Ivoire",
          type: b.type || "Immeuble",
          units,
          occupied,
          grossRevenue,
          commission,
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
        <p className="text-sm text-gray-500 mt-1">Consultez la rentabilité et l'occupation de votre parc en gestion.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {properties.length > 0 ? properties.map(property => (
          <div key={property.id} className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-app-border flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">{property.name}</h2>
                <p className="text-sm text-gray-500 truncate">{property.location}</p>
                <div className="inline-block mt-2 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                  {property.type}
                </div>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-4 flex-1">
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Occupation</p>
                <p className="text-base font-bold text-gray-900">{property.occupied} <span className="text-sm font-normal text-gray-500">/ {property.units} logement(s)</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Taux</p>
                <p className={`text-base font-bold ${Math.round((property.occupied/property.units)*100) > 90 ? 'text-green-600' : 'text-orange-500'}`}>
                  {property.units > 0 ? Math.round((property.occupied/property.units)*100) : 0}%
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 border-t border-app-border">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Revenus générés</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Brut : {formatFCFA(property.grossRevenue)}</p>
                  <p className="text-lg font-bold text-gray-900">Net : {formatFCFA(property.grossRevenue - property.commission)}</p>
                </div>
                <Link href={`/app/biens/${property.id}`} className="text-sm font-medium text-primary hover:underline">
                  Détails
                </Link>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-2 bg-white rounded-2xl border border-app-border p-12 text-center text-gray-500">
            Aucun bien immobilier enregistré pour votre compte.
          </div>
        )}
      </div>
    </div>
  );
}
