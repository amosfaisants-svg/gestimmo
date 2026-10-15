/**
 * Utility for automatic tacit renewal (reconduction automatique) of leases.
 * Rule: If today >= lease.end date and lease is NOT resiliated, automatically extend end date by 1 year.
 * Repeat every time end date is reached until resiliated.
 */

export function parseLeaseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // 1. ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Slash format (DD/MM/YYYY)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const parts = trimmed.split("/");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. French text format (ex: "01 oct. 2027", "11 Août 2027", "15 Septembre 2026")
  const monthsMap: { [key: string]: number } = {
    janv: 0, "janv.": 0, janvier: 0,
    févr: 1, "févr.": 1, fevr: 1, "fevr.": 1, février: 1, fevrier: 1,
    mars: 2,
    avr: 3, "avr.": 3, avril: 3,
    mai: 4,
    juin: 5,
    juil: 6, "juil.": 6, juillet: 6,
    août: 7, aout: 7, "août.": 7,
    sept: 8, "sept.": 8, septembre: 8,
    oct: 9, "oct.": 9, octobre: 9,
    nov: 10, "nov.": 10, novembre: 10,
    déc: 11, "déc.": 11, dec: 11, "dec.": 11, décembre: 11, decembre: 11
  };

  const parts = trimmed.toLowerCase().split(/\s+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    const year = parseInt(parts[2], 10);

    let month = -1;
    for (const key in monthsMap) {
      if (monthStr.startsWith(key) || key.startsWith(monthStr)) {
        month = monthsMap[key];
        break;
      }
    }

    if (!isNaN(day) && month !== -1 && !isNaN(year)) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export function formatLeaseDate(date: Date, originalFormat: "iso" | "slash" | "french" = "french"): string {
  const day = String(date.getDate()).padStart(2, "0");
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  if (originalFormat === "iso") {
    const month = String(monthIndex + 1).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (originalFormat === "slash") {
    const month = String(monthIndex + 1).padStart(2, "0");
    return `${day}/${month}/${year}`;
  }

  const fullMonths = [
    "janv.", "févr.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc."
  ];

  return `${day} ${fullMonths[monthIndex]} ${year}`;
}

export function detectDateFormat(dateStr: string): "iso" | "slash" | "french" {
  if (!dateStr) return "french";
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr.trim())) return "iso";
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr.trim())) return "slash";
  return "french";
}

/**
 * Checks all leases and automatically renews active, non-resiliated leases by +1 year if today >= end date.
 * Updates localStorage if any lease was renewed.
 */
export function checkAndAutoRenewLeases(leasesList: any[]): any[] {
  if (!Array.isArray(leasesList) || leasesList.length === 0) return leasesList;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let hasChanges = false;

  const updatedLeases = leasesList.map((lease) => {
    const isResiliated =
      (lease.status || "").toUpperCase() === "RÉSILIÉ" ||
      (lease.status || "").toUpperCase() === "RESILIE" ||
      (lease.status || "").toUpperCase() === "INACTIF" ||
      Boolean(lease.resiliated);

    if (isResiliated) {
      return lease;
    }

    const endStr = lease.end || lease.endDate || lease.dateFin;
    if (!endStr) return lease;

    const endDate = parseLeaseDate(endStr);
    if (!endDate) return lease;

    endDate.setHours(0, 0, 0, 0);

    // If endDate <= today, renew by 1 year
    if (endDate <= today) {
      const formatStyle = detectDateFormat(endStr);
      let newEndDate = new Date(endDate);
      let renewedCount = 0;

      while (newEndDate <= today) {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        renewedCount++;
      }

      const newEndStr = formatLeaseDate(newEndDate, formatStyle);
      hasChanges = true;

      return {
        ...lease,
        end: newEndStr,
        endDate: lease.endDate ? newEndStr : lease.endDate,
        dateFin: lease.dateFin ? newEndStr : lease.dateFin,
        autoRenewed: true,
        renewalCount: (lease.renewalCount || 0) + renewedCount,
        lastRenewalDate: new Date().toISOString(),
      };
    }

    return lease;
  });

  if (hasChanges && typeof window !== "undefined") {
    try {
      localStorage.setItem("gestimmo_baux", JSON.stringify(updatedLeases));
    } catch (e) {
      console.error("Error updating auto-renewed leases:", e);
    }
  }

  return updatedLeases;
}
