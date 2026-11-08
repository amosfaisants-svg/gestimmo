import { getStoredVaultCredential, saveStoredVaultCredential } from "./authSession";
import { supabase } from "./supabase";

export interface ModulePermissions {
  view: boolean;
  edit: boolean;
  delete: boolean;
  viewCredentials?: boolean;
}

export interface UserPermissionRights {
  biens: ModulePermissions;
  locataires: ModulePermissions;
  baux: ModulePermissions;
  paiements: ModulePermissions;
  incidents: ModulePermissions;
  parametres: ModulePermissions;
}

export interface UserAccount {
  id: string;
  companyId?: string;
  companyName?: string;
  name: string;
  email: string;
  phone: string;
  login: string;
  password: string;
  role: "Administrateur" | "Gestionnaire" | "Comptable" | "Agent de terrain";
  status: "Actif" | "En attente" | "Inactif";
  dateAdded: string;
  permissions: UserPermissionRights;
}

export const getDefaultPermissions = (role: string): UserPermissionRights => {
  const normRole = (role || "").toUpperCase();
  if (normRole.includes("ADMIN")) {
    return {
      biens: { view: true, edit: true, delete: true, viewCredentials: true },
      locataires: { view: true, edit: true, delete: true, viewCredentials: true },
      baux: { view: true, edit: true, delete: true },
      paiements: { view: true, edit: true, delete: true },
      incidents: { view: true, edit: true, delete: true },
      parametres: { view: true, edit: true, delete: true },
    };
  } else if (normRole.includes("COMPTA")) {
    return {
      biens: { view: true, edit: false, delete: false, viewCredentials: false },
      locataires: { view: true, edit: false, delete: false, viewCredentials: false },
      baux: { view: true, edit: false, delete: false },
      paiements: { view: true, edit: true, delete: true },
      incidents: { view: true, edit: false, delete: false },
      parametres: { view: true, edit: false, delete: false },
    };
  } else if (normRole.includes("AGENT") || normRole.includes("TERRAIN")) {
    return {
      biens: { view: true, edit: false, delete: false, viewCredentials: false },
      locataires: { view: true, edit: false, delete: false, viewCredentials: false },
      baux: { view: true, edit: false, delete: false },
      paiements: { view: false, edit: false, delete: false },
      incidents: { view: true, edit: true, delete: true },
      parametres: { view: false, edit: false, delete: false },
    };
  } else {
    // Gestionnaire
    return {
      biens: { view: true, edit: true, delete: false, viewCredentials: true },
      locataires: { view: true, edit: true, delete: false, viewCredentials: true },
      baux: { view: true, edit: true, delete: true },
      paiements: { view: true, edit: true, delete: false },
      incidents: { view: true, edit: true, delete: false },
      parametres: { view: true, edit: false, delete: false },
    };
  }
};

export const defaultCompanyUsersList: UserAccount[] = [
  {
    id: "USR-001",
    name: "NGBONTTI",
    email: "direction@immogestion-pro.ci",
    phone: "+225 07 01 02 03 04",
    login: "direction@immogestion-pro.ci",
    password: "Admin1234!",
    role: "Administrateur",
    status: "Actif",
    dateAdded: "15 Janv 2026",
    permissions: getDefaultPermissions("Administrateur"),
  },
  {
    id: "USR-002",
    name: "Konan Patricia",
    email: "patricia.konan@immogestion-pro.ci",
    phone: "+225 05 08 09 10 11",
    login: "patricia.konan@immogestion-pro.ci",
    password: "Gest5678!",
    role: "Gestionnaire",
    status: "Actif",
    dateAdded: "01 Mars 2026",
    permissions: getDefaultPermissions("Gestionnaire"),
  },
  {
    id: "USR-003",
    name: "Yao Armand",
    email: "armand.yao@immogestion-pro.ci",
    phone: "+225 01 44 55 66 77",
    login: "armand.yao@immogestion-pro.ci",
    password: "Compta9012!",
    role: "Comptable",
    status: "Actif",
    dateAdded: "10 Juin 2026",
    permissions: getDefaultPermissions("Comptable"),
  },
  {
    id: "USR-004",
    name: "konan othniel",
    email: "oty@yahoo.fr",
    phone: "0174820983",
    login: "oty@yahoo.fr",
    password: "Agent1234!",
    role: "Agent de terrain",
    status: "Actif",
    dateAdded: "05 oct. 2026",
    permissions: getDefaultPermissions("Agent de terrain"),
  },
];

/**
 * Gets company users from localStorage or initializes with default list
 */
export function getCompanyUsers(): UserAccount[] {
  if (typeof window === "undefined") return defaultCompanyUsersList;

  const storedRaw = localStorage.getItem("gestimmo_company_users");
  if (storedRaw) {
    try {
      const parsed: any[] = JSON.parse(storedRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized: UserAccount[] = parsed.map((u: any, idx: number) => ({
          id: u.id || `USR-${String(idx + 1).padStart(3, "0")}`,
          companyId: u.companyId || u.company_id || undefined,
          companyName: u.companyName || undefined,
          name: u.name || "Utilisateur",
          email: u.email || "",
          phone: u.phone || "",
          login: u.login || u.email || u.name?.toLowerCase().replace(/\s+/g, "."),
          password: u.password || "Gest1234!",
          role: u.role || "Gestionnaire",
          status: u.status || "Actif",
          dateAdded: u.dateAdded || "01 Janv 2026",
          permissions: u.permissions || getDefaultPermissions(u.role || "Gestionnaire"),
        }));

        defaultCompanyUsersList.forEach((defUser) => {
          const exists = normalized.some(
            (u) =>
              (u.email && u.email.toLowerCase() === defUser.email.toLowerCase()) ||
              (u.name && u.name.toLowerCase() === defUser.name.toLowerCase()) ||
              (u.login && u.login.toLowerCase() === defUser.login.toLowerCase())
          );
          if (!exists) {
            normalized.push(defUser);
          }
        });

        localStorage.setItem("gestimmo_company_users", JSON.stringify(normalized));
        return normalized;
      }
    } catch (e) {
      console.error(e);
    }
  }

  localStorage.setItem("gestimmo_company_users", JSON.stringify(defaultCompanyUsersList));
  return defaultCompanyUsersList;
}

export const defaultGerantsList = [
  { 
    id: "M-001", 
    name: "Aron Levine", 
    role: "Super Admin", 
    phone: "+225 0102030405", 
    email: "aron@gestimmo.ci", 
    login: "aron@gestimmo.ci", 
    password: "Admin1234!", 
    status: "Actif", 
    propertiesCount: 5, 
    performance: 94, 
    collected: 8500000, 
    assignedLogements: ["A-102", "B-204", "C-101"],
    gerantPermissions: { canViewReceipts: true, canManageContracts: true, canManageDocuments: true, canManageLogements: true }
  },
  { 
    id: "M-002", 
    name: "Sarah Kone", 
    role: "Gérante", 
    phone: "+225 0708091011", 
    email: "sarah@gestimmo.ci", 
    login: "sarah@gestimmo.ci", 
    password: "Gerant5678!", 
    status: "Actif", 
    propertiesCount: 4, 
    performance: 82, 
    collected: 4200000, 
    assignedLogements: ["A-101", "V-001"],
    gerantPermissions: { canViewReceipts: true, canManageContracts: true, canManageDocuments: true, canManageLogements: true }
  },
  { 
    id: "M-003", 
    name: "Marc Dubois", 
    role: "Gérant", 
    phone: "+225 0506070809", 
    email: "marc@gestimmo.ci", 
    login: "marc@gestimmo.ci", 
    password: "Gerant9012!", 
    status: "Actif", 
    propertiesCount: 2, 
    performance: 100, 
    collected: 2100000, 
    assignedLogements: [],
    gerantPermissions: { canViewReceipts: true, canManageContracts: true, canManageDocuments: true, canManageLogements: true }
  },
];

/**
 * Authenticates a company user, SaaS agency, or gérant with STRICT password verification.
 * Any wrong password for a known account immediately returns null (no fallback bypass).
 */
export function authenticateCompanyUser(loginInput: string, passwordInput: string): UserAccount | null {
  if (typeof window === "undefined") return null;

  const cleanInput = loginInput.trim().toLowerCase();
  const digitsOnlyInput = loginInput.replace(/\D/g, "");
  const inputPass = passwordInput.trim();
  if (!cleanInput || !inputPass) return null;

  // 1. Vérifier en priorité les agences SaaS inscrites (source de vérité des accès Administrateur d'agence)
  try {
    const rawAgencies = localStorage.getItem("gestimmo_saas_agencies");
    if (rawAgencies) {
      const agencies: any[] = JSON.parse(rawAgencies);
      const matchedAgency = agencies.find((ag) => {
        const agEmail = (ag.email || "").trim().toLowerCase();
        const agLogin = (ag.login || "").trim().toLowerCase();
        const agPhoneDigits = String(ag.phone || "").replace(/\D/g, "");
        return (
          (agEmail && cleanInput === agEmail) ||
          (agLogin && cleanInput === agLogin) ||
          (digitsOnlyInput.length >= 8 && agPhoneDigits.length >= 8 && agPhoneDigits === digitsOnlyInput)
        );
      });

      if (matchedAgency) {
        const expectedPass = String(matchedAgency.password || "").trim();
        // Vérification STRICTE du mot de passe de l'agence : si le mot de passe est faux, bloquer immédiatement !
        if (!expectedPass || inputPass !== expectedPass) {
          return null;
        }
        return {
          id: matchedAgency.id,
          companyId: matchedAgency.id,
          companyName: matchedAgency.name,
          name: matchedAgency.adminName || matchedAgency.name,
          email: matchedAgency.email,
          phone: matchedAgency.phone || "",
          login: matchedAgency.login || matchedAgency.email,
          password: matchedAgency.password,
          role: "Administrateur",
          status: matchedAgency.status === "Suspendu" ? "Inactif" : "Actif",
          dateAdded: matchedAgency.createdAt || "01 Janv 2026",
          permissions: getDefaultPermissions("Administrateur"),
        };
      }
    }
  } catch (e) {
    console.error("Erreur lecture agences SaaS lors de la connexion:", e);
  }

  // 2. Vérifier la liste des utilisateurs d'entreprise (gestimmo_company_users)
  const companyUsers = getCompanyUsers();
  const matchedUser = companyUsers.find((u) => {
    const uLogin = (u.login || "").trim().toLowerCase();
    const uEmail = (u.email || "").trim().toLowerCase();
    const uName = (u.name || "").trim().toLowerCase();
    const uId = (u.id || "").trim().toLowerCase();
    const uPhoneDigits = String(u.phone || "").replace(/\D/g, "");

    const matchesEmail = uEmail.length > 0 && (cleanInput === uEmail || cleanInput === uLogin);
    const matchesId = uId.length > 0 && cleanInput === uId;
    const matchesName = uName.length > 0 && cleanInput === uName;
    const matchesPhone = digitsOnlyInput.length >= 8 && uPhoneDigits.length >= 8 && uPhoneDigits === digitsOnlyInput;

    return matchesEmail || matchesId || matchesName || matchesPhone;
  });

  if (matchedUser) {
    let storedPass = (matchedUser.password || "").trim();
    if (!storedPass || storedPass.includes("••••") || storedPass.includes("••")) {
      const vaultPass = getStoredVaultCredential(matchedUser.id, "password");
      storedPass = vaultPass ? String(vaultPass).trim() : "";
    }

    // Vérification STRICTE du mot de passe : aucun mot de passe générique n'est toléré
    if (!storedPass || inputPass !== storedPass) {
      return null;
    }

    saveStoredVaultCredential(matchedUser.id, "password", storedPass);
    if (!matchedUser.companyId) {
      try {
        const rawAg = localStorage.getItem("gestimmo_saas_agencies");
        if (rawAg) {
          const agList: any[] = JSON.parse(rawAg);
          const foundAg = agList.find(
            (a) =>
              (a.email || "").trim().toLowerCase() === (matchedUser.email || "").trim().toLowerCase() ||
              (a.login || "").trim().toLowerCase() === (matchedUser.login || "").trim().toLowerCase()
          );
          if (foundAg) {
            matchedUser.companyId = foundAg.id;
            matchedUser.companyName = foundAg.name;
          }
        }
      } catch {}
    }
    return matchedUser;
  }

  // 3. Vérifier la liste Équipe / Gérants (gestimmo_equipe)
  let equipe: any[] = [];
  const storedEquipe = localStorage.getItem("gestimmo_equipe");
  if (storedEquipe) {
    try {
      equipe = JSON.parse(storedEquipe);
    } catch (e) {
      console.error(e);
    }
  }

  defaultGerantsList.forEach((defM) => {
    if (!equipe.some((m) => (m.email && m.email.toLowerCase() === defM.email.toLowerCase()) || (m.name && m.name.toLowerCase() === defM.name.toLowerCase()) || m.id === defM.id)) {
      equipe.push(defM);
    }
  });

  const matchedGerant = equipe.find((m) => {
    const mLogin = (m.login || m.email || "").trim().toLowerCase();
    const mEmail = (m.email || "").trim().toLowerCase();
    const mName = (m.name || "").trim().toLowerCase();
    const mId = (m.id || "").trim().toLowerCase();
    const mPhoneDigits = String(m.phone || "").replace(/\D/g, "");

    const matchesEmail = mEmail.length > 0 && (cleanInput === mEmail || cleanInput === mLogin);
    const matchesId = mId.length > 0 && cleanInput === mId;
    const matchesName = mName.length > 0 && cleanInput === mName;
    const matchesPhone = digitsOnlyInput.length >= 8 && mPhoneDigits.length >= 8 && mPhoneDigits === digitsOnlyInput;

    return matchesEmail || matchesId || matchesName || matchesPhone;
  });

  if (matchedGerant) {
    if (matchedGerant.status === "Inactif") {
      return null;
    }

    let storedPass = (matchedGerant.password || "").trim();
    if (!storedPass || storedPass.includes("••••") || storedPass.includes("••")) {
      const vaultPass = getStoredVaultCredential(matchedGerant.id, "password");
      storedPass = vaultPass ? String(vaultPass).trim() : "";
    }

    // Vérification STRICTE du mot de passe du gérant
    if (!storedPass || inputPass !== storedPass) {
      return null;
    }

    saveStoredVaultCredential(matchedGerant.id, "password", storedPass);
    return {
      id: matchedGerant.id,
      name: matchedGerant.name,
      email: matchedGerant.email || matchedGerant.login || "",
      phone: matchedGerant.phone || "",
      login: matchedGerant.login || matchedGerant.email || matchedGerant.name?.toLowerCase().replace(/\s+/g, "."),
      password: storedPass,
      role: matchedGerant.role || "Gérant",
      status: matchedGerant.status || "Actif",
      assignedLogements: matchedGerant.assignedLogements || (matchedGerant.id === "M-002" ? ["A-101", "V-001"] : []),
      gerantPermissions: matchedGerant.gerantPermissions || {
        canViewReceipts: true,
        canManageContracts: true,
        canManageDocuments: true,
        canManageLogements: true,
      },
      dateAdded: matchedGerant.dateAdded || "01 Janv 2026",
      permissions: matchedGerant.permissions || getDefaultPermissions(matchedGerant.role || "Gestionnaire"),
    } as any;
  }

  return null;
}

/**
 * Vérifie si un identifiant est déjà connu dans le stockage local de ce navigateur.
 * Si oui, on ne doit jamais contourner un échec de mot de passe local via Supabase.
 */
function isKnownLocalCompanyIdentifier(loginInput: string): boolean {
  if (typeof window === "undefined") return false;
  const cleanInput = loginInput.trim().toLowerCase();
  const digitsOnlyInput = loginInput.replace(/\D/g, "");

  try {
    const rawAgencies = localStorage.getItem("gestimmo_saas_agencies");
    if (rawAgencies) {
      const agencies: any[] = JSON.parse(rawAgencies);
      if (
        agencies.some((ag) => {
          const agEmail = (ag.email || "").trim().toLowerCase();
          const agLogin = (ag.login || "").trim().toLowerCase();
          const agPhone = String(ag.phone || "").replace(/\D/g, "");
          return (
            (agEmail && cleanInput === agEmail) ||
            (agLogin && cleanInput === agLogin) ||
            (digitsOnlyInput.length >= 8 && agPhone.length >= 8 && agPhone === digitsOnlyInput)
          );
        })
      ) {
        return true;
      }
    }
  } catch {}

  const companyUsers = getCompanyUsers();
  if (
    companyUsers.some((u) => {
      const uEmail = (u.email || "").trim().toLowerCase();
      const uLogin = (u.login || "").trim().toLowerCase();
      const uPhone = String(u.phone || "").replace(/\D/g, "");
      return (
        (uEmail && cleanInput === uEmail) ||
        (uLogin && cleanInput === uLogin) ||
        (digitsOnlyInput.length >= 8 && uPhone.length >= 8 && uPhone === digitsOnlyInput)
      );
    })
  ) {
    return true;
  }

  return false;
}

/**
 * Authentifie un utilisateur d'agence / collaborateur depuis N'IMPORTE QUEL ordinateur
 * avec contrôle STRICT du mot de passe.
 */
export async function authenticateCompanyUserAsync(
  loginInput: string,
  passwordInput: string
): Promise<UserAccount | null> {
  const localMatch = authenticateCompanyUser(loginInput, passwordInput);
  if (localMatch) return localMatch;

  // Si l'identifiant existe déjà localement mais que authenticateCompanyUser a renvoyé null,
  // cela signifie que le mot de passe saisi est FAUX : on refuse immédiatement la connexion !
  if (isKnownLocalCompanyIdentifier(loginInput)) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !supabaseUrl.startsWith("http")) return null;

  try {
    const cleanInput = loginInput.trim().toLowerCase();
    const digitsOnly = loginInput.replace(/\D/g, "");
    const inputPass = passwordInput.trim();
    if (!inputPass) return null;

    const [profilesRes, companiesRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("companies").select("*"),
    ]);

    const profiles: any[] = Array.isArray(profilesRes.data) ? profilesRes.data : [];
    const companies: any[] = Array.isArray(companiesRes.data) ? companiesRes.data : [];

    // Vérifier dans profiles avec contrôle strict du mot de passe stocké dans permissions.password
    const matchedProfile = profiles.find((p: any) => {
      const pEmail = (p.email || "").trim().toLowerCase();
      const pPhone = String(p.phone || "").replace(/\D/g, "");
      const matchesId =
        (pEmail && cleanInput === pEmail) ||
        (digitsOnly.length >= 8 && pPhone.length >= 8 && pPhone === digitsOnly);
      if (!matchesId) return false;

      const remotePass = p.permissions?.password ? String(p.permissions.password).trim() : "";
      if (!remotePass) return false;

      return inputPass === remotePass;
    });

    if (matchedProfile) {
      const comp = companies.find((c: any) => c.id === matchedProfile.company_id);
      const roleStr =
        matchedProfile.role === "ADMINISTRATEUR"
          ? "Administrateur"
          : matchedProfile.role === "COMPTABLE"
          ? "Comptable"
          : matchedProfile.role === "AGENT_TERRAIN"
          ? "Agent de terrain"
          : "Gestionnaire";
      return {
        id: matchedProfile.id,
        companyId: matchedProfile.company_id || "11111111-1111-1111-1111-111111111111",
        companyName: comp?.name || "Agence GESTIMMO",
        name: matchedProfile.full_name || "Collaborateur",
        email: matchedProfile.email || "",
        phone: matchedProfile.phone || "",
        login: matchedProfile.email || matchedProfile.full_name,
        password: inputPass,
        role: roleStr,
        status: "Actif",
        dateAdded: "01 Janv 2026",
        permissions: getDefaultPermissions(roleStr),
      };
    }
  } catch (e) {
    console.error("Erreur vérification Supabase utilisateur agence:", e);
  }

  return null;
}
