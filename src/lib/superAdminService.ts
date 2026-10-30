import { supabase } from "./supabase";
import { isSupabaseConfigured, DEFAULT_COMPANY_ID } from "./dataService";
import { saveStoredVaultCredential, getStoredVaultCredential } from "./authSession";
import { getDefaultPermissions } from "./companyCredentials";

export type SaaSPlanType = "Essai Gratuit" | "Starter" | "Professionnel" | "Entreprise";
export type SaaSAgencyStatus = "Actif" | "En essai" | "Suspendu" | "Expiré";

export interface SaaSPlanConfig {
  name: SaaSPlanType;
  monthlyPrice: number;
  maxUnits: number | "Illimité";
  maxUsers: number | "Illimité";
  description: string;
}

export const SAAS_PLANS: Record<SaaSPlanType, SaaSPlanConfig> = {
  "Essai Gratuit": {
    name: "Essai Gratuit",
    monthlyPrice: 0,
    maxUnits: 15,
    maxUsers: 2,
    description: "Période d'essai gratuite de 14 jours",
  },
  Starter: {
    name: "Starter",
    monthlyPrice: 9900,
    maxUnits: 15,
    maxUsers: 1,
    description: "Pour les propriétaires indépendants et petites agences",
  },
  Professionnel: {
    name: "Professionnel",
    monthlyPrice: 24900,
    maxUnits: "Illimité",
    maxUsers: 5,
    description: "Pour les agences immobilières et syndics",
  },
  Entreprise: {
    name: "Entreprise",
    monthlyPrice: 75000,
    maxUnits: "Illimité",
    maxUsers: "Illimité",
    description: "Pour les grands groupes immobiliers (Marque blanche & API)",
  },
};

export interface SaaSAgency {
  id: string;
  name: string;
  adminName: string;
  email: string;
  phone: string;
  address?: string;
  login: string;
  password: string;
  plan: SaaSPlanType;
  monthlyFee: number;
  status: SaaSAgencyStatus;
  createdAt: string;
  subscriptionEndDate: string;
  propertiesCount: number;
  unitsCount: number;
  tenantsCount: number;
  usersCount: number;
  totalRevenueCollected: number;
}

export interface SaaSSubscriptionPayment {
  id: string;
  agencyId: string;
  agencyName: string;
  plan: SaaSPlanType;
  amount: number;
  period: string;
  paymentMethod: "Mobile Money" | "Virement" | "Carte Bancaire" | "Espèces";
  status: "Payé" | "En attente";
  date: string;
}

export interface SuperAdminCredentials {
  id: string;
  name: string;
  email: string;
  phone: string;
  login: string;
  password: string;
  role: "Super Administrateur SaaS";
}

const SUPER_ADMIN_STORAGE_KEY = "gestimmo_saas_super_admin";
const AGENCIES_STORAGE_KEY = "gestimmo_saas_agencies";
const SAAS_PAYMENTS_STORAGE_KEY = "gestimmo_saas_payments";

export const DEFAULT_SUPER_ADMIN: SuperAdminCredentials = {
  id: "SAAS-FOUNDER-001",
  name: "NGBONTTI - Fondateur GESTIMMO",
  email: "admin@gestimmo.ci",
  phone: "+225 07 00 00 00 00",
  login: "admin@gestimmo.ci",
  password: "SuperAdmin2026!",
  role: "Super Administrateur SaaS",
};

export function getSuperAdminCredentials(): SuperAdminCredentials {
  if (typeof window === "undefined") return DEFAULT_SUPER_ADMIN;
  try {
    const raw = localStorage.getItem(SUPER_ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.login && parsed.password) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Erreur lecture SuperAdmin:", e);
  }
  localStorage.setItem(SUPER_ADMIN_STORAGE_KEY, JSON.stringify(DEFAULT_SUPER_ADMIN));
  return DEFAULT_SUPER_ADMIN;
}

export function saveSuperAdminCredentials(creds: Partial<SuperAdminCredentials>): SuperAdminCredentials {
  const current = getSuperAdminCredentials();
  const updated: SuperAdminCredentials = {
    ...current,
    ...creds,
    login: (creds.login || creds.email || current.login).trim(),
    email: (creds.email || creds.login || current.email).trim(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SUPER_ADMIN_STORAGE_KEY, JSON.stringify(updated));
    saveStoredVaultCredential("equipe", updated.id, {
      login: updated.login,
      email: updated.email,
      password: updated.password,
    });
  }
  return updated;
}

export function authenticateSuperAdmin(loginInput: string, passwordInput: string): SuperAdminCredentials | null {
  const admin = getSuperAdminCredentials();
  const cleanLogin = loginInput.trim().toLowerCase();
  const matchesLogin =
    cleanLogin === admin.login.toLowerCase() ||
    cleanLogin === admin.email.toLowerCase() ||
    cleanLogin === "superadmin" ||
    cleanLogin === "superadmin@gestimmo.ci";

  if (matchesLogin && passwordInput === admin.password) {
    return admin;
  }
  return null;
}

const DEFAULT_AGENCIES: SaaSAgency[] = [
  {
    id: DEFAULT_COMPANY_ID,
    name: "ImmoGestion Pro CI (Agence Principale)",
    adminName: "NGBONTTI",
    email: "direction@immogestion-pro.ci",
    phone: "+225 07 01 02 03 04",
    address: "Abidjan, Cocody Riviera",
    login: "direction@immogestion-pro.ci",
    password: "Admin1234!",
    plan: "Professionnel",
    monthlyFee: 24900,
    status: "Actif",
    createdAt: "2026-01-15",
    subscriptionEndDate: "2027-01-15",
    propertiesCount: 2,
    unitsCount: 12,
    tenantsCount: 12,
    usersCount: 4,
    totalRevenueCollected: 249000,
  },
];

const DEFAULT_SAAS_PAYMENTS: SaaSSubscriptionPayment[] = [
  {
    id: "SUB-PAY-001",
    agencyId: DEFAULT_COMPANY_ID,
    agencyName: "ImmoGestion Pro CI (Agence Principale)",
    plan: "Professionnel",
    amount: 24900,
    period: "Octobre 2026",
    paymentMethod: "Mobile Money",
    status: "Payé",
    date: "2026-10-01",
  },
];

export function getSaaSAgencies(): SaaSAgency[] {
  if (typeof window === "undefined") return DEFAULT_AGENCIES;
  try {
    const raw = localStorage.getItem(AGENCIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Erreur lecture agences SaaS:", e);
  }
  localStorage.setItem(AGENCIES_STORAGE_KEY, JSON.stringify(DEFAULT_AGENCIES));
  return DEFAULT_AGENCIES;
}

export function saveSaaSAgencies(agencies: SaaSAgency[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AGENCIES_STORAGE_KEY, JSON.stringify(agencies));
  window.dispatchEvent(new Event("gestimmo_saas_agencies_updated"));
}

export function getSaaSPayments(): SaaSSubscriptionPayment[] {
  if (typeof window === "undefined") return DEFAULT_SAAS_PAYMENTS;
  try {
    const raw = localStorage.getItem(SAAS_PAYMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Erreur lecture paiements SaaS:", e);
  }
  localStorage.setItem(SAAS_PAYMENTS_STORAGE_KEY, JSON.stringify(DEFAULT_SAAS_PAYMENTS));
  return DEFAULT_SAAS_PAYMENTS;
}

export function saveSaaSPayments(payments: SaaSSubscriptionPayment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAAS_PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
}

/**
 * Synchronise les agences et statistiques réelles depuis Supabase (`companies`, `properties`, `units`, `tenants`, `profiles`)
 */
export async function syncAgenciesWithSupabase(): Promise<SaaSAgency[]> {
  const localAgencies = getSaaSAgencies();
  if (!isSupabaseConfigured()) return localAgencies;

  try {
    const [companiesRes, propsRes, unitsRes, tenantsRes, profilesRes] = await Promise.all([
      supabase.from("companies").select("*"),
      supabase.from("properties").select("id, company_id"),
      supabase.from("units").select("id, property_id"),
      supabase.from("tenants").select("id, company_id"),
      supabase.from("profiles").select("id, company_id, full_name, email, phone, role"),
    ]);

    const dbCompanies: any[] = companiesRes.data || [];
    const dbProps: any[] = propsRes.data || [];
    const dbUnits: any[] = unitsRes.data || [];
    const dbTenants: any[] = tenantsRes.data || [];
    const dbProfiles: any[] = profilesRes.data || [];

    const mergedMap = new Map<string, SaaSAgency>();
    localAgencies.forEach((ag) => mergedMap.set(ag.id, { ...ag }));

    dbCompanies.forEach((comp) => {
      const existing = mergedMap.get(comp.id);
      const compProps = dbProps.filter((p) => p.company_id === comp.id || (!p.company_id && comp.id === DEFAULT_COMPANY_ID));
      const compPropIds = new Set(compProps.map((p) => p.id));
      const compUnits = dbUnits.filter((u) => u.property_id && compPropIds.has(u.property_id));
      const compTenants = dbTenants.filter((t) => t.company_id === comp.id || (!t.company_id && comp.id === DEFAULT_COMPANY_ID));
      const compProfiles = dbProfiles.filter((pr) => pr.company_id === comp.id || (!pr.company_id && comp.id === DEFAULT_COMPANY_ID));
      const adminProfile = compProfiles.find((pr) => (pr.role || "").toUpperCase().includes("ADMIN")) || compProfiles[0];

      const rawPlan = (comp.subscription_plan || existing?.plan || "Professionnel") as SaaSPlanType;
      const validPlan: SaaSPlanType = SAAS_PLANS[rawPlan] ? rawPlan : "Professionnel";
      const vaultCreds = getStoredVaultCredential("equipe", comp.id);

      if (existing) {
        mergedMap.set(comp.id, {
          ...existing,
          name: comp.name || existing.name,
          email: comp.email || existing.email,
          phone: comp.phone || existing.phone,
          address: comp.address || existing.address,
          propertiesCount: compProps.length,
          unitsCount: compUnits.length,
          tenantsCount: compTenants.length,
          usersCount: Math.max(compProfiles.length, existing.usersCount || 1),
        });
      } else {
        const createdDate = comp.created_at ? comp.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
        const endDateObj = new Date(createdDate);
        endDateObj.setDate(endDateObj.getDate() + 30);

        mergedMap.set(comp.id, {
          id: comp.id,
          name: comp.name,
          adminName: adminProfile?.full_name || "Administrateur Agence",
          email: comp.email || adminProfile?.email || "",
          phone: comp.phone || adminProfile?.phone || "",
          address: comp.address || "Côte d'Ivoire",
          login: vaultCreds?.login || comp.email || adminProfile?.email || "",
          password: vaultCreds?.password || "Agence1234!",
          plan: validPlan,
          monthlyFee: SAAS_PLANS[validPlan].monthlyPrice,
          status: "Actif",
          createdAt: createdDate,
          subscriptionEndDate: endDateObj.toISOString().slice(0, 10),
          propertiesCount: compProps.length,
          unitsCount: compUnits.length,
          tenantsCount: compTenants.length,
          usersCount: Math.max(compProfiles.length, 1),
          totalRevenueCollected: SAAS_PLANS[validPlan].monthlyPrice,
        });
      }
    });

    // Mettre à jour les compteurs de l'agence principale même si elle n'est pas encore dans companies
    if (mergedMap.has(DEFAULT_COMPANY_ID)) {
      const mainAg = mergedMap.get(DEFAULT_COMPANY_ID)!;
      const mainProps = dbProps.filter((p) => !p.company_id || p.company_id === DEFAULT_COMPANY_ID);
      const mainPropIds = new Set(mainProps.map((p) => p.id));
      const mainUnits = dbUnits.filter((u) => (u.property_id && mainPropIds.has(u.property_id)) || !u.company_id || u.company_id === DEFAULT_COMPANY_ID);
      const mainTenants = dbTenants.filter((t) => !t.company_id || t.company_id === DEFAULT_COMPANY_ID);
      if (mainProps.length > 0 || mainTenants.length > 0) {
        mainAg.propertiesCount = mainProps.length;
        mainAg.unitsCount = mainUnits.length;
        mainAg.tenantsCount = mainTenants.length;
      }
    }

    // Pour toutes les autres agences locales qui ne sont pas l'agence principale, calculer strictement leurs propres biens
    mergedMap.forEach((ag, agId) => {
      if (agId !== DEFAULT_COMPANY_ID) {
        const agProps = dbProps.filter((p) => p.company_id === agId);
        const agPropIds = new Set(agProps.map((p) => p.id));
        const agUnits = dbUnits.filter((u) => (u.property_id && agPropIds.has(u.property_id)) || u.company_id === agId);
        const agTenants = dbTenants.filter((t) => t.company_id === agId);
        ag.propertiesCount = agProps.length;
        ag.unitsCount = agUnits.length;
        ag.tenantsCount = agTenants.length;
      }
    });

    const updatedList = Array.from(mergedMap.values());
    saveSaaSAgencies(updatedList);
    return updatedList;
  } catch (err) {
    console.error("Erreur syncAgenciesWithSupabase:", err);
    return localAgencies;
  }
}

/**
 * Crée une nouvelle agence cliente (depuis /inscription ou depuis /super-admin)
 * et enregistre ses accès Administrateur pour qu'elle puisse se connecter sur /connexion.
 */
export async function registerNewSaaSAgency(input: {
  companyName: string;
  adminName: string;
  email: string;
  phone: string;
  password: string;
  plan?: SaaSPlanType;
  status?: SaaSAgencyStatus;
  address?: string;
}): Promise<SaaSAgency> {
  const plan: SaaSPlanType = input.plan || "Essai Gratuit";
  const status: SaaSAgencyStatus = input.status || (plan === "Essai Gratuit" ? "En essai" : "Actif");
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (plan === "Essai Gratuit" ? 14 : 30));

  const newAgencyId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `AG-${Date.now()}`;

  const cleanEmail = input.email.trim().toLowerCase();
  const cleanPhone = input.phone.trim();

  const newAgency: SaaSAgency = {
    id: newAgencyId,
    name: input.companyName.trim(),
    adminName: input.adminName.trim(),
    email: cleanEmail,
    phone: cleanPhone,
    address: input.address || "Abidjan, Côte d'Ivoire",
    login: cleanEmail,
    password: input.password,
    plan,
    monthlyFee: SAAS_PLANS[plan].monthlyPrice,
    status,
    createdAt: today.toISOString().slice(0, 10),
    subscriptionEndDate: endDate.toISOString().slice(0, 10),
    propertiesCount: 0,
    unitsCount: 0,
    tenantsCount: 0,
    usersCount: 1,
    totalRevenueCollected: plan === "Essai Gratuit" ? 0 : SAAS_PLANS[plan].monthlyPrice,
  };

  // 1. Sauvegarder dans la liste des agences SaaS
  const agencies = getSaaSAgencies();
  const filtered = agencies.filter((a) => a.email.toLowerCase() !== cleanEmail);
  saveSaaSAgencies([newAgency, ...filtered]);

  // 2. Sauvegarder dans le Vault d'authentification
  saveStoredVaultCredential("equipe", newAgencyId, {
    login: cleanEmail,
    email: cleanEmail,
    password: input.password,
  });

  // 3. Ajouter l'administrateur de l'agence dans gestimmo_company_users pour qu'il puisse se connecter sur /connexion
  if (typeof window !== "undefined") {
    try {
      const rawUsers = localStorage.getItem("gestimmo_company_users");
      const users = rawUsers ? JSON.parse(rawUsers) : [];
      const newAdminUser = {
        id: `USR-${Date.now().toString().slice(-4)}`,
        companyId: newAgencyId,
        companyName: newAgency.name,
        name: newAgency.adminName,
        email: cleanEmail,
        phone: cleanPhone,
        login: cleanEmail,
        password: input.password,
        role: "Administrateur",
        status: status === "Suspendu" ? "Inactif" : "Actif",
        dateAdded: today.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
        permissions: getDefaultPermissions("Administrateur"),
      };
      const updatedUsers = [
        newAdminUser,
        ...users.filter((u: any) => (u.email || "").toLowerCase() !== cleanEmail),
      ];
      localStorage.setItem("gestimmo_company_users", JSON.stringify(updatedUsers));

      // Initialiser un espace de travail 100 % vierge pour cette nouvelle agence
      const emptyWorkspace = {
        gestimmo_proprietaires: "[]",
        gestimmo_biens: "[]",
        gestimmo_logements: "[]",
        gestimmo_locataires: "[]",
        gestimmo_baux: "[]",
        gestimmo_paiements: "[]",
        gestimmo_reversements: "[]",
        gestimmo_incidents: "[]",
        gestimmo_preavis: "[]",
        gestimmo_equipe: "[]",
        gestimmo_notifications: "[]",
        gestimmo_messages: "[]",
        gestimmo_company_info: JSON.stringify({
          name: newAgency.name,
          email: cleanEmail,
          phone: cleanPhone,
          address: newAgency.address || "Abidjan, Côte d'Ivoire",
          logo: "",
        }),
      };
      localStorage.setItem(`gestimmo_workspace_${newAgencyId}`, JSON.stringify(emptyWorkspace));
    } catch (e) {
      console.error("Erreur ajout utilisateur agence:", e);
    }
  }

  // 4. Persister dans Supabase si configuré
  if (isSupabaseConfigured()) {
    try {
      await (supabase.from("companies") as any).upsert({
        id: newAgencyId,
        name: newAgency.name,
        email: cleanEmail,
        phone: cleanPhone,
        address: newAgency.address || null,
        subscription_plan: plan,
      });

      await (supabase.from("profiles") as any).upsert({
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : newAgencyId,
        company_id: newAgencyId,
        full_name: newAgency.adminName,
        email: cleanEmail,
        phone: cleanPhone,
        role: "ADMINISTRATEUR",
        permissions: { all: true },
      });
    } catch (err) {
      console.error("Erreur sauvegarde Supabase nouvelle agence:", err);
    }
  }

  return newAgency;
}

/**
 * Vérifie si l'agence associée à un utilisateur est suspendue ou expirée
 */
export function isAgencySuspendedForUser(loginOrEmail: string): { suspended: boolean; agencyName?: string } {
  const clean = (loginOrEmail || "").trim().toLowerCase();
  if (!clean) return { suspended: false };

  const agencies = getSaaSAgencies();
  const matched = agencies.find(
    (ag) =>
      ag.email.toLowerCase() === clean ||
      ag.login.toLowerCase() === clean
  );

  if (matched && (matched.status === "Suspendu" || matched.status === "Expiré")) {
    return { suspended: true, agencyName: matched.name };
  }
  return { suspended: false };
}

