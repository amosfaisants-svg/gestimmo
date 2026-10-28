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
  if (!Array.isArray(paymentsList)) paymentsList = [];
  if (!Array.isArray(leasesList) || leasesList.length === 0) return paymentsList;

  // 1. Synchroniser les paiements existants avec les détails du bail
  const updatedPayments = paymentsList.map((p) => {
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

  // 2. Garantir que la caution / dépôt de garantie prévue par un bail actif figure bien dans les encaissements
  const resultPayments = [...updatedPayments];
  leasesList.forEach((lease) => {
    if (!lease || (lease.status && lease.status.toString().toUpperCase() !== "ACTIF")) return;

    const lTenant = (lease.tenant || "").toString().trim().toLowerCase();
    const lUnit = (lease.unit || "").toString().trim().toLowerCase();
    const lId = (lease.id || "").toString().trim().toLowerCase();
    if (!lTenant && !lUnit) return;

    const monthlyTotal = (Number(lease.rent) || 0) + (Number(lease.charges) || 0);
    const cautionMonths = Number(lease.cautionMonths || lease.caution_months) || 
      (Number(lease.deposit || lease.deposit_amount) > 0 && monthlyTotal > 0 ? Math.round(Number(lease.deposit || lease.deposit_amount) / monthlyTotal) : 0);

    if (cautionMonths > 0 && monthlyTotal > 0) {
      const hasCaution = resultPayments.some((p) => {
        if (!p) return false;
        const pTenant = (p.tenant || "").toString().trim().toLowerCase();
        const pUnit = (p.unit || "").toString().trim().toLowerCase();
        const pLeaseId = (p.leaseId || p.lease_id || "").toString().trim().toLowerCase();
        const pPeriod = (p.period || p.period_month || p.type || "").toString().toLowerCase();

        const matchesLease = (pLeaseId && lId && pLeaseId === lId) ||
          (pTenant && lTenant && pTenant === lTenant) ||
          (pUnit && lUnit && (pUnit === lUnit || pUnit.includes(lUnit) || lUnit.includes(pUnit)));

        return matchesLease && (pPeriod.includes("caution") || pPeriod.includes("dépôt") || pPeriod.includes("depot"));
      });

      if (!hasCaution) {
        const cautionAmt = cautionMonths * monthlyTotal;
        const fallbackDate = lease.start || lease.startDate || lease.start_date || new Date().toISOString().split("T")[0];
        resultPayments.push({
          id: `P-CAU-SYNC-${lease.id ? String(lease.id).slice(0, 8) : Math.floor(1000 + Math.random() * 9000)}`,
          code: `REC-CAU-${lease.id ? String(lease.id).slice(0, 6).toUpperCase() : "SYNC"}`,
          leaseId: lease.id,
          lease_id: lease.id,
          tenant: lease.tenant,
          tenantId: lease.tenantId || lease.tenant_id,
          unit: lease.unit,
          unitId: lease.unitId || lease.unit_id,
          property: lease.property,
          propertyId: lease.propertyId || lease.property_id,
          amount: cautionAmt,
          date: fallbackDate,
          period: `Caution (${cautionMonths} mois)`,
          period_month: `Caution (${cautionMonths} mois)`,
          method: "Espèces",
          status: "PAYÉ",
          receiptNumber: `REC-CAU-${lease.id ? String(lease.id).slice(0, 6).toUpperCase() : "SYNC"}`,
        });
      }
    }
  });

  return sortPaymentsDesc(resultPayments);
};

export const parsePaymentDateToTimestamp = (raw?: any): number => {
  if (!raw || raw === "-" || raw === "—") return 0;
  if (typeof raw === "number") return raw;
  if (raw instanceof Date) return raw.getTime();
  const str = String(raw).trim();

  const isoTime = Date.parse(str);
  if (!isNaN(isoTime)) return isoTime;

  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10) - 1;
    const y = parseInt(slashMatch[3], 10);
    return new Date(y, m, d).getTime();
  }

  const clean = str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,.]/g, "");
  const parts = clean.split(/\s+/);

  const MONTHS_NORM: Record<string, number> = {
    janv: 0, janvier: 0,
    fevr: 1, fev: 1, fevrier: 1,
    mars: 2,
    avr: 3, avril: 3,
    mai: 4,
    juin: 5,
    juil: 6, juillet: 6,
    aout: 7,
    sept: 8, septembre: 8,
    oct: 9, octobre: 9,
    nov: 10, novembre: 10,
    dec: 11, decembre: 11,
  };

  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const mKey = parts[1];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && MONTHS_NORM[mKey] !== undefined && !isNaN(year)) {
      return new Date(year, MONTHS_NORM[mKey], day).getTime();
    }
  }

  if (parts.length === 2) {
    const mKey = parts[0];
    const year = parseInt(parts[1], 10);
    if (MONTHS_NORM[mKey] !== undefined && !isNaN(year)) {
      return new Date(year, MONTHS_NORM[mKey], 1).getTime();
    }
  }

  return 0;
};

export const formatPaymentDateDisplay = (raw?: any): string => {
  if (!raw || raw === "-" || raw === "—") return "-";
  const ts = parsePaymentDateToTimestamp(raw);
  if (!ts) return String(raw);
  const d = new Date(ts);
  const formatted = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const parsePeriodScore = (raw?: any): number => {
  if (!raw) return 0;
  const s = String(raw).trim().toLowerCase();
  if (s.includes("caution") || s.includes("dépôt") || s.includes("depot")) {
    return 1;
  }
  const clean = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,.]/g, "");
  const parts = clean.split(/\s+/);
  const MONTHS_NUM: Record<string, number> = {
    janv: 1, janvier: 1,
    fevr: 2, fev: 2, fevrier: 2,
    mars: 3,
    avr: 4, avril: 4,
    mai: 5,
    juin: 6,
    juil: 7, juillet: 7,
    aout: 8,
    sept: 9, septembre: 9,
    oct: 10, octobre: 10,
    nov: 11, novembre: 11,
    dec: 12, decembre: 12,
  };
  let month = -1;
  let year = -1;
  for (const p of parts) {
    if (MONTHS_NUM[p] !== undefined) month = MONTHS_NUM[p];
    if (/^\d{4}$/.test(p)) year = parseInt(p, 10);
  }
  if (year !== -1 && month !== -1) {
    return year * 100 + month;
  }
  return 0;
};

export const comparePaymentsDesc = (a: any, b: any): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  if (a.isVirtual && !b.isVirtual) return -1;
  if (!a.isVirtual && b.isVirtual) return 1;

  // 1. Payment Date DESC
  const timeA = parsePaymentDateToTimestamp(a.payment_date || a.paymentDate || a.date);
  const timeB = parsePaymentDateToTimestamp(b.payment_date || b.paymentDate || b.date);
  if (timeA !== timeB) return timeB - timeA;

  // 2. Created_at timestamp DESC (when recorded in DB)
  const createdA = parsePaymentDateToTimestamp(a.created_at || a.createdAt);
  const createdB = parsePaymentDateToTimestamp(b.created_at || b.createdAt);
  if (createdA !== createdB) return createdB - createdA;

  // 3. Period score DESC (e.g. Décembre 2026 before Novembre 2026 before Octobre 2026)
  const scoreA = parsePeriodScore(a.period || a.period_month || a.periodMonth);
  const scoreB = parsePeriodScore(b.period || b.period_month || b.periodMonth);
  if (scoreA !== scoreB) return scoreB - scoreA;

  // 4. Fallback on code or id
  const codeA = String(a.code || a.id || "");
  const codeB = String(b.code || b.id || "");
  return codeB.localeCompare(codeA);
};

export const sortPaymentsDesc = <T = any>(list: T[]): T[] => {
  if (!Array.isArray(list)) return [];
  return [...list].sort(comparePaymentsDesc);
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


