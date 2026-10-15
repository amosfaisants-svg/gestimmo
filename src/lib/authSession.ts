"use client";

export type PortalType = 'ADMIN' | 'LOCATAIRE' | 'PROPRIETAIRE';

export interface AuthSessionUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  login?: string;
  role: string;
  [key: string]: any;
}

const VAULT_STORAGE_KEY = "gestimmo_credentials_vault";

/**
 * Normalizes identifier key for the credentials vault (case-insensitive, trimmed)
 */
function normalizeVaultKey(accountType: string, identifier: string): string {
  return `${accountType.trim().toLowerCase()}:${identifier.trim().toLowerCase()}`;
}

/**
 * Retrieves stored credentials from the persistent vault.
 * Supports both getStoredVaultCredential(type, id) and getStoredVaultCredential(id, fieldName)
 */
export function getStoredVaultCredential(
  accountTypeOrId: 'locataire' | 'proprietaire' | 'equipe' | string,
  identifierOrField?: string
): any {
  if (typeof window === "undefined" || !accountTypeOrId) return null;

  let type = "equipe";
  let id = accountTypeOrId;
  let field = identifierOrField;

  if (accountTypeOrId === "locataire" || accountTypeOrId === "proprietaire" || accountTypeOrId === "equipe") {
    type = accountTypeOrId;
    id = identifierOrField || "";
    field = undefined;
  }

  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return null;
    const vault = JSON.parse(raw);
    const key = normalizeVaultKey(type, id);
    const item = vault[key] || vault[id.trim().toLowerCase()] || null;
    if (!item) return null;
    if (field && typeof item === "object") {
      return item[field] || null;
    }
    return item;
  } catch (e) {
    console.error("Error reading credentials vault:", e);
    return null;
  }
}

/**
 * Saves or updates credentials in the persistent vault to ensure passwords remain stable.
 * Supports both saveStoredVaultCredential(type, id, creds) and saveStoredVaultCredential(id, fieldName, value)
 */
export function saveStoredVaultCredential(
  accountTypeOrId: 'locataire' | 'proprietaire' | 'equipe' | string,
  identifierOrField: string,
  credsOrValue?: any
): void {
  if (typeof window === "undefined" || !accountTypeOrId) return;

  let type = "equipe";
  let id = accountTypeOrId;
  let credsToSave: any = {};

  if (accountTypeOrId === "locataire" || accountTypeOrId === "proprietaire" || accountTypeOrId === "equipe") {
    type = accountTypeOrId;
    id = identifierOrField;
    credsToSave = typeof credsOrValue === "object" ? credsOrValue : { password: credsOrValue };
  } else {
    id = accountTypeOrId;
    const fieldName = identifierOrField;
    credsToSave = { [fieldName]: credsOrValue };
  }

  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    const vault = raw ? JSON.parse(raw) : {};
    const key = normalizeVaultKey(type, id);
    const existing = vault[key] || vault[id.trim().toLowerCase()] || {};

    // Never overwrite an existing valid password with bullets or empty string
    if (credsToSave.password && (credsToSave.password.includes("••••") || credsToSave.password.trim() === "")) {
      delete credsToSave.password;
    }

    vault[key] = {
      ...existing,
      ...credsToSave,
      updatedAt: new Date().toISOString(),
    };
    // Also save directly by id for fast lookups
    vault[id.trim().toLowerCase()] = vault[key];

    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch (e) {
    console.error("Error saving credentials vault:", e);
  }
}

/**
 * Establishes an authenticated session for a specific portal.
 * Combines tab-level sessionStorage (for independent multi-tab navigation)
 * with portal-specific localStorage (so different portals never overwrite each other).
 */
export function setPortalSession(portal: PortalType, user: any, role?: string): void {
  if (typeof window === "undefined" || !user) return;

  const actualRole = role || user.role || (portal === 'ADMIN' ? 'ADMIN' : portal);
  const userJson = JSON.stringify(user);

  try {
    // 1. Tab-level isolation (this tab now exclusively runs this portal session)
    sessionStorage.setItem("gestimmo_tab_portal", portal);
    sessionStorage.setItem("gestimmo_tab_user", userJson);
    sessionStorage.setItem("gestimmo_tab_role", actualRole);

    // 2. Portal-specific persistent storage (isolated per portal)
    if (portal === 'ADMIN') {
      localStorage.setItem("gestimmo_admin_user", userJson);
      localStorage.setItem("gestimmo_admin_role", actualRole);
    } else if (portal === 'LOCATAIRE') {
      localStorage.setItem("gestimmo_locataire_user", userJson);
      localStorage.setItem("gestimmo_locataire_role", "LOCATAIRE");
    } else if (portal === 'PROPRIETAIRE') {
      localStorage.setItem("gestimmo_proprietaire_user", userJson);
      localStorage.setItem("gestimmo_proprietaire_role", "PROPRIETAIRE");
    }

    // 3. Fallback sync for components reading gestimmo_current_user
    localStorage.setItem("gestimmo_current_user", userJson);
    localStorage.setItem("gestimmo_user_role", actualRole);

    // 4. Notify all listeners
    window.dispatchEvent(new Event("gestimmo_auth_changed"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("setPortalSession error:", e);
  }
}

/**
 * Retrieves the currently active user for a specific portal.
 * Checks tab-level sessionStorage first, then portal-specific localStorage.
 */
export function getPortalSession(portal: PortalType): any | null {
  if (typeof window === "undefined") return null;

  try {
    // 1. Check tab-level sessionStorage (isolated per tab)
    const tabPortal = sessionStorage.getItem("gestimmo_tab_portal");
    if (tabPortal === portal) {
      const tabUserStr = sessionStorage.getItem("gestimmo_tab_user");
      const tabRole = sessionStorage.getItem("gestimmo_tab_role");
      if (tabUserStr) {
        try {
          const userObj = JSON.parse(tabUserStr);
          const role = tabRole || userObj.role || portal;
          return { ...userObj, user: userObj, role };
        } catch (e) {}
      }
    }

    // 2. Check portal-specific localStorage (prevents cross-portal collisions)
    let portalUserStr: string | null = null;
    let portalRole: string | null = null;

    if (portal === 'ADMIN') {
      portalUserStr = localStorage.getItem("gestimmo_admin_user");
      portalRole = localStorage.getItem("gestimmo_admin_role");
    } else if (portal === 'LOCATAIRE') {
      portalUserStr = localStorage.getItem("gestimmo_locataire_user");
      portalRole = localStorage.getItem("gestimmo_locataire_role") || "LOCATAIRE";
    } else if (portal === 'PROPRIETAIRE') {
      portalUserStr = localStorage.getItem("gestimmo_proprietaire_user");
      portalRole = localStorage.getItem("gestimmo_proprietaire_role") || "PROPRIETAIRE";
    }

    if (portalUserStr) {
      try {
        const userObj = JSON.parse(portalUserStr);
        const role = portalRole || userObj.role || portal;
        return { ...userObj, user: userObj, role };
      } catch (e) {}
    }

    // 3. Backward-compatibility check on gestimmo_current_user (only if role matches portal)
    const legacyUserStr = localStorage.getItem("gestimmo_current_user");
    const legacyRole = localStorage.getItem("gestimmo_user_role")?.toUpperCase();
    if (legacyUserStr && legacyRole) {
      try {
        const userObj = JSON.parse(legacyUserStr);
        const normUserRole = (userObj.role || legacyRole || "").toUpperCase();

        if (portal === 'LOCATAIRE' && normUserRole.includes("LOCATAIRE")) {
          return { ...userObj, user: userObj, role: "LOCATAIRE" };
        }
        if (portal === 'PROPRIETAIRE' && (normUserRole.includes("PROPRIETAIRE") || normUserRole.includes("PROPRIÉTAIRE"))) {
          return { ...userObj, user: userObj, role: "PROPRIETAIRE" };
        }
        if (portal === 'ADMIN' && !normUserRole.includes("LOCATAIRE") && !normUserRole.includes("PROPRIETAIRE") && !normUserRole.includes("PROPRIÉTAIRE")) {
          return { ...userObj, user: userObj, role: legacyRole };
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error("getPortalSession error:", e);
  }

  return null;
}

/**
 * Clears the session for a specific portal without disconnecting other portals.
 */
export function clearPortalSession(portal: PortalType): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Clear tab-level sessionStorage if this tab belongs to this portal
    if (sessionStorage.getItem("gestimmo_tab_portal") === portal) {
      sessionStorage.removeItem("gestimmo_tab_portal");
      sessionStorage.removeItem("gestimmo_tab_user");
      sessionStorage.removeItem("gestimmo_tab_role");
    }

    // 2. Clear portal-specific localStorage
    if (portal === 'ADMIN') {
      localStorage.removeItem("gestimmo_admin_user");
      localStorage.removeItem("gestimmo_admin_role");
    } else if (portal === 'LOCATAIRE') {
      localStorage.removeItem("gestimmo_locataire_user");
      localStorage.removeItem("gestimmo_locataire_role");
    } else if (portal === 'PROPRIETAIRE') {
      localStorage.removeItem("gestimmo_proprietaire_user");
      localStorage.removeItem("gestimmo_proprietaire_role");
    }

    // 3. If gestimmo_current_user was this portal, clear legacy keys
    const legacyRole = localStorage.getItem("gestimmo_user_role")?.toUpperCase();
    if (legacyRole) {
      const isLocataire = legacyRole.includes("LOCATAIRE");
      const isOwner = legacyRole.includes("PROPRIETAIRE") || legacyRole.includes("PROPRIÉTAIRE");
      if ((portal === 'LOCATAIRE' && isLocataire) || (portal === 'PROPRIETAIRE' && isOwner) || (portal === 'ADMIN' && !isLocataire && !isOwner)) {
        localStorage.removeItem("gestimmo_current_user");
        localStorage.removeItem("gestimmo_user_role");
      }
    }

    window.dispatchEvent(new Event("gestimmo_auth_changed"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("clearPortalSession error:", e);
  }
}
