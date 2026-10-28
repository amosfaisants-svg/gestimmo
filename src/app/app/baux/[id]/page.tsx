"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, FileText, Calendar, Download, Printer, UserMinus, ShieldCheck, X, MapPin, IdCard, PenLine, CheckCircle2, Save, Trash2, Upload, Eye, FileCheck } from "lucide-react";
import Link from "next/link";
import { getPdfTemplate, getGenericTemplate, getOrGenerateContratTemplate } from "@/lib/storage";
import PdfContractEditor from "@/components/ui/PdfContractEditor";
import { checkAndAutoRenewLeases } from "@/lib/leaseRenewal";
import { formatUnitDisplay, getLeaseDisplayCode, isUnitOccupied } from "@/lib/utils";
import { updateLease } from "@/lib/dataService";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const parseToInputDate = (dateStr?: string | null): string => {
  if (!dateStr || typeof dateStr !== 'string') return "";
  const str = dateStr.trim();
  if (!str) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str.split("T")[0];

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split("/");
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }

  const months: { [key: string]: string } = {
    'janv': '01', 'janvier': '01', 'jan': '01',
    'févr': '02', 'février': '02', 'fevr': '02', 'fevrier': '02', 'feb': '02',
    'mars': '03', 'mar': '03',
    'avr': '04', 'avril': '04', 'apr': '04',
    'mai': '05', 'may': '05',
    'juin': '06', 'jun': '06',
    'juil': '07', 'juillet': '07', 'jul': '07',
    'août': '08', 'aout': '08', 'aug': '08',
    'sept': '09', 'septembre': '09', 'sep': '09',
    'oct': '10', 'octobre': '10',
    'nov': '11', 'novembre': '11',
    'déc': '12', 'décembre': '12', 'dec': '12', 'decembre': '12'
  };

  const cleanParts = str.toLowerCase().replace(/\./g, '').split(/[\s,]+/);
  if (cleanParts.length >= 3) {
    const day = parseInt(cleanParts[0], 10);
    const mKey = cleanParts[1];
    const year = parseInt(cleanParts[2], 10);
    if (!isNaN(day) && months[mKey] && !isNaN(year)) {
      const dStr = day.toString().padStart(2, "0");
      return `${year}-${months[mKey]}-${dStr}`;
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return "";
};

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const getAdvanceMonthLabels = (startStr: string | undefined | null, count: number): string => {
  if (!count || count <= 0 || !startStr) return "";

  let startYear: number | null = null;
  let startMonth: number | null = null;

  const s = startStr.trim();

  if (/^\d{4}-\d{2}/.test(s)) {
    const parts = s.split("-");
    startYear = parseInt(parts[0], 10);
    startMonth = parseInt(parts[1], 10);
  } else {
    const monthsMap: { [key: string]: number } = {
      janv: 1, 'janv.': 1, janvier: 1,
      févr: 2, 'févr.': 2, février: 2, fevrier: 2,
      mars: 3,
      avr: 4, 'avr.': 4, avril: 4,
      mai: 5,
      juin: 6,
      juil: 7, 'juil.': 7, juillet: 7,
      août: 8, aout: 8,
      sept: 9, 'sept.': 9, septembre: 9,
      oct: 10, 'oct.': 10, octobre: 10,
      nov: 11, 'nov.': 11, novembre: 11,
      déc: 12, 'déc.': 12, décembre: 12, decembre: 12
    };

    const parts = s.toLowerCase().split(/[\s,/\.-]+/);
    for (const p of parts) {
      if (monthsMap[p] !== undefined && startMonth === null) {
        startMonth = monthsMap[p];
      } else if (/^\d{4}$/.test(p) && startYear === null) {
        startYear = parseInt(p, 10);
      }
    }

    if (startYear === null || startMonth === null) {
      const inputStr = parseToInputDate(s);
      const d = inputStr ? new Date(inputStr + "T12:00:00") : new Date(s);
      if (d && !isNaN(d.getTime())) {
        startYear = d.getFullYear();
        startMonth = d.getMonth() + 1;
      }
    }
  }

  if (!startYear || !startMonth || startMonth < 1 || startMonth > 12) {
    return "";
  }

  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    const totalMonths = (startYear * 12) + (startMonth - 1) + i;
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    labels.push(`${MONTH_NAMES_FR[m]} ${y}`);
  }

  return labels.join(", ");
};

const defaultLeases = [
  { id: "B-2026-084", tenant: "Cora Richards", tenantId: "T-892", property: "Résidence Les Flamboyants", propertyId: "B-001", unit: "A-101", start: "12 Août 2026", end: "11 Août 2027", rent: 150000, charges: 15000, avanceMonths: 2, cautionMonths: 2, deposit: 660000, status: "ACTIF", signedAt: "10 Août 2026" },
  { id: "B-2026-085", tenant: "Alistair Dunlap", tenantId: "T-893", property: "Résidence Les Flamboyants", propertyId: "B-001", unit: "B-204", start: "01 Sept 2026", end: "31 Août 2027", rent: 200000, charges: 20000, avanceMonths: 2, cautionMonths: 2, deposit: 880000, status: "ACTIF", signedAt: "28 Août 2026" }
];

export default function LeaseDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lease, setLease] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [allBiens, setAllBiens] = useState<any[]>([]);
  const [allUnits, setAllUnits] = useState<any[]>([]);

  const [editCode, setEditCode] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIF");
  const [editTenantId, setEditTenantId] = useState("");
  const [editTenantName, setEditTenantName] = useState("");
  const [editProperty, setEditProperty] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editRent, setEditRent] = useState("");
  const [editCharges, setEditCharges] = useState("");
  const [editAvanceMonths, setEditAvanceMonths] = useState("0");
  const [editCautionMonths, setEditCautionMonths] = useState("0");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editSignedAt, setEditSignedAt] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [tenantInfo, setTenantInfo] = useState<any>({ name: "", phone: "", email: "", cni: "" });
  const [ownerInfo, setOwnerInfo] = useState<string>("Non défini");
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const handleDeleteLease = () => {
    const stored = localStorage.getItem("gestimmo_baux");
    if (stored) {
      const all = JSON.parse(stored);
      const updated = all.filter((l: any) => l.id !== params.id);
      localStorage.setItem("gestimmo_baux", JSON.stringify(updated));
    }
    router.push("/app/baux");
  };

  // Contract editor modal states
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractPdfBase64, setContractPdfBase64] = useState<string | null>(null);
  const [contractSavedDate, setContractSavedDate] = useState<string | null>(null);
  const [initialContractPage, setInitialContractPage] = useState<number>(1);
  const [contractFields, setContractFields] = useState({
    locataire: "",
    proprietaire: "",
    logement: "",
    bien: "",
    dateDebut: "",
    dateFin: "",
    loyer: "",
    charges: "",
    caution: "",
    avance: "",
    noteLibre: ""
  });
  const [signatureCode, setSignatureCode] = useState<string>("");
  const [contractSaved, setContractSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("gestimmo_baux");
    const all = stored ? JSON.parse(stored) : defaultLeases;
    const renewedAll = checkAndAutoRenewLeases(all);
    let found = renewedAll.find((l: any) => l.id === params.id || (l.code && l.code === params.id));

    if (found) {
      const monthly = (Number(found.rent) || 0) + (Number(found.charges) || 0);
      let avanceM = found.avanceMonths !== undefined && found.avanceMonths !== null 
        ? Number(found.avanceMonths) 
        : (found.avance_months !== undefined && found.avance_months !== null ? Number(found.avance_months) : 0);
      let cautionM = found.cautionMonths !== undefined && found.cautionMonths !== null 
        ? Number(found.cautionMonths) 
        : (found.caution_months !== undefined && found.caution_months !== null ? Number(found.caution_months) : 0);
      let needsFix = false;

      // Si les mois étaient absents/0 mais qu'un montant de dépôt avait été saisi (ex: 400 000 F CFA)
      if (avanceM === 0 && cautionM === 0 && found.deposit && monthly > 0) {
        const totalM = Math.round(found.deposit / monthly);
        if (totalM >= 2) {
          avanceM = Math.floor(totalM / 2);
          cautionM = totalM - avanceM;
        } else {
          cautionM = totalM;
        }
        needsFix = true;
      }

      const totalDep = found.deposit && found.deposit > 0 ? found.deposit : ((avanceM + cautionM) * (monthly > 0 ? monthly : 1));

      const fixedLease = {
        ...found,
        avanceMonths: avanceM,
        cautionMonths: cautionM,
        deposit: totalDep,
      };

      if (needsFix) {
        try {
          const updatedAll = all.map((l: any) => (l.id === fixedLease.id || l.code === fixedLease.code) ? fixedLease : l);
          localStorage.setItem("gestimmo_baux", JSON.stringify(updatedAll));
        } catch (e) {}
      }
      setLease(fixedLease);
    } else {
      setLease(null);
    }

    const storedTenants = localStorage.getItem("gestimmo_locataires");
    if (storedTenants) {
      try {
        const tenants = JSON.parse(storedTenants);
        setAllTenants(tenants);
        if (found) {
          const t = tenants.find((x: any) => x.id === found.tenantId);
          if (t) setTenantInfo(t);
          else setTenantInfo({ name: found.tenant, phone: "Non renseigné", email: "", cni: "" });
        }
      } catch (e) {}
    } else if (found) {
      setTenantInfo({ name: found.tenant, phone: "Non renseigné", email: "", cni: "" });
    }

    const storedBiens = localStorage.getItem("gestimmo_biens");
    if (storedBiens) {
      try {
        const biens = JSON.parse(storedBiens);
        setAllBiens(biens);
        if (found) {
          const b = biens.find((x: any) => x.name === found.property);
          if (b) setOwnerInfo(b.owner);
        }
      } catch (e) {}
    }

    const storedUnits = localStorage.getItem("gestimmo_logements");
    if (storedUnits) {
      try {
        const units = JSON.parse(storedUnits);
        setAllUnits(units);
      } catch (e) {}
    }

    const storedDocs = localStorage.getItem(`gestimmo_docs_${params.id}`);
    if (storedDocs) {
      setDocuments(JSON.parse(storedDocs));
    }

    // Load saved contract date if exists
    const savedDocs = localStorage.getItem(`gestimmo_docs_${params.id}`);
    if (savedDocs) {
      const docs = JSON.parse(savedDocs);
      const contractDoc = docs.find((d: any) => d.name === "Contrat_Bail_Signé.pdf");
      if (contractDoc) setContractSavedDate(contractDoc.date);
    }
  }, [params.id]);

  const formatFrenchDate = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  const openContractModal = async (initialPageNum: number | React.SyntheticEvent = 1) => {
    const pageToOpen = typeof initialPageNum === "number" ? initialPageNum : 1;
    const contractDoc = documents.find((d: any) => d.isContract || (d.name && d.name.toLowerCase().includes("contrat")));
    let base64 = contractDoc?.base64;
    if (!base64 && ownerInfo) {
      try {
        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        if (storedOwners) {
          const owners = JSON.parse(storedOwners);
          const o = owners.find((x: any) => 
            (x.name && x.name.trim().toLowerCase() === ownerInfo.trim().toLowerCase()) ||
            (x.full_name && x.full_name.trim().toLowerCase() === ownerInfo.trim().toLowerCase()) ||
            (x.id && x.id === ownerInfo)
          );
          if (o?.templates?.contratFileKey) {
            base64 = await getGenericTemplate(o.templates.contratFileKey);
          }
        }
      } catch (e) {}
    }
    if (!base64) {
      base64 = await getOrGenerateContratTemplate(ownerInfo);
    }
    setContractPdfBase64(base64);
    setInitialContractPage(pageToOpen);
    // Pre-fill fields
    setContractFields({
      locataire: lease.tenant || "",
      proprietaire: ownerInfo || "",
      logement: lease.unit || "",
      bien: lease.property || "",
      dateDebut: lease.start || "",
      dateFin: lease.end || "",
      loyer: lease.rent ? formatFCFA(lease.rent) : "",
      charges: lease.charges ? formatFCFA(lease.charges) : "0 F CFA",
      caution: formatFCFA((Number(lease.cautionMonths || 0)) * ((lease.rent || 0) + (lease.charges || 0))),
      avance: `${Number(lease.avanceMonths || 0)} mois (${formatFCFA((Number(lease.avanceMonths || 0)) * ((lease.rent || 0) + (lease.charges || 0)))})`,
      noteLibre: ""
    });
    // Generate electronic signature code
    const code = `SIG-${lease.id}-${Date.now().toString(36).toUpperCase()}`;
    setSignatureCode(code);
    setContractSaved(false);
    setIsContractModalOpen(true);
  };

  const handleSaveContract = () => {
    const today = formatFrenchDate(new Date());
    const newDoc = {
      id: `contract-${Date.now()}`,
      name: "Contrat_Bail_Signé.pdf",
      date: today,
      isContract: true,
      signatureCode,
      fields: contractFields
    };

    const storedDocs = localStorage.getItem(`gestimmo_docs_${lease.id}`);
    const existingDocs: any[] = storedDocs ? JSON.parse(storedDocs) : [];
    // Remove old contract if exists
    const filteredDocs = existingDocs.filter((d: any) => d.name !== "Contrat_Bail_Signé.pdf");
    const updatedDocs = [newDoc, ...filteredDocs];
    localStorage.setItem(`gestimmo_docs_${lease.id}`, JSON.stringify(updatedDocs));
    setDocuments(filteredDocs); // trigger re-render for uploaded docs
    setContractSavedDate(today);
    setContractSaved(true);
    setTimeout(() => setIsContractModalOpen(false), 1200);
  };

  const handlePrintContract = () => {
    const printWin = window.open('', '', 'width=900,height=700');
    if (!printWin) return;
    const fields = contractFields;
    printWin.document.write(`
      <html><head><title>Contrat de Bail - ${getLeaseDisplayCode(lease)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { text-align: center; color: #1a1a2e; } 
        .field { margin: 12px 0; } label { font-weight: bold; display: block; font-size: 12px; color: #555; }
        .val { border-bottom: 1px solid #333; padding: 4px 0; min-height: 24px; font-size: 14px; }
        .sig { margin-top: 40px; padding: 16px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9; }
        .sig-code { font-family: monospace; color: #2563eb; font-weight: bold; font-size: 13px; }
        .sig-label { font-size: 11px; color: #777; margin-bottom: 6px; }
        @media print { body { padding: 20px; } }
      </style></head>
      <body>
        <h1 style="font-size: 19px; line-height: 1.35; margin: 0 0 10px 0;">CONTRAT DE BAIL À USAGE D'HABITATION : ENGAGEMENT DE RÈGLEMENT DU LOYER AVANT LE 10 DE CHAQUE MOIS EN COURS</h1>
        <p style="text-align:center;color:#666;font-size:12px;">Réf: ${getLeaseDisplayCode(lease)} &nbsp;|&nbsp; Généré le ${formatFrenchDate(new Date())}</p>
        <hr style="margin:20px 0">
        <div class="field"><label>LOCATAIRE</label><div class="val">${fields.locataire}</div></div>
        <div class="field"><label>PROPRIÉTAIRE</label><div class="val">${fields.proprietaire}</div></div>
        <div class="field"><label>BIEN IMMOBILIER</label><div class="val">${fields.bien}</div></div>
        <div class="field"><label>APPARTEMENT</label><div class="val">${fields.logement}</div></div>
        <div class="field"><label>DATE DE DÉBUT</label><div class="val">${fields.dateDebut}</div></div>
        <div class="field"><label>DATE DE FIN</label><div class="val">${fields.dateFin}</div></div>
        <div class="field"><label>LOYER MENSUEL</label><div class="val">${fields.loyer}</div></div>
        <div class="field"><label>CHARGES</label><div class="val">${fields.charges}</div></div>
        <div class="field"><label>DÉPÔT DE GARANTIE</label><div class="val">${fields.caution}</div></div>
        <div class="field"><label>AVANCE</label><div class="val">${fields.avance}</div></div>
        ${fields.noteLibre ? `<div class="field"><label>NOTES / CLAUSES SUPPLÉMENTAIRES</label><div class="val">${fields.noteLibre}</div></div>` : ''}
        <div class="sig">
          <div class="sig-label">✅ SIGNATURE ÉLECTRONIQUE</div>
          <div class="sig-code">${signatureCode}</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Validé le ${formatFrenchDate(new Date())} — GESTIMMO</div>
        </div>
      </body></html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 400);
  };

  if (!lease) return <div className="p-8 text-center text-gray-500">Bail introuvable ou en cours de chargement...</div>;

  const openEditModal = () => {
    setEditCode(getLeaseDisplayCode(lease));
    setEditStatus(lease.status || "ACTIF");

    // Match Locataire actif dans la liste des locataires
    let initialTenantId = lease.tenantId || "";
    let initialTenantName = lease.tenant || "";
    if (allTenants.length > 0) {
      const foundTenant = allTenants.find((t: any) =>
        (t.id && initialTenantId && t.id === initialTenantId) ||
        (t.name && initialTenantName && t.name.trim().toLowerCase() === initialTenantName.trim().toLowerCase()) ||
        (t.full_name && initialTenantName && t.full_name.trim().toLowerCase() === initialTenantName.trim().toLowerCase())
      );
      if (foundTenant) {
        initialTenantId = foundTenant.id;
        initialTenantName = foundTenant.name || foundTenant.full_name || initialTenantName;
      }
    }
    setEditTenantId(initialTenantId);
    setEditTenantName(initialTenantName);

    // Match Bien / Immeuble
    let initialProperty = lease.property || "";
    if (allBiens.length > 0) {
      const foundBien = allBiens.find((b: any) =>
        (b.name && initialProperty && b.name.trim().toLowerCase() === initialProperty.trim().toLowerCase()) ||
        (b.id && initialProperty && b.id.trim().toLowerCase() === initialProperty.trim().toLowerCase())
      );
      if (foundBien) {
        initialProperty = foundBien.name || initialProperty;
      }
    }
    setEditProperty(initialProperty);

    // Match Logement / Unité (retrouve l'identifiant exact de l'unité ou la nomenclature)
    let initialUnit = lease.unit || "";
    if (allUnits.length > 0) {
      const targetUnitUpper = initialUnit.toString().trim().toUpperCase();
      const foundUnit = allUnits.find((u: any) => {
        const uId = (u.id || "").toString().trim().toUpperCase();
        const uNum = (u.unit_number || u.unit || u.name || "").toString().trim().toUpperCase();
        return uId === targetUnitUpper || uNum === targetUnitUpper;
      });
      if (foundUnit) {
        const humanName = foundUnit.unit_number || foundUnit.name || foundUnit.unit;
        initialUnit = humanName || foundUnit.id || initialUnit;
      }
    }
    setEditUnit(initialUnit);

    setEditRent(lease.rent !== undefined ? lease.rent.toString() : "0");
    setEditCharges(lease.charges !== undefined ? lease.charges.toString() : "0");
    setEditAvanceMonths(lease.avanceMonths !== undefined && lease.avanceMonths !== null ? lease.avanceMonths.toString() : "0");
    setEditCautionMonths(lease.cautionMonths !== undefined && lease.cautionMonths !== null ? lease.cautionMonths.toString() : "0");

    const startDate = parseToInputDate(lease.start);
    setEditStart(startDate);

    const endDate = parseToInputDate(lease.end);
    setEditEnd(endDate);

    const signedDate = parseToInputDate(lease.signedAt);
    setEditSignedAt(signedDate);

    setEditNotes(lease.notes || lease.clauses || "");

    setIsEditModalOpen(true);
  };

  const handleUpdateLease = async () => {
    const parsedRent = parseInt(editRent) || 0;
    const parsedCharges = parseInt(editCharges) || 0;
    const avance = parseInt(editAvanceMonths) || 0;
    const caution = parseInt(editCautionMonths) || 0;
    const totalMonthly = parsedRent + parsedCharges;

    let selectedTenantName = editTenantName;
    if (editTenantId && allTenants.length > 0) {
      const foundTenant = allTenants.find((t: any) => t.id === editTenantId);
      if (foundTenant) {
        selectedTenantName = foundTenant.name || foundTenant.full_name || editTenantName;
      }
    }
    if (!selectedTenantName) selectedTenantName = lease.tenant || "Locataire";

    const formattedStart = editStart
      ? (new Date(editStart + "T12:00:00").toString() !== "Invalid Date"
          ? new Date(editStart + "T12:00:00").toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
          : editStart)
      : lease.start;

    const formattedEnd = editEnd
      ? (new Date(editEnd + "T12:00:00").toString() !== "Invalid Date"
          ? new Date(editEnd + "T12:00:00").toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
          : editEnd)
      : lease.end;

    const formattedSignedAt = editSignedAt
      ? (new Date(editSignedAt + "T12:00:00").toString() !== "Invalid Date"
          ? new Date(editSignedAt + "T12:00:00").toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
          : editSignedAt)
      : lease.signedAt;

    const updatedLease = {
      ...lease,
      code: editCode || lease.code || lease.id,
      tenant: selectedTenantName,
      tenantId: editTenantId || lease.tenantId,
      property: editProperty || lease.property,
      unit: editUnit || lease.unit,
      status: editStatus || lease.status,
      rent: parsedRent,
      charges: parsedCharges,
      avanceMonths: avance,
      cautionMonths: caution,
      deposit: (avance + caution) * totalMonthly,
      start: formattedStart,
      end: formattedEnd,
      signedAt: formattedSignedAt,
      notes: editNotes,
    };

    setLease(updatedLease);

    setTenantInfo((prev: any) => ({
      ...prev,
      name: selectedTenantName,
    }));

    // 1. Update gestimmo_baux
    const stored = localStorage.getItem("gestimmo_baux");
    if (stored) {
      try {
        const all = JSON.parse(stored);
        const updatedAll = all.map((l: any) => (l.id === lease.id || l.code === lease.code) ? updatedLease : l);
        localStorage.setItem("gestimmo_baux", JSON.stringify(updatedAll));
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Update gestimmo_locataires for the tenant of this lease
    const storedTenants = localStorage.getItem("gestimmo_locataires");
    if (storedTenants) {
      try {
        const tenants = JSON.parse(storedTenants);
        const updatedTenants = tenants.map((t: any) => {
          if ((t.id && updatedLease.tenantId && t.id === updatedLease.tenantId) || 
              (t.name && updatedLease.tenant && t.name.trim().toLowerCase() === updatedLease.tenant.trim().toLowerCase())) {
            return { ...t, name: selectedTenantName, rent: totalMonthly, unit: updatedLease.unit, property: updatedLease.property };
          }
          return t;
        });
        localStorage.setItem("gestimmo_locataires", JSON.stringify(updatedTenants));
      } catch (e) {
        console.error(e);
      }
    }

    // 3. Update gestimmo_logements for the unit of this lease
    const storedLogements = localStorage.getItem("gestimmo_logements");
    if (storedLogements) {
      try {
        const logements = JSON.parse(storedLogements);
        const updatedLogements = logements.map((u: any) => {
          if ((u.id && updatedLease.unit && u.id.trim().toLowerCase() === updatedLease.unit.trim().toLowerCase()) ||
              (u.unit_number && updatedLease.unit && u.unit_number.trim().toLowerCase() === updatedLease.unit.trim().toLowerCase()) ||
              (u.unit && updatedLease.unit && u.unit.trim().toLowerCase() === updatedLease.unit.trim().toLowerCase())) {
            return { ...u, rent: parsedRent, charges: parsedCharges, tenant: selectedTenantName, status: updatedLease.status === "ACTIF" ? "OCCUPÉ" : u.status };
          }
          return u;
        });
        localStorage.setItem("gestimmo_logements", JSON.stringify(updatedLogements));
      } catch (e) {
        console.error(e);
      }
    }

    // 4. Update gestimmo_paiements
    const storedPaiements = localStorage.getItem("gestimmo_paiements");
    if (storedPaiements) {
      try {
        const paiements = JSON.parse(storedPaiements);
        const updatedPaiements = paiements.map((p: any) => {
          const isMatchLease = p.leaseId === lease.id || 
            (p.unit && lease.unit && p.unit.trim().toLowerCase() === lease.unit.trim().toLowerCase()) ||
            (p.tenant && lease.tenant && p.tenant.trim().toLowerCase() === lease.tenant.trim().toLowerCase());
          
          if (isMatchLease) {
            return {
              ...p,
              tenant: selectedTenantName,
              unit: updatedLease.unit,
              property: updatedLease.property,
              amount: totalMonthly
            };
          }
          return p;
        });
        localStorage.setItem("gestimmo_paiements", JSON.stringify(updatedPaiements));
      } catch (e) {
        console.error(e);
      }
    }

    // 5. Update Supabase DB if available
    try {
      await updateLease(lease.id, {
        rent_amount: parsedRent,
        charges_amount: parsedCharges,
        deposit_amount: (avance + caution) * totalMonthly,
        avance_months: avance,
        caution_months: caution,
        status: updatedLease.status,
      });
    } catch (e) {
      console.error("Supabase updateLease error:", e);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("gestimmo_baux_updated"));
      window.dispatchEvent(new Event("gestimmo_paiements_updated"));
      window.dispatchEvent(new Event("gestimmo_logements_updated"));
      window.dispatchEvent(new Event("gestimmo_locataires_updated"));
    }

    setIsEditModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newDoc = {
          id: Date.now(),
          name: file.name,
          date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
          base64
        };
        const updatedDocs = [...documents, newDoc];
        setDocuments(updatedDocs);
        try {
          localStorage.setItem(`gestimmo_docs_${lease.id}`, JSON.stringify(updatedDocs));
        } catch {
          // Fallback sans base64 si trop volumineux
          const docWithoutFile = { ...newDoc, base64: "" };
          const fallbackDocs = [...documents, docWithoutFile];
          setDocuments(fallbackDocs);
          localStorage.setItem(`gestimmo_docs_${lease.id}`, JSON.stringify(fallbackDocs));
          alert("Document ajouté (fichier trop volumineux pour être stocké en local).");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteDoc = (docId: any) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
      const updatedDocs = documents.filter((d: any) => d.id !== docId);
      setDocuments(updatedDocs);
      try {
        localStorage.setItem(`gestimmo_docs_${lease.id}`, JSON.stringify(updatedDocs));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleImportContract = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && lease) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
        const contractDoc = {
          id: `contract-${Date.now()}`,
          name: file.name,
          date: today,
          isContract: true,
          isImported: true,
          base64
        };

        const existingDocs = documents.filter((d: any) => !d.isContract && d.name !== "Contrat_Bail_Signé.pdf");
        const updatedDocs = [contractDoc, ...existingDocs];

        setDocuments(updatedDocs);
        setContractSavedDate(today);

        try {
          localStorage.setItem(`gestimmo_docs_${lease.id}`, JSON.stringify(updatedDocs));
        } catch {
          const docWithoutFile = { ...contractDoc, base64: "" };
          const fallbackDocs = [docWithoutFile, ...existingDocs];
          setDocuments(fallbackDocs);
          localStorage.setItem(`gestimmo_docs_${lease.id}`, JSON.stringify(fallbackDocs));
          alert("Contrat importé avec succès.");
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleResilier = () => {
    if (window.confirm("Êtes-vous sûr de vouloir résilier ce bail ? L'historique sera conservé.")) {
      const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
      const updatedLease = {
        ...lease,
        status: "RÉSILIÉ",
        terminatedAt: today,
        originalEnd: lease.originalEnd || lease.end
      };
      setLease(updatedLease);

      const stored = localStorage.getItem("gestimmo_baux");
      if (stored) {
        const all = JSON.parse(stored);
        const updatedAll = all.map((l: any) => l.id === lease.id ? updatedLease : l);
        localStorage.setItem("gestimmo_baux", JSON.stringify(updatedAll));
      }
    }
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/app/baux">
            <button className="p-2 bg-white border border-app-border rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">Bail {getLeaseDisplayCode(lease)}</h1>
              <Badge dot variant={lease.status === "ACTIF" ? "success" : "default"}>
                {lease.status}
              </Badge>
            </div>
            <div className="flex items-center text-sm text-gray-500 gap-4 mt-2">
              <span className="flex items-center">
                Locataire: <Link href={`/app/locataires/${lease.tenantId}`} className="ml-1 font-medium hover:text-primary hover:underline">{lease.tenant}</Link>
              </span>
              <span className="flex items-center">
                Appartement: <Link href={`/app/logements/${lease.unit}`} className="ml-1 font-medium hover:text-primary hover:underline">{formatUnitDisplay(lease.unit)}</Link>
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm cursor-pointer">
            <Upload className="h-4 w-4 mr-2" /> Importer le contrat
            <input type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={handleImportContract} />
          </label>
          <button 
            onClick={openEditModal}
            className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
          >
            Modifier
          </button>
          <button 
            onClick={() => setIsReceiptModalOpen(true)}
            className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
          >
            <Printer className="h-4 w-4 mr-2" /> Reçu
          </button>
          <button onClick={openContractModal} className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm">
            <Download className="h-4 w-4 mr-2" /> PDF
          </button>
          {lease.status === "ACTIF" && (
            <button onClick={handleResilier} className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center">
              <UserMinus className="h-4 w-4 mr-2" /> Résilier
            </button>
          )}
          <button 
            onClick={() => setIsDeleteModalOpen(true)} 
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center shadow-sm"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShieldCheck className="w-5 h-5 text-green-500 mr-2" />
              Conditions financières
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-app-border">
                <p className="text-xs text-gray-500 mb-1">Loyer de base</p>
                <p className="text-xl font-bold text-gray-900">{formatFCFA(lease.rent)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-app-border">
                <p className="text-xs text-gray-500 mb-1">Charges</p>
                <p className="text-xl font-bold text-gray-900">{formatFCFA(lease.charges)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-app-border border-l-4 border-l-primary">
                <p className="text-xs text-gray-500 mb-1">Total Mensuel</p>
                <p className="text-xl font-bold text-primary">{formatFCFA(lease.rent + lease.charges)}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-app-border flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Dépôt de garantie versé</p>
                <p className="text-xs text-gray-500 mt-1">
                  Encaissé le {lease.signedAt || lease.start} 
                  {(lease.avanceMonths !== undefined || lease.cautionMonths !== undefined) && (
                    <span className="block mt-0.5">
                      ({lease.avanceMonths || 0} mois d'avance{getAdvanceMonthLabels(lease.start, lease.avanceMonths) ? ` - ${getAdvanceMonthLabels(lease.start, lease.avanceMonths)}` : ""}, {lease.cautionMonths || 0} mois de caution)
                    </span>
                  )}
                </p>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatFCFA(lease.deposit)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Période de location</h2>
              {lease.status !== 'RÉSILIÉ' && (
                <Badge variant="info" className="text-xs font-normal w-fit">
                  Tacite reconduction automatique (1 an)
                </Badge>
              )}
            </div>
            <div className={`flex flex-col ${lease.status === 'RÉSILIÉ' ? 'xl:flex-row' : 'md:flex-row'} md:items-center gap-6`}>
              <div className="flex-1 border border-app-border rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Calendar className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Début du bail</p>
                  <p className="text-sm font-bold text-gray-900">{lease.start}</p>
                </div>
              </div>
              
              {lease.status === 'RÉSILIÉ' && (
                <>
                  <div className="hidden xl:block w-4 h-[1px] bg-gray-300"></div>
                  <div className="flex-1 border border-red-200 bg-red-50 rounded-xl p-4 flex items-center gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-lg"><UserMinus className="w-5 h-5" /></div>
                    <div>
                      <p className="text-xs text-red-600 font-medium mb-1">Date de résiliation</p>
                      <p className="text-sm font-bold text-red-700">{lease.terminatedAt || lease.end}</p>
                    </div>
                  </div>
                </>
              )}

              <div className={`hidden ${lease.status === 'RÉSILIÉ' ? 'xl:block' : 'md:block'} w-4 h-[1px] bg-gray-300`}></div>
              
              <div className="flex-1 border border-app-border rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Calendar className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fin {lease.status === 'RÉSILIÉ' ? 'prévue' : ''} du bail</p>
                  <p className="text-sm font-bold text-gray-900">{lease.originalEnd || lease.end}</p>
                </div>
              </div>
            </div>

            {lease.status !== 'RÉSILIÉ' && (
              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>
                  En l'absence de résiliation à la date d'échéance, ce bail est <strong>automatiquement reconduit de 1 an</strong> chaque année.
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Documents liés</h2>
              <label className="text-xs font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Importer contrat
                <input type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={handleImportContract} />
              </label>
            </div>
            
            <div className="space-y-3">
              {/* Contrat de bail principal */}
              {(() => {
                const contractDoc = documents.find((d: any) => d.isContract || (d.name && d.name.toLowerCase().includes("contrat")));
                const docName = contractDoc ? contractDoc.name : "Contrat_Bail_Signé.pdf";
                return (
                  <div className="p-3.5 border border-app-border rounded-xl bg-gray-50 hover:border-primary transition-colors flex flex-col gap-2 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate" title={docName}>
                            {docName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {contractDoc ? `${contractDoc.isImported ? 'Importé' : 'Généré'} le ${contractDoc.date}` : (contractSavedDate ? `Généré le ${contractSavedDate}` : (lease.signedAt ? `Bail signé le ${lease.signedAt}` : "Aucun contrat rattaché"))}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Badge variant={contractDoc || contractSavedDate ? "success" : "warning"} dot className="whitespace-nowrap">
                          {contractDoc ? (contractDoc.isImported ? "Importé" : "Signé") : (contractSavedDate ? "Généré" : "À importer")}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200/60 text-xs flex-wrap">
                      {contractDoc && contractDoc.base64 && (
                        <button 
                          onClick={() => setViewingDoc(contractDoc)}
                          className="px-2.5 py-1 text-gray-700 bg-white border border-app-border rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1 font-medium"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-500" /> Aperçu
                        </button>
                      )}
                      <button 
                        onClick={openContractModal}
                        className="px-2.5 py-1 text-primary bg-primary/10 rounded-md hover:bg-primary hover:text-white transition-colors flex items-center gap-1 font-medium"
                      >
                        <PenLine className="w-3.5 h-3.5" /> Éditeur
                      </button>
                      <label className="px-2.5 py-1 text-gray-700 bg-white border border-app-border rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1 font-medium cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-gray-500" /> Remplacer
                        <input
                          type="file"
                          accept=".pdf,application/pdf,image/png,image/jpeg"
                          className="hidden"
                          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                          onChange={handleImportContract}
                        />
                      </label>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between p-3 border border-app-border rounded-xl group cursor-pointer hover:border-primary transition-colors gap-3 overflow-hidden" onClick={() => openContractModal(12)}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-gray-100 text-gray-600 rounded-lg shrink-0"><FileText className="w-4 h-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate" title="Etat_des_lieux_Entree.pdf">Etat_des_lieux_Entree.pdf</p>
                    <p className="text-xs text-gray-500">Ajouté le {lease.start}</p>
                  </div>
                </div>
                <Eye className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
              </div>
              
              {documents.filter((d: any) => !d.isContract && (!d.name || !d.name.toLowerCase().includes("contrat"))).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-app-border rounded-xl group hover:border-primary transition-colors gap-3 overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => setViewingDoc(doc)}>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><FileText className="w-4 h-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate" title={doc.name}>{doc.name}</p>
                      <p className="text-xs text-gray-500">Ajouté le {doc.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setViewingDoc(doc)} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Aperçu">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }} 
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                      title="Supprimer le document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <label className="w-full bg-white border border-dashed border-gray-300 text-gray-600 px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-primary hover:text-primary transition-colors mt-2 flex justify-center cursor-pointer items-center gap-2">
                <Upload className="w-4 h-4" /> Uploader un document
                <input type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

        </div>
      </div>

      {/* Viewing Document Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
            <div className="p-4 px-6 border-b border-app-border flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{viewingDoc.name}</h3>
                  <p className="text-xs text-gray-500">Ajouté le {viewingDoc.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewingDoc.base64 && (
                  <button 
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = viewingDoc.base64;
                      link.download = viewingDoc.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Télécharger
                  </button>
                )}
                <button 
                  onClick={() => setViewingDoc(null)} 
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 p-4 flex items-center justify-center overflow-auto">
              {viewingDoc.base64 ? (
                viewingDoc.base64.startsWith("data:image/") ? (
                  <img src={viewingDoc.base64} alt={viewingDoc.name} className="max-w-full max-h-full object-contain rounded-lg shadow" />
                ) : (
                  <iframe src={viewingDoc.base64} className="w-full h-full rounded-lg border border-gray-300 shadow" title={viewingDoc.name} />
                )
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium text-gray-900">Aperçu du document</p>
                  <p className="text-xs text-gray-500 mt-1">{viewingDoc.name} est rattaché à ce bail.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editeur PDF Contrat (plein écran) */}
      {isContractModalOpen && contractPdfBase64 && (
        <PdfContractEditor
          base64Pdf={contractPdfBase64}
          signatureCode={signatureCode}
          leaseName={`Contrat_Bail_${getLeaseDisplayCode(lease)}`}
          initialPage={initialContractPage}
          onClose={() => setIsContractModalOpen(false)}
          onSave={(_annotations) => handleSaveContract()}
        />
      )}

      {/* Modal Edition Bail complet */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Modifier le bail {getLeaseDisplayCode(lease)}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Modifier les informations administratives, financières et contractuelles</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Section 1: Identification & Statut */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-app-border">
                  <FileText className="w-4 h-4 text-primary" />
                  Identification & Statut du bail
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Code / N° Bail *</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium" 
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      placeholder="ex: B-2026-084"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Statut du bail *</label>
                    <select 
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="ACTIF">ACTIF</option>
                      <option value="EN ATTENTE">EN ATTENTE</option>
                      <option value="EN PRÉAVIS">EN PRÉAVIS</option>
                      <option value="RÉSILIÉ">RÉSILIÉ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date de signature</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editSignedAt}
                      onChange={(e) => setEditSignedAt(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Locataire, Bien & Logement */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-app-border">
                  <IdCard className="w-4 h-4 text-primary" />
                  Parties & Logement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Locataire *</label>
                    {allTenants.length > 0 ? (
                      <select
                        className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        value={editTenantId || ""}
                        onChange={(e) => {
                          const id = e.target.value;
                          setEditTenantId(id);
                          const t = allTenants.find((x: any) => x.id === id);
                          if (t) setEditTenantName(t.name || t.full_name || "");
                        }}
                      >
                        <option value="">Sélectionner un locataire</option>
                        {allTenants.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name || t.full_name || t.id}</option>
                        ))}
                        {editTenantName && !allTenants.some((t: any) => t.id === editTenantId) && (
                          <option value={editTenantId || editTenantName}>{editTenantName}</option>
                        )}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                        value={editTenantName}
                        onChange={(e) => setEditTenantName(e.target.value)}
                        placeholder="Nom du locataire"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bien / Immeuble *</label>
                    {allBiens.length > 0 ? (
                      <select
                        className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        value={editProperty}
                        onChange={(e) => setEditProperty(e.target.value)}
                      >
                        <option value="">Sélectionner un bien</option>
                        {allBiens.map((b: any) => (
                          <option key={b.id || b.name} value={b.name}>{b.name}</option>
                        ))}
                        {editProperty && !allBiens.some((b: any) => b.name === editProperty) && (
                          <option value={editProperty}>{editProperty}</option>
                        )}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                        value={editProperty}
                        onChange={(e) => setEditProperty(e.target.value)}
                        placeholder="Nom de l'immeuble"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Logement / Unité *</label>
                    {allUnits.length > 0 ? (
                      <select
                        className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white font-medium"
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                      >
                        <option value="">-- Sélectionner un logement --</option>
                        {allUnits
                          .filter((u: any) => {
                            const uId = (u.id || "").toString().trim().toUpperCase();
                            const uNum = (u.unit_number || u.unit || u.name || "").toString().trim().toUpperCase();
                            const currentEditUnit = (editUnit || "").toString().trim().toUpperCase();

                            // Conserver le logement actuellement attribué à ce bail
                            if (currentEditUnit && (uId === currentEditUnit || uNum === currentEditUnit)) return true;

                            // Exclure les logements occupés par un autre bail actif ou par statut
                            const storedBaux = typeof window !== 'undefined' ? localStorage.getItem("gestimmo_baux") : null;
                            const otherBaux = storedBaux ? JSON.parse(storedBaux).filter((b: any) => b.id !== lease?.id) : [];
                            return !isUnitOccupied(u, otherBaux);
                          })
                          .map((u: any, idx: number) => {
                            const humanName = u.unit_number || u.name || u.unit;
                            const displayNomenclature = formatUnitDisplay(humanName || u.id, idx + 1);
                            
                            // Si editUnit correspond à u.id (UUID), on utilise u.id pour garantir le match, sinon humanName
                            const isMatchId = editUnit && u.id && u.id.toString().trim().toUpperCase() === editUnit.toString().trim().toUpperCase();
                            const optVal = isMatchId ? u.id : (humanName || u.id);

                            return (
                              <option key={u.id || u.unit_number || idx} value={optVal}>
                                {displayNomenclature}
                              </option>
                            );
                          })}
                          {editUnit && !allUnits.some((u: any) => u.id === editUnit || u.unit_number === editUnit || u.name === editUnit || u.unit === editUnit) && (
                            <option value={editUnit}>{formatUnitDisplay(editUnit)}</option>
                          )}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                        placeholder="ex: A-101"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Conditions Financières */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-app-border">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Conditions financières
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Loyer de base (F CFA) *</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editRent}
                      onChange={(e) => setEditRent(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Charges (F CFA)</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editCharges}
                      onChange={(e) => setEditCharges(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mois d'avance</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editAvanceMonths}
                      onChange={(e) => setEditAvanceMonths(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mois de caution</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editCautionMonths}
                      onChange={(e) => setEditCautionMonths(e.target.value)}
                    />
                  </div>
                </div>

                {/* Recapitulatif en direct */}
                <div className="p-4 bg-gray-50 rounded-xl border border-app-border grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block">Total Mensuel (Loyer + Charges) :</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatFCFA((parseInt(editRent) || 0) + (parseInt(editCharges) || 0))}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Dépôt total d'entrée ({ (parseInt(editAvanceMonths) || 0) + (parseInt(editCautionMonths) || 0) } mois) :</span>
                    <span className="text-sm font-bold text-primary">
                      {formatFCFA(((parseInt(editAvanceMonths) || 0) + (parseInt(editCautionMonths) || 0)) * ((parseInt(editRent) || 0) + (parseInt(editCharges) || 0)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Période du bail */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-app-border">
                  <Calendar className="w-4 h-4 text-primary" />
                  Période de location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date de début du bail *</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date de fin du bail</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Remarques / Clauses */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Clauses & Remarques particulières</label>
                <textarea 
                  rows={3}
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Notes internes, clauses particulières, conditions spécifiques du contrat..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleUpdateLease}
                className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reçu de Bail */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-app-border shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Reçu d'Entrée - {getLeaseDisplayCode(lease)}</h2>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1" id="receipt-print-area">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-primary mb-2">REÇU DE PAIEMENT INITIAL</h1>
                <p className="text-gray-500">Date d'émission : {lease.signedAt || lease.start}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4 tracking-wider flex items-center">
                    <IdCard className="w-4 h-4 mr-2 text-primary" />
                    Informations Locataire
                  </h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Nom complet</span> <span className="font-semibold text-gray-900">{tenantInfo.name}</span></p>
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Contact</span> <span className="font-medium text-gray-900">{tenantInfo.phone}</span></p>
                    {tenantInfo.email && <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Email</span> <span className="font-medium text-gray-900">{tenantInfo.email}</span></p>}
                    {tenantInfo.cni && <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Pièce d'identité (CNI)</span> <span className="font-medium text-gray-900">{tenantInfo.cni}</span></p>}
                    {tenantInfo.cniExpiry && (
                      <p className="flex flex-col">
                        <span className="text-xs text-gray-400 uppercase">Validité CNI</span>
                        <span className={`font-medium ${new Date(tenantInfo.cniExpiry) < new Date() ? 'text-red-500' : 'text-gray-900'}`}>
                          {new Date(tenantInfo.cniExpiry).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          {new Date(tenantInfo.cniExpiry) < new Date() && " (Expirée)"}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4 tracking-wider flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-primary" />
                    Propriété
                  </h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Propriétaire</span> <span className="font-semibold text-gray-900">{ownerInfo}</span></p>
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Bien Immobilier</span> <span className="font-medium text-gray-900">{lease.property}</span></p>
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Logement</span> <span className="font-medium text-gray-900">{lease.unit}</span></p>
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Prise d'effet</span> <span className="font-medium text-gray-900">{lease.start}</span></p>
                  </div>
                </div>
              </div>

              <div className="mb-8 border border-app-border rounded-xl overflow-hidden shadow-sm overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-primary/5 border-b border-app-border">
                    <tr>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Désignation</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border text-sm">
                    <tr className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">Loyer de base</span>
                        <div className="text-xs text-gray-500 mt-1">Loyer mensuel hors charges</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-700">{formatFCFA(lease.rent)}</td>
                    </tr>
                    {lease.charges > 0 && (
                      <tr className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">Charges locatives</span>
                          <div className="text-xs text-gray-500 mt-1">Forfait mensuel</div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-700">{formatFCFA(lease.charges)}</td>
                      </tr>
                    )}
                    {(() => {
                      const totalMonthly = (Number(lease.rent) || 0) + (Number(lease.charges) || 0);
                      let avanceM = lease.avanceMonths !== undefined && lease.avanceMonths !== null 
                        ? Number(lease.avanceMonths) 
                        : (lease.avance_months !== undefined && lease.avance_months !== null ? Number(lease.avance_months) : 0);
                      let cautionM = lease.cautionMonths !== undefined && lease.cautionMonths !== null 
                        ? Number(lease.cautionMonths) 
                        : (lease.caution_months !== undefined && lease.caution_months !== null ? Number(lease.caution_months) : 0);
                      
                      // Si aucun mois n'avait été enregistré mais qu'un montant de dépôt avait été versé
                      if (avanceM === 0 && cautionM === 0 && lease.deposit && totalMonthly > 0) {
                        const totalM = Math.round(lease.deposit / totalMonthly);
                        if (totalM >= 2) {
                          avanceM = Math.floor(totalM / 2);
                          cautionM = totalM - avanceM;
                        } else {
                          cautionM = totalM;
                        }
                      }
                      const avanceTotal = avanceM * totalMonthly;
                      const cautionTotal = cautionM * totalMonthly;

                      return (
                        <>
                          <tr className="bg-primary/5">
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-900">Avance sur loyer</span>
                              <div className="text-xs text-gray-600 mt-1">
                                Pour {avanceM} mois d'avance
                                {getAdvanceMonthLabels(lease.start, avanceM) ? ` (${getAdvanceMonthLabels(lease.start, avanceM)})` : ""}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900">{formatFCFA(avanceTotal)}</td>
                          </tr>
                          <tr className="bg-primary/5">
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-900">Dépôt de garantie (Caution)</span>
                              <div className="text-xs text-gray-600 mt-1">Garantie sur {cautionM} mois</div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900">{formatFCFA(cautionTotal)}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                  <tfoot className="bg-primary text-white">
                    <tr>
                      <td className="px-6 py-5 text-base font-bold uppercase tracking-wider">Total payé à l'entrée</td>
                      <td className="px-6 py-5 text-right text-xl font-bold">
                        {formatFCFA(lease.deposit ?? (((Number(lease.avanceMonths ?? 0) + Number(lease.cautionMonths ?? 0))) * ((Number(lease.rent) || 0) + (Number(lease.charges) || 0))))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="text-center text-sm text-gray-500 mt-12 border-t border-dashed border-gray-300 pt-8">
                <p>Ce reçu est généré informatiquement et fait office de preuve de paiement.</p>
                <p className="mt-1 font-semibold text-gray-900">Gestimmo - Gestion Immobilière</p>
              </div>
            </div>

            <div className="p-6 border-t border-app-border bg-gray-50 flex justify-end gap-3 shrink-0 flex-wrap">
              <button 
                type="button" 
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-5 py-2.5 border border-app-border bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm shadow-sm"
              >
                Fermer
              </button>
              <button 
                type="button" 
                onClick={async () => {
                  const element = document.getElementById("receipt-print-area");
                  if (!element) return;
                  const html2pdf = (await import("html2pdf.js" as any)).default;
                  html2pdf()
                    .set({
                      margin: [10, 10, 10, 10],
                      filename: `Recu-${getLeaseDisplayCode(lease)}.pdf`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2, useCORS: true },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    })
                    .from(element)
                    .save();
                }}
                className="px-5 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium text-sm flex items-center shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </button>
              <button 
                type="button" 
                onClick={() => {
                  const printWindow = window.open('', '', 'height=800,width=800');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Reçu d'Entrée - ${getLeaseDisplayCode(lease)}</title>
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            @media print {
                              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            }
                          </style>
                        </head>
                        <body class="p-8 font-sans max-w-4xl mx-auto">
                          ${document.getElementById("receipt-print-area")?.innerHTML || ""}
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                    }, 500);
                  }
                }}
                className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm flex items-center shadow-sm"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation de Suppression */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Supprimer le bail</h3>
                <p className="text-xs text-gray-500">Action irréversible</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Êtes-vous sûr de vouloir supprimer définitivement le bail <strong className="text-gray-900">{getLeaseDisplayCode(lease)}</strong> ({lease.tenant} - {formatUnitDisplay(lease.unit)}) ?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleDeleteLease}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Supprimer le bail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
