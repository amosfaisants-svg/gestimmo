/**
 * portalSettings.ts - GESTIMMO
 * Gestion de la visibilité des fonctionnalités pour les espaces portails (ex: Espace Propriétaire)
 */

export const STORAGE_KEY_SHOW_PENDING_RENTS = "gestimmo_portal_show_pending_rents";

/**
 * Vérifie si l'onglet / bouton "Loyers en attente de reversement" doit être visible pour un propriétaire donné.
 * Priorité :
 * 1. Configuration spécifique au propriétaire (owner.showPendingRents) si définie (true ou false)
 * 2. Configuration globale de l'agence (gestimmo_portal_show_pending_rents dans localStorage)
 * 3. Valeur par défaut : true (visible)
 */
export function isPendingRentsVisibleForOwner(owner?: any): boolean {
  // 1. Spécifique au propriétaire
  if (owner) {
    if (owner.showPendingRents === true || owner.showPendingRents === "true") return true;
    if (owner.showPendingRents === false || owner.showPendingRents === "false") return false;
    if (owner.portalPermissions?.canViewPendingRents !== undefined) {
      return Boolean(owner.portalPermissions.canViewPendingRents);
    }
  }

  // 2. Configuration globale de l'administrateur
  if (typeof window !== "undefined") {
    try {
      const globalSetting = localStorage.getItem(STORAGE_KEY_SHOW_PENDING_RENTS);
      if (globalSetting !== null) {
        return globalSetting === "true";
      }
    } catch {}
  }

  // 3. Par défaut : visible
  return true;
}

/**
 * Définit la visibilité globale côté administrateur pour tous les propriétaires
 */
export function setGlobalPendingRentsVisibility(visible: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_SHOW_PENDING_RENTS, String(visible));
    window.dispatchEvent(new Event("gestimmo_portal_settings_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Erreur lors de la mise à jour des paramètres du portail:", e);
  }
}

/**
 * Récupère le réglage global actuel
 */
export function getGlobalPendingRentsVisibility(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(STORAGE_KEY_SHOW_PENDING_RENTS);
    if (val !== null) return val === "true";
  } catch {}
  return true;
}

/**
 * Définit la visibilité individuelle pour un propriétaire spécifique
 */
export function setOwnerPendingRentsVisibility(ownerId: string, visible: boolean | null): void {
  if (typeof window === "undefined" || !ownerId) return;
  try {
    const stored = localStorage.getItem("gestimmo_proprietaires");
    if (stored) {
      const owners = JSON.parse(stored);
      const updated = owners.map((o: any) => {
        if (o.id === ownerId || String(o.id) === String(ownerId)) {
          return {
            ...o,
            showPendingRents: visible,
          };
        }
        return o;
      });
      localStorage.setItem("gestimmo_proprietaires", JSON.stringify(updated));
      window.dispatchEvent(new Event("gestimmo_portal_settings_updated"));
      window.dispatchEvent(new Event("storage"));
    }
  } catch (e) {
    console.error("Erreur mise à jour propriétaire:", e);
  }
}
