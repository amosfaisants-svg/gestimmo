import QRCode from "qrcode";
import { formatUnitDisplay, getPaymentDisplayCode } from "@/lib/utils";

export interface ReceiptQrInput {
  receiptNumber?: string;
  tenantName?: string;
  period?: string;
  unit?: string;
  unitType?: string;
  property?: string;
  amount?: number | string;
  paymentDate?: string;
  paymentObj?: any;
}

const formatAmountFCFA = (amount: number | string | undefined): string => {
  if (amount === undefined || amount === null || amount === "") return "0 F CFA";
  if (typeof amount === "string") {
    const cleaned = Number(amount.replace(/[^0-9.-]+/g, ""));
    if (!isNaN(cleaned) && cleaned > 0) {
      return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(cleaned)} F CFA`;
    }
    return amount.includes("CFA") ? amount : `${amount} F CFA`;
  }
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} F CFA`;
};

export interface ResolvedApartmentInfo {
  characteristics: string;
  property: string;
  fullLabel: string;
}

/**
 * Résout automatiquement les caractéristiques de l'appartement (type, référence, bien/immeuble)
 * à partir des données fournies et du cache local (gestimmo_logements / gestimmo_baux).
 */
export function resolveApartmentCharacteristics(input: ReceiptQrInput): ResolvedApartmentInfo {
  const p = input.paymentObj || {};
  const rawUnit = input.unit || p.unit || p.unitId || p.unit_id || "";
  let unitType = input.unitType || p.unitType || p.typeLogement || "";
  let propertyName = input.property || p.property || p.bien || "";
  let extraDetails = "";

  if (typeof window !== "undefined") {
    try {
      const storedLogements = localStorage.getItem("gestimmo_logements");
      if (storedLogements) {
        const logements: any[] = JSON.parse(storedLogements);
        const normUnit = String(rawUnit).trim().toLowerCase();
        const foundUnit = logements.find(
          (l: any) =>
            (l.id && String(l.id).trim().toLowerCase() === normUnit) ||
            (l.unit && String(l.unit).trim().toLowerCase() === normUnit) ||
            (l.name && String(l.name).trim().toLowerCase() === normUnit) ||
            (l.unit_number && String(l.unit_number).trim().toLowerCase() === normUnit)
        );
        if (foundUnit) {
          if (!unitType && foundUnit.type) unitType = foundUnit.type;
          if (!propertyName && (foundUnit.property || foundUnit.bien)) {
            propertyName = foundUnit.property || foundUnit.bien;
          }
          const parts: string[] = [];
          if (foundUnit.rooms || foundUnit.pieces) parts.push(`${foundUnit.rooms || foundUnit.pieces} pièce(s)`);
          if (foundUnit.surface) parts.push(`${foundUnit.surface} m²`);
          if (foundUnit.floor || foundUnit.etage) parts.push(`Étage ${foundUnit.floor || foundUnit.etage}`);
          if (parts.length > 0) extraDetails = parts.join(", ");
        }
      }

      if (!propertyName) {
        const storedBaux = localStorage.getItem("gestimmo_baux");
        if (storedBaux) {
          const baux: any[] = JSON.parse(storedBaux);
          const normTenant = String(input.tenantName || p.tenant || "").trim().toLowerCase();
          const normUnit = String(rawUnit).trim().toLowerCase();
          const foundLease = baux.find(
            (b: any) =>
              (normUnit && b.unit && String(b.unit).trim().toLowerCase() === normUnit) ||
              (normTenant && b.tenant && String(b.tenant).trim().toLowerCase() === normTenant)
          );
          if (foundLease) {
            if (!propertyName && foundLease.property) propertyName = foundLease.property;
            if (!unitType && foundLease.unitType) unitType = foundLease.unitType;
          }
        }
      }
    } catch {
      // Ignore storage parsing errors
    }
  }

  const formattedUnit = rawUnit ? formatUnitDisplay(rawUnit, 1, unitType || "Appartement") : "Logement";
  const unitLower = formattedUnit.toLowerCase();
  const typeLower = (unitType || "").trim().toLowerCase();

  let unitDesc = formattedUnit;
  if (unitType && !unitLower.includes(typeLower)) {
    unitDesc = `${formattedUnit} (${unitType})`;
  } else if (
    !unitLower.startsWith("studio") &&
    !unitLower.startsWith("appartement") &&
    !unitLower.startsWith("villa") &&
    !unitLower.startsWith("magasin") &&
    !unitLower.startsWith("duplex") &&
    !unitLower.startsWith("logement")
  ) {
    unitDesc = `Appartement ${formattedUnit}`;
  }

  if (extraDetails) {
    unitDesc += ` [${extraDetails}]`;
  }

  const cleanProp = propertyName && propertyName !== "-" && propertyName !== "Inconnu" ? propertyName : "";
  const fullLabel = cleanProp ? `${unitDesc} - ${cleanProp}` : unitDesc;

  return {
    characteristics: unitDesc,
    property: cleanProp,
    fullLabel,
  };
}

/**
 * Construit le texte lisible affiché lorsqu'on scanne le QR code d'une quittance.
 */
export function buildReceiptQrPayload(input: ReceiptQrInput): string {
  const p = input.paymentObj || {};
  const receiptNo =
    input.receiptNumber ||
    p.receiptNumber ||
    p.receipt_number ||
    (p.id || p.code ? getPaymentDisplayCode(p) : "REC-OFFICIEL");
  const tenant = (input.tenantName || p.tenant || p.locataire || "Locataire").toString().trim();
  const period = (input.period || p.period || p.periode || p.period_month || "-").toString().trim();
  const aptInfo = resolveApartmentCharacteristics(input);
  const amountStr = formatAmountFCFA(input.amount !== undefined ? input.amount : (p.amount ?? p.montant ?? 0));
  const dateStr = (input.paymentDate || p.date || p.payment_date || new Date().toLocaleDateString("fr-FR"))
    .toString()
    .trim();

  return [
    "QUITTANCE DE LOYER CERTIFIEE",
    `N° Quittance : ${receiptNo}`,
    `Locataire : ${tenant}`,
    `Periode : ${period}`,
    `Appartement : ${aptInfo.fullLabel}`,
    `Montant paye : ${amountStr}`,
    `Date de paiement : ${dateStr}`,
  ].join("\n");
}

/**
 * Génère de manière 100% synchrone une image Data URL (PNG sur navigateur, SVG en fallback)
 * représentant le QR code de la quittance, compatible avec html2pdf.js et window.print().
 */
export function generateReceiptQrDataUrl(input: ReceiptQrInput, pixelSize: number = 140): string {
  const text = buildReceiptQrPayload(input);
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
    const modules = qr.modules;
    const moduleCount = modules.size;
    const margin = 2;
    const totalModules = moduleCount + margin * 2;

    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      const scale = Math.max(3, Math.floor(pixelSize / totalModules));
      const canvasSize = totalModules * scale;
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        ctx.fillStyle = "#0F172A";
        for (let r = 0; r < moduleCount; r++) {
          for (let c = 0; c < moduleCount; c++) {
            if (modules.get(r, c)) {
              ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
            }
          }
        }
        return canvas.toDataURL("image/png");
      }
    }

    // Fallback SVG Data URL
    let path = "";
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (modules.get(r, c)) {
          path += `M${c + margin},${r + margin}h1v1h-1z`;
        }
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#FFFFFF"/><path d="${path}" fill="#0F172A"/></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch (err) {
    console.error("Erreur génération QR code:", err);
    return "";
  }
}
