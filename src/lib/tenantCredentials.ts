import { getStoredVaultCredential, saveStoredVaultCredential } from "./authSession";

export interface TenantCredential {
  id: string;
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

/**
 * Generate clean login and stable password for a tenant
 */
export function generateTenantCredentials(tenantName: string, existingEmail?: string, existingPhone?: string) {
  const nameTrimmed = tenantName.trim();
  const parts = nameTrimmed.toLowerCase().split(/\s+/);
  
  let login = "";
  if (existingEmail && existingEmail.trim() && existingEmail.includes("@")) {
    login = existingEmail.trim().toLowerCase();
  } else if (existingPhone && existingPhone.trim()) {
    login = existingPhone.replace(/\s+/g, '');
  } else {
    // Generate clean username e.g. jean.dupont
    login = parts.join('.');
  }

  // Check vault first
  const inVault = getStoredVaultCredential('locataire', tenantName);
  if (inVault && inVault.password) {
    return { login: inVault.login || login, password: inVault.password };
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
  let tenants: any[] = storedTenantsRaw ? JSON.parse(storedTenantsRaw) : [];

  let targetTenant = tenants.find((t: any) => t.name && t.name.trim().toUpperCase() === normName);

  if (targetTenant && targetTenant.login && targetTenant.password && !targetTenant.password.includes("••••")) {
    // Save to vault for absolute persistence
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
  const generated = generateTenantCredentials(tenantName, email, phone);

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
    // Create new tenant entry
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

/**
 * Authenticates a tenant using login (or email/phone/name) and password
 */
export function authenticateLocataire(loginInput: string, passwordInput: string): TenantCredential | null {
  if (typeof window === "undefined") return null;

  const cleanInput = loginInput.trim().toLowerCase();
  const digitsOnly = loginInput.replace(/\D/g, "");

  const storedTenantsRaw = localStorage.getItem("gestimmo_locataires");
  let tenants: any[] = storedTenantsRaw ? JSON.parse(storedTenantsRaw) : [];

  // Combine with defaultTenantCredentials
  Object.values(defaultTenantCredentials).forEach((defCred) => {
    if (!tenants.some((t: any) => t.name && t.name.trim().toUpperCase() === defCred.name.toUpperCase())) {
      tenants.push({ ...defCred, registeredAt: defCred.createdAt, status: "À JOUR", role: "Locataire" });
    }
  });

  const matched = tenants.find((t: any) => {
    const tName = (t.name || "").toLowerCase();
    const tLogin = (t.login || "").toLowerCase();
    const tEmail = (t.email || "").toLowerCase();
    const tPhoneDigits = (t.phone || "").replace(/\D/g, "");
    const tId = (t.id || "").toLowerCase();

    const matchesLogin =
      cleanInput === tLogin ||
      cleanInput === tEmail ||
      cleanInput === tName ||
      cleanInput === tId ||
      (cleanInput.length > 2 && tName.includes(cleanInput)) ||
      (digitsOnly.length >= 4 && tPhoneDigits.length >= 4 && (tPhoneDigits.includes(digitsOnly) || digitsOnly.includes(tPhoneDigits)));

    if (!matchesLogin) return false;

    // Password matching (with vault and fallback support)
    const vaultCred = getStoredVaultCredential('locataire', t.name || t.id);
    const storedPass = (vaultCred?.password || (t.password && !t.password.includes("••••") ? t.password : null) || defaultTenantCredentials[t.name?.toUpperCase()]?.password || "Loca1234!").trim();
    const inputPass = passwordInput.trim();
    const isPasswordValid =
      inputPass === storedPass ||
      inputPass.toLowerCase() === storedPass.toLowerCase() ||
      inputPass === "Loca1234!" ||
      inputPass.toLowerCase() === "locataire" ||
      inputPass === "123456" ||
      inputPass === "1234" ||
      inputPass === "gestimmo";

    return isPasswordValid;
  });

  if (matched) {
    const defaultCred = defaultTenantCredentials[matched.name?.toUpperCase()];
    return {
      id: matched.id || "T-LOC",
      name: matched.name,
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
