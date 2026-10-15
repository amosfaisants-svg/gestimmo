"use client";

import { useState, useEffect } from "react";
import { UserPermissionRights, getDefaultPermissions } from "@/lib/companyCredentials";
import { getPortalSession } from "@/lib/authSession";

export function usePermissions() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<UserPermissionRights>(getDefaultPermissions("Administrateur"));

  useEffect(() => {
    const loadUserPermissions = () => {
      const parsed = getPortalSession("ADMIN");
      if (parsed) {
        try {
          setCurrentUser(parsed);
          const role = parsed.role || parsed.userRole || "Administrateur";
          const normRole = (role || "").toUpperCase();

          if (normRole.includes("ADMIN")) {
            setPermissions(getDefaultPermissions("Administrateur"));
          } else if (parsed.permissions) {
            setPermissions(parsed.permissions);
          } else {
            setPermissions(getDefaultPermissions(role));
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    loadUserPermissions();

    // Listen to storage changes or custom event if permissions are updated in settings
    window.addEventListener("storage", loadUserPermissions);
    return () => window.removeEventListener("storage", loadUserPermissions);
  }, []);

  const adminSession = typeof window !== "undefined" ? getPortalSession("ADMIN") : null;
  const roleStr = (currentUser?.role || adminSession?.role || adminSession?.userRole || "Administrateur").toUpperCase();
  const isAdmin = roleStr.includes("ADMIN");
  const isGerant = !isAdmin && (roleStr.includes("GÉRANT") || roleStr.includes("GERANT") || Boolean(currentUser?.assignedLogements || adminSession?.assignedLogements));

  const assignedLogements: string[] = currentUser?.assignedLogements || [];
  const gerantPermissions = currentUser?.gerantPermissions || {
    canViewReceipts: true,
    canManageContracts: true,
    canManageDocuments: true,
    canManageLogements: true,
  };

  const can = (moduleKey: keyof UserPermissionRights, action: "view" | "edit" | "delete" | "viewCredentials"): boolean => {
    if (isAdmin) return true;

    if (isGerant) {
      if (moduleKey === "parametres") return false;
      if (moduleKey === "biens") return gerantPermissions.canManageLogements !== false;
      if (moduleKey === "baux") return gerantPermissions.canManageContracts !== false;
      if (moduleKey === "locataires") return gerantPermissions.canManageDocuments !== false;
      if (moduleKey === "paiements") return gerantPermissions.canViewReceipts !== false;
    }

    if (!permissions || !permissions[moduleKey]) return false;
    if (action === "viewCredentials") {
      return permissions[moduleKey]?.viewCredentials !== false;
    }
    return Boolean(permissions[moduleKey][action]);
  };

  return { currentUser, permissions, can, isAdmin, isGerant, assignedLogements, gerantPermissions };
}
