import { getStoredVaultCredential, saveStoredVaultCredential } from "./authSession";
import { supabase } from "./supabase";

export interface TenantCredential {
  id: string;
  companyId?: string;
  name: string;
  email?: string;
  phone?: string;
  login: string;
  password: string;
  unit?: string;
  property?: string;
  rent?: number;
  role?: string;
  accountStatus?: "Actif" | "Inactif";
  createdAt: string;
}

// Format default credentials for known initial tenants
export const defaultTenantCredentials: Record<string, TenantCredential> = {
  "CORA RICHARDS": {
    id: "T-892",
    name: "Cora Richards",
    email: "cora@email.com",
    phone: "+225 0102030405",
    login: "cora@email.com",
    password: "Loca1234!",
    unit: "A-101",
    property: "Résidence Les Flamboyants",
    rent: 165000,
    role: "Locataire",
    accountStatus: "Actif",
    createdAt: "2026-01-10T08:00:00Z"
  },
  "ALISTAIR DUNLAP": {
    id: "T-893",
    name: "Alistair Dunlap",
    email: "alistair@email.com",
    phone: "+225 0506070809",
    login: "alistair@email.com",
    password: "Loca5678!",
    unit: "B-204",
    property: "Résidence Les Flamboyants",
    rent: 220000,
    role: "Locataire",
    accountStatus: "Actif",
    createdAt: "2026-01-12T09:30:00Z"
  },
  "BIBI SHELTON": {
    id: "T-894",
    name: "Bibi Shelton",
    email: "bibi@email.com",
    phone: "+225 0708091011",
    login: "bibi@email.com",
    password: "Loca9012!",
    unit: "A-102",
    property: "Résidence Les Flamboyants",
    rent: 165000,
    role: "Locataire",
    accountStatus: "Actif",
    createdAt: "2026-01-15T11:00:00Z"
  },
  "JEAN DUPONT": {
    id: "T-895",
    name: "Jean Dupont",
    email: "jean@email.com",
    phone: "+225 0910111213",
    login: "jean@email.com",
    password: "Loca3456!",
    unit: "V-001",
    property: "Villa Palmeraie",
    rent: 850000,
    role: "Locataire",
    accountStatus: "Actif",
    createdAt: "2026-01-20T14:15:00Z"
  },
  "ADDIE BRADFORD": {
    id: "T-896",
    name: "Addie Bradford",
    email: "addie@email.com",
    phone: "+225 0203040506",
    login: "addie@email.com",
    password: "Loca1234!",
    unit: "B-205",
    property: "Résidence Les Flamboyants",
    rent: 220000,
    role: "Locataire",
    accountStatus: "Actif",
    createdAt: "2026-02-01T10:00:00Z"
  },
  "KOFFI MENSAH": {
    id: "T-897",
    name: "Koffi Mensah",
    email: "koffi@email.com",
    phone: "+225 0101010101",
    login: "koffi@email.com",
    password: "Loca1234!",
    unit: "-",
    property: "-",
    rent: 0,
    role: "Locataire",
    accountStatus: "Actif",
    createdAt: "2026-02-05T09:00:00Z"
  },
  "FATOU DIOP": {
    id: "T-898",
    name: "Fatou Diop",
    email: "fatou@email.com",
    phone: "+225 0202020202",
    login: "fatou@email.com",
    password: "Loca1234!",
    unit: "-",
    property: "-",
    rent: 0,
    role: "Locataire",
    accountStatus: "Actif",
    createdAt: "2026-02-10T16:45:00Z"
  }
};

export function computeTenantCandidatePasswords(tenantName?: string, tenantId?: string): string[] {
  const candidates = new Set<string>();
  const cleanName = (tenantName || "").trim();

  if (cleanName) {
    const upper = cleanName.toUpperCase();
    let hashUpper = 1234;
    for (let i = 0; i < upper.length; i++) {
      hashUpper = (hashUpper * 31 + upper.charCodeAt(i)) % 9000;
    }
    candidates.add(`Loca${1000 + Math.abs(hashUpper)}!`);

    let hashRaw = 1234;
    for (let i = 0; i < cleanName.length; i++) {
      hashRaw = (hashRaw * 31 + cleanName.charCodeAt(i)) % 9000;
    }
    candidates.add(`Loca${1000 + Math.abs(hashRaw)}!`);
  }

  if (tenantId && String(tenantId).trim().length >= 4) {
    const idPrefix = String(tenantId).trim().slice(0, 4);
    candidates.add(`Locat${idPrefix}!`);
    candidates.add(`Loca${idPrefix}!`);
  }

  return Array.from(candidates);
}

/**
 * Generate clean login and stable password for a tenant
 */
export function generateTenantCredentials(tenantName: string, existingEmail?: string, existingPhone?: string, tenantId?: string) {
  const nameTrimmed = tenantName.trim();
  const parts = nameTrimmed.toLowerCase().split(/\s+/);
  
  let login = "";
  if (existingEmail && existingEmail.trim() && existingEmail.includes("@")) {
    login = existingEmail.trim().toLowerCase();
  } else if (existingPhone && existingPhone.trim()) {
    login = existingPhone.replace(/\s+/g, '');
  } else {
    login = parts.join('.');
  }

  // Check vault first
  const inVault = getStoredVaultCredential('locataire', tenantName);
  if (inVault && inVault.password && !inVault.password.includes("••••")) {
    return { login: inVault.login || login, password: inVault.password };
  }
  if (tenantId) {
    const vaultByIdPass = getStoredVaultCredential(tenantId, "password");
    const vaultByIdLogin = getStoredVaultCredential(tenantId, "login");
    if (vaultByIdPass && !String(vaultByIdPass).includes("••••")) {
      return { login: vaultByIdLogin || login, password: String(vaultByIdPass) };
    }
  }

  if (tenantId && /^[0-9a-f]{8}-/i.test(tenantId.trim())) {
    return { login, password: `Locat${tenantId.trim().slice(0, 4)}!` };
  }

  // Stable deterministic password based on name hash (never changes randomly)
  let hash = 1234;
  for (let i = 0; i < nameTrimmed.length; i++) {
    hash = (hash * 31 + nameTrimmed.charCodeAt(i)) % 9000;
  }
  const stableDigits = 1000 + Math.abs(hash);
  const password = `Loca${stableDigits}!`;

  return { login, password };
}

/**
 * Ensures a tenant has credentials in gestimmo_locataires and returns them.
 * If credentials already exist for this tenant, returns the existing credentials.
 */
export function ensureTenantCredentials(tenantName: string, unit?: string, property?: string, rent?: number): TenantCredential {
  const normName = tenantName.trim().toUpperCase();
  const vaultCred = getStoredVaultCredential('locataire', tenantName);
  const defaultCred = defaultTenantCredentials[normName];

  if (typeof window === "undefined") {
    return {
      id: "T-TEMP",
      name: tenantName,
      login: vaultCred?.login || defaultCred?.login || `${tenantName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      password: vaultCred?.password || defaultCred?.password || "Loca1234!",
      createdAt: new Date().toISOString()
    };
  }

  // Load locataires from localStorage
  const storedTenantsRaw = localStorage.getItem("gestimmo_locataires");
  const tenants: any[] = storedTenantsRaw ? JSON.parse(storedTenantsRaw) : [];

  let targetTenant = tenants.find((t: any) => t.name && t.name.trim().toUpperCase() === normName);

  if (targetTenant && targetTenant.login && targetTenant.password && !targetTenant.password.includes("••••")) {
    saveStoredVaultCredential('locataire', tenantName, {
      login: targetTenant.login,
      password: targetTenant.password,
      accountStatus: targetTenant.accountStatus || "Actif"
    });

    if (unit || property || rent) {
      targetTenant.unit = unit || targetTenant.unit;
      targetTenant.property = property || targetTenant.property;
      if (rent !== undefined) targetTenant.rent = rent;
      localStorage.setItem("gestimmo_locataires", JSON.stringify(tenants));
    }
    return {
      id: targetTenant.id || "T-LOC",
      companyId: targetTenant.companyId || targetTenant.company_id,
      name: targetTenant.name || tenantName,
      email: targetTenant.email,
      phone: targetTenant.phone,
      login: targetTenant.login,
      password: targetTenant.password,
      unit: targetTenant.unit,
      property: targetTenant.property,
      rent: targetTenant.rent,
      role: "Locataire",
      accountStatus: targetTenant.accountStatus || "Actif",
      createdAt: targetTenant.registeredAt || new Date().toISOString()
    };
  }

  // Generate stable credentials
  const email = targetTenant?.email || vaultCred?.login || defaultCred?.email || "";
  const phone = targetTenant?.phone || defaultCred?.phone || "";
  const generated = generateTenantCredentials(tenantName, email, phone, targetTenant?.id);

  const finalLogin = targetTenant?.login || vaultCred?.login || defaultCred?.login || generated.login;
  const finalPassword = (targetTenant?.password && !targetTenant.password.includes("••••") ? targetTenant.password : null) || vaultCred?.password || defaultCred?.password || generated.password;

  saveStoredVaultCredential('locataire', tenantName, {
    login: finalLogin,
    password: finalPassword,
    accountStatus: targetTenant?.accountStatus || "Actif"
  });

  if (targetTenant) {
    targetTenant.login = finalLogin;
    targetTenant.password = finalPassword;
    targetTenant.role = "Locataire";
    if (unit) targetTenant.unit = unit;
    if (property) targetTenant.property = property;
    if (rent !== undefined) targetTenant.rent = rent;
  } else {
    targetTenant = {
      id: defaultCred?.id || `T-${Math.floor(1000 + Math.random() * 9000)}`,
      name: tenantName.trim(),
      phone: phone || "+225 0102030405",
      email: email || `${tenantName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      unit: unit || "-",
      property: property || "-",
      rent: rent || 0,
      status: "À JOUR",
      role: "Locataire",
      accountStatus: "Actif",
      registeredAt: new Date().toISOString(),
      login: finalLogin,
      password: finalPassword
    };
    tenants.push(targetTenant);
  }

  localStorage.setItem("gestimmo_locataires", JSON.stringify(tenants));

  return {
    id: targetTenant.id,
    companyId: targetTenant.companyId || targetTenant.company_id,
    name: targetTenant.name,
    email: targetTenant.email,
    phone: targetTenant.phone,
    login: finalLogin,
    password: finalPassword,
    unit: targetTenant.unit,
    property: targetTenant.property,
    rent: targetTenant.rent,
    role: "Locataire",
    accountStatus: targetTenant.accountStatus || "Actif",
    createdAt: targetTenant.registeredAt || new Date().toISOString()
  };
}

function matchesTenantRecord(t: any, loginInput: string, passwordInput: string): boolean {
  const cleanInput = loginInput.trim().toLowerCase();
  const digitsOnly = loginInput.replace(/\D/g, "");

  const rawName = (t.name || t.full_name || "").trim();
  const tName = rawName.toLowerCase();
  const tLogin = (t.login || "").trim().toLowerCase();
  const tEmail = (t.email || "").trim().toLowerCase();
  const tPhoneDigits = String(t.phone || "").replace(/\D/g, "");
  const tId = String(t.id || "").trim().toLowerCase();

  const generatedLocataireLogin = `locataire.${tName.replace(/[^a-z0-9]/g, "")}`;
  const generatedDotLogin = tName.split(/\s+/).filter(Boolean).join(".");
  const generatedEmailLogin = `${generatedDotLogin}@email.com`;

  const matchesLogin =
    (tLogin && cleanInput === tLogin) ||
    (tEmail && cleanInput === tEmail) ||
    (tName && cleanInput === tName) ||
    (tId && cleanInput === tId) ||
    cleanInput === generatedLocataireLogin ||
    cleanInput === generatedDotLogin ||
    cleanInput === generatedEmailLogin ||
    (cleanInput.length > 3 && tName.includes(cleanInput)) ||
    (digitsOnly.length >= 6 && tPhoneDigits.length >= 6 && (tPhoneDigits.includes(digitsOnly) || digitsOnly.includes(tPhoneDigits)));

  if (!matchesLogin) return false;

  const inputPass = passwordInput.trim();
  if (!inputPass) return false;

  const vaultCred = getStoredVaultCredential('locataire', rawName || t.id);
  const vaultById = t.id ? getStoredVaultCredential(String(t.id), "password") : null;
  const defaultCred = defaultTenantCredentials[rawName.toUpperCase()];

  const validPasswords = new Set<string>([
    ...computeTenantCandidatePasswords(rawName, t.id),
  ]);

  if (vaultCred?.password && !String(vaultCred.password).includes("••••")) {
    validPasswords.add(String(vaultCred.password).trim());
  }
  if (vaultById && !String(vaultById).includes("••••")) {
    validPasswords.add(String(vaultById).trim());
  }
  if (t.password && !String(t.password).includes("••••")) {
    validPasswords.add(String(t.password).trim());
  }
  if (defaultCred?.password) {
    validPasswords.add(defaultCred.password.trim());
  }

  for (const candidate of Array.from(validPasswords)) {
    if (inputPass === candidate) {
      return true;
    }
  }

  return false;
}

/**
 * Authenticates a tenant using login (or email/phone/name) and password
 */
export function authenticateLocataire(loginInput: string, passwordInput: string): TenantCredential | null {
  if (typeof window === "undefined") return null;

  const storedTenantsRaw = localStorage.getItem("gestimmo_locataires");
  const tenants: any[] = storedTenantsRaw ? JSON.parse(storedTenantsRaw) : [];

  Object.values(defaultTenantCredentials).forEach((defCred) => {
    if (!tenants.some((t: any) => t.name && t.name.trim().toUpperCase() === defCred.name.toUpperCase())) {
      tenants.push({ ...defCred, registeredAt: defCred.createdAt, status: "À JOUR", role: "Locataire" });
    }
  });

  const matched = tenants.find((t: any) => matchesTenantRecord(t, loginInput, passwordInput));

  if (matched) {
    const defaultCred = defaultTenantCredentials[matched.name?.toUpperCase()];
    return {
      id: matched.id || "T-LOC",
      companyId: matched.companyId || matched.company_id,
      name: matched.name || matched.full_name,
      email: matched.email || defaultCred?.email,
      phone: matched.phone || defaultCred?.phone,
      login: matched.login || defaultCred?.login || matched.email || matched.name,
      password: matched.password || defaultCred?.password || "Loca1234!",
      unit: matched.unit || defaultCred?.unit || "A-101",
      property: matched.property || defaultCred?.property || "Résidence Les Flamboyants",
      rent: matched.rent || defaultCred?.rent || 165000,
      role: "Locataire",
      accountStatus: matched.accountStatus || "Actif",
      createdAt: matched.registeredAt || new Date().toISOString()
    };
  }

  return null;
}

/**
 * Authentifie un locataire depuis N'IMPORTE QUEL ordinateur ou téléphone via Supabase + localStorage
 */
export async function authenticateLocataireAsync(
  loginInput: string,
  passwordInput: string
): Promise<TenantCredential | null> {
  if (typeof window === "undefined") return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl.startsWith("http")) {
    try {
      const { data: dbTenants, error } = await supabase.from("tenants").select("*");
      if (!error && Array.isArray(dbTenants) && dbTenants.length > 0) {
        const storedTenantsRaw = localStorage.getItem("gestimmo_locataires");
        const localTenants: any[] = storedTenantsRaw ? JSON.parse(storedTenantsRaw) : [];

        const matchedDb: any = dbTenants.find((dbRow: any) => {
          const localMatch = localTenants.find(
            (lt: any) =>
              lt.id === dbRow.id ||
              (lt.name && dbRow.full_name && lt.name.trim().toLowerCase() === dbRow.full_name.trim().toLowerCase())
          );
          const merged = {
            ...localMatch,
            ...dbRow,
            id: dbRow.id,
            name: dbRow.full_name,
            email: dbRow.email || localMatch?.email || "",
            phone: dbRow.phone || localMatch?.phone || "",
            login: localMatch?.login || (dbRow.email ? dbRow.email.toLowerCase() : ""),
            password: localMatch?.password,
          };
          return matchesTenantRecord(merged, loginInput, passwordInput);
        });

        if (matchedDb) {
          const localMatch = localTenants.find(
            (lt: any) =>
              lt.id === matchedDb.id ||
              (lt.name && matchedDb.full_name && lt.name.trim().toLowerCase() === matchedDb.full_name.trim().toLowerCase())
          );
          const generated = generateTenantCredentials(
            matchedDb.full_name,
            matchedDb.email || undefined,
            matchedDb.phone || undefined,
            matchedDb.id
          );

          const resultCred: TenantCredential = {
            id: matchedDb.id,
            companyId: matchedDb.company_id || "11111111-1111-1111-1111-111111111111",
            name: matchedDb.full_name,
            email: matchedDb.email || localMatch?.email || "",
            phone: matchedDb.phone || localMatch?.phone || "",
            login: localMatch?.login || generated.login,
            password: localMatch?.password || generated.password,
            unit: localMatch?.unit || "-",
            property: localMatch?.property || "-",
            rent: localMatch?.rent || 0,
            role: "Locataire",
            accountStatus: localMatch?.accountStatus === "Inactif" ? "Inactif" : "Actif",
            createdAt: matchedDb.created_at || new Date().toISOString(),
          };

          if (resultCred.companyId) {
            localStorage.setItem("gestimmo_active_company_id", resultCred.companyId);
          }

          return resultCred;
        }
      }
    } catch (e) {
      console.error("Erreur vérification Supabase locataire:", e);
    }
  }

  return authenticateLocataire(loginInput, passwordInput);
}
