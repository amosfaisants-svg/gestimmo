import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatFCFA = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined || amount === "") return "0 F CFA";
  const num = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : Number(amount);
  if (isNaN(num)) return "0 F CFA";
  let rounded = Math.round(num);
  if (Math.abs(rounded - Math.round(rounded / 1000) * 1000) < 10) {
    rounded = Math.round(rounded / 1000) * 1000;
  }
  return new Intl.NumberFormat("fr-FR").format(rounded) + " F CFA";
};

export const isUUID = (str?: string | null): boolean => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
};

export const formatUnitDisplay = (
  val?: any,
  fallbackIndex: number = 1,
  defaultType: string = "Appartement"
): string => {
  if (!val) return `${defaultType} ${fallbackIndex}`;

  if (typeof val === "object") {
    const candidate = val.unit || val.name || val.unit_number || val.unitNumber;
    const type = val.type || defaultType;
    if (candidate && typeof candidate === "string" && !isUUID(candidate) && candidate.length <= 25) {
      const trimmed = candidate.trim();
      const lower = trimmed.toLowerCase();
      if (
        lower.startsWith("appartement") ||
        lower.startsWith("studio") ||
        lower.startsWith("villa") ||
        lower.startsWith("magasin") ||
        lower.startsWith("bureau") ||
        lower.startsWith("chambre") ||
        lower.startsWith("porte")
      ) {
        return trimmed;
      }
      return `${type} ${trimmed}`;
    }
    return `${type} ${fallbackIndex}`;
  }

  const trimmed = String(val).trim();
  if (!trimmed || trimmed === "-" || trimmed === "—") return `${defaultType} ${fallbackIndex}`;
  if (isUUID(trimmed) || trimmed.length > 25) {
    return `${defaultType} ${fallbackIndex}`;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("appartement") ||
    lower.startsWith("studio") ||
    lower.startsWith("villa") ||
    lower.startsWith("magasin") ||
    lower.startsWith("bureau") ||
    lower.startsWith("chambre") ||
    lower.startsWith("porte")
  ) {
    return trimmed;
  }

  return trimmed;
};

export const getPaymentDisplayCode = (paymentOrId?: any): string => {
  if (!paymentOrId) return "REC-2026-001";
  if (typeof paymentOrId === "string") {
    const trimmed = paymentOrId.trim();
    if (!trimmed || trimmed === "-") return "REC-2026-001";
    if (isUUID(trimmed) || trimmed.length > 20) {
      return `REC-2026-${trimmed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;
    }
    return trimmed;
  }
  if (paymentOrId.code && !isUUID(paymentOrId.code) && paymentOrId.code.length <= 20) return paymentOrId.code;
  if (paymentOrId.receipt_number && !isUUID(paymentOrId.receipt_number) && paymentOrId.receipt_number.length <= 20) return paymentOrId.receipt_number;
  if (paymentOrId.receiptNumber && !isUUID(paymentOrId.receiptNumber) && paymentOrId.receiptNumber.length <= 20) return paymentOrId.receiptNumber;
  if (paymentOrId.id && typeof paymentOrId.id === "string") {
    if (isUUID(paymentOrId.id) || paymentOrId.id.length > 20) {
      let year = "2026";
      const dateStr = paymentOrId.date || paymentOrId.payment_date || paymentOrId.createdAt || "";
      if (typeof dateStr === "string") {
        const match = dateStr.match(/\b(20\d\d)\b/);
        if (match) year = match[1];
      }
      return `REC-${year}-${paymentOrId.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;
    }
    return paymentOrId.id;
  }
  return "REC-2026-001";
};

export const getLeaseDisplayCode = (leaseOrId?: any): string => {
  if (!leaseOrId) return "-";
  if (typeof leaseOrId === "string") {
    const trimmed = leaseOrId.trim();
    if (!trimmed || trimmed === "-") return "-";
    if (isUUID(trimmed) || trimmed.length > 20) {
      return `B-2026-${trimmed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;
    }
    return trimmed;
  }
  if (leaseOrId.code && !isUUID(leaseOrId.code) && leaseOrId.code.length <= 20) return leaseOrId.code;
  if (leaseOrId.lease_number && !isUUID(leaseOrId.lease_number) && leaseOrId.lease_number.length <= 20) return leaseOrId.lease_number;
  if (leaseOrId.leaseNumber && !isUUID(leaseOrId.leaseNumber) && leaseOrId.leaseNumber.length <= 20) return leaseOrId.leaseNumber;

  let year = "2026";
  const dateStr = leaseOrId.start || leaseOrId.startDate || leaseOrId.start_date || leaseOrId.createdAt || leaseOrId.created_at || "";
  if (typeof dateStr === "string") {
    const match = dateStr.match(/\b(20\d\d)\b/);
    if (match) year = match[1];
  } else if (dateStr instanceof Date) {
    year = dateStr.getFullYear().toString();
  }

  const rawId = leaseOrId.id || leaseOrId.leaseId || leaseOrId.lease_id || leaseOrId.code || "";
  if (rawId && typeof rawId === "string") {
    const trimmedId = rawId.trim();
    if (isUUID(trimmedId) || trimmedId.length > 20) {
      const cleanHex = trimmedId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
      return `B-${year}-${cleanHex}`;
    }
    return trimmedId;
  }
  return "-";
};

export const getIncidentDisplayCode = (incidentOrId?: any): string => {
  if (!incidentOrId) return "INC-0001";
  const raw = typeof incidentOrId === "string" 
    ? incidentOrId 
    : (incidentOrId.code || incidentOrId.reference || incidentOrId.id || "");
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === "-") return "INC-0001";
  if (trimmed.startsWith("INC-") && trimmed.length <= 15) return trimmed;
  if (isUUID(trimmed) || trimmed.length > 15) {
    const cleanHex = trimmed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
    return `INC-${cleanHex}`;
  }
  return trimmed;
};

export const syncPaymentsWithLeases = (paymentsList: any[], leasesList: any[]): any[] => {
  if (!Array.isArray(paymentsList) || paymentsList.length === 0) return paymentsList;
  if (!Array.isArray(leasesList) || leasesList.length === 0) return paymentsList;

  return paymentsList.map((p) => {
    if (!p) return p;
    
    const pTenant = (p.tenant || "").toString().trim().toLowerCase();
    const pUnit = (p.unit || "").toString().trim().toLowerCase();
    const pLeaseId = (p.leaseId || p.lease_id || "").toString().trim().toLowerCase();
    const pCode = (p.code || "").toString().trim().toLowerCase();

    const matchedLease = leasesList.find((l) => {
      if (!l) return false;
      const lId = (l.id || "").toString().trim().toLowerCase();
      const lCode = (l.code || "").toString().trim().toLowerCase();
      const lTenant = (l.tenant || "").toString().trim().toLowerCase();
      const lUnit = (l.unit || "").toString().trim().toLowerCase();

      if (pLeaseId && lId && pLeaseId === lId) return true;
      if (pCode && lCode && pCode === lCode) return true;
      if (pTenant && lTenant && pTenant === lTenant) return true;
      if (pUnit && lUnit && (pUnit === lUnit || pUnit.includes(lUnit) || lUnit.includes(pUnit))) return true;

      return false;
    });

    if (matchedLease) {
      const leaseMonthlyRent = (Number(matchedLease.rent) || 0) + (Number(matchedLease.charges) || 0);
      const periodLower = (p.period || p.type || "").toString().toLowerCase();

      let targetAmount = leaseMonthlyRent > 0 ? leaseMonthlyRent : p.amount;

      if (periodLower.includes("caution") || periodLower.includes("dépôt") || periodLower.includes("depot")) {
        const matchMonths = periodLower.match(/(\d+)\s*mois/);
        const months = matchMonths ? parseInt(matchMonths[1], 10) : (matchedLease.cautionMonths || matchedLease.caution_months || 2);
        const baseRent = leaseMonthlyRent > 0 ? leaseMonthlyRent : (p.amount ? p.amount / (months || 1) : 0);
        targetAmount = months * baseRent;
      } else if (periodLower.includes("avance")) {
        const matchMonths = periodLower.match(/(\d+)\s*mois/);
        const months = matchMonths ? parseInt(matchMonths[1], 10) : (matchedLease.avanceMonths || matchedLease.avance_months || 1);
        const baseRent = leaseMonthlyRent > 0 ? leaseMonthlyRent : (p.amount ? p.amount / (months || 1) : 0);
        targetAmount = months * baseRent;
      }

      return {
        ...p,
        tenant: matchedLease.tenant || p.tenant,
        unit: matchedLease.unit || p.unit,
        property: matchedLease.property || p.property,
        amount: targetAmount > 0 ? targetAmount : p.amount,
      };
    }

    return p;
  });
};

export const checkTenantHasImportedContract = (tenant: any, allBaux: any[] = []): boolean => {
  if (!tenant) return false;

  // 1. Direct documents in tenant.documents
  if (Array.isArray(tenant.documents) && tenant.documents.length > 0) {
    const hasContract = tenant.documents.some((d: any) =>
      d && (
        d.isContract === true ||
        d.isImported === true ||
        d.type === "CONTRAT" ||
        (typeof d.name === "string" && (
          d.name.toLowerCase().includes("contrat") || 
          d.name.toLowerCase().includes("bail")
        ))
      )
    );
    if (hasContract) return true;
  }

  // 2. Lease documents in gestimmo_docs_${lease.id}
  const tenantLeases = (allBaux || []).filter((b: any) =>
    b && (
      (b.tenantId && tenant.id && b.tenantId === tenant.id) ||
      (b.tenant && tenant.name && b.tenant.trim().toLowerCase() === tenant.name.trim().toLowerCase())
    )
  );

  for (const lease of tenantLeases) {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`gestimmo_docs_${lease.id}`);
        if (stored) {
          const docs = JSON.parse(stored);
          if (Array.isArray(docs)) {
            const hasContract = docs.some((d: any) =>
              d && (
                d.isContract === true ||
                d.isImported === true ||
                d.type === "CONTRAT" ||
                (typeof d.name === "string" && (
                  d.name.toLowerCase().includes("contrat") || 
                  d.name.toLowerCase().includes("bail")
                ))
              )
            );
            if (hasContract) return true;
          }
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }
  }

  return false;
};

export const isUnitOccupied = (unit: any, allLeases: any[] = []): boolean => {
  if (!unit) return false;

  // 1. Vérifier le statut direct du logement (insensible à la casse et aux accents)
  const rawStatus = (unit.status || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // "occupé" -> "occupe"

  if (
    rawStatus.includes("occup") || // "occupé", "occupe", "occupied", "occupée", "occupes"
    rawStatus === "loue" ||
    rawStatus === "loué" ||
    rawStatus.includes("loue") ||
    rawStatus === "indisponible"
  ) {
    return true;
  }

  // 2. Vérifier si un locataire est explicitement assigné au logement
  if (
    unit.tenant &&
    typeof unit.tenant === "string" &&
    unit.tenant.trim() !== "" &&
    unit.tenant.trim() !== "-" &&
    unit.tenant.trim().toLowerCase() !== "aucun" &&
    unit.tenant.trim().toLowerCase() !== "vacant" &&
    unit.tenant.trim().toLowerCase() !== "disponible"
  ) {
    return true;
  }

  if (unit.tenant_id || unit.tenantId) {
    return true;
  }

  if (unit.is_occupied === true || unit.isOccupied === true) {
    return true;
  }

  // 3. Vérifier les baux actifs (depuis le paramètre ou localStorage)
  let leasesToCheck = allLeases;
  if ((!leasesToCheck || leasesToCheck.length === 0) && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("gestimmo_baux");
      if (stored) {
        leasesToCheck = JSON.parse(stored);
      }
    } catch (e) {}
  }

  if (Array.isArray(leasesToCheck) && leasesToCheck.length > 0) {
    const uId = (unit.id || "").toString().trim().toLowerCase();
    const uNum = (unit.unit_number || "").toString().trim().toLowerCase();
    const uUnit = (unit.unit || "").toString().trim().toLowerCase();
    const uName = (unit.name || "").toString().trim().toLowerCase();
    const uProp = (unit.property || unit.property_id || "").toString().trim().toLowerCase();

    const cleanUNum = uNum.replace(/^logement\s+/i, "").replace(/^appartement\s+/i, "").trim();
    const cleanUUnit = uUnit.replace(/^logement\s+/i, "").replace(/^appartement\s+/i, "").trim();
    const cleanUName = uName.replace(/^logement\s+/i, "").replace(/^appartement\s+/i, "").trim();

    const hasActiveLease = leasesToCheck.some((l: any) => {
      if (!l) return false;
      const lStatus = (l.status || "")
        .toString()
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      // Ignorer les baux résiliés, expirés ou annulés
      if (
        lStatus.includes("RESILIE") ||
        lStatus.includes("EXPIRE") ||
        lStatus.includes("ANNULE") ||
        lStatus.includes("CLOTURE") ||
        lStatus.includes("TERMINE")
      ) {
        return false;
      }

      // Considéré actif si ACTIF, EN COURS, ACTIVE, VALIDE, SIGNE, ou si aucun statut explicite
      const isActive =
        lStatus === "ACTIF" ||
        lStatus === "EN COURS" ||
        lStatus === "EN_COURS" ||
        lStatus === "ACTIVE" ||
        lStatus === "VALIDE" ||
        lStatus === "SIGNE" ||
        lStatus === "EN ATTENTE" ||
        lStatus === "";

      if (!isActive) return false;

      const lUnitId = (l.unitId || l.unit_id || "").toString().trim().toLowerCase();
      const lUnit = (l.unit || "").toString().trim().toLowerCase();
      const cleanLUnit = lUnit.replace(/^logement\s+/i, "").replace(/^appartement\s+/i, "").trim();

      // Correspondance par ID direct (UUID ou identifiant)
      if (lUnitId && (lUnitId === uId || lUnitId === uNum || lUnitId === uUnit)) {
        return true;
      }

      // Correspondance par libellé ou numéro de logement
      if (lUnit) {
        if (
          lUnit === uId ||
          lUnit === uNum ||
          lUnit === uUnit ||
          lUnit === uName ||
          (cleanLUnit && (cleanLUnit === cleanUNum || cleanLUnit === cleanUUnit || cleanLUnit === cleanUName))
        ) {
          // Si le bien est précisé sur le bail et le logement, s'assurer que c'est le même bien
          const lProp = (l.property || l.propertyId || l.property_id || "").toString().trim().toLowerCase();
          if (lProp && uProp && lProp !== uProp) {
            if (!lProp.includes(uProp) && !uProp.includes(lProp)) {
              return false;
            }
          }
          return true;
        }
      }

      return false;
    });

    if (hasActiveLease) return true;
  }

  return false;
};


