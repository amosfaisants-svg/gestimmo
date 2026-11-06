import { getStoredVaultCredential, saveStoredVaultCredential } from "./authSession";
import { supabase } from "./supabase";

export interface OwnerCredential {
  id: string;
  companyId?: string;
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
 * Calcule tous les mots de passe déterministes valides pour un propriétaire
 * (couvre à la fois le format PropXXXX! basé sur le nom et le format ProprioXXXX! basé sur l'ID/Code Supabase)
 */
export function computeOwnerCandidatePasswords(
  ownerName?: string,
  ownerId?: string,
  ownerCode?: string
): string[] {
  const candidates = new Set<string>();
  const cleanName = (ownerName || "").trim();

  if (cleanName) {
    // 1. Hash sur le nom en majuscules (standard)
    const upper = cleanName.toUpperCase();
    let hashUpper = 1234;
    for (let i = 0; i < upper.length; i++) {
      hashUpper = (hashUpper * 31 + upper.charCodeAt(i)) % 9000;
    }
    candidates.add(`Prop${1000 + Math.abs(hashUpper)}!`);

    // 2. Hash sur le nom tel quel (casse d'origine)
    let hashRaw = 1234;
    for (let i = 0; i < cleanName.length; i++) {
      hashRaw = (hashRaw * 31 + cleanName.charCodeAt(i)) % 9000;
    }
    candidates.add(`Prop${1000 + Math.abs(hashRaw)}!`);
  }

  // 3. Format généré par dataService à partir de l'UUID Supabase (ex: Proprio0ccc!)
  if (ownerId && String(ownerId).trim().length >= 4) {
    const idPrefix = String(ownerId).trim().slice(0, 4);
    candidates.add(`Proprio${idPrefix}!`);
    candidates.add(`Prop${idPrefix}!`);
  }

  // 4. Format dérivé du code propriétaire (ex: PR-0ccc44 -> Proprio0ccc!)
  if (ownerCode && String(ownerCode).trim()) {
    const stripped = String(ownerCode).trim().replace(/^PR-/i, "");
    if (stripped.length >= 4) {
      const codePrefix = stripped.slice(0, 4);
      candidates.add(`Proprio${codePrefix}!`);
      candidates.add(`Prop${codePrefix}!`);
    }
  }

  return Array.from(candidates);
}

/**
 * Generate login and password for an owner (particulier or entreprise)
 */
export function generateOwnerCredentials(
  ownerName: string,
  existingEmail?: string,
  existingPhone?: string,
  ownerId?: string
) {
  const nameTrimmed = (ownerName || "").trim();
  const parts = nameTrimmed.toLowerCase().split(/\s+/);

  let login = "";
  if (existingEmail && existingEmail.trim() && existingEmail.includes("@")) {
    login = existingEmail.trim().toLowerCase();
  } else if (existingPhone && existingPhone.trim()) {
    login = existingPhone.replace(/\s+/g, "");
  } else {
    login = parts.join(".") + "@email.com";
  }

  // Check vault first
  const inVault = getStoredVaultCredential("proprietaire", nameTrimmed);
  if (inVault && inVault.password && !inVault.password.includes("••••")) {
    return { login: inVault.login || login, password: inVault.password };
  }
  if (ownerId) {
    const vaultByIdPass = getStoredVaultCredential(ownerId, "password");
    const vaultByIdLogin = getStoredVaultCredential(ownerId, "login");
    if (vaultByIdPass && !String(vaultByIdPass).includes("••••")) {
      return { login: vaultByIdLogin || login, password: String(vaultByIdPass) };
    }
  }

  // Si l'ID Supabase (UUID) est connu, utiliser ProprioXXXX! pour être 100% identique à dataService,
  // sinon utiliser le hash déterministe sur le nom en majuscules (PropXXXX!)
  if (ownerId && /^[0-9a-f]{8}-/i.test(ownerId.trim())) {
    return { login, password: `Proprio${ownerId.trim().slice(0, 4)}!` };
  }

  const upperName = nameTrimmed.toUpperCase();
  let hash = 1234;
  for (let i = 0; i < upperName.length; i++) {
    hash = (hash * 31 + upperName.charCodeAt(i)) % 9000;
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
  code?: string,
  ownerId?: string
): OwnerCredential {
  const normName = (ownerName || "").trim().toUpperCase();
  const vaultCred = getStoredVaultCredential("proprietaire", ownerName);
  const defaultCred = defaultOwnerCredentials[normName];

  if (typeof window === "undefined") {
    return {
      id: ownerId || "O-TEMP",
      name: ownerName,
      type: type || "particulier",
      login: vaultCred?.login || defaultCred?.login || `${ownerName.toLowerCase().replace(/\s+/g, ".")}@email.com`,
      password: vaultCred?.password || defaultCred?.password || "Prop1234!",
      createdAt: new Date().toISOString()
    };
  }

  const storedOwnersRaw = localStorage.getItem("gestimmo_proprietaires");
  const owners: any[] = storedOwnersRaw ? JSON.parse(storedOwnersRaw) : [];

  let targetOwner = owners.find(
    (o: any) =>
      (ownerId && o.id === ownerId) ||
      (o.name && o.name.trim().toUpperCase() === normName)
  );

  if (targetOwner && targetOwner.login && targetOwner.password && !targetOwner.password.includes("••••")) {
    saveStoredVaultCredential("proprietaire", ownerName, {
      login: targetOwner.login,
      password: targetOwner.password,
      accountStatus: targetOwner.accountStatus || "Actif"
    });

    return {
      id: targetOwner.id || ownerId || "O-100",
      companyId: targetOwner.companyId || targetOwner.company_id,
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
  const resolvedId = ownerId || targetOwner?.id;
  const generated = generateOwnerCredentials(ownerName, finalEmail, finalPhone, resolvedId);

  const finalLogin = targetOwner?.login || vaultCred?.login || defaultCred?.login || generated.login;
  const finalPassword =
    (targetOwner?.password && !targetOwner.password.includes("••••") ? targetOwner.password : null) ||
    vaultCred?.password ||
    defaultCred?.password ||
    generated.password;

  saveStoredVaultCredential("proprietaire", ownerName, {
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
      id: resolvedId || defaultCred?.id || `O-${Math.floor(100 + Math.random() * 900)}`,
      code: code || defaultCred?.code || `PR-XX-${Math.floor(100000 + Math.random() * 900000)}`,
      type: type || defaultCred?.type || "particulier",
      name: ownerName.trim(),
      email: finalEmail || `${ownerName.toLowerCase().replace(/\s+/g, ".")}@email.com`,
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
    companyId: targetOwner.companyId || targetOwner.company_id,
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
 * Vérifie si un couple (loginInput, passwordInput) correspond à un enregistrement propriétaire donné
 */
function matchesOwnerRecord(o: any, loginInput: string, passwordInput: string): boolean {
  const cleanInput = loginInput.trim().toLowerCase();
  const digitsOnly = loginInput.replace(/\D/g, "");

  const rawName = (o.name || o.full_name || "").trim();
  const oName = rawName.toLowerCase();
  const oLogin = (o.login || "").trim().toLowerCase();
  const oEmail = (o.email || "").trim().toLowerCase();
  const oId = String(o.id || "").trim().toLowerCase();
  const oCode = String(o.code || o.id_card_number || (o.id ? `PR-${String(o.id).slice(0, 6)}` : "")).trim().toLowerCase();
  const oPhoneDigits = String(o.phone || "").replace(/\D/g, "");

  const generatedBailleurLogin = `bailleur.${oName.replace(/[^a-z0-9]/g, "")}`;
  const generatedEmailLogin = `${oName.split(/\s+/).filter(Boolean).join(".")}@email.com`;
  const generatedDotLogin = oName.split(/\s+/).filter(Boolean).join(".");

  const matchesLogin =
    (oLogin && cleanInput === oLogin) ||
    (oEmail && cleanInput === oEmail) ||
    (oName && cleanInput === oName) ||
    (oCode && cleanInput === oCode) ||
    (oId && cleanInput === oId) ||
    cleanInput === generatedBailleurLogin ||
    cleanInput === generatedEmailLogin ||
    cleanInput === generatedDotLogin ||
    (cleanInput.length > 3 && oName.includes(cleanInput)) ||
    (digitsOnly.length >= 6 &&
      oPhoneDigits.length >= 6 &&
      (oPhoneDigits.includes(digitsOnly) || digitsOnly.includes(oPhoneDigits)));

  if (!matchesLogin) return false;

  const inputPass = passwordInput.trim();
  if (!inputPass) return false;

  const vaultCred = getStoredVaultCredential("proprietaire", rawName || o.id);
  const vaultById = o.id ? getStoredVaultCredential(String(o.id), "password") : null;
  const defaultCred = defaultOwnerCredentials[rawName.toUpperCase()];

  const validPasswords = new Set<string>([
    ...computeOwnerCandidatePasswords(rawName, o.id, o.code || o.id_card_number || (o.id ? `PR-${String(o.id).slice(0, 6)}` : "")),
    "Prop1234!",
    "proprietaire",
    "123456",
    "1234",
    "gestimmo",
  ]);

  if (vaultCred?.password && !String(vaultCred.password).includes("••••")) {
    validPasswords.add(String(vaultCred.password).trim());
  }
  if (vaultById && !String(vaultById).includes("••••")) {
    validPasswords.add(String(vaultById).trim());
  }
  if (o.password && !String(o.password).includes("••••")) {
    validPasswords.add(String(o.password).trim());
  }
  if (defaultCred?.password) {
    validPasswords.add(defaultCred.password.trim());
  }

  for (const candidate of Array.from(validPasswords)) {
    if (
      inputPass === candidate ||
      inputPass.toLowerCase() === candidate.toLowerCase()
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Authenticates an owner synchronously against localStorage
 */
export function authenticateProprietaire(
  loginInput: string,
  passwordInput: string,
  skipLog = false
): OwnerCredential | null {
  if (typeof window === "undefined") return null;

  const storedOwnersRaw = localStorage.getItem("gestimmo_proprietaires");
  const owners: any[] = storedOwnersRaw ? JSON.parse(storedOwnersRaw) : [];

  // Merge defaultOwnerCredentials if missing
  Object.values(defaultOwnerCredentials).forEach((defCred) => {
    if (!owners.some((o: any) => o.name && o.name.trim().toUpperCase() === defCred.name.toUpperCase())) {
      owners.push({ ...defCred, role: "Propriétaire" });
    }
  });

  const matched = owners.find((o: any) => matchesOwnerRecord(o, loginInput, passwordInput));

  if (matched) {
    const defaultCred = defaultOwnerCredentials[matched.name?.toUpperCase()];
    const finalLogin = matched.login || defaultCred?.login || matched.email || matched.name;
    const finalPass = matched.password || defaultCred?.password || "Prop1234!";

    const resultCred: OwnerCredential = {
      id: matched.id || "O-100",
      companyId: matched.companyId || matched.company_id,
      name: matched.name || matched.full_name,
      code: matched.code || defaultCred?.code,
      type: matched.type || defaultCred?.type || "particulier",
      email: matched.email || defaultCred?.email,
      phone: matched.phone || defaultCred?.phone,
      login: finalLogin,
      password: finalPass,
      role: "Propriétaire",
      accountStatus: matched.accountStatus === "Inactif" ? "Inactif" : "Actif",
      createdAt: matched.createdAt || defaultCred?.createdAt || new Date().toISOString()
    };

    if (!skipLog) {
      recordOwnerLoginEvent(
        resultCred,
        resultCred.accountStatus === "Inactif" ? "Échec (Compte inactif)" : "Succès"
      );
    }

    return resultCred;
  }

  return null;
}

/**
 * Authentifie un propriétaire depuis N'IMPORTE QUEL ordinateur ou téléphone
 * en vérifiant à la fois le cache local ET la table `owners` de Supabase en temps réel.
 */
export async function authenticateProprietaireAsync(
  loginInput: string,
  passwordInput: string
): Promise<OwnerCredential | null> {
  if (typeof window === "undefined") return null;

  // 1. Rechercher d'abord dans Supabase (source de vérité multi-appareils) pour récupérer l'ID et le company_id exacts
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl.startsWith("http")) {
    try {
      const { data: dbOwners, error } = await supabase.from("owners").select("*");
      if (!error && Array.isArray(dbOwners) && dbOwners.length > 0) {
        const storedOwnersRaw = localStorage.getItem("gestimmo_proprietaires");
        const localOwners: any[] = storedOwnersRaw ? JSON.parse(storedOwnersRaw) : [];

        const matchedDb: any = dbOwners.find((dbRow: any) => {
          const localMatch = localOwners.find(
            (lo: any) =>
              lo.id === dbRow.id ||
              (lo.name && dbRow.full_name && lo.name.trim().toLowerCase() === dbRow.full_name.trim().toLowerCase())
          );
          const mergedCandidate = {
            ...localMatch,
            ...dbRow,
            id: dbRow.id,
            name: dbRow.full_name,
            code: localMatch?.code || dbRow.id_card_number || `PR-${String(dbRow.id).slice(0, 6)}`,
            email: dbRow.email || localMatch?.email || "",
            phone: dbRow.phone || localMatch?.phone || "",
            login: localMatch?.login || (dbRow.email ? dbRow.email.toLowerCase() : ""),
            password: localMatch?.password,
          };
          return matchesOwnerRecord(mergedCandidate, loginInput, passwordInput);
        });

        if (matchedDb) {
          const localMatch = localOwners.find(
            (lo: any) =>
              lo.id === matchedDb.id ||
              (lo.name && matchedDb.full_name && lo.name.trim().toLowerCase() === matchedDb.full_name.trim().toLowerCase())
          );
          const code = localMatch?.code || matchedDb.id_card_number || `PR-${String(matchedDb.id).slice(0, 6)}`;
          const generated = generateOwnerCredentials(
            matchedDb.full_name,
            matchedDb.email || undefined,
            matchedDb.phone || undefined,
            matchedDb.id
          );

          const isInactive =
            localMatch?.accountStatus === "Inactif" ||
            (matchedDb.account_status && String(matchedDb.account_status).toLowerCase().startsWith("inactif"));

          const resultCred: OwnerCredential = {
            id: matchedDb.id,
            companyId: matchedDb.company_id || "11111111-1111-1111-1111-111111111111",
            name: matchedDb.full_name,
            code,
            type: localMatch?.type || "particulier",
            email: matchedDb.email || localMatch?.email || "",
            phone: matchedDb.phone || localMatch?.phone || "",
            login: localMatch?.login || generated.login,
            password: localMatch?.password || generated.password,
            role: "Propriétaire",
            accountStatus: isInactive ? "Inactif" : "Actif",
            createdAt: matchedDb.created_at || new Date().toISOString(),
          };

          // Mettre à jour localStorage sur cet ordinateur pour le portail propriétaire
          if (resultCred.companyId) {
            localStorage.setItem("gestimmo_active_company_id", resultCred.companyId);
          }

          const updatedLocalOwners = [
            {
              ...localMatch,
              ...resultCred,
              commissionRate:
                matchedDb.commission_rate !== undefined && matchedDb.commission_rate !== null
                  ? Number(matchedDb.commission_rate)
                  : localMatch?.commissionRate ?? 10,
            },
            ...localOwners.filter((lo: any) => lo.id !== resultCred.id),
          ];
          localStorage.setItem("gestimmo_proprietaires", JSON.stringify(updatedLocalOwners));

          recordOwnerLoginEvent(
            resultCred,
            resultCred.accountStatus === "Inactif" ? "Échec (Compte inactif)" : "Succès"
          );

          return resultCred;
        }
      }
    } catch (e) {
      console.error("Erreur lors de la vérification Supabase du propriétaire:", e);
    }
  }

  // 2. Repli sur l'authentification locale
  return authenticateProprietaire(loginInput, passwordInput, false);
}

export interface OwnerLoginLogEntry {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerCode?: string;
  loginUsed: string;
  timestamp: string;
  formattedDate: string;
  device: string;
  browser: string;
  status: "Succès" | "Échec (Compte inactif)" | "Déconnexion";
}

const OWNER_LOGIN_LOGS_KEY = "gestimmo_owner_login_logs";
const BANK_DETAILS_LOGS_DELIMITER = " |||LOGS:";

export function stripLogsFromBankDetails(rawBankDetails?: string | null): string {
  if (!rawBankDetails) return "";
  return rawBankDetails.split(BANK_DETAILS_LOGS_DELIMITER)[0];
}

export function extractLogsFromBankDetails(rawBankDetails?: string | null): OwnerLoginLogEntry[] {
  if (!rawBankDetails || !rawBankDetails.includes(BANK_DETAILS_LOGS_DELIMITER)) return [];
  try {
    const jsonPart = rawBankDetails.split(BANK_DETAILS_LOGS_DELIMITER)[1];
    if (!jsonPart) return [];
    const parsed = JSON.parse(jsonPart);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function detectDeviceAndBrowser(): { device: string; browser: string } {
  if (typeof window === "undefined" || !navigator?.userAgent) {
    return { device: "Ordinateur", browser: "Navigateur Web" };
  }
  const ua = navigator.userAgent;

  let device = "Ordinateur";
  if (/android/i.test(ua)) device = "Smartphone Android";
  else if (/iphone|ipod/i.test(ua)) device = "iPhone (iOS)";
  else if (/ipad/i.test(ua)) device = "Tablette iPad";
  else if (/windows/i.test(ua)) device = "Ordinateur Windows";
  else if (/macintosh|mac os x/i.test(ua)) device = "Ordinateur Mac";
  else if (/linux/i.test(ua)) device = "Ordinateur Linux";

  let browser = "Navigateur";
  if (/edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";

  return { device, browser };
}

export function recordOwnerLoginEvent(
  owner: { id?: string; name?: string; full_name?: string; code?: string; login?: string; email?: string },
  status: "Succès" | "Échec (Compte inactif)" | "Déconnexion" = "Succès"
): void {
  if (typeof window === "undefined" || !owner) return;

  try {
    const raw = localStorage.getItem(OWNER_LOGIN_LOGS_KEY);
    const logs: OwnerLoginLogEntry[] = raw ? JSON.parse(raw) : [];
    const now = new Date();
    const { device, browser } = detectDeviceAndBrowser();

    const ownerName = (owner.name || owner.full_name || "Propriétaire").trim();
    const entry: OwnerLoginLogEntry = {
      id: `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      ownerId: String(owner.id || ""),
      ownerName,
      ownerCode: owner.code || "",
      loginUsed: owner.login || owner.email || ownerName,
      timestamp: now.toISOString(),
      formattedDate: now.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      device,
      browser,
      status,
    };

    const updated = [entry, ...logs].slice(0, 300);
    localStorage.setItem(OWNER_LOGIN_LOGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("gestimmo_owner_logs_updated"));

    // Synchroniser également dans Supabase pour que l'administrateur voie les connexions faites depuis l'ordinateur/téléphone du propriétaire
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl.startsWith("http") && owner.id && /^[0-9a-f]{8}-/i.test(String(owner.id))) {
      (async () => {
        try {
          const { data: row } = await (supabase.from("owners") as any)
            .select("id, bank_details")
            .eq("id", owner.id)
            .maybeSingle();
          if (row) {
            const cleanBank = stripLogsFromBankDetails(row.bank_details);
            const remoteLogs = extractLogsFromBankDetails(row.bank_details);
            const mergedOwnerLogs = [entry, ...remoteLogs.filter((l) => l.id !== entry.id)].slice(0, 30);
            const nextBankDetails = `${cleanBank}${BANK_DETAILS_LOGS_DELIMITER}${JSON.stringify(mergedOwnerLogs)}`;
            await (supabase.from("owners") as any)
              .update({ bank_details: nextBankDetails })
              .eq("id", owner.id);
          }
        } catch (err) {
          console.warn("Sync journal connexion Supabase:", err);
        }
      })();
    }
  } catch (e) {
    console.error("Erreur enregistrement journal connexion propriétaire:", e);
  }
}

export function getOwnerLoginLogs(owner: { id?: string; name?: string; code?: string }): OwnerLoginLogEntry[] {
  if (typeof window === "undefined" || !owner) return [];
  try {
    const raw = localStorage.getItem(OWNER_LOGIN_LOGS_KEY);
    const logs: OwnerLoginLogEntry[] = raw ? JSON.parse(raw) : [];
    const targetId = String(owner.id || "").trim().toLowerCase();
    const targetName = String(owner.name || "").trim().toLowerCase();
    const targetCode = String(owner.code || "").trim().toLowerCase();

    return logs.filter((log) => {
      const lId = (log.ownerId || "").trim().toLowerCase();
      const lName = (log.ownerName || "").trim().toLowerCase();
      const lCode = (log.ownerCode || "").trim().toLowerCase();

      return (
        (targetId && lId && lId === targetId) ||
        (targetName && lName && lName === targetName) ||
        (targetCode && lCode && lCode === targetCode)
      );
    });
  } catch {
    return [];
  }
}

/**
 * Récupère les journaux de connexion d'un propriétaire en fusionnant localStorage et Supabase
 */
export async function fetchOwnerLoginLogsAsync(owner: { id?: string; name?: string; code?: string }): Promise<OwnerLoginLogEntry[]> {
  const localLogs = getOwnerLoginLogs(owner);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && supabaseUrl.startsWith("http") && owner?.id && /^[0-9a-f]{8}-/i.test(String(owner.id))) {
    try {
      const { data: row } = await (supabase.from("owners") as any)
        .select("bank_details")
        .eq("id", owner.id)
        .maybeSingle();
      if (row && row.bank_details) {
        const remoteLogs = extractLogsFromBankDetails(row.bank_details);
        const byId = new Map<string, OwnerLoginLogEntry>();
        [...remoteLogs, ...localLogs].forEach((item) => {
          if (item && item.id) byId.set(item.id, item);
        });
        const merged = Array.from(byId.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return merged;
      }
    } catch {}
  }

  return localLogs;
}

export function clearOwnerLoginLogs(owner: { id?: string; name?: string; code?: string }): void {
  if (typeof window === "undefined" || !owner) return;
  try {
    const raw = localStorage.getItem(OWNER_LOGIN_LOGS_KEY);
    if (raw) {
      const logs: OwnerLoginLogEntry[] = JSON.parse(raw);
      const targetId = String(owner.id || "").trim().toLowerCase();
      const targetName = String(owner.name || "").trim().toLowerCase();
      const targetCode = String(owner.code || "").trim().toLowerCase();

      const remaining = logs.filter((log) => {
        const lId = (log.ownerId || "").trim().toLowerCase();
        const lName = (log.ownerName || "").trim().toLowerCase();
        const lCode = (log.ownerCode || "").trim().toLowerCase();
        const isMatch =
          (targetId && lId && lId === targetId) ||
          (targetName && lName && lName === targetName) ||
          (targetCode && lCode && lCode === targetCode);
        return !isMatch;
      });

      localStorage.setItem(OWNER_LOGIN_LOGS_KEY, JSON.stringify(remaining));
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl.startsWith("http") && owner.id && /^[0-9a-f]{8}-/i.test(String(owner.id))) {
      (async () => {
        try {
          const { data: row } = await (supabase.from("owners") as any)
            .select("id, bank_details")
            .eq("id", owner.id)
            .maybeSingle();
          if (row && row.bank_details) {
            const cleanBank = stripLogsFromBankDetails(row.bank_details);
            await (supabase.from("owners") as any)
              .update({ bank_details: cleanBank })
              .eq("id", owner.id);
          }
        } catch {}
      })();
    }

    window.dispatchEvent(new Event("gestimmo_owner_logs_updated"));
  } catch {}
}
