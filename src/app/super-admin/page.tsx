"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { formatFCFA } from "@/lib/utils";
import {
  ShieldCheck,
  Building2,
  TrendingUp,
  Users,
  Home,
  Plus,
  Search,
  CheckCircle2,
  Ban,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  CalendarPlus,
  CreditCard,
  KeyRound,
  LogOut,
  RefreshCw,
  Check,
  Copy,
  X,
} from "lucide-react";
import {
  SaaSAgency,
  SaaSPlanType,
  SaaSAgencyStatus,
  SaaSSubscriptionPayment,
  SAAS_PLANS,
  getSaaSAgencies,
  saveSaaSAgencies,
  syncAgenciesWithSupabase,
  registerNewSaaSAgency,
  getSaaSPayments,
  saveSaaSPayments,
  getSuperAdminCredentials,
  saveSuperAdminCredentials,
} from "@/lib/superAdminService";
import { setPortalSession, clearPortalSession } from "@/lib/authSession";
import { getDefaultPermissions } from "@/lib/companyCredentials";
import { invalidateDatabaseCache } from "@/lib/dataService";

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"agencies" | "revenues" | "settings">("agencies");
  const [agencies, setAgencies] = useState<SaaSAgency[]>([]);
  const [payments, setPayments] = useState<SaaSSubscriptionPayment[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");

  // Password visibility & copy feedback per agency
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Agency Modal
  const [showAddAgencyModal, setShowAddAgencyModal] = useState(false);
  const [newAgencyForm, setNewAgencyForm] = useState({
    companyName: "",
    adminName: "",
    email: "",
    phone: "",
    address: "Abidjan, Côte d'Ivoire",
    password: "",
    plan: "Professionnel" as SaaSPlanType,
  });

  // New Subscription Payment Modal
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newPaymentForm, setNewPaymentForm] = useState({
    agencyId: "",
    plan: "Professionnel" as SaaSPlanType,
    amount: 24900,
    period: "Novembre 2026",
    paymentMethod: "Mobile Money" as SaaSSubscriptionPayment["paymentMethod"],
  });

  // Super Admin Personal Credentials Form
  const [adminCreds, setAdminCreds] = useState(() => getSuperAdminCredentials());
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [credsSavedSuccess, setCredsSavedSuccess] = useState(false);

  useEffect(() => {
    const initial = getSaaSAgencies();
    setAgencies(initial);
    setPayments(getSaaSPayments());
    setAdminCreds(getSuperAdminCredentials());

    setIsSyncing(true);
    syncAgenciesWithSupabase()
      .then((synced) => setAgencies(synced))
      .finally(() => setIsSyncing(false));
  }, []);

  const handleRefresh = async () => {
    setIsSyncing(true);
    const synced = await syncAgenciesWithSupabase();
    setAgencies(synced);
    setIsSyncing(false);
  };

  // KPIs SaaS
  const kpis = useMemo(() => {
    const activeAgencies = agencies.filter((a) => a.status === "Actif");
    const trialAgencies = agencies.filter((a) => a.status === "En essai");
    const suspendedAgencies = agencies.filter((a) => a.status === "Suspendu" || a.status === "Expiré");

    const mrr = activeAgencies.reduce((sum, a) => sum + (a.monthlyFee || SAAS_PLANS[a.plan]?.monthlyPrice || 0), 0);
    const arr = mrr * 12;
    const totalCollected = payments
      .filter((p) => p.status === "Payé")
      .reduce((sum, p) => sum + p.amount, 0);
    const totalUnits = agencies.reduce((sum, a) => sum + (a.unitsCount || 0), 0);
    const totalTenants = agencies.reduce((sum, a) => sum + (a.tenantsCount || 0), 0);

    return {
      totalAgencies: agencies.length,
      activeCount: activeAgencies.length,
      trialCount: trialAgencies.length,
      suspendedCount: suspendedAgencies.length,
      mrr,
      arr,
      totalCollected,
      totalUnits,
      totalTenants,
    };
  }, [agencies, payments]);

  const filteredAgencies = useMemo(() => {
    return agencies.filter((ag) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        ag.name.toLowerCase().includes(q) ||
        ag.adminName.toLowerCase().includes(q) ||
        ag.email.toLowerCase().includes(q) ||
        ag.phone.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || ag.status === statusFilter;
      const matchesPlan = planFilter === "ALL" || ag.plan === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [agencies, searchTerm, statusFilter, planFilter]);

  const handleToggleStatus = (agency: SaaSAgency) => {
    const nextStatus: SaaSAgencyStatus = agency.status === "Suspendu" ? "Actif" : "Suspendu";
    const updated = agencies.map((a) => (a.id === agency.id ? { ...a, status: nextStatus } : a));
    setAgencies(updated);
    saveSaaSAgencies(updated);

    // Synchroniser aussi le statut dans gestimmo_company_users
    try {
      const rawUsers = localStorage.getItem("gestimmo_company_users");
      if (rawUsers) {
        const users = JSON.parse(rawUsers);
        const updatedUsers = users.map((u: any) =>
          (u.email || "").toLowerCase() === agency.email.toLowerCase()
            ? { ...u, status: nextStatus === "Suspendu" ? "Inactif" : "Actif" }
            : u
        );
        localStorage.setItem("gestimmo_company_users", JSON.stringify(updatedUsers));
      }
    } catch (e) {}
  };

  const handleChangePlan = (agencyId: string, newPlan: SaaSPlanType) => {
    const newFee = SAAS_PLANS[newPlan].monthlyPrice;
    const updated = agencies.map((a) =>
      a.id === agencyId
        ? {
            ...a,
            plan: newPlan,
            monthlyFee: newFee,
            status: newPlan === "Essai Gratuit" ? ("En essai" as SaaSAgencyStatus) : ("Actif" as SaaSAgencyStatus),
          }
        : a
    );
    setAgencies(updated);
    saveSaaSAgencies(updated);
  };

  const handleExtendSubscription = (agency: SaaSAgency, daysToAdd: number) => {
    const currentEnd = agency.subscriptionEndDate ? new Date(agency.subscriptionEndDate) : new Date();
    const baseDate = isNaN(currentEnd.getTime()) || currentEnd < new Date() ? new Date() : currentEnd;
    baseDate.setDate(baseDate.getDate() + daysToAdd);

    const updated = agencies.map((a) =>
      a.id === agency.id
        ? {
            ...a,
            status: "Actif" as SaaSAgencyStatus,
            subscriptionEndDate: baseDate.toISOString().slice(0, 10),
          }
        : a
    );
    setAgencies(updated);
    saveSaaSAgencies(updated);
  };

  const handleDeleteAgency = (agency: SaaSAgency) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer l'agence "${agency.name}" de la plateforme ?`)) return;
    const updated = agencies.filter((a) => a.id !== agency.id);
    setAgencies(updated);
    saveSaaSAgencies(updated);
  };

  const handleImpersonateAgency = (agency: SaaSAgency) => {
    invalidateDatabaseCache();
    setPortalSession("ADMIN", {
      id: agency.id,
      companyId: agency.id,
      companyName: agency.name,
      name: `${agency.adminName} (${agency.name})`,
      email: agency.email,
      phone: agency.phone,
      login: agency.login,
      role: "Administrateur",
      userRole: "ADMIN",
      status: "Actif",
      permissions: getDefaultPermissions("Administrateur"),
    });
    router.push("/app");
  };

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgencyForm.companyName.trim() || !newAgencyForm.email.trim()) return;

    const created = await registerNewSaaSAgency({
      companyName: newAgencyForm.companyName,
      adminName: newAgencyForm.adminName || "Administrateur Agence",
      email: newAgencyForm.email,
      phone: newAgencyForm.phone,
      address: newAgencyForm.address,
      password: newAgencyForm.password || "Agence2026!",
      plan: newAgencyForm.plan,
      status: newAgencyForm.plan === "Essai Gratuit" ? "En essai" : "Actif",
    });

    setAgencies(getSaaSAgencies());
    setShowAddAgencyModal(false);
    setNewAgencyForm({
      companyName: "",
      adminName: "",
      email: "",
      phone: "",
      address: "Abidjan, Côte d'Ivoire",
      password: "",
      plan: "Professionnel",
    });

    // Si plan payant, enregistrer le 1er paiement SaaS
    if (created.monthlyFee > 0) {
      const firstPayment: SaaSSubscriptionPayment = {
        id: `SUB-PAY-${Date.now().toString().slice(-4)}`,
        agencyId: created.id,
        agencyName: created.name,
        plan: created.plan,
        amount: created.monthlyFee,
        period: new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
        paymentMethod: "Mobile Money",
        status: "Payé",
        date: new Date().toISOString().slice(0, 10),
      };
      const nextPayments = [firstPayment, ...payments];
      setPayments(nextPayments);
      saveSaaSPayments(nextPayments);
    }
  };

  const handleRecordSubscriptionPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAgency = agencies.find((a) => a.id === newPaymentForm.agencyId) || agencies[0];
    if (!targetAgency) return;

    const newPayment: SaaSSubscriptionPayment = {
      id: `SUB-PAY-${Date.now().toString().slice(-4)}`,
      agencyId: targetAgency.id,
      agencyName: targetAgency.name,
      plan: newPaymentForm.plan,
      amount: Number(newPaymentForm.amount) || SAAS_PLANS[newPaymentForm.plan].monthlyPrice,
      period: newPaymentForm.period,
      paymentMethod: newPaymentForm.paymentMethod,
      status: "Payé",
      date: new Date().toISOString().slice(0, 10),
    };

    const nextPayments = [newPayment, ...payments];
    setPayments(nextPayments);
    saveSaaSPayments(nextPayments);

    // Activer et prolonger l'abonnement de l'agence de 30 jours
    const currentEnd = targetAgency.subscriptionEndDate ? new Date(targetAgency.subscriptionEndDate) : new Date();
    const baseDate = isNaN(currentEnd.getTime()) || currentEnd < new Date() ? new Date() : currentEnd;
    baseDate.setDate(baseDate.getDate() + 30);

    const updatedAgencies = agencies.map((a) =>
      a.id === targetAgency.id
        ? {
            ...a,
            plan: newPaymentForm.plan,
            monthlyFee: SAAS_PLANS[newPaymentForm.plan].monthlyPrice,
            status: "Actif" as SaaSAgencyStatus,
            subscriptionEndDate: baseDate.toISOString().slice(0, 10),
            totalRevenueCollected: (a.totalRevenueCollected || 0) + newPayment.amount,
          }
        : a
    );
    setAgencies(updatedAgencies);
    saveSaaSAgencies(updatedAgencies);
    setShowAddPaymentModal(false);
  };

  const handleSaveSuperAdminCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveSuperAdminCredentials(adminCreds);
    setAdminCreds(updated);
    setPortalSession("SUPER_ADMIN", updated, "SUPER_ADMIN");
    setCredsSavedSuccess(true);
    setTimeout(() => setCredsSavedSuccess(false), 3500);
  };

  const handleCopyCredentials = (agency: SaaSAgency) => {
    const text = `Agence: ${agency.name}\nConnexion: ${ window.location.origin }/connexion\nIdentifiant: ${agency.login}\nMot de passe: ${agency.password}`;
    navigator.clipboard.writeText(text);
    setCopiedId(agency.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = () => {
    clearPortalSession("SUPER_ADMIN");
    clearPortalSession("ADMIN");
    router.replace("/connexion");
  };

  const getStatusBadgeVariant = (status: SaaSAgencyStatus) => {
    if (status === "Actif") return "success";
    if (status === "En essai") return "info";
    if (status === "Suspendu") return "danger";
    return "alert";
  };

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Top Header Super-Admin */}
      <header className="bg-gray-900 text-white border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">GESTIMMO</span>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-primary/20 text-primary-100 border border-primary/40 px-2 py-0.5 rounded-full">
                  Super-Admin SaaS
                </span>
              </div>
              <p className="text-xs text-gray-400 hidden sm:block">
                Console propriétaire — Gestion multi-agences, licences & revenus SaaS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              className="bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Synchroniser avec Supabase"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin text-primary" : ""}`} />
              <span className="hidden md:inline">Synchroniser</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (agencies[0]) handleImpersonateAgency(agencies[0]);
                else router.push("/app");
              }}
              className="bg-primary text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Vue Agence (/app)</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="bg-gray-800 border border-gray-700 text-gray-300 hover:text-red-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Barre d'onglets */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-app-border shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("agencies")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === "agencies" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Agences Clientes ({agencies.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("revenues")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === "revenues" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Revenus SaaS & Abonnements</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === "settings" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>Mes Identifiants Super-Admin</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setNewPaymentForm((prev) => ({
                  ...prev,
                  agencyId: agencies[0]?.id || "",
                }));
                setShowAddPaymentModal(true);
              }}
              className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Encaisser un abonnement</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddAgencyModal(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvelle Agence Cliente</span>
            </button>
          </div>
        </div>

        {/* Cartes KPIs SaaS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Revenu Mensuel (MRR)</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatFCFA(kpis.mrr)}</p>
            <p className="text-xs text-gray-500 mt-1">
              ARR projeté : <span className="font-semibold text-gray-700">{formatFCFA(kpis.arr)}/an</span>
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Agences Inscrites</span>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpis.totalAgencies}</p>
            <div className="flex items-center gap-3 text-xs mt-1">
              <span className="text-emerald-600 font-medium">{kpis.activeCount} actives</span>
              <span className="text-blue-600 font-medium">{kpis.trialCount} en essai</span>
              {kpis.suspendedCount > 0 && (
                <span className="text-red-600 font-medium">{kpis.suspendedCount} suspendues</span>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Total Encaissé (SaaS)</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatFCFA(kpis.totalCollected)}</p>
            <p className="text-xs text-gray-500 mt-1">{payments.length} règlement(s) d&apos;abonnement</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Volume Parc Hébergé</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Home className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpis.totalUnits} logements</p>
            <p className="text-xs text-gray-500 mt-1">{kpis.totalTenants} locataires gérés sur GESTIMMO</p>
          </div>
        </div>

        {/* ONGLET 1 : LISTE DES AGENCES CLIENTES */}
        {activeTab === "agencies" && (
          <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Répertoire des Agences Immobilières</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Gérez les accès, changez les offres d&apos;abonnement et activez ou suspendez les agences en temps réel.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher une agence, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-app-border rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:border-primary"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="Actif">Actif</option>
                  <option value="En essai">En essai</option>
                  <option value="Suspendu">Suspendu</option>
                </select>

                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-3 py-2 border border-app-border rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:border-primary"
                >
                  <option value="ALL">Toutes les offres</option>
                  <option value="Essai Gratuit">Essai Gratuit</option>
                  <option value="Starter">Starter</option>
                  <option value="Professionnel">Professionnel</option>
                  <option value="Entreprise">Entreprise</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                  <tr>
                    <th className="px-6 py-4 font-medium text-left">Agence & Dirigeant</th>
                    <th className="px-6 py-4 font-medium text-left">Accès Administrateur</th>
                    <th className="px-6 py-4 font-medium text-center">Offre & Tarif</th>
                    <th className="px-6 py-4 font-medium text-center">Parc Géré</th>
                    <th className="px-6 py-4 font-medium text-center">Statut & Échéance</th>
                    <th className="px-6 py-4 font-medium text-right">Actions Super-Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredAgencies.map((agency) => {
                    const isPassVisible = Boolean(visiblePasswords[agency.id]);
                    return (
                      <tr key={agency.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                              {agency.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{agency.name}</p>
                              <p className="text-xs text-gray-500">
                                {agency.adminName} • {agency.phone || "Sans téléphone"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-900">{agency.login}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                {isPassVisible ? agency.password : "••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setVisiblePasswords((prev) => ({ ...prev, [agency.id]: !prev[agency.id] }))
                                }
                                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                                title={isPassVisible ? "Masquer" : "Afficher le mot de passe"}
                              >
                                {isPassVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyCredentials(agency)}
                                className="text-gray-400 hover:text-primary p-1 cursor-pointer"
                                title="Copier les identifiants de l'agence"
                              >
                                {copiedId === agency.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <select
                            value={agency.plan}
                            onChange={(e) => handleChangePlan(agency.id, e.target.value as SaaSPlanType)}
                            className="text-xs font-semibold border border-app-border rounded-lg px-2.5 py-1.5 bg-white text-gray-900 focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="Essai Gratuit">Essai Gratuit</option>
                            <option value="Starter">Starter</option>
                            <option value="Professionnel">Professionnel</option>
                            <option value="Entreprise">Entreprise</option>
                          </select>
                          <p className="text-xs font-medium text-gray-500 mt-1">
                            {formatFCFA(agency.monthlyFee)}/mois
                          </p>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                          <div className="inline-flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-xs">
                            <span title="Immeubles / Biens">
                              <strong className="text-gray-900">{agency.propertiesCount}</strong> biens
                            </span>
                            <span>•</span>
                            <span title="Logements / Lots">
                              <strong className="text-gray-900">{agency.unitsCount}</strong> lots
                            </span>
                            <span>•</span>
                            <span title="Locataires">
                              <strong className="text-gray-900">{agency.tenantsCount}</strong> loc.
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant={getStatusBadgeVariant(agency.status)} dot>
                              {agency.status}
                            </Badge>
                            <span className="text-[11px] text-gray-500">
                              Fin : {agency.subscriptionEndDate || "Illimité"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleImpersonateAgency(agency)}
                              className="text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Entrer dans l'espace d'administration de cette agence"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Gérer</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExtendSubscription(agency, 30)}
                              className="bg-white border border-app-border text-gray-700 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Prolonger l'abonnement de 30 jours"
                            >
                              <CalendarPlus className="h-3.5 w-3.5 text-emerald-600" />
                              <span>+30j</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(agency)}
                              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1 cursor-pointer ${
                                agency.status === "Suspendu"
                                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                                  : "bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white"
                              }`}
                            >
                              {agency.status === "Suspendu" ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Activer</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="h-3.5 w-3.5" />
                                  <span>Suspendre</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteAgency(agency)}
                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                              title="Supprimer l'agence"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAgencies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                        Aucune agence trouvée pour ces critères.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ONGLET 2 : REVENUS SAAS & FACTURATION */}
        {activeTab === "revenues" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(["Starter", "Professionnel", "Entreprise"] as SaaSPlanType[]).map((planKey) => {
                const planInfo = SAAS_PLANS[planKey];
                const planAgencies = agencies.filter((a) => a.plan === planKey && a.status === "Actif");
                const planMrr = planAgencies.length * planInfo.monthlyPrice;
                return (
                  <div key={planKey} className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Offre {planInfo.name}</h3>
                      <Badge variant={planKey === "Professionnel" ? "info" : "default"} dot>
                        {planAgencies.length} agence(s)
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">{planInfo.description}</p>
                    <div className="pt-4 border-t border-app-border flex items-baseline justify-between">
                      <span className="text-xs text-gray-500">Tarif unitaire : {formatFCFA(planInfo.monthlyPrice)}/mois</span>
                      <span className="text-base font-bold text-primary">{formatFCFA(planMrr)}/mois</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-app-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Historique des Abonnements Encaissés</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Suivi de tous les règlements d&apos;abonnements SaaS effectués par les agences immobilières.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(true)}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Enregistrer un paiement</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                    <tr>
                      <th className="px-6 py-4 font-medium text-left">Référence & Date</th>
                      <th className="px-6 py-4 font-medium text-left">Agence Cliente</th>
                      <th className="px-6 py-4 font-medium text-center">Offre</th>
                      <th className="px-6 py-4 font-medium text-center">Période</th>
                      <th className="px-6 py-4 font-medium text-center">Mode de paiement</th>
                      <th className="px-6 py-4 font-medium text-center">Montant</th>
                      <th className="px-6 py-4 font-medium text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {pay.id}
                          <p className="text-xs text-gray-500 font-normal">{pay.date}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {pay.agencyName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                          {pay.plan}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                          {pay.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                          {pay.paymentMethod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                          {formatFCFA(pay.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Badge variant={pay.status === "Payé" ? "success" : "warning"} dot>
                            {pay.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 3 : MES IDENTIFIANTS SUPER-ADMIN */}
        {activeTab === "settings" && (
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Mes Identifiants Propriétaire SaaS (Super-Administrateur)
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Personnalisez vos identifiants personnels pour vous connecter à la console{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/super-admin</code> depuis la page de connexion.
            </p>

            {credsSavedSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3.5 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Vos identifiants Super-Administrateur ont été mis à jour avec succès !</span>
              </div>
            )}

            <form onSubmit={handleSaveSuperAdminCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet / Titre</label>
                <input
                  type="text"
                  required
                  value={adminCreds.name}
                  onChange={(e) => setAdminCreds({ ...adminCreds, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-app-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email / Identifiant de connexion
                  </label>
                  <input
                    type="text"
                    required
                    value={adminCreds.login}
                    onChange={(e) =>
                      setAdminCreds({ ...adminCreds, login: e.target.value, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-app-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={adminCreds.phone}
                    onChange={(e) => setAdminCreds({ ...adminCreds, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-app-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe Super-Admin</label>
                <div className="relative">
                  <input
                    type={showAdminPass ? "text" : "password"}
                    required
                    value={adminCreds.password}
                    onChange={(e) => setAdminCreds({ ...adminCreds, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 pr-10 border border-app-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    {showAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                >
                  Enregistrer mes identifiants
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* MODALE : CRÉER UNE NOUVELLE AGENCE CLIENTE */}
      {showAddAgencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Ajouter une Nouvelle Agence Cliente</h3>
              <button
                type="button"
                onClick={() => setShowAddAgencyModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgency} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nom de l&apos;Agence Immobilière</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Babi Immo Prestige"
                  value={newAgencyForm.companyName}
                  onChange={(e) => setNewAgencyForm({ ...newAgencyForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom du Dirigeant / Admin</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: KOUAME CEDRIC"
                    value={newAgencyForm.adminName}
                    onChange={(e) => setNewAgencyForm({ ...newAgencyForm, adminName: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    placeholder="Ex: +225 0708091011"
                    value={newAgencyForm.phone}
                    onChange={(e) => setNewAgencyForm({ ...newAgencyForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email (Identifiant de connexion)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contact@agence.ci"
                    value={newAgencyForm.email}
                    onChange={(e) => setNewAgencyForm({ ...newAgencyForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe initial</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Agence2026!"
                    value={newAgencyForm.password}
                    onChange={(e) => setNewAgencyForm({ ...newAgencyForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Offre d&apos;abonnement</label>
                <select
                  value={newAgencyForm.plan}
                  onChange={(e) =>
                    setNewAgencyForm({ ...newAgencyForm, plan: e.target.value as SaaSPlanType })
                  }
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white"
                >
                  <option value="Essai Gratuit">Essai Gratuit (14 jours — {formatFCFA(0)})</option>
                  <option value="Starter">Starter ({formatFCFA(9900)}/mois)</option>
                  <option value="Professionnel">Professionnel ({formatFCFA(24900)}/mois)</option>
                  <option value="Entreprise">Entreprise ({formatFCFA(75000)}/mois)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setShowAddAgencyModal(false)}
                  className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                >
                  Créer l&apos;agence et activer l&apos;accès
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : ENREGISTRER UN PAIEMENT D'ABONNEMENT SAAS */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Encaisser un Abonnement SaaS</h3>
              <button
                type="button"
                onClick={() => setShowAddPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSubscriptionPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Agence Cliente</label>
                <select
                  value={newPaymentForm.agencyId}
                  onChange={(e) => {
                    const ag = agencies.find((a) => a.id === e.target.value);
                    const plan = ag?.plan && ag.plan !== "Essai Gratuit" ? ag.plan : "Professionnel";
                    setNewPaymentForm({
                      ...newPaymentForm,
                      agencyId: e.target.value,
                      plan,
                      amount: SAAS_PLANS[plan].monthlyPrice,
                    });
                  }}
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white"
                >
                  {agencies.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.plan})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Offre facturée</label>
                  <select
                    value={newPaymentForm.plan}
                    onChange={(e) => {
                      const p = e.target.value as SaaSPlanType;
                      setNewPaymentForm({
                        ...newPaymentForm,
                        plan: p,
                        amount: SAAS_PLANS[p].monthlyPrice,
                      });
                    }}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Professionnel">Professionnel</option>
                    <option value="Entreprise">Entreprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Montant (F CFA)</label>
                  <input
                    type="number"
                    required
                    value={newPaymentForm.amount}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Période</label>
                  <input
                    type="text"
                    required
                    value={newPaymentForm.period}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, period: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mode de paiement</label>
                  <select
                    value={newPaymentForm.paymentMethod}
                    onChange={(e) =>
                      setNewPaymentForm({
                        ...newPaymentForm,
                        paymentMethod: e.target.value as SaaSSubscriptionPayment["paymentMethod"],
                      })
                    }
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white"
                  >
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Virement">Virement</option>
                    <option value="Carte Bancaire">Carte Bancaire</option>
                    <option value="Espèces">Espèces</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                >
                  Valider & Prolonger (+30j)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

