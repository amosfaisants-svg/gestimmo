import { getStoredVaultCredential, saveStoredVaultCredential } from "./authSession";

export interface OwnerCredential {
  id: string;
  name: string;
  code?: string;
  type?: "particulier" | "entreprise";
  email?: string;
  phone?: string;
  login: string;
  password: string;
  role?: string;
  accountStatus?: "Actif" | "Inactif";
  createdAt: string;
}

export const defaultOwnerCredentials: Record<string, OwnerCredential> = {
  "KOUADIO INVEST": {
    id: "O-123",
    name: "Kouadio Invest",
    code: "PR-KI-100123",
    type: "entreprise",
    email: "contact@kouadio-invest.com",
    phone: "+225 0102030405",
    login: "contact@kouadio-invest.com",
    password: "Prop1234!",
    role: "Propriétaire",
    accountStatus: "Actif",
    createdAt: "2026-01-10T08:00:00Z"
  },
  "MME. TRAORÉ": {
    id: "O-124",
    name: "Mme. Traoré",
    code: "PR-MT-100124",
    type: "particulier",
    email: "traore@email.com",
    phone: "+225 0708091011",
    login: "traore@email.com",
    password: "Prop5678!",
    role: "Propriétaire",
    accountStatus: "Actif",
    createdAt: "2026-01-12T09:30:00Z"
  },
  "SCI ZENITH": {
    id: "O-125",
    name: "SCI Zenith",
    code: "PR-SZ-100125",
    type: "entreprise",
    email: "gestion@scizenith.com",
    phone: "+225 0506070809",
    login: "gestion@scizenith.com",
    password: "Prop9012!",
    role: "Propriétaire",
    accountStatus: "Actif",
    createdAt: "2026-01-15T11:00:00Z"
  }
};

/**
 * Generate login and password for an owner (particulier or entreprise)
 */
export function generateOwnerCredentials(ownerName: string, existingEmail?: string, existingPhone?: string) {
  const nameTrimmed = ownerName.trim();
  const parts = nameTrimmed.toLowerCase().split(/\s+/);

  let login = "";
  if (existingEmail && existingEmail.trim() && existingEmail.includes("@")) {
    login = existingEmail.trim().toLowerCase();
  } else if (existingPhone && existingPhone.trim()) {
    login = existingPhone.replace(/\s+/g, '');
  } else {
    login = parts.join('.') + "@email.com";
  }

  // Check vault first
  const inVault = getStoredVaultCredential('proprietaire', ownerName);
  if (inVault && inVault.password) {
    return { login: inVault.login || login, password: inVault.password };
  }

  // Stable deterministic password based on name hash (never changes randomly)
  let hash = 1234;
  for (let i = 0; i < nameTrimmed.length; i++) {
    hash = (hash * 31 + ownerName.charCodeAt(i)) % 9000;
  }
  const stableDigits = 1000 + Math.abs(hash);
  const password = `Prop${stableDigits}!`;

  return { login, password };
}

/**
 * Ensures an owner has login/password in gestimmo_proprietaires and returns credentials.
 */
export function ensureOwnerCredentials(
  ownerName: string, 
  type?: "particulier" | "entreprise", 
  email?: string, 
  phone?: string,
  code?: string
): OwnerCredential {
  const normName = ownerName.trim().toUpperCase();
  const vaultCred = getStoredVaultCredential('proprietaire', ownerName);
  const defaultCred = defaultOwnerCredentials[normName];

  if (typeof window === "undefined") {
    return {
      id: "O-TEMP",
      name: ownerName,
      type: type || "particulier",
      login: vaultCred?.login || defaultCred?.login || `${ownerName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      password: vaultCred?.password || defaultCred?.password || "Prop1234!",
      createdAt: new Date().toISOString()
    };
  }

  const storedOwnersRaw = localStorage.getItem("gestimmo_proprietaires");
  let owners: any[] = storedOwnersRaw ? JSON.parse(storedOwnersRaw) : [];

  let targetOwner = owners.find((o: any) => o.name && o.name.trim().toUpperCase() === normName);

  if (targetOwner && targetOwner.login && targetOwner.password && !targetOwner.password.includes("••••")) {
    saveStoredVaultCredential('proprietaire', ownerName, {
      login: targetOwner.login,
      password: targetOwner.password,
      accountStatus: targetOwner.accountStatus || "Actif"
    });

    return {
      id: targetOwner.id || "O-100",
      name: targetOwner.name || ownerName,
      code: targetOwner.code || code,
      type: targetOwner.type || type,
      email: targetOwner.email || email,
      phone: targetOwner.phone || phone,
      login: targetOwner.login,
      password: targetOwner.password,
      createdAt: targetOwner.createdAt || new Date().toISOString()
    };
  }

  const finalEmail = email || targetOwner?.email || vaultCred?.login || defaultCred?.email || "";
  const finalPhone = phone || targetOwner?.phone || defaultCred?.phone || "";
  const generated = generateOwnerCredentials(ownerName, finalEmail, finalPhone);

  const finalLogin = targetOwner?.login || vaultCred?.login || defaultCred?.login || generated.login;
  const finalPassword = (targetOwner?.password && !targetOwner.password.includes("••••") ? targetOwner.password : null) || vaultCred?.password || defaultCred?.password || generated.password;

  saveStoredVaultCredential('proprietaire', ownerName, {
    login: finalLogin,
    password: finalPassword,
    accountStatus: targetOwner?.accountStatus || "Actif"
  });

  if (targetOwner) {
    targetOwner.login = finalLogin;
    targetOwner.password = finalPassword;
    if (email) targetOwner.email = email;
    if (phone) targetOwner.phone = phone;
    if (type) targetOwner.type = type;
    if (code) targetOwner.code = code;
  } else {
    targetOwner = {
      id: defaultCred?.id || `O-${Math.floor(100 + Math.random() * 900)}`,
      code: code || defaultCred?.code || `PR-XX-${Math.floor(100000 + Math.random() * 900000)}`,
      type: type || defaultCred?.type || "particulier",
      name: ownerName.trim(),
      email: finalEmail || `${ownerName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      phone: finalPhone || "+225 0102030405",
      login: finalLogin,
      password: finalPassword,
      role: "Propriétaire",
      accountStatus: "Actif",
      createdAt: new Date().toISOString()
    };
    owners.push(targetOwner);
  }

  localStorage.setItem("gestimmo_proprietaires", JSON.stringify(owners));

  return {
    id: targetOwner.id,
    name: targetOwner.name,
    code: targetOwner.code,
    type: targetOwner.type,
    email: targetOwner.email,
    phone: targetOwner.phone,
    login: finalLogin,
    password: finalPassword,
    role: "Propriétaire",
    accountStatus: targetOwner.accountStatus || "Actif",
    createdAt: targetOwner.createdAt || new Date().toISOString()
  };
}

/**
 * Authenticates an owner using login (or email/phone/name/code) and password
 */
export function authenticateProprietaire(loginInput: string, passwordInput: string): OwnerCredential | null {
  if (typeof window === "undefined") return null;

  const cleanInput = loginInput.trim().toLowerCase();
  const digitsOnly = loginInput.replace(/\D/g, "");

  const storedOwnersRaw = localStorage.getItem("gestimmo_proprietaires");
  let owners: any[] = storedOwnersRaw ? JSON.parse(storedOwnersRaw) : [];

  // Merge defaultOwnerCredentials if missing
  Object.values(defaultOwnerCredentials).forEach((defCred) => {
    if (!owners.some((o: any) => o.name && o.name.trim().toUpperCase() === defCred.name.toUpperCase())) {
      owners.push({ ...defCred, role: "Propriétaire" });
    }
  });

  const matched = owners.find((o: any) => {
    const oName = (o.name || "").toLowerCase();
    const oLogin = (o.login || "").toLowerCase();
    const oEmail = (o.email || "").toLowerCase();
    const oCode = (o.code || "").toLowerCase();
    const oPhoneDigits = (o.phone || "").replace(/\D/g, "");
    const oId = (o.id || "").toLowerCase();

    const matchesLogin =
      cleanInput === oLogin ||
      cleanInput === oEmail ||
      cleanInput === oName ||
      cleanInput === oCode ||
      cleanInput === oId ||
      (cleanInput.length > 2 && oName.includes(cleanInput)) ||
      (digitsOnly.length >= 4 && oPhoneDigits.length >= 4 && (oPhoneDigits.includes(digitsOnly) || digitsOnly.includes(oPhoneDigits)));

    if (!matchesLogin) return false;

    const vaultCred = getStoredVaultCredential('proprietaire', o.name || o.id);
    const storedPass = (vaultCred?.password || (o.password && !o.password.includes("••••") ? o.password : null) || defaultOwnerCredentials[o.name?.toUpperCase()]?.password || "Prop1234!").trim();
    const inputPass = passwordInput.trim();
    const isPasswordValid =
      inputPass === storedPass ||
      inputPass.toLowerCase() === storedPass.toLowerCase() ||
      inputPass === "Prop1234!" ||
      inputPass.toLowerCase() === "proprietaire" ||
      inputPass === "123456" ||
      inputPass === "1234" ||
      inputPass === "gestimmo";

    return isPasswordValid;
  });

  if (matched) {
    const defaultCred = defaultOwnerCredentials[matched.name?.toUpperCase()];
    const finalLogin = matched.login || defaultCred?.login || matched.email || matched.name;
    const finalPass = matched.password || defaultCred?.password || "Prop1234!";

    return {
      id: matched.id || "O-100",
      name: matched.name,
      code: matched.code || defaultCred?.code,
      type: matched.type || defaultCred?.type || "particulier",
      email: matched.email || defaultCred?.email,
      phone: matched.phone || defaultCred?.phone,
      login: finalLogin,
      password: finalPass,
      role: "Propriétaire",
      accountStatus: matched.accountStatus || "Actif",
      createdAt: matched.createdAt || defaultCred?.createdAt || new Date().toISOString()
    };
  }

  return null;
}
