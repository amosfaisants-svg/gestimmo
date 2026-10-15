"use client";

import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Building2, Phone, Mail, FileText, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchOwners } from "@/lib/dataService";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const payouts = [
  { id: "REV-1092", period: "Août 2026", collected: 5500000, commission: 550000, amount: 4950000, date: "05 Sept 2026", status: "EFFECTUÉ" },
  { id: "REV-1044", period: "Juillet 2026", collected: 5300000, commission: 530000, amount: 4770000, date: "05 Août 2026", status: "EFFECTUÉ" },
];

export default function OwnerDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const [owner, setOwner] = useState<any>(null);
  const [managedProperties, setManagedProperties] = useState<any[]>([]);

  useEffect(() => {
    const loadOwner = async () => {
      let found: any = null;
      const storedOwners = localStorage.getItem("gestimmo_proprietaires");
      if (storedOwners) {
        const owners = JSON.parse(storedOwners);
        found = owners.find((o: any) => o.id === id || String(o.id) === String(id));
      }

      if (!found) {
        const dbOwners = await fetchOwners();
        const dbFound = dbOwners.find((o: any) => o.id === id || String(o.id) === String(id));
        if (dbFound) {
          found = {
            id: dbFound.id,
            code: dbFound.id_card_number || `PR-${dbFound.id.slice(0, 6)}`,
            type: "particulier",
            name: dbFound.full_name,
            phone: dbFound.phone,
            email: dbFound.email || "",
            adresse: dbFound.address || "",
            commissionRate: (dbFound.commission_rate !== undefined && dbFound.commission_rate !== null) ? Number(dbFound.commission_rate) : 10,
          };
        }
      }

      if (found) {
        setOwner(found);

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
        }
      }
    };

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
          <Link href="/app/reversements">
            <button type="button" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm">
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
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                    <th className="px-6 py-3 font-medium">Relevé</th>
                    <th className="px-6 py-3 font-medium">Période</th>
                    <th className="px-6 py-3 font-medium text-center">Encaissé</th>
                    <th className="px-6 py-3 font-medium text-center">Net reversé</th>
                    <th className="px-6 py-3 font-medium text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <Link href="/app/reversements" className="text-sm font-semibold text-primary hover:underline flex items-center">
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                          {payout.id}
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
                        <Badge dot variant="success">
                          {payout.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
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
        </div>
      </div>
    </div>
  );
}
