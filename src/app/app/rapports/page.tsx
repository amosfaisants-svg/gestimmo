"use client";

import { useState, useEffect, useRef } from "react";
import { 
  BarChart3, Download, PieChart, TrendingUp, Calendar, 
  Building2, Users, Printer, FileText, X, Filter, 
  Briefcase, UserCheck, FileSpreadsheet, Eye, Search, AlertCircle, ChevronDown, Check, Clock,
  Receipt, CheckCircle2, RotateCcw, Megaphone, MessageSquare, ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { loadAllDataFromDatabase } from "@/lib/dataService";
import { syncPaymentsWithLeases, formatUnitDisplay, getPaymentDisplayCode } from "@/lib/utils";
import { getStoredCompanyInfo } from "@/lib/companyInfo";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

// --------------------------------------------------------------------------
// COMPOSANT SÉLECTEUR DE PÉRIODES COMPLET & CALENDRIER (POPOVER MODAL FIXÉ)
// --------------------------------------------------------------------------
function CompletePeriodSelector({
  value,
  onChange,
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<"rapide" | "2026" | "2025" | "trimestres" | "annuel">("rapide");

  const handleSelectOption = (periodName: string) => {
    onChange(periodName);
    setIsCustomMode(false);
    setIsOpen(false);
  };

  const handleApplyCustomDates = () => {
    if (startDate && endDate) {
      const d1 = new Date(startDate).toLocaleDateString("fr-FR");
      const d2 = new Date(endDate).toLocaleDateString("fr-FR");
      onChange(`Du ${d1} au ${d2}`);
    } else if (startDate) {
      const d1 = new Date(startDate).toLocaleDateString("fr-FR");
      onChange(`Depuis le ${d1}`);
    }
    setIsCustomMode(false);
    setIsOpen(false);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Période :</span>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-white border border-app-border hover:border-primary/60 text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 shadow-sm transition-all flex items-center gap-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
      >
        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="truncate max-w-[150px] sm:max-w-[200px] text-gray-900 font-bold">{value}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>

      {/* MODAL POPOVER OVERLAY CENTRÉ INROGNABLE */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-app-border overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-app-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Sélecteur de Période Immobilier</h3>
                  <p className="text-[11px] text-gray-500">Choisir un mois, un trimestre, une année ou une plage personnalisée</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-app-border bg-gray-100/60 p-2 gap-1 overflow-x-auto text-xs font-medium">
              {[
                { id: "rapide", label: "⚡ Rapides" },
                { id: "2026", label: "📅 2026" },
                { id: "2025", label: "📅 2025" },
                { id: "trimestres", label: "📊 Trimestres" },
                { id: "annuel", label: "🗓️ Bilans" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id as any); setIsCustomMode(false); }}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id && !isCustomMode ? "bg-white font-bold text-primary shadow-xs" : "text-gray-600 hover:text-gray-900 hover:bg-white/50"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="p-4 max-h-[340px] overflow-y-auto space-y-3">

              {/* TAB 1: RAPIDES */}
              {activeTab === "rapide" && !isCustomMode && (
                <div className="space-y-1.5">
                  {[
                    { label: "Octobre 2026 (Mois en cours)", val: "Octobre 2026" },
                    { label: "Septembre 2026 (Mois dernier)", val: "Septembre 2026" },
                    { label: "Toutes les périodes (Historique complet)", val: "Toutes les périodes" },
                    { label: "3ème Trimestre 2026 (Juil - Sept)", val: "3ème Trimestre 2026" },
                    { label: "4ème Trimestre 2026 (Oct - Déc)", val: "4ème Trimestre 2026" },
                    { label: "Année 2026 Complet", val: "Année 2026 Complet" },
                    { label: "Année 2025 Complet", val: "Année 2025 Complet" },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => handleSelectOption(item.val)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${value === item.val ? "bg-primary/10 text-primary font-bold border border-primary/20" : "hover:bg-gray-50 border border-transparent text-gray-700 font-medium"}`}
                    >
                      <span>{item.label}</span>
                      {value === item.val && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}

              {/* TAB 2: MOIS 2026 */}
              {activeTab === "2026" && !isCustomMode && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Janvier 2026", "Février 2026", "Mars 2026", "Avril 2026",
                    "Mai 2026", "Juin 2026", "Juillet 2026", "Août 2026",
                    "Septembre 2026", "Octobre 2026", "Novembre 2026", "Décembre 2026"
                  ].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectOption(m)}
                      className={`text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${value === m ? "bg-primary text-white font-bold shadow-xs" : "bg-gray-50 hover:bg-gray-100 text-gray-800 font-medium"}`}
                    >
                      <span className="truncate">{m}</span>
                      {value === m && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              )}

              {/* TAB 3: MOIS 2025 */}
              {activeTab === "2025" && !isCustomMode && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Janvier 2025", "Février 2025", "Mars 2025", "Avril 2025",
                    "Mai 2025", "Juin 2025", "Juillet 2025", "Août 2025",
                    "Septembre 2025", "Octobre 2025", "Novembre 2025", "Décembre 2025"
                  ].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectOption(m)}
                      className={`text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${value === m ? "bg-primary text-white font-bold shadow-xs" : "bg-gray-50 hover:bg-gray-100 text-gray-800 font-medium"}`}
                    >
                      <span className="truncate">{m}</span>
                      {value === m && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              )}

              {/* TAB 4: TRIMESTRES & SEMESTRES */}
              {activeTab === "trimestres" && !isCustomMode && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Trimestres 2026</span>
                  <div className="space-y-1">
                    {[
                      "1er Trimestre 2026 (Jan - Mar)",
                      "2ème Trimestre 2026 (Avr - Jun)",
                      "3ème Trimestre 2026 (Jul - Sep)",
                      "4ème Trimestre 2026 (Oct - Déc)",
                    ].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectOption(t)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${value === t ? "bg-primary/10 text-primary font-bold border border-primary/20" : "bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"}`}
                      >
                        <span>{t}</span>
                        {value === t && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>

                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1 pt-2">Semestres 2026</span>
                  <div className="space-y-1">
                    {[
                      "1er Semestre 2026 (Jan - Jun)",
                      "2ème Semestre 2026 (Jul - Déc)",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSelectOption(s)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${value === s ? "bg-primary/10 text-primary font-bold border border-primary/20" : "bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"}`}
                      >
                        <span>{s}</span>
                        {value === s && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: BILANS ANNUELS */}
              {activeTab === "annuel" && !isCustomMode && (
                <div className="space-y-1.5">
                  {[
                    "Année 2026 Complet",
                    "Année 2025 Complet",
                    "Année 2024 Complet",
                    "Année 2023 Complet",
                    "Toutes les périodes (Historique complet)"
                  ].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => handleSelectOption(y)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${value === y ? "bg-primary/10 text-primary font-bold border border-primary/20" : "bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"}`}
                    >
                      <span>{y}</span>
                      {value === y && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}

              {/* MODE DATES SUR MESURE (CALENDRIER) */}
              {isCustomMode && (
                <div className="space-y-4 py-2">
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                    <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary" />
                      Sélectionnez une période personnalisée
                    </p>
                    <p className="text-[11px] text-blue-700 mt-0.5">Choisissez les dates précises de début et de fin du rapport.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Date de début :</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-app-border rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Date de fin :</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-app-border rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(false)}
                      className="px-4 py-2 border border-app-border text-xs font-semibold rounded-xl text-gray-700 hover:bg-gray-50"
                    >
                      Retour aux onglets
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyCustomDates}
                      className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 shadow-sm"
                    >
                      Appliquer la plage
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom bar for switching to custom calendar mode */}
            {!isCustomMode && (
              <div className="p-3 bg-gray-50 border-t border-app-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>📅 Choisir des dates précises sur le calendrier</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white border border-app-border rounded-lg"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Initial default data fallback if localStorage is empty
const defaultOwners = [
  { id: "O-123", code: "PR-KI-100123", type: "entreprise", name: "Kouadio Invest", phone: "+225 0102030405", email: "contact@kouadio-invest.com", propertiesCount: 2, totalCollected: 3500000, balance: 3150000 },
  { id: "O-124", code: "PR-MT-100124", type: "particulier", name: "Mme. Traoré", phone: "+225 0708091011", email: "traore@email.com", propertiesCount: 1, totalCollected: 800000, balance: 720000 },
  { id: "O-125", code: "PR-SZ-100125", type: "entreprise", name: "SCI Zenith", phone: "+225 0506070809", email: "gestion@scizenith.com", propertiesCount: 3, totalCollected: 2100000, balance: 1890000 },
];

const defaultBiens = [
  { id: "B-001", name: "Résidence Les Flamboyants", type: "Immeuble", owner: "Kouadio Invest", units: 24, occupied: 22, revenue: 3500000, address: "Cocody Ambassades" },
  { id: "B-002", name: "Villa Palmeraie", type: "Villa", owner: "Mme. Traoré", units: 1, occupied: 1, revenue: 800000, address: "Palmeraie BD Ministres" },
  { id: "B-003", name: "Immeuble Horizon", type: "Immeuble", owner: "Biens Propres", units: 40, occupied: 38, revenue: 5200000, address: "Plateau Centre" },
  { id: "B-004", name: "Complexe Riviera", type: "Résidence fermée", owner: "SCI Zenith", units: 15, occupied: 12, revenue: 2100000, address: "Riviera 3" },
];

const defaultLogements = [
  { id: "A-101", property: "Résidence Les Flamboyants", type: "3 Pièces", rent: 150000, tenant: "Cora Richards", status: "OCCUPÉ", phone: "+225 01020304" },
  { id: "A-102", property: "Résidence Les Flamboyants", type: "4 Pièces", rent: 200000, tenant: "Bibi Shelton", status: "OCCUPÉ", phone: "+225 07080910" },
  { id: "B-201", property: "Résidence Les Flamboyants", type: "3 Pièces", rent: 150000, tenant: "-", status: "NON OCCUPÉ", phone: "-" },
  { id: "B-204", property: "Résidence Les Flamboyants", type: "2 Pièces", rent: 3150000, tenant: "Alistair Dunlap", status: "OCCUPÉ", phone: "+225 05060708" },
  { id: "V-001", property: "Villa Palmeraie", type: "Villa", rent: 800000, tenant: "Jean Dupont", status: "OCCUPÉ", phone: "+225 01445566" },
  { id: "C-101", property: "Complexe Riviera", type: "Duplex", rent: 2100000, tenant: "Sery Paul", status: "OCCUPÉ", phone: "+225 07778899" },
  { id: "C-201", property: "Complexe Riviera", type: "3 Pièces", rent: 450000, tenant: "Marcelle Yao", status: "OCCUPÉ", phone: "+225 05554433" },
  { id: "H-101", property: "Immeuble Horizon", type: "Studio", rent: 120000, tenant: "Koffi Yves", status: "OCCUPÉ", phone: "+225 01112233" },
];

const defaultManagers = [
  { id: "M-001", name: "Aron Levine", role: "Super Admin", phone: "+225 0102030405", email: "aron@gestimmo.ci", propertiesCount: 5, performance: 94, collected: 8500000, assignedLogements: ["A-101", "A-102", "B-204", "H-101"] },
  { id: "M-002", name: "Sarah Kone", role: "Gérante", phone: "+225 0708091011", email: "sarah@gestimmo.ci", propertiesCount: 4, performance: 82, collected: 4200000, assignedLogements: ["V-001", "B-201"] },
  { id: "M-003", name: "Marc Dubois", role: "Gérant", phone: "+225 0506070809", email: "marc@gestimmo.ci", propertiesCount: 2, performance: 100, collected: 2100000, assignedLogements: ["C-101", "C-201"] },
];

const defaultBaux = [
  { id: "L-101", code: "B-2026-1001", tenant: "Cora Richards", unit: "A-101", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", rent: 130000, charges: 20000, status: "ACTIF" },
  { id: "L-102", code: "B-2026-1002", tenant: "Bibi Shelton", unit: "A-102", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", rent: 180000, charges: 20000, status: "ACTIF" },
  { id: "L-301", code: "B-2026-1003", tenant: "Sery Paul", unit: "C-101", property: "Complexe Riviera", owner: "SCI Zenith", rent: 1950000, charges: 150000, status: "ACTIF" },
  { id: "L-302", code: "B-2026-1004", tenant: "Marcelle Yao", unit: "C-201", property: "Complexe Riviera", owner: "SCI Zenith", rent: 400000, charges: 50000, status: "ACTIF" },
  { id: "L-401", code: "B-2026-1005", tenant: "Koffi Yves", unit: "H-101", property: "Immeuble Horizon", owner: "Biens Propres", rent: 110000, charges: 10000, status: "ACTIF" },
  { id: "L-204", code: "B-2026-1006", tenant: "Alistair Dunlap", unit: "B-204", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", rent: 3150000, charges: 0, status: "ACTIF" },
  { id: "L-001", code: "B-2026-1007", tenant: "Jean Dupont", unit: "V-001", property: "Villa Palmeraie", owner: "Mme. Traoré", rent: 800000, charges: 0, status: "ACTIF" },
];

const defaultPaiements = [
  { id: "P-1925", code: "REC-2026-001", tenant: "Cora Richards", unit: "A-101", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", date: "05 Oct 2026", period: "Octobre 2026", amount: 150000, method: "Virement", status: "VALIDÉ" },
  { id: "P-1927", code: "REC-2026-002", tenant: "Bibi Shelton", unit: "A-102", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", date: "07 Oct 2026", period: "Octobre 2026", amount: 200000, method: "Espèces", status: "VALIDÉ" },
  { id: "P-1930", code: "REC-2026-003", tenant: "Sery Paul", unit: "C-101", property: "Complexe Riviera", owner: "SCI Zenith", date: "04 Oct 2026", period: "Octobre 2026", amount: 2100000, method: "Mobile Money", status: "VALIDÉ" },
  { id: "P-1931", code: "REC-2026-004", tenant: "Marcelle Yao", unit: "C-201", property: "Complexe Riviera", owner: "SCI Zenith", date: "08 Oct 2026", period: "Octobre 2026", amount: 450000, method: "Virement", status: "VALIDÉ" },
  { id: "P-1932", code: "REC-2026-005", tenant: "Koffi Yves", unit: "H-101", property: "Immeuble Horizon", owner: "Biens Propres", date: "02 Oct 2026", period: "Octobre 2026", amount: 120000, method: "Espèces", status: "VALIDÉ" },
  { id: "P-1926", code: "REC-2026-006", tenant: "Alistair Dunlap", unit: "B-204", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", date: "06 Oct 2026", period: "Octobre 2026", amount: 3150000, method: "Wave", status: "EN RETARD" },
  { id: "P-1928", code: "REC-2026-007", tenant: "Jean Dupont", unit: "V-001", property: "Villa Palmeraie", owner: "Mme. Traoré", date: "01 Oct 2026", period: "Octobre 2026", amount: 800000, method: "Chèque", status: "REJETÉ" },
  { id: "P-1920", code: "REC-2026-008", tenant: "Cora Richards", unit: "A-101", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", date: "05 Sept 2026", period: "Septembre 2026", amount: 150000, method: "Virement", status: "VALIDÉ" },
  { id: "P-1921", code: "REC-2026-009", tenant: "Bibi Shelton", unit: "A-102", property: "Résidence Les Flamboyants", owner: "Kouadio Invest", date: "06 Sept 2026", period: "Septembre 2026", amount: 200000, method: "Espèces", status: "VALIDÉ" },
  { id: "P-1922", code: "REC-2026-010", tenant: "Sery Paul", unit: "C-101", property: "Complexe Riviera", owner: "SCI Zenith", date: "03 Sept 2026", period: "Septembre 2026", amount: 2100000, method: "Mobile Money", status: "VALIDÉ" },
];

type ReportType = "OWNERS" | "MANAGERS" | "FINANCIAL" | "UNPAID" | "TENANTS" | "RECEIPTS" | null;

export default function RapportsPage() {
  const { can } = usePermissions();

  const [owners, setOwners] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [logements, setLogements] = useState<any[]>([]);
  const [baux, setBaux] = useState<any[]>([]);
  const [gerants, setGerants] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);

  // Filter states inside report generator
  const [activeReportModal, setActiveReportModal] = useState<ReportType>(null);
  
  // Specific Filters
  const [ownerTypeFilter, setOwnerTypeFilter] = useState<"ALL" | "entreprise" | "particulier">("ALL");
  const [selectedGerantId, setSelectedGerantId] = useState<string>("ALL");
  const [bienFilter, setBienFilter] = useState<string>("ALL");
  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>("ALL");
  const [periodFilter, setPeriodFilter] = useState<string>("Octobre 2026");
  const [searchQuery, setSearchQuery] = useState("");

  // Specific Filters for Receipts (Quittances des locataires à jour)
  const [receiptOwnerFilter, setReceiptOwnerFilter] = useState<string>("ALL");
  const [receiptBienFilter, setReceiptBienFilter] = useState<string>("ALL");
  const [receiptUnitFilter, setReceiptUnitFilter] = useState<string>("ALL");
  const [receiptPeriodFilter, setReceiptPeriodFilter] = useState<string>("Octobre 2026");
  const [isBulkDownloading, setIsBulkDownloading] = useState<boolean>(false);

  // Note d'information personnalisée imprimée sur les quittances
  const [receiptCustomNote, setReceiptCustomNote] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gestimmo_quittances_custom_note") || "";
    }
    return "";
  });
  const [isCustomNoteModalOpen, setIsCustomNoteModalOpen] = useState<boolean>(false);
  const [tempNoteText, setTempNoteText] = useState<string>("");

  const openCustomNoteModal = () => {
    setTempNoteText(receiptCustomNote);
    setIsCustomNoteModalOpen(true);
  };

  const handleSaveCustomNote = () => {
    const trimmed = tempNoteText.trim();
    setReceiptCustomNote(trimmed);
    if (typeof window !== "undefined") {
      if (trimmed) {
        localStorage.setItem("gestimmo_quittances_custom_note", trimmed);
      } else {
        localStorage.removeItem("gestimmo_quittances_custom_note");
      }
    }
    setIsCustomNoteModalOpen(false);
  };

  const handleClearCustomNote = () => {
    setTempNoteText("");
    setReceiptCustomNote("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("gestimmo_quittances_custom_note");
    }
    setIsCustomNoteModalOpen(false);
  };

  useEffect(() => {
    const initData = async () => {
      const dbState = await loadAllDataFromDatabase();
      if (dbState) {
        setOwners(dbState.owners && dbState.owners.length > 0 ? dbState.owners : defaultOwners);
        setBiens(dbState.properties && dbState.properties.length > 0 ? dbState.properties : defaultBiens);
        setLogements(dbState.units && dbState.units.length > 0 ? dbState.units : defaultLogements);
        setBaux(dbState.leases && dbState.leases.length > 0 ? dbState.leases : defaultBaux);
        setPaiements(syncPaymentsWithLeases(dbState.payments && dbState.payments.length > 0 ? dbState.payments : defaultPaiements, dbState.leases && dbState.leases.length > 0 ? dbState.leases : defaultBaux));
        setGerants(dbState.profiles && dbState.profiles.length > 0 ? dbState.profiles : defaultManagers);
      } else {
        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        setOwners(storedOwners ? JSON.parse(storedOwners) : defaultOwners);

        const storedBiens = localStorage.getItem("gestimmo_biens");
        setBiens(storedBiens ? JSON.parse(storedBiens) : defaultBiens);

        const storedLogements = localStorage.getItem("gestimmo_logements");
        setLogements(storedLogements ? JSON.parse(storedLogements) : defaultLogements);

        const storedBaux = localStorage.getItem("gestimmo_baux");
        const bList = storedBaux ? JSON.parse(storedBaux) : defaultBaux;
        setBaux(bList);

        const storedGerants = localStorage.getItem("gestimmo_equipe");
        setGerants(storedGerants ? JSON.parse(storedGerants) : defaultManagers);

        const storedPaiements = localStorage.getItem("gestimmo_paiements");
        const pList = storedPaiements ? JSON.parse(storedPaiements) : defaultPaiements;
        setPaiements(syncPaymentsWithLeases(pList, bList));
      }
    };

    initData();
  }, []);

  if (!can("paiements", "view")) {
    return <AccessDeniedCard moduleName="Rapports & Statistiques" />;
  }

  // Reset filters when opening a modal
  const openModal = (type: ReportType) => {
    setSearchQuery("");
    setBienFilter("ALL");
    setSelectedGerantId("ALL");
    setOwnerTypeFilter("ALL");
    setTenantStatusFilter("ALL");
    setReceiptOwnerFilter("ALL");
    setReceiptBienFilter("ALL");
    setReceiptUnitFilter("ALL");
    setReceiptPeriodFilter(periodFilter);
    setActiveReportModal(type);
  };

  // Helper CSV Exporter
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(";"), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper Print Window
  const handlePrintHTML = (
    title: string, 
    htmlContent: string, 
    options?: { hideReportHeaderFooter?: boolean; pageMargin?: string; customCSS?: string }
  ) => {
    const printWindow = window.open("", "", "height=900,width=1100");
    if (printWindow) {
      const hideHeaderFooter = options?.hideReportHeaderFooter ?? false;
      const margin = options?.pageMargin ?? (hideHeaderFooter ? "6mm 8mm" : "1.5cm");
      const customCSS = options?.customCSS ?? "";

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      primary: {
                        DEFAULT: '#F0492B',
                        50: '#FFF1EE',
                      },
                      app: {
                        border: '#EEEDEB',
                        bg: '#F7F6F5',
                      }
                    }
                  }
                }
              }
            </script>
            <style>
              @media print {
                html, body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                }
                .no-print { display: none !important; }
                @page { size: A4 portrait; margin: ${margin}; }
              }
              * { box-sizing: border-box; }
              ${customCSS}
            </style>
          </head>
          <body class="${hideHeaderFooter ? 'p-0 m-0 bg-white font-sans text-gray-900 w-full' : 'p-8 bg-white font-sans text-gray-900 max-w-5xl mx-auto'}">
            ${hideHeaderFooter ? '' : `
            <div class="border-b-2 border-primary pb-4 mb-6 flex justify-between items-end">
              <div>
                <h1 class="text-2xl font-bold text-gray-900 tracking-tight">GESTIMMO</h1>
                <p class="text-sm font-semibold text-primary">Plateforme de Gestion Immobilière</p>
                <p class="text-xs text-gray-500 mt-1">${title}</p>
              </div>
              <div class="text-right text-xs text-gray-500">
                <p>Édité le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                <p class="font-bold text-gray-700 mt-0.5">Confidentiel - Document Officiel</p>
              </div>
            </div>
            `}
            ${htmlContent}
            ${hideHeaderFooter ? '' : `
            <div class="mt-12 pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400">
              <span>GESTIMMO &copy; ${new Date().getFullYear()} - Tous droits réservés</span>
              <span>Page 1 / 1</span>
            </div>
            `}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const normalizeStr = (str?: string) => (str ? str.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "");

  const matchesPeriod = (p: any, target: string) => {
    if (!target || target === "Toutes les périodes" || target === "Historique") return true;
    
    const pPeriod = (p.period || p.periode || "").toString().toLowerCase().trim();
    const pDate = (p.date || "").toString().toLowerCase().trim();
    const targetNorm = target.toLowerCase().trim();

    // Direct match with period or date
    if (pPeriod === targetNorm || pDate === targetNorm) return true;

    // Check if target is a specific month + year
    const monthNamesMap: { [key: string]: string[] } = {
      janvier: ["janvier", "janv", "01"],
      février: ["février", "fevrier", "févr", "fevr", "02"],
      mars: ["mars", "03"],
      avril: ["avril", "avr", "04"],
      mai: ["mai", "05"],
      juin: ["juin", "06"],
      juillet: ["juillet", "juil", "07"],
      août: ["août", "aout", "08"],
      septembre: ["septembre", "sept", "09"],
      octobre: ["octobre", "oct", "10"],
      novembre: ["novembre", "nov", "11"],
      décembre: ["décembre", "decembre", "déc", "dec", "12"]
    };

    const targetYearMatch = targetNorm.match(/\d{4}/);
    const targetYear = targetYearMatch ? targetYearMatch[0] : null;

    for (const [mName, aliases] of Object.entries(monthNamesMap)) {
      if (targetNorm.includes(mName)) {
        const matchesMonthInPayment = aliases.some(alias => pPeriod.includes(alias) || pDate.includes(alias));
        const matchesYearInPayment = targetYear ? (pPeriod.includes(targetYear) || pDate.includes(targetYear)) : true;
        if (matchesMonthInPayment && matchesYearInPayment) return true;
      }
    }

    // Check trimester (e.g. "3ème Trimestre 2026")
    if (targetNorm.includes("trimestre")) {
      const qMatch = targetNorm.match(/(\d)(?:er|ème|eme)?\s*trimestre/);
      if (qMatch) {
        const qNum = parseInt(qMatch[1], 10);
        let qMonths: string[] = [];
        if (qNum === 1) qMonths = ["janvier", "janv", "février", "fevrier", "mars", "-01", "-02", "-03"];
        else if (qNum === 2) qMonths = ["avril", "avr", "mai", "juin", "-04", "-05", "-06"];
        else if (qNum === 3) qMonths = ["juillet", "juil", "août", "aout", "septembre", "sept", "-07", "-08", "-09"];
        else if (qNum === 4) qMonths = ["octobre", "oct", "novembre", "nov", "décembre", "decembre", "-10", "-11", "-12"];

        const matchesMonth = qMonths.some(m => pPeriod.includes(m) || pDate.includes(m));
        const matchesYear = targetYear ? (pPeriod.includes(targetYear) || pDate.includes(targetYear)) : true;
        if (matchesMonth && matchesYear) return true;
      }
    }

    // Check full year (e.g. "Année 2026" or "2026")
    if (targetYear && (targetNorm.includes("année") || targetNorm.includes("annee"))) {
      if (pPeriod.includes(targetYear) || pDate.includes(targetYear)) return true;
    }

    return false;
  };

  const getBienCalculatedStats = (b: any, targetPeriod: string = periodFilter) => {
    const bienNameNorm = normalizeStr(b.name);
    const bienIdNorm = normalizeStr(b.id);

    // 1. Logements linked to this property
    const propLogements = logements.filter((l: any) => {
      const lProp = normalizeStr(l.property || l.bien || l.propertyName);
      const lPropId = normalizeStr(l.propertyId || l.bienId);
      return (
        (bienNameNorm && (lProp === bienNameNorm || lProp.includes(bienNameNorm) || bienNameNorm.includes(lProp))) ||
        (bienIdNorm && lPropId === bienIdNorm)
      );
    });

    const propLogementIds = propLogements.map((l: any) => normalizeStr(l.id));

    // 2. Baux linked to this property or its logements
    const propBaux = baux.filter((bx: any) => {
      const bxProp = normalizeStr(bx.property || bx.bien);
      const bxUnit = normalizeStr(bx.unit || bx.logementId || bx.unitId);
      return (
        (bienNameNorm && (bxProp === bienNameNorm || bxProp.includes(bienNameNorm) || bienNameNorm.includes(bxProp))) ||
        (bxUnit && propLogementIds.includes(bxUnit))
      );
    });

    // 3. Paiements linked to this property or its logements
    const propPaiements = paiements.filter((p: any) => {
      const pProp = normalizeStr(p.property || p.bien);
      const pUnit = normalizeStr(p.unit || p.logementId || p.unitId);
      return (
        (bienNameNorm && (pProp === bienNameNorm || pProp.includes(bienNameNorm) || bienNameNorm.includes(pProp))) ||
        (pUnit && propLogementIds.includes(pUnit))
      );
    });

    // Units count
    const unitsCount = propLogements.length > 0
      ? propLogements.length
      : (Number(b.units || b.nombreLogements || b.logementsCount) || 1);

    // Occupied count
    const occupiedLogements = propLogements.filter(
      (l: any) => l.status === "OCCUPÉ" || l.statut === "OCCUPE" || (l.tenant && l.tenant !== "-") || (l.locataire && l.locataire !== "-")
    );
    const activeBaux = propBaux.filter((bx: any) => bx.status === "ACTIF" || bx.statut === "ACTIF");

    let occupiedCount = 0;
    if (occupiedLogements.length > 0) {
      occupiedCount = occupiedLogements.length;
    } else if (activeBaux.length > 0) {
      occupiedCount = activeBaux.length;
    } else if (propBaux.length > 0) {
      occupiedCount = propBaux.length;
    } else {
      occupiedCount = Number(b.occupied || b.logementsOccupes || 0);
    }

    // Gross Revenue (Encaissements valides perçus pour la période demandée)
    const validPaiements = propPaiements.filter((p: any) => {
      const status = (p.status || p.statut || "").toUpperCase();
      const isValidStatus = status === "VALIDÉ" || status === "VALIDE" || status === "PAYÉ" || status === "PAYE" || status === "EFFECTUÉ" || status === "EFFECTUE";
      return isValidStatus && matchesPeriod(p, targetPeriod);
    });

    const paidSum = validPaiements.reduce((sum: number, p: any) => sum + (Number(p.montant || p.amount) || 0), 0);

    let grossRevenue = 0;
    const isAllPeriods = !targetPeriod || targetPeriod === "Toutes les périodes" || targetPeriod === "Historique";

    if (!isAllPeriods) {
      // Pour une période spécifique (ex: "Septembre 2026"), le Chiffre d'Affaires Brut
      // correspond aux encaissements valides perçus pour ce filtre.
      grossRevenue = paidSum;
    } else {
      if (paidSum > 0) {
        grossRevenue = paidSum;
      } else {
        const rentFromLogements = propLogements.reduce((sum: number, l: any) => sum + (Number(l.rent || l.loyer || l.prix) || 0), 0);
        const rentFromBaux = propBaux.reduce((sum: number, bx: any) => sum + (Number(bx.rent || bx.loyer || bx.montant) || 0), 0);
        if (rentFromLogements > 0) grossRevenue = rentFromLogements;
        else if (rentFromBaux > 0) grossRevenue = rentFromBaux;
        else grossRevenue = Number(b.revenue || b.loyerTotal || b.loyerMensuel || 0);
      }
    }

    return {
      unitsCount,
      occupiedCount,
      grossRevenue,
      propLogements,
      propBaux,
      propPaiements
    };
  };

  // -------------------------------------------------------------
  // 1. DATA CALCULATIONS FOR OWNERS & COMPANIES
  // -------------------------------------------------------------
  const filteredOwners = owners.filter(o => {
    if (ownerTypeFilter === "entreprise") return o.type === "entreprise";
    if (ownerTypeFilter === "particulier") return o.type === "particulier";
    return true;
  }).filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.name?.toLowerCase().includes(q) || o.phone?.includes(q) || o.email?.toLowerCase().includes(q);
  });

  const getOwnerDetails = (ownerName: string) => {
    const ownerNameNorm = normalizeStr(ownerName);
    let ownerBiens = biens.filter(b => normalizeStr(b.owner) === ownerNameNorm);
    if (bienFilter !== "ALL") {
      const bienFilterNorm = normalizeStr(bienFilter);
      ownerBiens = ownerBiens.filter(b => normalizeStr(b.name) === bienFilterNorm || b.id === bienFilter);
    }
    const ownerBiensNamesNorm = ownerBiens.map(b => normalizeStr(b.name));
    const ownerLogements = logements.filter(l => l.property && ownerBiensNamesNorm.includes(normalizeStr(l.property)));

    let totalRentSum = ownerBiens.reduce((acc, b) => {
      const { grossRevenue } = getBienCalculatedStats(b);
      return acc + grossRevenue;
    }, 0);

    if (totalRentSum === 0 && ownerLogements.length > 0) {
      totalRentSum = ownerLogements.reduce((acc, l) => acc + (Number(l.rent || l.loyer) || 0), 0);
    }

    return { ownerBiens, ownerLogements, totalRentSum };
  };

  const exportOwnersCSV = () => {
    const headers = ["Nom / Raison Sociale", "Type", "Téléphone", "Email", "Biens Possédés", "Nbre Logements", "Détails Appartements", "Total Loyers Mensuels (FCFA)"];
    const rows = filteredOwners.map(o => {
      const { ownerBiens, ownerLogements, totalRentSum } = getOwnerDetails(o.name);
      const biensListStr = ownerBiens.map(b => b.name).join(" | ") || "Aucun bien rattaché";
      const logementsStr = ownerLogements.map((l, i) => `${formatUnitDisplay(l.unit || l.name || l.id, i + 1, l.type || "Appartement")} (${l.type} - ${l.property} - ${l.status})`).join(" | ") || "Aucun logement";
      return [
        o.name,
        o.type === "entreprise" ? "Entreprise" : "Particulier",
        o.phone || "-",
        o.email || "-",
        biensListStr,
        ownerLogements.length,
        logementsStr,
        totalRentSum
      ];
    });
    downloadCSV(`Export_Proprietaires_Entreprises_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const printOwnersPDF = () => {
    const contentHtml = `
      <div class="mb-6">
        <h2 class="text-xl font-bold text-gray-800">Rapport Complet des Propriétaires & Entreprises</h2>
        <p class="text-sm text-gray-500">Période : ${periodFilter} | Type: ${ownerTypeFilter} | Immeuble: ${bienFilter}</p>
      </div>

      <div class="space-y-6">
        ${filteredOwners.map(owner => {
          const { ownerBiens, ownerLogements, totalRentSum } = getOwnerDetails(owner.name);
          return `
            <div class="border border-gray-300 rounded-lg p-4 bg-gray-50/50 break-inside-avoid">
              <div class="flex justify-between items-start border-b border-gray-200 pb-3 mb-3">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-lg text-gray-900">${owner.name}</span>
                    <span class="px-2 py-0.5 text-xs font-semibold rounded ${owner.type === 'entreprise' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                      ${owner.type === 'entreprise' ? 'ENTREPRISE' : 'PARTICULIER'}
                    </span>
                  </div>
                  <div class="text-xs text-gray-600 mt-1 flex gap-4">
                    <span>Tél : ${owner.phone || 'N/A'}</span>
                    <span>Email : ${owner.email || 'N/A'}</span>
                    <span>Code : ${owner.code || owner.id}</span>
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-xs text-gray-500">Portefeuille mensuel</span>
                  <p class="text-base font-bold text-primary">${formatFCFA(totalRentSum)}</p>
                </div>
              </div>

              ${ownerBiens.length === 0 ? `
                <p class="text-xs text-gray-400 italic">Aucun bien enregistré pour ce propriétaire.</p>
              ` : `
                <div class="space-y-4">
                  ${ownerBiens.map(bien => {
                    const bienLogements = ownerLogements.filter(l => l.property === bien.name);
                    return `
                      <div class="bg-white p-3 rounded border border-gray-200">
                        <div class="flex justify-between items-center mb-2">
                          <span class="font-semibold text-sm text-gray-800">🏠 ${bien.name} (${bien.type})</span>
                          <span class="text-xs text-gray-500">${bienLogements.length} logement(s)</span>
                        </div>
                        ${bienLogements.length > 0 ? `
                          <table class="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr class="bg-gray-100 text-gray-600 border-b">
                                <th class="p-1.5 font-medium">Réf Logement</th>
                                <th class="p-1.5 font-medium">Type</th>
                                <th class="p-1.5 font-medium">Locataire Actuel</th>
                                <th class="p-1.5 font-medium">Statut</th>
                                <th class="p-1.5 font-medium text-right">Loyer Mensuel</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${bienLogements.map((l, lIdx) => `
                                <tr class="border-b border-gray-100">
                                  <td class="p-1.5 font-semibold text-gray-800">${formatUnitDisplay(l.unit || l.name || l.id, lIdx + 1, l.type || "Appartement")}</td>
                                  <td class="p-1.5 text-gray-600">${l.type}</td>
                                  <td class="p-1.5 text-gray-700">${l.tenant || '-'}</td>
                                  <td class="p-1.5">
                                    <span class="px-1.5 py-0.5 text-[10px] rounded ${l.status === 'OCCUPÉ' ? 'bg-green-100 text-green-700 font-medium' : 'bg-amber-100 text-amber-700'}">
                                      ${l.status}
                                    </span>
                                  </td>
                                  <td class="p-1.5 text-right font-semibold text-gray-900">${formatFCFA(l.rent)}</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                        ` : `
                          <p class="text-xs text-gray-400 italic">Aucun appartement renseigné dans cet immeuble.</p>
                        `}
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    `;
    handlePrintHTML("Liste_Proprietaires_et_Biens", contentHtml);
  };

  // -------------------------------------------------------------
  // 2. DATA CALCULATIONS FOR MANAGERS
  // -------------------------------------------------------------
  const filteredManagers = gerants.filter(g => {
    if (selectedGerantId !== "ALL") return g.id === selectedGerantId;
    return true;
  }).filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return g.name?.toLowerCase().includes(q) || g.role?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q);
  });

  const getManagerLogements = (manager: any) => {
    const assignedIds = (manager.assignedLogements || (manager.id === "M-002" ? ["A-101", "V-001"] : [])).map((id: string) => normalizeStr(id));
    let assignedUnits = logements.filter(l => assignedIds.includes(normalizeStr(l.id)));
    if (bienFilter !== "ALL") {
      const bienFilterNorm = normalizeStr(bienFilter);
      assignedUnits = assignedUnits.filter(u => normalizeStr(u.property) === bienFilterNorm);
    }
    const propertyNamesNorm = Array.from(new Set(assignedUnits.map(u => normalizeStr(u.property))));
    const managedBiens = biens.filter(b => propertyNamesNorm.includes(normalizeStr(b.name)));
    const totalRent = assignedUnits.reduce((sum, u) => sum + (Number(u.rent || u.loyer) || 0), 0);

    return { assignedUnits, managedBiens, totalRent };
  };

  const exportManagersCSV = () => {
    const headers = ["Nom du Gérant", "Rôle", "Téléphone", "Email", "Biens Gérés", "Nbre Logements Gérés", "Détail Logements", "Total Valeur Portefeuille (FCFA)"];
    const rows = filteredManagers.map(m => {
      const { assignedUnits, managedBiens, totalRent } = getManagerLogements(m);
      const biensNames = managedBiens.map(b => b.name).join(" | ") || "Aucun bien principal";
      const unitsStr = assignedUnits.map(u => `${u.unit || u.id} (${u.property} - ${u.tenant || 'Vacant'})`).join(" | ") || "Aucun logement assigné";
      return [
        m.name,
        m.role || "Gérant",
        m.phone || "-",
        m.email || "-",
        biensNames,
        assignedUnits.length,
        unitsStr,
        totalRent
      ];
    });
    downloadCSV(`Export_Gerants_Portefeuille_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const printManagersPDF = () => {
    const contentHtml = `
      <div class="mb-6">
        <h2 class="text-xl font-bold text-gray-800">Rapport des Gérants & Biens Sous Gestion</h2>
        <p class="text-sm text-gray-500">Période : ${periodFilter} | Liste des gérants de l'équipe</p>
      </div>

      <div class="space-y-6">
        ${filteredManagers.map(manager => {
          const { assignedUnits, managedBiens, totalRent } = getManagerLogements(manager);
          return `
            <div class="border border-gray-300 rounded-lg p-4 bg-gray-50/50 break-inside-avoid">
              <div class="flex justify-between items-start border-b border-gray-200 pb-3 mb-3">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-lg text-gray-900">${manager.name}</span>
                    <span class="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800">
                      ${manager.role || 'Gérant'}
                    </span>
                  </div>
                  <div class="text-xs text-gray-600 mt-1 flex gap-4">
                    <span>Tél : ${manager.phone || 'N/A'}</span>
                    <span>Email : ${manager.email || 'N/A'}</span>
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-xs text-gray-500">Valeur gérée</span>
                  <p class="text-base font-bold text-primary">${formatFCFA(totalRent)}</p>
                </div>
              </div>

              ${assignedUnits.length === 0 ? `
                <p class="text-xs text-gray-400 italic">Aucun logement attribuer à ce gérant pour le moment.</p>
              ` : `
                <div class="bg-white p-3 rounded border border-gray-200">
                  <div class="flex justify-between items-center mb-2">
                    <span class="font-semibold text-sm text-gray-800">Logements sous sa responsabilité (${assignedUnits.length})</span>
                    <span class="text-xs text-gray-500">${managedBiens.length} immeuble(s) / bien(s)</span>
                  </div>
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="bg-gray-100 text-gray-600 border-b">
                        <th class="p-1.5 font-medium">Logement</th>
                        <th class="p-1.5 font-medium">Bien / Immeuble</th>
                        <th class="p-1.5 font-medium">Type</th>
                        <th class="p-1.5 font-medium">Locataire</th>
                        <th class="p-1.5 font-medium">Statut</th>
                        <th class="p-1.5 font-medium text-right">Loyer Mensuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${assignedUnits.map(u => `
                        <tr class="border-b border-gray-100">
                          <td class="p-1.5 font-semibold text-gray-800">${u.unit || u.id}</td>
                          <td class="p-1.5 text-gray-700">${u.property}</td>
                          <td class="p-1.5 text-gray-600">${u.type}</td>
                          <td class="p-1.5 text-gray-700">${u.tenant || '-'}</td>
                          <td class="p-1.5">
                            <span class="px-1.5 py-0.5 text-[10px] rounded ${u.status === 'OCCUPÉ' ? 'bg-green-100 text-green-700 font-medium' : 'bg-amber-100 text-amber-700'}">
                              ${u.status}
                            </span>
                          </td>
                          <td class="p-1.5 text-right font-semibold text-gray-900">${formatFCFA(u.rent)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    `;
    handlePrintHTML("Liste_Gerants_et_Portefeuilles", contentHtml);
  };

  // -------------------------------------------------------------
  // 3. DATA CALCULATIONS FOR UNPAID (ÉTAT DES IMPAYÉS)
  // -------------------------------------------------------------
  const filteredUnpaid = logements.filter(l => {
    // 1. Must be an occupied unit
    const isOccupied = l.status === "OCCUPÉ" || l.statut === "OCCUPE" || (l.tenant && l.tenant !== "-");
    if (!isOccupied) return false;

    const tenantNameNorm = normalizeStr(l.tenant);
    const unitIdNorm = normalizeStr(l.id);

    // 2. Find matching payments for this unit/tenant
    const unitPayments = paiements.filter((p: any) => {
      const matchUnit = p.unit && unitIdNorm && normalizeStr(p.unit) === unitIdNorm;
      const matchTenant = p.tenant && tenantNameNorm && normalizeStr(p.tenant) === tenantNameNorm;
      return matchUnit || matchTenant;
    });

    // Check if there is an explicit VALIDATED or PAID payment for this period
    const hasPaidPaymentForPeriod = unitPayments.some((p: any) => {
      const isPaid = p.status === "VALIDÉ" || p.status === "PAYÉ" || p.status === "PAYE";
      return isPaid && matchesPeriod(p, periodFilter);
    });

    // If paid for the period, tenant is UP TO DATE! Not unpaid.
    if (hasPaidPaymentForPeriod) return false;

    // Check if there is an explicit payment with status EN RETARD, IMPAYÉ, or REJETÉ for the period
    const hasExplicitLatePayment = unitPayments.some((p: any) => {
      const isLate = p.status === "EN RETARD" || p.status === "IMPAYÉ" || p.status === "REJETÉ";
      return isLate && matchesPeriod(p, periodFilter);
    });

    // Check if logement or tenant object explicitly has late status
    const isLogementLate = l.paymentStatus === "EN RETARD" || l.paymentStatus === "IMPAYÉ" || l.status === "EN RETARD" || l.statut === "EN RETARD";

    // Check in baux if lease has status EN RETARD or IMPAYÉ
    const unitLeases = baux.filter((bx: any) => {
      const matchUnit = bx.unit && unitIdNorm && normalizeStr(bx.unit) === unitIdNorm;
      const matchTenant = bx.tenant && tenantNameNorm && normalizeStr(bx.tenant) === tenantNameNorm;
      return matchUnit || matchTenant;
    });
    const isLeaseLate = unitLeases.some((bx: any) => bx.status === "EN RETARD" || bx.status === "IMPAYÉ" || bx.statut === "EN RETARD" || bx.statut === "IMPAYÉ");

    // Check in locataires list
    let isLocataireLate = false;
    if (typeof window !== "undefined") {
      try {
        const storedTenants = JSON.parse(localStorage.getItem("gestimmo_locataires") || "[]");
        const matchedTenantObj = storedTenants.find((t: any) => {
          return (t.name && tenantNameNorm && normalizeStr(t.name) === tenantNameNorm) || (t.unit && unitIdNorm && normalizeStr(t.unit) === unitIdNorm);
        });
        if (matchedTenantObj) {
          isLocataireLate = matchedTenantObj.status === "EN RETARD" || matchedTenantObj.status === "IMPAYÉ" || (Number(matchedTenantObj.unpaidMonths) > 0);
        }
      } catch (e) {}
    }

    return hasExplicitLatePayment || isLogementLate || isLeaseLate || isLocataireLate;
  }).filter(l => {
    if (bienFilter !== "ALL") {
      const bienFilterNorm = normalizeStr(bienFilter);
      const lPropNorm = normalizeStr(l.property);
      if (lPropNorm !== bienFilterNorm && l.property !== bienFilter && !lPropNorm.includes(bienFilterNorm) && !bienFilterNorm.includes(lPropNorm)) {
        return false;
      }
    }
    if (selectedGerantId !== "ALL") {
      const g = gerants.find(m => m.id === selectedGerantId);
      const assigned = (g?.assignedLogements || []).map((id: string) => normalizeStr(id));
      if (!assigned.includes(normalizeStr(l.id))) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return l.tenant?.toLowerCase().includes(q) || l.id?.toLowerCase().includes(q) || l.property?.toLowerCase().includes(q);
    }
    return true;
  });

  // Helper to determine the month corresponding to unpaid rent / delay
  const getUnpaidMonthForLogement = (l: any) => {
    if (paiements && paiements.length > 0) {
      const matchP = paiements.find((p: any) => {
        const isLate = p.status === "EN RETARD" || p.status === "IMPAYÉ" || p.status === "REJETÉ";
        const sameUnit = p.unit && l.id && normalizeStr(p.unit) === normalizeStr(l.id);
        const sameTenant = p.tenant && l.tenant && normalizeStr(p.tenant) === normalizeStr(l.tenant);
        return isLate && (sameUnit || sameTenant) && (p.period || p.periode);
      });
      if (matchP && (matchP.period || matchP.periode)) {
        return matchP.period || matchP.periode;
      }
    }

    if (l.period || l.periode || l.moisRetard || l.unpaidMonth) {
      return l.period || l.periode || l.moisRetard || l.unpaidMonth;
    }

    if (periodFilter && periodFilter !== "Toutes les périodes" && periodFilter !== "Historique") {
      return periodFilter;
    }

    return "Octobre 2026";
  };

  // Helper to retrieve owner's commission rate (%)
  const getOwnerCommissionRate = (ownerNameOrId: string, bienObj?: any) => {
    const targetOwnerName = bienObj?.owner || bienObj?.proprietaire || ownerNameOrId;
    if (!targetOwnerName) return 10;

    const targetNorm = normalizeStr(targetOwnerName);

    let foundOwner = owners.find((o: any) => {
      const matchName = o.name && targetNorm && normalizeStr(o.name) === targetNorm;
      const matchId = o.id && targetNorm && normalizeStr(o.id) === targetNorm;
      return matchName || matchId;
    });

    if (!foundOwner && typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("gestimmo_proprietaires") || "[]");
        foundOwner = stored.find((o: any) => {
          const matchName = o.name && targetNorm && normalizeStr(o.name) === targetNorm;
          const matchId = o.id && targetNorm && normalizeStr(o.id) === targetNorm;
          return matchName || matchId;
        });
      } catch (e) {}
    }

    if (foundOwner) {
      const rawRate = foundOwner.commissionRate !== undefined 
        ? foundOwner.commissionRate 
        : (foundOwner.commission_rate !== undefined ? foundOwner.commission_rate : foundOwner.commission);
      if (rawRate !== undefined && rawRate !== null && rawRate !== "") {
        const parsed = Number(rawRate);
        if (!isNaN(parsed)) return parsed;
      }
    }

    return 10;
  };
  const getTenantPhone = (l: any) => {
    if (!l) return "-";
    if (l.phone && l.phone !== "-" && l.phone.trim() !== "") return l.phone;
    if (l.telephone && l.telephone !== "-" && l.telephone.trim() !== "") return l.telephone;
    if (l.tenantPhone && l.tenantPhone !== "-" && l.tenantPhone.trim() !== "") return l.tenantPhone;

    const tenantNameNorm = normalizeStr(l.tenant || l.name || l.locataire);
    const unitIdNorm = normalizeStr(l.id || l.unit || l.logementId);

    if (typeof window !== "undefined") {
      try {
        const storedTenants = JSON.parse(localStorage.getItem("gestimmo_locataires") || "[]");
        const found = storedTenants.find((t: any) => {
          const matchName = t.name && tenantNameNorm && normalizeStr(t.name) === tenantNameNorm;
          const matchUnit = t.unit && unitIdNorm && normalizeStr(t.unit) === unitIdNorm;
          return matchName || matchUnit;
        });
        if (found && found.phone && found.phone !== "-" && found.phone.trim() !== "") {
          return found.phone;
        }
      } catch (e) {}
    }

    if (baux && baux.length > 0) {
      const foundBail = baux.find((b: any) => {
        const matchName = b.tenant && tenantNameNorm && normalizeStr(b.tenant) === tenantNameNorm;
        const matchUnit = b.unit && unitIdNorm && normalizeStr(b.unit) === unitIdNorm;
        return matchName || matchUnit;
      });
      if (foundBail) {
        const p = foundBail.phone || foundBail.tenantPhone || foundBail.telephone;
        if (p && p !== "-" && p.trim() !== "") return p;
      }
    }

    if (paiements && paiements.length > 0) {
      const foundP = paiements.find((p: any) => {
        const matchName = p.tenant && tenantNameNorm && normalizeStr(p.tenant) === tenantNameNorm;
        const matchUnit = p.unit && unitIdNorm && normalizeStr(p.unit) === unitIdNorm;
        return matchName || matchUnit;
      });
      if (foundP) {
        const pNum = foundP.phone || foundP.tenantPhone || foundP.telephone;
        if (pNum && pNum !== "-" && pNum.trim() !== "") return pNum;
      }
    }

    return "-";
  };

  const totalUnpaidSum = filteredUnpaid.reduce((sum, l) => sum + (Number(l.rent || l.loyer) || 0), 0);

  const exportUnpaidCSV = () => {
    const headers = ["Réf Logement", "Bien / Immeuble", "Type Logement", "Locataire", "Téléphone", "Mois Concerné", "Statut Paiement", "Montant Impayé (FCFA)"];
    const rows = filteredUnpaid.map((l, idx) => [
      formatUnitDisplay(l.unit || l.name || l.id, idx + 1, l.type || "Appartement"),
      l.property,
      l.type,
      l.tenant,
      getTenantPhone(l),
      getUnpaidMonthForLogement(l),
      "EN RETARD",
      l.rent || l.loyer || 0
    ]);
    downloadCSV(`Etat_des_Impayes_${periodFilter.replace(/\s+/g, '_')}.csv`, headers, rows);
  };

  const printUnpaidPDF = () => {
    const contentHtml = `
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-red-700">État des Impayés & Loyers en Retard</h2>
          <p class="text-sm text-gray-500">Période : ${periodFilter} | ${filteredUnpaid.length} dossier(s) d'impayés</p>
        </div>
        <div class="text-right">
          <span class="text-xs text-gray-500">Cumul Impayés</span>
          <p class="text-xl font-bold ${filteredUnpaid.length > 0 ? 'text-red-600' : 'text-green-600'}">${formatFCFA(totalUnpaidSum)}</p>
        </div>
      </div>

      ${filteredUnpaid.length === 0 ? `
        <div class="p-8 text-center bg-green-50 border border-green-300 rounded-2xl my-6">
          <div class="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">✓</div>
          <h3 class="text-base font-bold text-green-900 mb-1">Tous les locataires sont à jour !</h3>
          <p class="text-xs text-green-700">Aucun retard de paiement ni dossier d'impayé constaté pour la période : <strong>${periodFilter}</strong>.</p>
        </div>
      ` : `
        <table class="w-full text-left text-xs border-collapse border border-gray-300">
          <thead>
            <tr class="bg-red-50 text-red-900 border-b border-gray-300">
              <th class="p-2.5 font-bold">Logement</th>
              <th class="p-2.5 font-bold">Immeuble / Bien</th>
              <th class="p-2.5 font-bold">Locataire Concerné</th>
              <th class="p-2.5 font-bold">Téléphone</th>
              <th class="p-2.5 font-bold">Mois concerné</th>
              <th class="p-2.5 font-bold">Statut</th>
              <th class="p-2.5 font-bold text-right">Loyer Due (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredUnpaid.map((u, i) => `
              <tr class="border-b border-gray-200 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                <td class="p-2.5 font-bold text-gray-900">${formatUnitDisplay(u.unit || u.name || u.id, i + 1, u.type || "Appartement")}</td>
                <td class="p-2.5 text-gray-700">${u.property}</td>
                <td class="p-2.5 font-semibold text-gray-900">${u.tenant}</td>
                <td class="p-2.5 text-gray-600">${getTenantPhone(u)}</td>
                <td class="p-2.5 font-semibold text-red-900">${getUnpaidMonthForLogement(u)}</td>
                <td class="p-2.5">
                  <span class="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                    EN RETARD
                  </span>
                </td>
                <td class="p-2.5 text-right text-red-600 font-bold">${formatFCFA(u.rent || u.loyer || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="bg-red-100 text-red-950 font-bold border-t-2 border-red-300">
              <td colspan="6" class="p-2.5 text-right">Total Général des Impayés :</td>
              <td class="p-2.5 text-right text-red-700">${formatFCFA(totalUnpaidSum)}</td>
            </tr>
          </tfoot>
        </table>
      `}
    `;
    handlePrintHTML("Etat_des_Impayes", contentHtml);
  };

  // -------------------------------------------------------------
  // 4. DATA CALCULATIONS FOR FINANCIAL REPORT (BILAN FINANCIER)
  // -------------------------------------------------------------
  const filteredFinancialBiens = biens.filter(b => {
    if (bienFilter !== "ALL") {
      const bNorm = normalizeStr(b.name);
      const filterNorm = normalizeStr(bienFilter);
      if (bNorm !== filterNorm && b.id !== bienFilter && !bNorm.includes(filterNorm) && !filterNorm.includes(bNorm)) {
        return false;
      }
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const ownerName = b.owner || "";
    return b.name?.toLowerCase().includes(q) || ownerName.toLowerCase().includes(q);
  });

  const totalFinancialRevenue = filteredFinancialBiens.reduce((sum, b) => {
    const { grossRevenue } = getBienCalculatedStats(b);
    return sum + grossRevenue;
  }, 0);

  const exportFinancialCSV = () => {
    const headers = ["Propriété / Bien", "Propriétaire", "Type Bien", "Total Logements", "Logements Occupés", "Encaissement Bruts (FCFA)", "Taux Commission", "Commission Gestimmo (FCFA)", "Solde Net (FCFA)"];
    const rows = filteredFinancialBiens.map(b => {
      const { unitsCount, occupiedCount, grossRevenue } = getBienCalculatedStats(b);
      const rate = getOwnerCommissionRate(b.owner, b);
      const comm = Math.round(grossRevenue * (rate / 100));
      const net = grossRevenue - comm;
      return [
        b.name,
        b.owner || "-",
        b.type || "Immeuble",
        unitsCount,
        occupiedCount,
        grossRevenue,
        `${rate}%`,
        comm,
        net
      ];
    });
    downloadCSV(`Bilan_Financier_Mensuel_${periodFilter.replace(/\s+/g, '_')}.csv`, headers, rows);
  };

  const printFinancialPDF = () => {
    let totalCommSum = 0;
    let totalNetSum = 0;

    filteredFinancialBiens.forEach(b => {
      const { grossRevenue } = getBienCalculatedStats(b);
      const rate = getOwnerCommissionRate(b.owner, b);
      const comm = Math.round(grossRevenue * (rate / 100));
      totalCommSum += comm;
      totalNetSum += (grossRevenue - comm);
    });

    const contentHtml = `
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-emerald-800">Bilan Financier Mensuel des Encaissements</h2>
          <p class="text-sm text-gray-500">Période d'activité : ${periodFilter}</p>
        </div>
        <div class="text-right">
          <span class="text-xs text-gray-500">Chiffre d'Affaires Global</span>
          <p class="text-xl font-bold text-emerald-700">${formatFCFA(totalFinancialRevenue)}</p>
        </div>
      </div>

      <table class="w-full text-left text-xs border-collapse border border-gray-300">
        <thead>
          <tr class="bg-emerald-50 text-emerald-950 border-b border-gray-300">
            <th class="p-2.5 font-bold">Biens / Immeuble</th>
            <th class="p-2.5 font-bold">Propriétaire Rattaché</th>
            <th class="p-2.5 font-bold text-center">Occupation</th>
            <th class="p-2.5 font-bold text-right">Encaissements Bruts</th>
            <th class="p-2.5 font-bold text-right">Commission Gestimmo</th>
            <th class="p-2.5 font-bold text-right">Net à Reverser</th>
          </tr>
        </thead>
        <tbody>
          ${filteredFinancialBiens.map((b, i) => {
            const { unitsCount, occupiedCount, grossRevenue } = getBienCalculatedStats(b);
            const rate = getOwnerCommissionRate(b.owner, b);
            const comm = Math.round(grossRevenue * (rate / 100));
            const net = grossRevenue - comm;
            return `
              <tr class="border-b border-gray-200 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                <td class="p-2.5 font-bold text-gray-900">${b.name} (${b.type || 'Immeuble'})</td>
                <td class="p-2.5 text-gray-700">${b.owner || '-'}</td>
                <td class="p-2.5 text-center font-medium">${occupiedCount} / ${unitsCount}</td>
                <td class="p-2.5 text-right font-semibold text-gray-900">${formatFCFA(grossRevenue)}</td>
                <td class="p-2.5 text-right text-gray-600">${formatFCFA(comm)} (${rate}%)</td>
                <td class="p-2.5 text-right font-bold text-emerald-700">${formatFCFA(net)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr class="bg-emerald-100 text-emerald-950 font-bold border-t-2 border-emerald-300">
            <td colspan="3" class="p-2.5 text-right">Total Général :</td>
            <td class="p-2.5 text-right text-gray-900">${formatFCFA(totalFinancialRevenue)}</td>
            <td class="p-2.5 text-right text-gray-700">${formatFCFA(totalCommSum)}</td>
            <td class="p-2.5 text-right text-emerald-800">${formatFCFA(totalNetSum)}</td>
          </tr>
        </tfoot>
      </table>
    `;
    handlePrintHTML("Bilan_Financier_Mensuel", contentHtml);
  };

  // -------------------------------------------------------------
  // 5. DATA CALCULATIONS FOR TENANTS (LISTE DES LOCATAIRES)
  // -------------------------------------------------------------
  const filteredTenants = logements.filter(l => {
    if (tenantStatusFilter !== "ALL" && l.status !== tenantStatusFilter) return false;
    if (bienFilter !== "ALL") {
      const bienFilterNorm = normalizeStr(bienFilter);
      const lPropNorm = normalizeStr(l.property);
      if (lPropNorm !== bienFilterNorm && l.property !== bienFilter && !lPropNorm.includes(bienFilterNorm) && !bienFilterNorm.includes(lPropNorm)) {
        return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return l.tenant?.toLowerCase().includes(q) || l.id.toLowerCase().includes(q) || l.property?.toLowerCase().includes(q);
    }
    return true;
  });

  const exportTenantsCSV = () => {
    const headers = ["Réf Logement", "Bien / Immeuble", "Type Logement", "Locataire", "Téléphone", "Statut Bail", "Loyer Mensuel (FCFA)"];
    const rows = filteredTenants.map((l, idx) => [
      formatUnitDisplay(l.unit || l.name || l.id, idx + 1, l.type || "Appartement"),
      l.property,
      l.type,
      l.tenant || "VACANT",
      getTenantPhone(l),
      l.status,
      l.rent
    ]);
    downloadCSV(`Export_Locataires_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const printTenantsPDF = () => {
    const contentHtml = `
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Répertoire Général des Locataires</h2>
          <p class="text-sm text-gray-500">Période : ${periodFilter} | Statut : ${tenantStatusFilter} | Immeuble : ${bienFilter}</p>
        </div>
        <div class="text-right">
          <span class="text-xs text-gray-500">Effectif locataires</span>
          <p class="text-xl font-bold text-primary">${filteredTenants.length} enregistrements</p>
        </div>
      </div>

      <table class="w-full text-left text-xs border-collapse border border-gray-300">
        <thead>
          <tr class="bg-gray-100 text-gray-800 border-b border-gray-300">
            <th class="p-2.5 font-bold">Réf Logement</th>
            <th class="p-2.5 font-bold">Bien / Immeuble</th>
            <th class="p-2.5 font-bold">Type</th>
            <th class="p-2.5 font-bold">Locataire Occupant</th>
            <th class="p-2.5 font-bold">Téléphone</th>
            <th class="p-2.5 font-bold">Statut Bail</th>
            <th class="p-2.5 font-bold text-right">Loyer Mensuel</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTenants.map((l, i) => `
            <tr class="border-b border-gray-200 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
              <td class="p-2.5 font-bold text-gray-900">${formatUnitDisplay(l.unit || l.name || l.id, i + 1, l.type || "Appartement")}</td>
              <td class="p-2.5 text-gray-700">${l.property}</td>
              <td class="p-2.5 text-gray-600">${l.type}</td>
              <td class="p-2.5 font-semibold text-gray-900">${l.tenant || 'VACANT'}</td>
              <td class="p-2.5 text-gray-600">${getTenantPhone(l)}</td>
              <td class="p-2.5">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${l.status === 'OCCUPÉ' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
                  ${l.status}
                </span>
              </td>
              <td class="p-2.5 text-right font-bold text-gray-900">${formatFCFA(l.rent)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    handlePrintHTML("Repertoire_Locataires", contentHtml);
  };

  // -------------------------------------------------------------
  // 6. DATA & LOGIC FOR RENT RECEIPTS (QUITTANCES LOCATAIRES À JOUR)
  // -------------------------------------------------------------
  const getOwnerForPayment = (p: any) => {
    if (p.owner && p.owner !== "Inconnu" && p.owner.trim() !== "") return p.owner;
    if (p.property) {
      const pNorm = normalizeStr(p.property);
      const b = biens.find((item: any) => normalizeStr(item.name) === pNorm || item.id === p.propertyId);
      if (b && b.owner && b.owner !== "Inconnu") return b.owner;
    }
    if (p.unit) {
      const uNorm = normalizeStr(p.unit);
      const l = logements.find((item: any) => normalizeStr(item.unit) === uNorm || normalizeStr(item.id) === uNorm);
      if (l && l.owner && l.owner !== "Inconnu") return l.owner;
      if (l && l.property) {
        const b = biens.find((item: any) => normalizeStr(item.name) === normalizeStr(l.property));
        if (b && b.owner) return b.owner;
      }
    }
    if (p.tenant) {
      const tNorm = normalizeStr(p.tenant);
      const bx = baux.find((item: any) => normalizeStr(item.tenant) === tNorm);
      if (bx && bx.owner && bx.owner !== "Inconnu") return bx.owner;
    }
    return "Propriétaire Bailleur";
  };

  const getPropertyForPayment = (p: any) => {
    if (p.property && p.property !== "Inconnu" && p.property.trim() !== "") return p.property;
    if (p.unit) {
      const uNorm = normalizeStr(p.unit);
      const l = logements.find((item: any) => normalizeStr(item.unit) === uNorm || normalizeStr(item.id) === uNorm);
      if (l && l.property) return l.property;
    }
    if (p.tenant) {
      const tNorm = normalizeStr(p.tenant);
      const bx = baux.find((item: any) => normalizeStr(item.tenant) === tNorm);
      if (bx && bx.property) return bx.property;
    }
    return "Bien Immobilier";
  };

  const getPaymentBreakdown = (p: any) => {
    const totalAmt = Number(p.amount || p.montant) || 0;
    let charges = 0;
    if (p.unit || p.tenant) {
      const uNorm = normalizeStr(p.unit);
      const tNorm = normalizeStr(p.tenant);
      const bx = baux.find((item: any) => 
        (uNorm && normalizeStr(item.unit) === uNorm) || 
        (tNorm && normalizeStr(item.tenant) === tNorm)
      );
      if (bx && Number(bx.charges) > 0) {
        charges = Number(bx.charges);
      } else {
        const l = logements.find((item: any) => uNorm && (normalizeStr(item.unit) === uNorm || normalizeStr(item.id) === uNorm));
        if (l && Number(l.charges) > 0) {
          charges = Number(l.charges);
        }
      }
    }
    const rent = Math.max(0, totalAmt - charges);
    return { rent, charges, total: totalAmt };
  };

  const availableReceiptBiens = biens.filter(b => {
    if (receiptOwnerFilter === "ALL") return true;
    const ownerNorm = normalizeStr(receiptOwnerFilter);
    return normalizeStr(b.owner) === ownerNorm || b.ownerId === receiptOwnerFilter;
  });

  const availableReceiptUnits = logements.filter(l => {
    if (receiptBienFilter !== "ALL") {
      const bienNorm = normalizeStr(receiptBienFilter);
      const lPropNorm = normalizeStr(l.property);
      return lPropNorm === bienNorm || l.property === receiptBienFilter || lPropNorm.includes(bienNorm) || bienNorm.includes(lPropNorm);
    }
    if (receiptOwnerFilter !== "ALL") {
      const ownerNorm = normalizeStr(receiptOwnerFilter);
      const lOwnerNorm = normalizeStr(l.owner);
      if (lOwnerNorm && lOwnerNorm === ownerNorm) return true;
      const b = biens.find(item => normalizeStr(item.name) === normalizeStr(l.property));
      return b && normalizeStr(b.owner) === ownerNorm;
    }
    return true;
  });

  const filteredUpToDateReceipts = paiements.filter((p: any) => {
    const st = (p.status || p.statut || "").toUpperCase();
    const isPaid = st === "VALIDÉ" || st === "VALIDE" || st === "PAYÉ" || st === "PAYE" || st === "EFFECTUÉ" || st === "EFFECTUE";
    if (!isPaid) return false;

    if (!matchesPeriod(p, receiptPeriodFilter)) return false;

    if (receiptOwnerFilter !== "ALL") {
      const ownerFilterNorm = normalizeStr(receiptOwnerFilter);
      const pOwnerNorm = normalizeStr(getOwnerForPayment(p));
      if (pOwnerNorm !== ownerFilterNorm && p.ownerId !== receiptOwnerFilter) return false;
    }

    if (receiptBienFilter !== "ALL") {
      const bienFilterNorm = normalizeStr(receiptBienFilter);
      const pPropNorm = normalizeStr(getPropertyForPayment(p));
      if (pPropNorm !== bienFilterNorm && !pPropNorm.includes(bienFilterNorm) && !bienFilterNorm.includes(pPropNorm) && p.propertyId !== receiptBienFilter) {
        return false;
      }
    }

    if (receiptUnitFilter !== "ALL") {
      const unitFilterNorm = normalizeStr(receiptUnitFilter);
      const pUnitNorm = normalizeStr(p.unit);
      const pUnitIdNorm = normalizeStr(p.unitId || p.id);
      if (pUnitNorm !== unitFilterNorm && pUnitIdNorm !== unitFilterNorm && !pUnitNorm.includes(unitFilterNorm) && !unitFilterNorm.includes(pUnitNorm)) {
        return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchText = (p.tenant && p.tenant.toLowerCase().includes(q)) ||
                        (p.unit && p.unit.toLowerCase().includes(q)) ||
                        (p.property && p.property.toLowerCase().includes(q)) ||
                        (p.code && p.code.toLowerCase().includes(q)) ||
                        (p.id && p.id.toLowerCase().includes(q));
      if (!matchText) return false;
    }

    return true;
  });

  const totalReceiptsSum = filteredUpToDateReceipts.reduce((sum, p) => sum + (Number(p.amount || p.montant) || 0), 0);

  const renderQuittanceCardHTML = (p: any, copyLabel?: string) => {
    const ownerName = getOwnerForPayment(p);
    const propName = getPropertyForPayment(p);
    const tenantPhone = getTenantPhone(p);
    const unitLabel = formatUnitDisplay(p.unit || p.unitId || "Logement");
    const receiptCode = getPaymentDisplayCode(p);
    const breakdown = getPaymentBreakdown(p);
    const periodLabel = p.period || p.periode || receiptPeriodFilter;
    const paymentDate = p.date || p.payment_date || new Date().toLocaleDateString("fr-FR");
    const paymentMethod = p.method || p.payment_method || "Règlement Direct";

    const company = getStoredCompanyInfo();
    const agencyName = company.name || "GESTIMMO";
    const agencyAddress = company.address || "Boulevard Latrille, Cocody Danga - Abidjan";
    const agencyPhone = company.phone || "(+225) 27 22 45 67 89";
    const agencyEmail = company.email || "contact@gestimmo.ci";
    const agencyRccm = company.rccm ? ` • RCCM : ${company.rccm}` : "";

    return `
      <div class="quittance-card bg-white border border-gray-300 rounded-xl p-3 shadow-xs text-gray-800 flex flex-col justify-between" style="height: 133mm; max-height: 133mm; width: 100%; box-sizing: border-box; overflow: hidden; page-break-inside: avoid; break-inside: avoid; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <!-- En-tête Quittance -->
        <div class="flex justify-between items-start border-b-2 border-primary pb-1.5 mb-1.5">
          <div>
            <div class="flex items-center gap-2">
              ${company.logo ? `<img src="${company.logo}" alt="Logo" style="height: 22px; max-width: 55px; object-fit: contain;" />` : ''}
              <span class="text-lg font-black text-primary tracking-tight leading-none">${agencyName}</span>
              <span class="bg-primary/10 text-primary text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Certifié Conforme</span>
              ${copyLabel ? `<span class="bg-gray-100 text-gray-700 border border-gray-200 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">${copyLabel}</span>` : ''}
            </div>
            <p class="text-[9.5px] font-bold text-gray-700 mt-0.5 leading-tight">Cabinet de Gestion Immobilière & Administration de Biens</p>
            <p class="text-[8.5px] text-gray-500 leading-tight">${agencyAddress} • Tél : ${agencyPhone} • ${agencyEmail}${agencyRccm}</p>
          </div>
          <div class="text-right">
            <div class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full text-[8.5px] uppercase tracking-wider mb-0.5">
              <span>✓</span> LOYER ACQUITTÉ
            </div>
            <h2 class="text-xs font-black text-gray-900 uppercase tracking-tight leading-tight">QUITTANCE DE LOYER</h2>
            <div class="flex items-center justify-end gap-1.5 text-[9.5px] mt-0.5">
              <span class="font-extrabold text-primary">N° ${receiptCode}</span>
              <span class="text-gray-300">•</span>
              <span class="text-gray-500">Délivrée le <strong>${paymentDate}</strong></span>
            </div>
          </div>
        </div>

        <!-- Coordonnées Bailleur / Locataire -->
        <div class="grid grid-cols-2 gap-2 mb-1.5 text-[10px]">
          <!-- Bailleur / Bien -->
          <div class="bg-gray-50/90 p-2 rounded-lg border border-gray-200 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Bailleur / Mandataire</span>
                <span class="text-[8px] text-gray-500 font-medium">Représenté par ${agencyName}</span>
              </div>
              <p class="text-[11px] font-bold text-gray-900 truncate mt-0.5" title="${ownerName}">${ownerName}</p>
            </div>
            <div class="mt-1 pt-1 border-t border-gray-200">
              <span class="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Bien & Logement Loué</span>
              <div class="flex items-center justify-between gap-1 text-[10px] mt-0.5">
                <span class="font-semibold text-gray-800 truncate" title="${propName}">🏠 ${propName}</span>
                <span class="text-primary font-bold whitespace-nowrap bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[9px]">${unitLabel}</span>
              </div>
            </div>
          </div>

          <!-- Locataire / Échéance -->
          <div class="bg-blue-50/40 p-2 rounded-lg border border-blue-100 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-[8px] font-bold text-blue-600 uppercase tracking-wider">Locataire Occupant</span>
                <span class="text-[8.5px] font-semibold text-gray-600">📞 ${tenantPhone}</span>
              </div>
              <p class="text-[11px] font-bold text-gray-900 truncate mt-0.5" title="${p.tenant || 'Locataire'}">${p.tenant || 'Locataire'}</p>
            </div>
            <div class="mt-1 pt-1 border-t border-blue-100">
              <span class="text-[8px] font-bold text-blue-600 uppercase tracking-wider block">Période Acquittée & Modalités</span>
              <div class="flex items-center justify-between gap-1 text-[10px] mt-0.5">
                <span class="text-gray-800">Échéance : <strong class="text-primary font-bold">${periodLabel}</strong></span>
                <span class="text-gray-600 text-[9px] whitespace-nowrap bg-white px-1.5 py-0.5 rounded border border-gray-200 font-medium">${paymentMethod}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Décomposition Financière -->
        <div class="border border-gray-300 rounded-lg overflow-hidden mb-1.5">
          <table class="w-full text-left text-[9.5px] border-collapse">
            <thead>
              <tr class="bg-gray-100 text-gray-700 border-b border-gray-300 font-bold uppercase tracking-wider text-[8.5px]">
                <th class="py-1 px-2.5">Désignation des sommes perçues</th>
                <th class="py-1 px-2.5 w-28 text-center">Période</th>
                <th class="py-1 px-2.5 text-right w-36">Montant Réglé</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${breakdown.charges > 0 ? `
                <tr>
                  <td class="py-1 px-2.5 text-gray-800">
                    <span class="font-semibold">Loyer d'habitation principal nu</span>
                    <span class="text-[8.5px] text-gray-500 ml-1">— Loyer contractuel</span>
                  </td>
                  <td class="py-1 px-2.5 text-gray-600 text-center font-medium">${periodLabel}</td>
                  <td class="py-1 px-2.5 text-right font-semibold text-gray-900">${formatFCFA(breakdown.rent)}</td>
                </tr>
                <tr>
                  <td class="py-1 px-2.5 text-gray-800">
                    <span class="font-semibold">Provisions pour charges locatives</span>
                    <span class="text-[8.5px] text-gray-500 ml-1">— Entretien et charges</span>
                  </td>
                  <td class="py-1 px-2.5 text-gray-600 text-center font-medium">${periodLabel}</td>
                  <td class="py-1 px-2.5 text-right font-semibold text-gray-900">${formatFCFA(breakdown.charges)}</td>
                </tr>
              ` : `
                <tr>
                  <td class="py-1 px-2.5 text-gray-800">
                    <span class="font-semibold">Loyer de base & charges locatives globales</span>
                    <span class="text-[8.5px] text-gray-500 ml-1">— Règlement complet d'occupation</span>
                  </td>
                  <td class="py-1 px-2.5 text-gray-600 text-center font-medium">${periodLabel}</td>
                  <td class="py-1 px-2.5 text-right font-semibold text-gray-900">${formatFCFA(breakdown.total)}</td>
                </tr>
              `}
            </tbody>
            <tfoot>
              <tr class="bg-primary/5 text-gray-900 border-t-2 border-primary">
                <td colspan="2" class="py-1 px-2.5 text-right font-extrabold text-[9.5px] uppercase tracking-wider">
                  TOTAL REÇU ET ACQUITTÉ :
                </td>
                <td class="py-1 px-2.5 text-right font-black text-primary text-xs">
                  ${formatFCFA(breakdown.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        ${receiptCustomNote.trim() ? `
        <!-- Information / Note Particulière de l'Agence aux Locataires -->
        <div class="bg-amber-50/95 border-l-4 border-amber-500 border-y border-r border-amber-200 rounded-md px-2 py-1 text-[8.5px] text-amber-950 mb-1.5 flex items-start gap-1.5 leading-tight">
          <span class="text-amber-700 font-black flex-shrink-0">📢 NOTE IMPORTANTE :</span>
          <span class="font-semibold flex-1">${receiptCustomNote.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
        </div>
        ` : ''}

        <!-- Mentions légales & Attestation -->
        <div class="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-[8.5px] leading-tight text-gray-600 mb-1.5">
          <strong class="text-gray-800 font-bold">ℹ Mention Légale :</strong> Le présent document certifie que le locataire susmentionné s'est intégralement acquitté du loyer et des charges pour la période désignée. Cette quittance annule tout reçu provisoire antérieur et fait foi de parfait paiement sous réserve de régularisation bancaire éventuelle.
        </div>

        <!-- Cachet & Signatures -->
        <div class="grid grid-cols-2 gap-3 items-center pt-1 border-t border-gray-200">
          <div>
            <div class="flex justify-between items-baseline mb-0.5">
              <span class="text-[8.5px] font-bold text-gray-500">Le Locataire</span>
              <span class="text-[7.5px] text-gray-400 italic">Pour acceptation et décharge</span>
            </div>
            <div class="h-7 border border-dashed border-gray-300 rounded bg-gray-50/50 flex items-center justify-center text-[7.5px] text-gray-400">
              Signature Locataire
            </div>
          </div>
          <div class="text-right">
            <div class="inline-block border border-primary/30 rounded-lg px-2.5 py-0.5 text-center bg-primary/5 min-w-[190px]">
              <p class="text-[8.5px] font-black text-primary tracking-wider uppercase leading-none">GESTIMMO SARL - ABIDJAN</p>
              <p class="text-[7.5px] text-gray-500 mt-0.5 leading-none">Service Recouvrement & Comptabilité</p>
              <div class="flex items-center justify-center gap-1 mt-0.5 leading-none">
                <span class="text-[8px] font-bold text-emerald-700">✓ ENCAISSÉ & CERTIFIÉ</span>
                <span class="text-[7px] text-gray-400">•</span>
                <span class="text-[7px] text-gray-500 font-mono">Réf: ${receiptCode}-VALID</span>
              </div>
              <p class="text-[7.5px] text-primary/80 font-bold mt-0.5 leading-none">« Bon Pour Acquit »</p>
            </div>
          </div>
        </div>

        <!-- Footer de la Quittance -->
        <div class="mt-1 pt-0.5 border-t border-gray-100 flex justify-between items-center text-[7.5px] text-gray-400 leading-none">
          <span>GESTIMMO Platform &copy; ${new Date().getFullYear()} — Document Officiel</span>
          <span>Format Demi-Feuille A4 • Validé électroniquement</span>
        </div>
      </div>
    `;
  };

  const renderQuittanceDividerHTML = () => `
    <div class="quittance-cut-divider" style="height: 6mm; display: flex; align-items: center; justify-content: center; gap: 8px; margin: 2mm 0; user-select: none;">
      <div style="flex: 1; border-top: 1px dashed #94a3b8;"></div>
      <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; background: #f8fafc; padding: 2px 10px; border: 1px solid #cbd5e1; border-radius: 9999px; display: flex; align-items: center; gap: 6px;">
        <span>✂</span> LIGNE DE DÉCOUPE / SÉPARATION DES QUITTANCES <span>✂</span>
      </div>
      <div style="flex: 1; border-top: 1px dashed #94a3b8;"></div>
    </div>
  `;

  const renderQuittanceSheetHTML = (card1HTML: string, card2HTML?: string, isLastSheet: boolean = false) => `
    <div class="quittance-sheet-page" style="height: 279mm; max-height: 279mm; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; ${isLastSheet ? 'page-break-after: avoid; break-after: avoid;' : 'page-break-after: always; break-after: page;'} overflow: hidden; margin: 0 auto; padding: 0;">
      ${card1HTML}
      ${card2HTML ? renderQuittanceDividerHTML() : ''}
      ${card2HTML ? card2HTML : ''}
    </div>
  `;

  const generateBulkQuittancesHTML = (paymentsList: any[]) => {
    const pages: string[] = [];
    for (let i = 0; i < paymentsList.length; i += 2) {
      const p1 = paymentsList[i];
      const p2 = paymentsList[i + 1];
      const isLastSheet = i + 2 >= paymentsList.length;

      const card1 = renderQuittanceCardHTML(p1, `Quittance #${i + 1}`);
      const card2 = p2
        ? renderQuittanceCardHTML(p2, `Quittance #${i + 2}`)
        : renderQuittanceCardHTML(p1, `Souche Agence / Copie Archive`);

      pages.push(renderQuittanceSheetHTML(card1, card2, isLastSheet));
    }
    return pages.join('\n');
  };

  const generateSingleQuittanceDocHTML = (p: any) => {
    const card1 = renderQuittanceCardHTML(p, "Exemplaire Locataire (Original)");
    const card2 = renderQuittanceCardHTML(p, "Souche Mandataire / Agence (Double)");
    return renderQuittanceSheetHTML(card1, card2, true);
  };

  const printReceiptsPDF = () => {
    if (filteredUpToDateReceipts.length === 0) {
      alert("Aucun locataire à jour trouvé avec les filtres sélectionnés.");
      return;
    }

    const contentHtml = `
      <div class="quittances-container w-full">
        ${generateBulkQuittancesHTML(filteredUpToDateReceipts)}
      </div>
    `;

    handlePrintHTML(`Quittances_Locataires_A_Jour_${receiptPeriodFilter.replace(/\s+/g, '_')}`, contentHtml, {
      hideReportHeaderFooter: true,
      pageMargin: "6mm 8mm",
      customCSS: `
        @page { size: A4 portrait; margin: 6mm 8mm; }
        .quittance-sheet-page {
          height: 280mm !important;
          max-height: 280mm !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .quittance-sheet-page:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .quittance-card {
          height: 133mm !important;
          max-height: 133mm !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .quittance-cut-divider {
          height: 6mm !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `
    });
  };

  const printSingleQuittance = (p: any) => {
    const contentHtml = `
      <div class="quittances-container w-full">
        ${generateSingleQuittanceDocHTML(p)}
      </div>
    `;
    handlePrintHTML(`Quittance_${getPaymentDisplayCode(p)}_${(p.tenant || 'Locataire').replace(/\s+/g, '_')}`, contentHtml, {
      hideReportHeaderFooter: true,
      pageMargin: "6mm 8mm",
      customCSS: `
        @page { size: A4 portrait; margin: 6mm 8mm; }
        .quittance-sheet-page {
          height: 280mm !important;
          max-height: 280mm !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .quittance-card {
          height: 133mm !important;
          max-height: 133mm !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .quittance-cut-divider {
          height: 6mm !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `
    });
  };

  const downloadBulkPDF = async () => {
    if (filteredUpToDateReceipts.length === 0) {
      alert("Aucun locataire à jour trouvé pour la période et les filtres choisis.");
      return;
    }
    setIsBulkDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.createElement("div");
      element.innerHTML = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; background: #ffffff;">
          ${generateBulkQuittancesHTML(filteredUpToDateReceipts)}
        </div>
      `;
      const opt = {
        margin: [6, 8, 6, 8],
        filename: `Quittances_Locataires_A_Jour_${receiptPeriodFilter.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      await (html2pdf() as any).set(opt).from(element).save();
    } catch (err) {
      console.error("Erreur téléchargement groupé:", err);
      printReceiptsPDF();
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const downloadSingleReceiptPDF = async (p: any) => {
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.createElement("div");
      element.innerHTML = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; background: #ffffff;">
          ${generateSingleQuittanceDocHTML(p)}
        </div>
      `;
      const opt = {
        margin: [6, 8, 6, 8],
        filename: `Quittance_${getPaymentDisplayCode(p)}_${(p.tenant || 'Locataire').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await (html2pdf() as any).set(opt).from(element).save();
    } catch (err) {
      console.error("Erreur téléchargement quittance individuelle:", err);
      printSingleQuittance(p);
    }
  };

  const exportReceiptsCSV = () => {
    const headers = [
      "N° Quittance",
      "Période",
      "Locataire",
      "Téléphone",
      "Bien / Immeuble",
      "Logement",
      "Propriétaire",
      "Date de Paiement",
      "Mode de Paiement",
      "Loyer Nu (FCFA)",
      "Charges (FCFA)",
      "Montant Total Acquitté (FCFA)"
    ];
    const rows = filteredUpToDateReceipts.map(p => {
      const breakdown = getPaymentBreakdown(p);
      return [
        getPaymentDisplayCode(p),
        p.period || receiptPeriodFilter,
        p.tenant || "-",
        getTenantPhone(p),
        getPropertyForPayment(p),
        formatUnitDisplay(p.unit || p.unitId),
        getOwnerForPayment(p),
        p.date || "-",
        p.method || "Règlement Direct",
        breakdown.rent,
        breakdown.charges,
        breakdown.total
      ];
    });
    downloadCSV(`Quittances_Locataires_A_Jour_${receiptPeriodFilter.replace(/\s+/g, '_')}.csv`, headers, rows);
  };

  const totalEncaisseOverview = paiements.filter((p: any) => {
    const status = (p.status || p.statut || "").toUpperCase();
    const isValid = status === "VALIDÉ" || status === "VALIDE" || status === "PAYÉ" || status === "PAYE" || status === "EFFECTUÉ";
    return isValid && matchesPeriod(p, periodFilter);
  }).reduce((sum: number, p: any) => sum + (Number(p.amount || p.montant) || 0), 0);

  const totalLogementsOverview = logements.length;
  const totalOccupesOverview = logements.filter((l: any) => l.status === "Occupé" || l.status === "OCCUPÉ" || (l.tenant && l.tenant !== "-")).length;
  const totalPreavisOverview = logements.filter((l: any) => l.status === "En préavis" || l.status === "EN_PRÉAVIS").length;
  const totalVacantsOverview = Math.max(0, totalLogementsOverview - totalOccupesOverview - totalPreavisOverview);
  const tauxOccupationOverview = totalLogementsOverview > 0 ? Math.round((totalOccupesOverview / totalLogementsOverview) * 100) : (totalOccupesOverview > 0 ? 100 : 0);

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports & Statistiques</h1>
          <p className="text-sm text-gray-500 mt-1">Analysez les performances et imprimez les états d'exportation de votre parc immobilier.</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* TOP CALENDAR PERIOD SELECTOR */}
          <CompletePeriodSelector
            value={periodFilter}
            onChange={(newPeriod) => setPeriodFilter(newPeriod)}
          />
          <button 
            onClick={printOwnersPDF}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" /> Exporter Rapport Général
          </button>
        </div>
      </div>

      {/* Top Stat Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recouvrement */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 text-primary mr-2" />
            Évolution du Recouvrement ({periodFilter})
          </h2>
          <div className="flex-1 flex items-end gap-2 h-64 border-b border-gray-100 pb-4 relative">
            <div className="absolute left-0 top-0 bottom-4 w-full flex flex-col justify-between">
              <div className="w-full border-t border-dashed border-gray-200"></div>
              <div className="w-full border-t border-dashed border-gray-200"></div>
              <div className="w-full border-t border-dashed border-gray-200"></div>
              <div className="w-full border-t border-dashed border-gray-200"></div>
            </div>
            
            {[65, 78, 85, 90, 82, 88, 92, 94, 91].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 z-10 group">
                <div className="w-full bg-primary/20 hover:bg-primary rounded-t-sm transition-colors relative flex-1 flex items-end">
                  <div className="w-full bg-primary rounded-t-sm transition-all" style={{ height: `${val}%` }}></div>
                </div>
                <span className="text-[10px] text-gray-400">
                  {['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep'][i]}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4">
            <div>
              <p className="text-xs text-gray-500">Moyenne annuelle</p>
              <p className="text-lg font-bold text-gray-900">{tauxOccupationOverview}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Encaissé</p>
              <p className="text-lg font-bold text-gray-900">{formatFCFA(totalEncaisseOverview)}</p>
            </div>
          </div>
        </div>

        {/* Vacance & Occupation */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <PieChart className="w-5 h-5 text-primary mr-2" />
            Répartition de l'Occupation (Actuel)
          </h2>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-48 h-48 rounded-full border-[24px] border-green-500 flex items-center justify-center">
              <div className="absolute inset-[-24px] rounded-full border-[24px] border-orange-400" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 30%)' }}></div>
              <div className="absolute inset-[-24px] rounded-full border-[24px] border-gray-200" style={{ clipPath: 'polygon(50% 50%, 100% 30%, 100% 50%)' }}></div>
              
              <Link 
                href="/app/logements?status=Occupés"
                className="text-center group p-3 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
                title="Cliquer pour voir la liste des maisons occupées"
              >
                <p className="text-3xl font-bold text-gray-900 group-hover:text-primary transition-colors">{tauxOccupationOverview}%</p>
                <p className="text-xs text-gray-500 group-hover:text-primary font-medium transition-colors">Occupé</p>
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-6 pt-6 border-t border-app-border">
            <Link 
              href="/app/logements?status=Occupés"
              className="flex items-center px-3 py-2 rounded-xl border border-transparent hover:border-emerald-200 hover:bg-emerald-50/70 transition-all cursor-pointer group shadow-sm hover:shadow"
              title="Cliquer pour voir la liste des maisons occupées"
            >
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2 shrink-0 group-hover:scale-125 transition-transform"></div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-800 transition-colors">
                Occupé <strong className="font-bold">({totalOccupesOverview})</strong>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 ml-1.5 transition-opacity" />
            </Link>

            <Link 
              href="/app/resiliations?status=preavis"
              className="flex items-center px-3 py-2 rounded-xl border border-transparent hover:border-orange-200 hover:bg-orange-50/70 transition-all cursor-pointer group shadow-sm hover:shadow"
              title="Cliquer pour voir la liste des locataires ayant émis un préavis (leurs maisons et biens correspondants)"
            >
              <div className="w-3 h-3 rounded-full bg-orange-400 mr-2 shrink-0 group-hover:scale-125 transition-transform"></div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-orange-800 transition-colors">
                Préavis <strong className="font-bold">({totalPreavisOverview})</strong>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 ml-1.5 transition-opacity" />
            </Link>

            <Link 
              href="/app/logements?status=Non+occupés"
              className="flex items-center px-3 py-2 rounded-xl border border-transparent hover:border-gray-300 hover:bg-gray-100/80 transition-all cursor-pointer group shadow-sm hover:shadow"
              title="Cliquer pour voir la liste des maisons vacantes"
            >
              <div className="w-3 h-3 rounded-full bg-gray-300 mr-2 shrink-0 group-hover:scale-125 transition-transform"></div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                Vacant <strong className="font-bold">({totalVacantsOverview})</strong>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 ml-1.5 transition-opacity" />
            </Link>
          </div>
        </div>

      </div>

      {/* Générateur d'Exports */}
      <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-app-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Générateur d'Exports</h2>
            <p className="text-xs text-gray-500 mt-0.5">Chaque module propose un sélecteur de périodes complet avec calendrier, un aperçu avant édition, l'impression PDF et l'export Excel / CSV.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Tous les formats :</span>
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">PDF / Impression</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold">Excel / CSV</span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Propriétaires et/ou Entreprises avec leurs biens et leurs appartements */}
          <div className="border border-app-border rounded-2xl p-5 flex flex-col justify-between hover:border-primary group transition-all hover:shadow-md bg-white">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                  <Badge variant="info" dot={false}>PDF</Badge>
                  <Badge variant="success" dot={false}>CSV</Badge>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary transition-colors">
                Liste des Propriétaires & Entreprises
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Rapport filtré des propriétaires (entreprises et particuliers) avec leurs biens et appartements.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-1.5">
              <button
                onClick={() => openModal("OWNERS")}
                className="bg-gray-50 border border-app-border hover:bg-gray-100 text-gray-700 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                title="Aperçu et filtres"
              >
                <Eye className="w-3.5 h-3.5" /> Filtrer
              </button>
              <button
                onClick={printOwnersPDF}
                className="bg-primary text-white hover:bg-primary/90 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={exportOwnersCSV}
                className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          {/* Card 2: Liste des Gérants et les biens qu'ils gèrent */}
          <div className="border border-app-border rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500 group transition-all hover:shadow-md bg-white">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                  <Badge variant="info" dot={false}>PDF</Badge>
                  <Badge variant="success" dot={false}>CSV</Badge>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                Liste des Gérants & Portefeuilles
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Portefeuille de l'équipe des gérants et liste des immeubles/logements sous leur responsabilité.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-1.5">
              <button
                onClick={() => openModal("MANAGERS")}
                className="bg-gray-50 border border-app-border hover:bg-gray-100 text-gray-700 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Filtrer
              </button>
              <button
                onClick={printManagersPDF}
                className="bg-purple-600 text-white hover:bg-purple-700 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={exportManagersCSV}
                className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          {/* Card 3: Bilan Financier Mensuel */}
          <div className="border border-app-border rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500 group transition-all hover:shadow-md bg-white">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                  <Badge variant="info" dot={false}>PDF</Badge>
                  <Badge variant="success" dot={false}>Excel / CSV</Badge>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                Bilan Financier Mensuel
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Synthèse mensuelle du chiffre d'affaires, commissions et loyers perçus filtrables par période et immeuble.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-1.5">
              <button
                onClick={() => openModal("FINANCIAL")}
                className="bg-gray-50 border border-app-border hover:bg-gray-100 text-gray-700 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Filtrer
              </button>
              <button
                onClick={printFinancialPDF}
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={exportFinancialCSV}
                className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
            </div>
          </div>

          {/* Card 4: État des impayés */}
          <div className="border border-app-border rounded-2xl p-5 flex flex-col justify-between hover:border-rose-500 group transition-all hover:shadow-md bg-white">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                  <Badge variant="danger" dot={true}>PDF</Badge>
                  <Badge variant="success" dot={false}>CSV</Badge>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                État des Impayés & Retards
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Liste et cumul des retards de paiement filtrables par bien, gérant et nom du locataire.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-1.5">
              <button
                onClick={() => openModal("UNPAID")}
                className="bg-gray-50 border border-app-border hover:bg-gray-100 text-gray-700 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Filtrer
              </button>
              <button
                onClick={printUnpaidPDF}
                className="bg-rose-600 text-white hover:bg-rose-700 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={exportUnpaidCSV}
                className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          {/* Card 5: Liste des locataires */}
          <div className="border border-app-border rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500 group transition-all hover:shadow-md bg-white">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                  <Badge variant="info" dot={false}>PDF</Badge>
                  <Badge variant="success" dot={false}>CSV</Badge>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                Liste des Locataires
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Repertoire filtrable des locataires, logements occupés, loyers et statuts de bail.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-1.5">
              <button
                onClick={() => openModal("TENANTS")}
                className="bg-gray-50 border border-app-border hover:bg-gray-100 text-gray-700 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Filtrer
              </button>
              <button
                onClick={printTenantsPDF}
                className="bg-amber-600 text-white hover:bg-amber-700 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={exportTenantsCSV}
                className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          {/* Card 6: Quittances des Locataires à Jour */}
          <div className="border border-app-border rounded-2xl p-5 flex flex-col justify-between hover:border-blue-600 group transition-all hover:shadow-md bg-white">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Receipt className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                  <Badge variant="info" dot={false}>PDF</Badge>
                  <Badge variant="success" dot={false}>Impression</Badge>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                Quittances des Locataires à Jour
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Génération en PDF et impression des quittances de loyer certifiées (2 par feuille A4) pour tous les locataires à jour selon vos filtres.
              </p>

              {/* Bouton Message / Note d'information pour les quittances */}
              <button
                type="button"
                onClick={openCustomNoteModal}
                className={`w-full mt-3 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border cursor-pointer ${
                  receiptCustomNote.trim()
                    ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100/90 shadow-xs"
                    : "bg-gray-50 text-gray-700 border-app-border hover:bg-gray-100 hover:text-gray-900"
                }`}
                title="Définir un message ou une nouvelle consigne à afficher sur les quittances"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${receiptCustomNote.trim() ? "bg-amber-500 text-white" : "bg-blue-600 text-white"}`}>
                    <Megaphone className="w-3 h-3" />
                  </div>
                  <span className="truncate text-left">
                    {receiptCustomNote.trim() ? (
                      <span>Note active : <strong className="italic">« {receiptCustomNote.trim()} »</strong></span>
                    ) : (
                      <span>Ajouter une information / note aux quittances</span>
                    )}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ml-1.5 ${
                  receiptCustomNote.trim() 
                    ? "bg-amber-200/80 text-amber-900" 
                    : "bg-white border border-gray-200 text-gray-600"
                }`}>
                  {receiptCustomNote.trim() ? "Modifier" : "+ Note"}
                </span>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-1.5">
              <button
                onClick={() => openModal("RECEIPTS")}
                className="bg-gray-50 border border-app-border hover:bg-gray-100 text-gray-700 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                title="Aperçu et filtres"
              >
                <Eye className="w-3.5 h-3.5" /> Filtrer
              </button>
              <button
                onClick={printReceiptsPDF}
                className="bg-blue-600 text-white hover:bg-blue-700 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
                title="Imprimer directement les quittances"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={exportReceiptsCSV}
                className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                title="Exporter le relevé en CSV"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* 1. MODAL APERÇU PROPRIÉTAIRES & ENTREPRISES */}
      {/* -------------------------------------------------------------------------- */}
      {activeReportModal === "OWNERS" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-app-border overflow-hidden">
            <div className="p-6 border-b border-app-border flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Aperçu & Filtres : Liste des Propriétaires & Entreprises
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Ajustez les filtres ci-dessous puis choisissez le format d'exportation (PDF ou CSV).</p>
              </div>
              <button onClick={() => setActiveReportModal(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white border-b border-app-border flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <CompletePeriodSelector
                  value={periodFilter}
                  onChange={(newPeriod) => setPeriodFilter(newPeriod)}
                />

                <span className="text-xs font-semibold text-gray-600 ml-2">Type :</span>
                <select
                  value={ownerTypeFilter}
                  onChange={(e) => setOwnerTypeFilter(e.target.value as any)}
                  className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer"
                >
                  <option value="ALL">Tous les types ({owners.length})</option>
                  <option value="entreprise">Entreprises uniquement</option>
                  <option value="particulier">Particuliers uniquement</option>
                </select>

                <span className="text-xs font-semibold text-gray-600 ml-2">Bien :</span>
                <select
                  value={bienFilter}
                  onChange={(e) => setBienFilter(e.target.value)}
                  className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer"
                >
                  <option value="ALL">Tous les biens</option>
                  {biens.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-48">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-app-border rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {filteredOwners.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Aucun propriétaire trouvé.</div>
              ) : (
                filteredOwners.map(owner => {
                  const { ownerBiens, ownerLogements, totalRentSum } = getOwnerDetails(owner.name);
                  return (
                    <div key={owner.id} className="border border-app-border rounded-xl p-4 bg-gray-50/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-base">{owner.name}</h4>
                            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${owner.type === 'entreprise' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                              {owner.type === 'entreprise' ? 'ENTREPRISE' : 'PARTICULIER'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Tél: {owner.phone || 'N/A'} • Email: {owner.email || 'N/A'}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[11px] text-gray-500">Portefeuille loyers</span>
                          <p className="text-base font-bold text-primary">{formatFCFA(totalRentSum)}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {ownerBiens.map(b => {
                          const bLogements = ownerLogements.filter(l => l.property === b.name);
                          return (
                            <div key={b.id} className="bg-white p-3 rounded-lg border border-app-border">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-gray-800">🏠 {b.name} ({b.type})</span>
                                <span className="text-[11px] text-gray-500">{bLogements.length} appartement(s)</span>
                              </div>
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-gray-50 text-gray-500 border-b border-app-border">
                                    <th className="p-1.5">Logement</th>
                                    <th className="p-1.5">Type</th>
                                    <th className="p-1.5">Locataire</th>
                                    <th className="p-1.5 text-right">Loyer</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bLogements.map(l => (
                                    <tr key={l.id} className="border-b border-gray-100">
                                      <td className="p-1.5 font-bold text-gray-900">{l.id}</td>
                                      <td className="p-1.5 text-gray-600">{l.type}</td>
                                      <td className="p-1.5 text-gray-700">{l.tenant || '-'}</td>
                                      <td className="p-1.5 text-right font-semibold text-gray-900">{formatFCFA(l.rent)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-app-border flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Total : <strong className="text-gray-900">{filteredOwners.length}</strong> propriétaires sélectionnés
              </span>
              <div className="flex gap-2">
                <button onClick={exportOwnersCSV} className="bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Exporter CSV
                </button>
                <button onClick={() => { printOwnersPDF(); setActiveReportModal(null); }} className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 2. MODAL APERÇU GÉRANTS & PORTEFEUILLES */}
      {/* -------------------------------------------------------------------------- */}
      {activeReportModal === "MANAGERS" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-app-border overflow-hidden">
            <div className="p-6 border-b border-app-border flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                  Aperçu & Filtres : Liste des Gérants & Portefeuilles
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Filtrer l'équipe et exporter la liste en PDF ou CSV.</p>
              </div>
              <button onClick={() => setActiveReportModal(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white border-b border-app-border flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <CompletePeriodSelector
                  value={periodFilter}
                  onChange={(newPeriod) => setPeriodFilter(newPeriod)}
                />

                <span className="text-xs font-semibold text-gray-600 ml-2">Gérant :</span>
                <select
                  value={selectedGerantId}
                  onChange={(e) => setSelectedGerantId(e.target.value)}
                  className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600/20 shadow-sm cursor-pointer"
                >
                  <option value="ALL">Tous les gérants ({gerants.length})</option>
                  {gerants.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.role})</option>
                  ))}
                </select>

                <span className="text-xs font-semibold text-gray-600 ml-2">Immeuble :</span>
                <select
                  value={bienFilter}
                  onChange={(e) => setBienFilter(e.target.value)}
                  className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600/20 shadow-sm cursor-pointer"
                >
                  <option value="ALL">Tous les immeubles</option>
                  {biens.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-48">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-app-border rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
                />
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {filteredManagers.map(manager => {
                const { assignedUnits, managedBiens, totalRent } = getManagerLogements(manager);
                return (
                  <div key={manager.id} className="border border-app-border rounded-xl p-4 bg-gray-50/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">{manager.name} ({manager.role})</h4>
                        <p className="text-xs text-gray-500">Tél: {manager.phone || 'N/A'} • Email: {manager.email || 'N/A'}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-gray-500">Valeur portefeuille</span>
                        <p className="text-base font-bold text-purple-700">{formatFCFA(totalRent)}</p>
                      </div>
                    </div>

                    <div className="mt-3 bg-white p-3 rounded-lg border border-app-border">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 border-b border-app-border">
                            <th className="p-1.5">Logement</th>
                            <th className="p-1.5">Immeuble</th>
                            <th className="p-1.5">Locataire</th>
                            <th className="p-1.5 text-right">Loyer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignedUnits.map(u => (
                            <tr key={u.id} className="border-b border-gray-100">
                              <td className="p-1.5 font-bold text-gray-900">{u.unit || u.id}</td>
                              <td className="p-1.5 text-gray-700">{u.property}</td>
                              <td className="p-1.5 text-gray-700">{u.tenant || '-'}</td>
                              <td className="p-1.5 text-right font-semibold text-gray-900">{formatFCFA(u.rent)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-gray-50 border-t border-app-border flex items-center justify-between">
              <span className="text-xs text-gray-500">Total : <strong className="text-gray-900">{filteredManagers.length}</strong> gérants affichés</span>
              <div className="flex gap-2">
                <button onClick={exportManagersCSV} className="bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Exporter CSV
                </button>
                <button onClick={() => { printManagersPDF(); setActiveReportModal(null); }} className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 3. MODAL APERÇU ÉTAT DES IMPAYÉS */}
      {/* -------------------------------------------------------------------------- */}
      {activeReportModal === "UNPAID" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-app-border overflow-hidden">
            <div className="p-6 border-b border-app-border flex items-center justify-between bg-rose-50">
              <div>
                <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  Aperçu & Filtres : État des Impayés & Retards
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">Synthèse filtrable des retards de paiement de loyers.</p>
              </div>
              <button onClick={() => setActiveReportModal(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-white border-b border-app-border flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <CompletePeriodSelector
                  value={periodFilter}
                  onChange={(newPeriod) => setPeriodFilter(newPeriod)}
                />

                <span className="text-xs font-semibold text-gray-600 ml-2">Immeuble :</span>
                <select
                  value={bienFilter}
                  onChange={(e) => setBienFilter(e.target.value)}
                  className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm cursor-pointer"
                >
                  <option value="ALL">Tous les immeubles</option>
                  {biens.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>

                <span className="text-xs font-semibold text-gray-600 ml-2">Gérant :</span>
                <select
                  value={selectedGerantId}
                  onChange={(e) => setSelectedGerantId(e.target.value)}
                  className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm cursor-pointer"
                >
                  <option value="ALL">Tous les gérants</option>
                  {gerants.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-48">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-app-border rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            {/* Impayes Table */}
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center mb-4 p-3 bg-red-50 rounded-xl border border-red-200">
                <span className="text-xs font-bold text-red-900">Total Cumulé des Impayés Filtrés :</span>
                <span className="text-lg font-bold text-red-600">{formatFCFA(totalUnpaidSum)}</span>
              </div>

              {filteredUnpaid.length === 0 ? (
                <div className="text-center py-12 bg-green-50/60 rounded-2xl border border-green-200 p-8 my-2">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-green-900">Tous les locataires sont à jour !</h4>
                  <p className="text-xs text-green-700 mt-1">Aucun retard de paiement ni impayé détecté pour la période : <strong className="text-green-900 font-semibold">{periodFilter}</strong>.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 border-b border-app-border">
                      <th className="p-2.5 font-semibold">Logement</th>
                      <th className="p-2.5 font-semibold">Immeuble</th>
                      <th className="p-2.5 font-semibold">Locataire Occupant</th>
                      <th className="p-2.5 font-semibold">Téléphone</th>
                      <th className="p-2.5 font-semibold">Mois concerné</th>
                      <th className="p-2.5 font-semibold">Statut</th>
                      <th className="p-2.5 font-semibold text-right">Loyer en Retard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUnpaid.map((u, uIdx) => (
                      <tr key={u.id} className="hover:bg-red-50/30">
                        <td className="p-2.5 font-bold text-gray-900">{formatUnitDisplay(u.unit || u.name || u.id, uIdx + 1, u.type || "Appartement")}</td>
                        <td className="p-2.5 text-gray-700">{u.property}</td>
                        <td className="p-2.5 font-semibold text-gray-900">{u.tenant}</td>
                        <td className="p-2.5 text-gray-600">{getTenantPhone(u)}</td>
                        <td className="p-2.5 font-semibold text-red-900">{getUnpaidMonthForLogement(u)}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                            EN RETARD
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-red-600">{formatFCFA(u.rent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-app-border flex items-center justify-between">
              <span className="text-xs text-gray-500">
                <strong className="text-gray-900">{filteredUnpaid.length}</strong> dossier(s) en retard
              </span>
              <div className="flex gap-2">
                <button onClick={exportUnpaidCSV} className="bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Exporter CSV / Excel
                </button>
                <button onClick={() => { printUnpaidPDF(); setActiveReportModal(null); }} className="bg-rose-600 text-white hover:bg-rose-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 4. MODAL APERÇU BILAN FINANCIER MENSUEL */}
      {/* -------------------------------------------------------------------------- */}
      {activeReportModal === "FINANCIAL" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-app-border overflow-hidden">
            <div className="p-6 border-b border-app-border flex items-center justify-between bg-emerald-50">
              <div>
                <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Aperçu & Filtres : Bilan Financier Mensuel
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">Visualisez les encaissements par immeuble pour la période sélectionnée.</p>
              </div>
              <button onClick={() => setActiveReportModal(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white border-b border-app-border flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {/* SÉLECTEUR DE PÉRIODE AVEC DROPDOWN COMPLET ET CALENDRIER */}
                <CompletePeriodSelector
                  value={periodFilter}
                  onChange={(newPeriod) => setPeriodFilter(newPeriod)}
                />

                <span className="text-xs font-semibold text-gray-600 ml-2">Immeuble :</span>
                <select
                  value={bienFilter}
                  onChange={(e) => setBienFilter(e.target.value)}
                  className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm cursor-pointer"
                >
                  <option value="ALL">Tous les immeubles</option>
                  {biens.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher bien..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-app-border rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-950">Chiffre d'Affaires Brut Estimé :</span>
                <span className="text-lg font-bold text-emerald-700">{formatFCFA(totalFinancialRevenue)}</span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 border-b border-app-border">
                    <th className="p-2.5 font-semibold">Biens / Immeuble</th>
                    <th className="p-2.5 font-semibold">Propriétaire</th>
                    <th className="p-2.5 font-semibold text-center">Occupation</th>
                    <th className="p-2.5 font-semibold text-right">Loyer Brut (FCFA)</th>
                    <th className="p-2.5 font-semibold text-right">Commission Gestimmo</th>
                    <th className="p-2.5 font-semibold text-right">Solde Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFinancialBiens.map(b => {
                    const { unitsCount, occupiedCount, grossRevenue } = getBienCalculatedStats(b);
                    const rate = getOwnerCommissionRate(b.owner, b);
                    const comm = Math.round(grossRevenue * (rate / 100));
                    const net = grossRevenue - comm;
                    return (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="p-2.5 font-bold text-gray-900">{b.name}</td>
                        <td className="p-2.5 text-gray-700">{b.owner || '-'}</td>
                        <td className="p-2.5 text-center font-medium">{occupiedCount} / {unitsCount}</td>
                        <td className="p-2.5 text-right font-semibold text-gray-900">{formatFCFA(grossRevenue)}</td>
                        <td className="p-2.5 text-right text-gray-600 font-medium">{formatFCFA(comm)} ({rate}%)</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">{formatFCFA(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-app-border flex items-center justify-between">
              <span className="text-xs text-gray-500">Période : <strong className="text-gray-900">{periodFilter}</strong></span>
              <div className="flex gap-2">
                <button onClick={exportFinancialCSV} className="bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Exporter Excel / CSV
                </button>
                <button onClick={() => { printFinancialPDF(); setActiveReportModal(null); }} className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 5. MODAL APERÇU LISTE DES LOCATAIRES */}
      {/* -------------------------------------------------------------------------- */}
      {activeReportModal === "TENANTS" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-app-border overflow-hidden">
            <div className="p-6 border-b border-app-border flex items-center justify-between bg-amber-50">
              <div>
                <h3 className="text-lg font-bold text-amber-950 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-600" />
                  Aperçu & Filtres : Répertoire des Locataires
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">Filtrer l'ensemble des locataires par immeuble et statut.</p>
              </div>
              <button onClick={() => setActiveReportModal(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white border-b border-app-border flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <CompletePeriodSelector
                  value={periodFilter}
                  onChange={(newPeriod) => setPeriodFilter(newPeriod)}
                />

                <span className="text-xs font-semibold text-gray-600 ml-2">Statut bail :</span>
                <select
                  value={tenantStatusFilter}
                  onChange={(e) => setTenantStatusFilter(e.target.value)}
                  className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm cursor-pointer"
                >
                  <option value="ALL">Tous les statuts ({logements.length})</option>
                  <option value="OCCUPÉ">Occupé uniquement</option>
                  <option value="NON OCCUPÉ">Vacant / Non occupé</option>
                </select>

                <span className="text-xs font-semibold text-gray-600 ml-2">Immeuble :</span>
                <select
                  value={bienFilter}
                  onChange={(e) => setBienFilter(e.target.value)}
                  className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm cursor-pointer"
                >
                  <option value="ALL">Tous les immeubles</option>
                  {biens.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-48">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-app-border rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 border-b border-app-border">
                    <th className="p-2.5 font-semibold">Logement</th>
                    <th className="p-2.5 font-semibold">Immeuble</th>
                    <th className="p-2.5 font-semibold">Type</th>
                    <th className="p-2.5 font-semibold">Locataire Occupant</th>
                    <th className="p-2.5 font-semibold">Téléphone</th>
                    <th className="p-2.5 font-semibold">Statut</th>
                    <th className="p-2.5 font-semibold text-right">Loyer Mensuel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTenants.map((l, lIdx) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="p-2.5 font-bold text-gray-900">{formatUnitDisplay(l.unit || l.name || l.id, lIdx + 1, l.type || "Appartement")}</td>
                      <td className="p-2.5 text-gray-700">{l.property}</td>
                      <td className="p-2.5 text-gray-600">{l.type}</td>
                      <td className="p-2.5 font-semibold text-gray-900">{l.tenant || 'VACANT'}</td>
                      <td className="p-2.5 text-gray-600">{getTenantPhone(l)}</td>
                      <td className="p-2.5">
                        <Badge variant={l.status === "OCCUPÉ" ? "success" : "warning"} dot={true}>
                          {l.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right font-bold text-gray-900">{formatFCFA(l.rent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-app-border flex items-center justify-between">
              <span className="text-xs text-gray-500">
                <strong className="text-gray-900">{filteredTenants.length}</strong> locataires affichés
              </span>
              <div className="flex gap-2">
                <button onClick={exportTenantsCSV} className="bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Exporter CSV
                </button>
                <button onClick={() => { printTenantsPDF(); setActiveReportModal(null); }} className="bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 6. MODAL APERÇU QUITTANCES DES LOCATAIRES À JOUR */}
      {/* -------------------------------------------------------------------------- */}
      {activeReportModal === "RECEIPTS" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-app-border overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-app-border flex items-center justify-between bg-blue-50/70">
              <div>
                <h3 className="text-lg font-bold text-blue-950 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  Aperçu & Filtres : Quittances des Locataires à Jour
                </h3>
                <p className="text-xs text-blue-700 mt-0.5">
                  Filtrez par propriétaire, bien, appartement et période pour générer et imprimer les quittances certifiées.
                </p>
              </div>
              <button 
                onClick={() => setActiveReportModal(null)} 
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-white border-b border-app-border flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filtre Période */}
                <CompletePeriodSelector
                  value={receiptPeriodFilter}
                  onChange={(newPeriod) => setReceiptPeriodFilter(newPeriod)}
                />

                {/* Filtre Propriétaire */}
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Propriétaire :</span>
                  <select
                    value={receiptOwnerFilter}
                    onChange={(e) => {
                      setReceiptOwnerFilter(e.target.value);
                      setReceiptBienFilter("ALL");
                      setReceiptUnitFilter("ALL");
                    }}
                    className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer max-w-[160px] truncate"
                  >
                    <option value="ALL">Tous les propriétaires ({owners.length})</option>
                    {owners.map(o => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filtre Bien */}
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Bien :</span>
                  <select
                    value={receiptBienFilter}
                    onChange={(e) => {
                      setReceiptBienFilter(e.target.value);
                      setReceiptUnitFilter("ALL");
                    }}
                    className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer max-w-[170px] truncate"
                  >
                    <option value="ALL">Tous les biens ({availableReceiptBiens.length})</option>
                    {availableReceiptBiens.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filtre Appartement */}
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Logement :</span>
                  <select
                    value={receiptUnitFilter}
                    onChange={(e) => setReceiptUnitFilter(e.target.value)}
                    className="bg-white border border-app-border text-gray-900 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer max-w-[160px] truncate"
                  >
                    <option value="ALL">Tous les logements ({availableReceiptUnits.length})</option>
                    {availableReceiptUnits.map((u, uIdx) => (
                      <option key={u.id} value={u.unit || u.id}>
                        {formatUnitDisplay(u.unit || u.name || u.id, uIdx + 1, u.type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recherche textuelle */}
              <div className="relative w-full sm:w-48">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher locataire, réf..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-app-border rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {/* Stats & Quick summary banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block">Locataires à jour</span>
                    <strong className="text-sm font-bold text-blue-950">{filteredUpToDateReceipts.length} quittance(s)</strong>
                  </div>
                  <div className="h-7 w-px bg-blue-200"></div>
                  <div>
                    <span className="text-gray-500 block">Cumul acquitté</span>
                    <strong className="text-sm font-bold text-primary">{formatFCFA(totalReceiptsSum)}</strong>
                  </div>
                  <div className="h-7 w-px bg-blue-200"></div>
                  <div>
                    <span className="text-gray-500 block">Échéance</span>
                    <strong className="text-xs font-semibold text-gray-800">{receiptPeriodFilter}</strong>
                  </div>
                  <div className="h-7 w-px bg-blue-200"></div>
                  <div className="flex items-center gap-1.5 bg-white border border-blue-200 px-2.5 py-1 rounded-lg text-[11px] text-blue-900 font-semibold shadow-xs">
                    <span>📄</span>
                    <span>Format : <strong>2 quittances par feuille A4</strong></span>
                  </div>
                  <div className="h-7 w-px bg-blue-200"></div>
                  <button
                    type="button"
                    onClick={openCustomNoteModal}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer ${
                      receiptCustomNote.trim()
                        ? "bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200 shadow-xs"
                        : "bg-white text-blue-900 border-blue-200 hover:bg-blue-50 shadow-xs"
                    }`}
                    title="Cliquer pour ajouter ou modifier le message à imprimer sur les quittances"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {receiptCustomNote.trim() ? (
                        <span>Note : <strong className="italic">« {receiptCustomNote.trim()} »</strong></span>
                      ) : (
                        <span>+ Note d'information aux locataires</span>
                      )}
                    </span>
                  </button>
                </div>

                {(receiptOwnerFilter !== "ALL" || receiptBienFilter !== "ALL" || receiptUnitFilter !== "ALL" || searchQuery) && (
                  <button
                    onClick={() => {
                      setReceiptOwnerFilter("ALL");
                      setReceiptBienFilter("ALL");
                      setReceiptUnitFilter("ALL");
                      setSearchQuery("");
                    }}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Réinitialiser les filtres
                  </button>
                )}
              </div>

              {filteredUpToDateReceipts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">Aucune quittance correspondant aux filtres</h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Aucun locataire à jour trouvé pour la période <strong>{receiptPeriodFilter}</strong> avec les critères sélectionnés.
                    Vérifiez le filtre propriétaire, bien, appartement ou sélectionnez une autre période.
                  </p>
                </div>
              ) : (
                <div className="border border-app-border rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700 border-b border-app-border font-semibold">
                        <th className="p-3">N° Quittance</th>
                        <th className="p-3">Locataire Occupant</th>
                        <th className="p-3">Propriétaire</th>
                        <th className="p-3">Bien / Immeuble</th>
                        <th className="p-3">Logement</th>
                        <th className="p-3">Date de règlement</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3 text-right">Montant Réglé</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredUpToDateReceipts.map((p) => {
                        const receiptCode = getPaymentDisplayCode(p);
                        const ownerName = getOwnerForPayment(p);
                        const propName = getPropertyForPayment(p);
                        const unitLabel = formatUnitDisplay(p.unit || p.unitId);
                        const tenantPhone = getTenantPhone(p);
                        const paymentDate = p.date || p.payment_date || "-";
                        const paymentMethod = p.method || p.payment_method || "Règlement Direct";
                        const amount = Number(p.amount || p.montant) || 0;

                        return (
                          <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="p-3 font-bold text-primary whitespace-nowrap">
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[11px] font-bold">
                                {receiptCode}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-gray-900">{p.tenant || 'Locataire'}</div>
                              <div className="text-[11px] text-gray-400">{tenantPhone}</div>
                            </td>
                            <td className="p-3 text-gray-700 whitespace-nowrap">{ownerName}</td>
                            <td className="p-3 text-gray-700">{propName}</td>
                            <td className="p-3 font-semibold text-gray-900 whitespace-nowrap">{unitLabel}</td>
                            <td className="p-3 text-gray-600 whitespace-nowrap">{paymentDate}</td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                                {paymentMethod}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                              {formatFCFA(amount)}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => printSingleQuittance(p)}
                                  className="bg-white border border-app-border hover:border-primary hover:bg-primary/5 text-primary px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                                  title="Imprimer cette quittance (2 volets sur 1 feuille : Locataire + Agence)"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Imprimer</span>
                                </button>
                                <button
                                  onClick={() => downloadSingleReceiptPDF(p)}
                                  className="bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                  title="Télécharger cette quittance en PDF (2 volets sur 1 feuille)"
                                >
                                  <Download className="w-3 h-3 text-gray-500" />
                                  <span>PDF</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                Total : <strong className="text-gray-900">{filteredUpToDateReceipts.length}</strong> quittance(s) prête(s) pour <strong className="text-gray-900">{receiptPeriodFilter}</strong> • <span className="text-emerald-700 font-medium">Format 2 par feuille A4</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={exportReceiptsCSV} 
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Exporter Relevé CSV
                </button>
                <button 
                  onClick={downloadBulkPDF} 
                  disabled={isBulkDownloading || filteredUpToDateReceipts.length === 0}
                  className="bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Télécharger l'ensemble des quittances sous un seul fichier PDF (2 par feuille)"
                >
                  <Download className="w-3.5 h-3.5 text-gray-600" />
                  {isBulkDownloading ? "Génération PDF..." : "Télécharger PDF Groupé"}
                </button>
                <button 
                  onClick={() => { printReceiptsPDF(); }} 
                  disabled={filteredUpToDateReceipts.length === 0}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimer Toutes les Quittances ({filteredUpToDateReceipts.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 7. MODAL DE PERSONNALISATION DE NOTE D'INFORMATION SUR LES QUITTANCES     */}
      {/* -------------------------------------------------------------------------- */}
      {isCustomNoteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-app-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-app-border flex items-center justify-between bg-gradient-to-r from-amber-50/70 to-orange-50/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Note d'information aux locataires
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ce message sera imprimé sur toutes les quittances de loyer (format 2 par feuille A4).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomNoteModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Message ou nouvelle consigne :
                </label>
                <textarea
                  value={tempNoteText}
                  onChange={(e) => setTempNoteText(e.target.value)}
                  placeholder="Ex : Travaux d'entretien dans les parties communes prévus du 15 au 20. Merci pour votre compréhension."
                  rows={3}
                  maxLength={220}
                  className="w-full p-3 bg-gray-50 border border-app-border rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none leading-relaxed"
                />
                <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1">
                  <span>💡 Conseil : Texte concis (1 à 2 lignes) pour une présentation optimale</span>
                  <span className={tempNoteText.length > 180 ? "text-amber-600 font-bold" : ""}>
                    {tempNoteText.length} / 220 car.
                  </span>
                </div>
              </div>

              {/* Suggestions rapides */}
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Suggestions & Modèles rapides :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "🔧 Travaux prévus", text: "Travaux d'entretien dans les parties communes prévus ce mois-ci. Merci pour votre compréhension." },
                    { label: "📑 Assurance habitation", text: "Rappel : Merci de transmettre votre attestation d'assurance habitation à jour à l'agence." },
                    { label: "💳 Libellé virement", text: "Rappel : Pour tout virement bancaire, veuillez obligatoirement préciser votre nom et numéro de logement." },
                    { label: "📞 Contact d'urgence", text: "Nouveau contact d'urgence et service gérance : (+225) 27 22 45 67 89 / contact@gestimmo.ci." },
                    { label: "🏖️ Fermeture exceptionnelle", text: "Fermeture exceptionnelle des bureaux le vendredi 24. Permanence d'urgence assurée." }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTempNoteText(preset.text)}
                      className="text-[11px] bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-900 px-2.5 py-1 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aperçu direct sur la quittance */}
              <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50/50">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Aperçu sur la quittance :
                </span>
                {tempNoteText.trim() ? (
                  <div className="bg-amber-50/95 border-l-4 border-amber-500 border-y border-r border-amber-200 rounded-md px-2.5 py-1 text-[9px] text-amber-950 flex items-start gap-1.5 leading-tight">
                    <span className="text-amber-700 font-bold flex-shrink-0">📢 NOTE IMPORTANTE :</span>
                    <span className="font-semibold flex-1">{tempNoteText.trim()}</span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic py-1 text-center">
                    Aucun message saisi. La quittance s'affichera sans note additionnelle.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-app-border flex items-center justify-between gap-3">
              <div>
                {(receiptCustomNote || tempNoteText) && (
                  <button
                    type="button"
                    onClick={handleClearCustomNote}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Effacer la note
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomNoteModalOpen(false)}
                  className="bg-white border border-app-border text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomNote}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer & Appliquer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
