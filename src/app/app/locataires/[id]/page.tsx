"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Phone, Mail, MapPin, FileText, CreditCard, Clock, CheckCircle2, AlertCircle, FileCheck, IdCard, Plus, Calendar, X, Save, Trash2, Pencil, Download, AlertTriangle, Video, MessageSquare, Eye, Upload, FileWarning } from "lucide-react";
import Link from "next/link";
import { formatUnitDisplay, syncPaymentsWithLeases, getPaymentDisplayCode, getLeaseDisplayCode, getIncidentDisplayCode, checkTenantHasImportedContract, isUnitOccupied } from "@/lib/utils";
import { deleteIncident, updateIncident, loadAllDataFromDatabase } from "@/lib/dataService";
import { isImageFile, getFileSource } from "@/lib/imageCompressor";

const formatFCFA = (amount: number | string) => {
  if (typeof amount === "string") return amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
};

const parseFrenchDate = (dateStr: string) => {
  if (!dateStr) return null;
  const months: { [key: string]: number } = { 'janv.': 0, 'janvier': 0, 'févr.': 1, 'février': 1, 'mars': 2, 'avr.': 3, 'avril': 3, 'mai': 4, 'juin': 5, 'juil.': 6, 'juillet': 6, 'août': 7, 'sept.': 8, 'septembre': 8, 'oct.': 9, 'octobre': 9, 'nov.': 10, 'novembre': 10, 'déc.': 11, 'décembre': 11 };
  const parts = dateStr.toLowerCase().split(' ');
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = months[parts[1]];
    const year = parseInt(parts[2], 10);
    if (month !== undefined) return new Date(year, month, day);
  }
  return null;
};

const parsePeriodToDate = (period: string) => {
  if (!period) return null;
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1);
  }
  const months: { [key: string]: number } = { 'janv.': 0, 'janvier': 0, 'févr.': 1, 'février': 1, 'mars': 2, 'avr.': 3, 'avril': 3, 'mai': 4, 'juin': 5, 'juil.': 6, 'juillet': 6, 'août': 7, 'sept.': 8, 'septembre': 8, 'oct.': 9, 'octobre': 9, 'nov.': 10, 'novembre': 10, 'déc.': 11, 'décembre': 11 };
  const parts = period.toLowerCase().split(' ');
  if (parts.length === 2) {
    const month = months[parts[0]];
    const year = parseInt(parts[1], 10);
    if (month !== undefined && !isNaN(year)) return new Date(year, month, 1);
  }
  return null;
};

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const parsePeriod = (str: string): { year: number; month: number; key: string; label: string } | null => {
  if (!str) return null;
  const s = str.trim();

  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      const monthName = MONTH_NAMES_FR[m - 1];
      return { year: y, month: m, key: `${y}-${m.toString().padStart(2, "0")}`, label: `${monthName} ${y}` };
    }
  }

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

  const parts = s.toLowerCase().split(/[\s,]+/);
  let foundMonth: number | null = null;
  let foundYear: number | null = null;

  for (const p of parts) {
    if (monthsMap[p] !== undefined) {
      foundMonth = monthsMap[p];
    } else if (/^\d{4}$/.test(p)) {
      foundYear = parseInt(p, 10);
    }
  }

  if (foundMonth !== null && foundYear !== null) {
    const monthName = MONTH_NAMES_FR[foundMonth - 1];
    const key = `${foundYear}-${foundMonth.toString().padStart(2, "0")}`;
    return { year: foundYear, month: foundMonth, key, label: `${monthName} ${foundYear}` };
  }

  return null;
};

const getAdvanceMonthLabels = (startStr: string | undefined | null, count: number): string => {
  if (!count || count <= 0 || !startStr) return "";

  let startYear: number | null = null;
  let startMonth: number | null = null;

  const parsed = parsePeriod(startStr);
  if (parsed) {
    startYear = parsed.year;
    startMonth = parsed.month;
  } else {
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
        const d = parseFrenchDate(s) || new Date(s);
        if (d && !isNaN(d.getTime())) {
          startYear = d.getFullYear();
          startMonth = d.getMonth() + 1;
        }
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

const getLeaseMonthOptions = (selectedLease: any, payments: any[]) => {
  if (!selectedLease) return { options: [], paidPeriodLabels: [], firstUnpaidPeriod: "" };

  const parsedStart = parsePeriod(selectedLease.start);
  const now = new Date();
  const startYear = parsedStart ? parsedStart.year : now.getFullYear();
  const startMonth = parsedStart ? parsedStart.month : 1;

  const paidKeys = new Set<string>();
  const paidPeriodLabels: string[] = [];

  payments.forEach((p) => {
    const matchTenant = p.tenant && selectedLease.tenant && p.tenant.trim().toLowerCase() === selectedLease.tenant.trim().toLowerCase();
    const matchUnit = p.unit && selectedLease.unit && p.unit.trim().toLowerCase() === selectedLease.unit.trim().toLowerCase();
    const isPaidStatus = p.status === "VALIDÉ" || p.status === "PAYÉ" || p.status === "EN ATTENTE";

    if ((matchTenant || matchUnit) && isPaidStatus) {
      const parsedP = parsePeriod(p.period);
      if (parsedP) {
        paidKeys.add(parsedP.key);
        if (!paidPeriodLabels.includes(parsedP.label)) {
          paidPeriodLabels.push(parsedP.label);
        }
      }
    }
  });

  const options: Array<{ key: string; value: string; label: string; disabled: boolean; isPaid: boolean }> = [];
  const startTotalMonths = startYear * 12 + startMonth;
  let firstUnpaidPeriod = "";

  for (let i = 0; i < 24; i++) {
    const currentTotal = startTotalMonths + i;
    const y = Math.floor((currentTotal - 1) / 12);
    const m = ((currentTotal - 1) % 12) + 1;

    const key = `${y}-${m.toString().padStart(2, "0")}`;
    const baseLabel = `${MONTH_NAMES_FR[m - 1]} ${y}`;
    const isPaid = paidKeys.has(key);

    if (!isPaid && !firstUnpaidPeriod) {
      firstUnpaidPeriod = baseLabel;
    }

    options.push({
      key,
      value: baseLabel,
      label: isPaid ? `${baseLabel} — (Déjà payé - Grisé)` : baseLabel,
      disabled: isPaid,
      isPaid
    });
  }

  return { options, paidPeriodLabels, firstUnpaidPeriod };
};

const checkPreviousMonthPaid = (selectedLease: any, selectedPeriodStr: string, payments: any[]) => {
  if (!selectedLease || !selectedPeriodStr) {
    return { isPrevMonthUnpaid: false, missingPrevMonthLabel: "" };
  }

  const parsedCurrent = parsePeriod(selectedPeriodStr);
  if (!parsedCurrent) {
    return { isPrevMonthUnpaid: false, missingPrevMonthLabel: "" };
  }

  const prevYear = parsedCurrent.month === 1 ? parsedCurrent.year - 1 : parsedCurrent.year;
  const prevMonth = parsedCurrent.month === 1 ? 12 : parsedCurrent.month - 1;
  const prevKey = `${prevYear}-${prevMonth.toString().padStart(2, "0")}`;
  const prevLabel = `${MONTH_NAMES_FR[prevMonth - 1]} ${prevYear}`;

  const parsedStart = parsePeriod(selectedLease.start);
  if (parsedStart) {
    const startTotalMonths = parsedStart.year * 12 + parsedStart.month;
    const prevTotalMonths = prevYear * 12 + prevMonth;

    if (prevTotalMonths < startTotalMonths) {
      return { isPrevMonthUnpaid: false, missingPrevMonthLabel: "" };
    }
  }

  const isPaid = payments.some((p) => {
    const matchTenant = p.tenant && selectedLease.tenant && p.tenant.trim().toLowerCase() === selectedLease.tenant.trim().toLowerCase();
    const matchUnit = p.unit && selectedLease.unit && p.unit.trim().toLowerCase() === selectedLease.unit.trim().toLowerCase();
    const isPaidStatus = p.status === "VALIDÉ" || p.status === "PAYÉ" || p.status === "EN ATTENTE";

    if ((matchTenant || matchUnit) && isPaidStatus) {
      const parsedP = parsePeriod(p.period);
      return parsedP && parsedP.key === prevKey;
    }
    return false;
  });

  if (!isPaid) {
    return { isPrevMonthUnpaid: true, missingPrevMonthLabel: prevLabel };
  }

  return { isPrevMonthUnpaid: false, missingPrevMonthLabel: "" };
};

const generateLeaseInitialPayments = (
  tenantName: string,
  unitId: string,
  startDateStr: string,
  rentAmount: number,
  chargesAmount: number,
  avanceMonths: number,
  cautionMonths: number
) => {
  const payments: any[] = [];
  const start = startDateStr ? new Date(startDateStr) : new Date();
  const totalMonthlyAmount = rentAmount + chargesAmount;

  if (avanceMonths > 0) {
    for (let i = 0; i < avanceMonths; i++) {
      const totalMonths = start.getFullYear() * 12 + start.getMonth() + i;
      const year = Math.floor(totalMonths / 12);
      const month = totalMonths % 12;
      const monthLabel = `${MONTH_NAMES_FR[month]} ${year}`;
      const formattedDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

      payments.push({
        id: `P-AV-${Math.floor(1000 + Math.random() * 9000)}`,
        tenant: tenantName.toUpperCase(),
        unit: unitId.toUpperCase(),
        date: formattedDate,
        period: monthLabel,
        amount: totalMonthlyAmount,
        method: "AVANCE",
        status: "PAYÉ"
      });
    }
  } else {
    const totalMonths = start.getFullYear() * 12 + start.getMonth();
    const year = Math.floor(totalMonths / 12);
    const month = totalMonths % 12;
    const monthLabel = `${MONTH_NAMES_FR[month]} ${year}`;

    payments.push({
      id: `P-ATT-${Math.floor(1000 + Math.random() * 9000)}`,
      tenant: tenantName.toUpperCase(),
      unit: unitId.toUpperCase(),
      date: "-",
      period: monthLabel,
      amount: totalMonthlyAmount,
      method: "-",
      status: "EN ATTENTE"
    });
  }

  if (cautionMonths > 0) {
    const cautionAmount = cautionMonths * totalMonthlyAmount;
    const formattedDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    payments.push({
      id: `P-CAU-${Math.floor(1000 + Math.random() * 9000)}`,
      tenant: tenantName.toUpperCase(),
      unit: unitId.toUpperCase(),
      date: formattedDate,
      period: `Caution (${cautionMonths} mois)`,
      amount: cautionAmount,
      method: "ESPÈCES",
      status: "PAYÉ"
    });
  }

  return payments;
};

const defaultTenants = [
  { id: "T-892", name: "Cora Richards", phone: "+225 0102030405", email: "cora@email.com", unit: "A-101", property: "Résidence Les Flamboyants", rent: 165000, status: "À JOUR", cni: "CI0011223344" },
  { id: "T-893", name: "Alistair Dunlap", phone: "+225 0506070809", email: "alistair@email.com", unit: "B-204", property: "Résidence Les Flamboyants", rent: 220000, status: "EN RETARD", cni: "CI0055667788" },
  { id: "T-894", name: "Bibi Shelton", phone: "+225 0708091011", email: "bibi@email.com", unit: "A-102", property: "Résidence Les Flamboyants", rent: 165000, status: "À JOUR", cni: "CI0099887766" },
  { id: "T-895", name: "Jean Dupont", phone: "+225 0910111213", email: "jean@email.com", unit: "V-001", property: "Villa Palmeraie", rent: 850000, status: "À JOUR", cni: "CI0022334455" },
  { id: "T-896", name: "Addie Bradford", phone: "+225 0203040506", email: "addie@email.com", unit: "B-205", property: "Résidence Les Flamboyants", rent: 220000, status: "IMPAYÉ", cni: "CI0044556677" },
];

const defaultLeases = [
  { id: "B-2026-084", property: "Résidence Les Flamboyants", unit: "A-101", start: "12 Août 2026", end: "11 Août 2027", rent: 165000, avanceMonths: 2, cautionMonths: 2, deposit: 660000, status: "ACTIF", tenant: "Cora Richards", tenantId: "T-892" }
];

const defaultPayments = [
  { id: "P-1925", date: "05 Sept 2026", amount: 165000, method: "Virement", period: "Septembre 2026", status: "PAYÉ", tenant: "Cora Richards" },
  { id: "P-1801", date: "05 Août 2026", amount: 165000, method: "Wave", period: "Août 2026", status: "PAYÉ", tenant: "Cora Richards" },
  { id: "P-1688", date: "08 Juil 2026", amount: 165000, method: "Espèces", period: "Juillet 2026", status: "PAYÉ EN RETARD", tenant: "Cora Richards" },
];

export default function TenantDetailsPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [tenant, setTenant] = useState<any>(null);
  const [tenantLeases, setTenantLeases] = useState<any[]>([]);
  const [activeLeases, setActiveLeases] = useState<any[]>([]);
  const [tenantPayments, setTenantPayments] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>("all");
  const [leaseDocuments, setLeaseDocuments] = useState<any[]>([]);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCni, setEditCni] = useState("");
  const [editCniExpiry, setEditCniExpiry] = useState("");
  const [editProfession, setEditProfession] = useState("");
  const [editEmployer, setEditEmployer] = useState("");

  // Document modal states
  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocFile, setNewDocFile] = useState<string | null>(null);

  // Payment modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newPeriod, setNewPeriod] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newMethod, setNewMethod] = useState("Virement");
  const [newTransferNumber, setNewTransferNumber] = useState("");

  // New Lease modal states
  const [isNewLeaseModalOpen, setIsNewLeaseModalOpen] = useState(false);
  const [newUnit, setNewUnit] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newRent, setNewRent] = useState("");
  const [newCharges, setNewCharges] = useState("0");
  const [newCautionMonths, setNewCautionMonths] = useState("");
  const [newAvanceMonths, setNewAvanceMonths] = useState("");
  const [leaseOwnerFilter, setLeaseOwnerFilter] = useState("");
  const [leasePropertyFilter, setLeasePropertyFilter] = useState("");
  const [generatedReceipt, setGeneratedReceipt] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      const tab = search.get("tab");
      if (tab === "documents" || tab === "communications" || tab === "overview") {
        setActiveTab(tab);
      }
      if (search.get("action") === "import" || search.get("action") === "upload") {
        setActiveTab("documents");
        setIsAddDocumentModalOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    const storedTenants = localStorage.getItem("gestimmo_locataires");
    const allTenants = storedTenants ? JSON.parse(storedTenants) : defaultTenants;
    const foundTenant = allTenants.find((t: any) => t.id === params.id);
    
    if (foundTenant) {
      setTenant({
        ...foundTenant,
        cni: foundTenant.cni || "",
        debt: foundTenant.status === "IMPAYÉ" ? foundTenant.rent * 2 : (foundTenant.status === "EN RETARD" ? foundTenant.rent : 0)
      });

      const storedBaux = localStorage.getItem("gestimmo_baux");
      const allBaux = storedBaux ? JSON.parse(storedBaux) : defaultLeases;
      const tLeases = allBaux.filter((b: any) => b.tenantId === params.id || b.tenant === foundTenant.name);
      setTenantLeases(tLeases);
      setActiveLeases(allBaux.filter((b: any) => {
        const s = (b.status || "").toString().trim().toUpperCase();
        return s === "ACTIF" || s === "EN COURS" || s === "EN_COURS" || s === "ACTIVE" || s === "SIGNE" || s === "VALIDE";
      }));

      // Charger les documents liés à chaque bail du locataire
      const allLeaseDocs: any[] = [];
      tLeases.forEach((lease: any) => {
        const storedLeaseDocs = localStorage.getItem(`gestimmo_docs_${lease.id}`);
        if (storedLeaseDocs) {
          const docs = JSON.parse(storedLeaseDocs);
          docs.forEach((doc: any) => {
            allLeaseDocs.push({ ...doc, leaseId: lease.id, fromLease: true });
          });
        }
      });
      setLeaseDocuments(allLeaseDocs);

      const storedPaiements = localStorage.getItem("gestimmo_paiements");
      const allPaiements = storedPaiements ? JSON.parse(storedPaiements) : defaultPayments;
      const syncedPaiements = syncPaymentsWithLeases(allPaiements, allBaux);
      setTenantPayments(syncedPaiements.filter((p: any) => (p.tenant || "").trim().toLowerCase() === foundTenant.name.trim().toLowerCase()));

      // Charger les incidents du locataire
      const storedIncidents = localStorage.getItem("gestimmo_incidents");
      if (storedIncidents) {
        try {
          const allInc: any[] = JSON.parse(storedIncidents);
          const tenantFiltered = allInc.filter((inc) => (inc.tenant || "").trim().toLowerCase() === foundTenant.name.trim().toLowerCase());
          setTenantIncidents(tenantFiltered);
        } catch (e) {
          console.error(e);
        }
      }
    }

    const storedUnits = localStorage.getItem("gestimmo_logements");
    if (storedUnits) {
      setUnits(JSON.parse(storedUnits));
    }

    const storedOwners = localStorage.getItem("gestimmo_proprietaires");
    if (storedOwners) {
      setOwners(JSON.parse(storedOwners));
    }

    const storedBiens = localStorage.getItem("gestimmo_biens");
    if (storedBiens) {
      setBiens(JSON.parse(storedBiens));
    }

    // Synchronisation asynchrone avec la base de données
    const syncDb = async () => {
      try {
        const dbState = await loadAllDataFromDatabase();
        if (dbState) {
          if (dbState.units && dbState.units.length > 0) setUnits(dbState.units);
          if (dbState.owners && dbState.owners.length > 0) setOwners(dbState.owners);
          if (dbState.properties && dbState.properties.length > 0) setBiens(dbState.properties);
          if (dbState.leases && dbState.leases.length > 0) {
            setActiveLeases(dbState.leases.filter((b: any) => {
              const s = (b.status || "").toString().trim().toUpperCase();
              return s === "ACTIF" || s === "EN COURS" || s === "EN_COURS" || s === "ACTIVE" || s === "SIGNE" || s === "VALIDE";
            }));
          }
        }
      } catch (e) {
        console.error("syncDb error", e);
      }
    };
    syncDb();
  }, [params.id]);

  const [tenantIncidents, setTenantIncidents] = useState<any[]>([]);
  const [previewIncidentImage, setPreviewIncidentImage] = useState<{ src: string; title: string } | null>(null);

  const handleUpdateIncidentStatus = async (incidentId: string, newStatus: string) => {
    const updated = tenantIncidents.map((inc) => inc.id === incidentId ? { ...inc, status: newStatus } : inc);
    setTenantIncidents(updated);
    await updateIncident(incidentId, { status: newStatus });
  };

  const handleDeleteSingleIncident = async (incidentId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet incident ? Il sera également retiré de l'espace locataire.")) return;
    const stored = localStorage.getItem("gestimmo_incidents");
    let all: any[] = stored ? JSON.parse(stored) : [];
    const updated = all.filter((inc) => inc.id !== incidentId);
    localStorage.setItem("gestimmo_incidents", JSON.stringify(updated));
    if (tenant?.name) {
      const normName = tenant.name.trim().toLowerCase();
      setTenantIncidents(updated.filter((inc) => (inc.tenant || "").trim().toLowerCase() === normName));
    }
    try {
      await deleteIncident(incidentId);
    } catch (e) {
      console.error("Error deleting incident DB:", e);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("gestimmo_incidents_updated"));
    }
  };

  useEffect(() => {
    if (tenantLeases.length > 0 && selectedLeaseId === "all") {
      const activeLease = tenantLeases.find((l: any) => l.status === "ACTIF");
      if (activeLease && tenantLeases.length > 1) {
        setSelectedLeaseId(activeLease.id);
      }
    }
  }, [tenantLeases]);

  if (!tenant) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

  const openEditModal = () => {
    setEditName(tenant.name);
    setEditPhone(tenant.phone);
    setEditEmail(tenant.email);
    setEditCni(tenant.cni || "");
    setEditCniExpiry(tenant.cniExpiry || "");
    setEditProfession(tenant.profession || "");
    setEditEmployer(tenant.employer || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateTenant = () => {
    const updatedTenant = { 
      ...tenant, 
      name: editName ? editName.trim().toUpperCase() : tenant.name, 
      phone: editPhone ? editPhone.replace(/\D/g, '') : tenant.phone, 
      email: editEmail,
      cni: editCni ? editCni.trim().toUpperCase() : tenant.cni,
      cniExpiry: editCniExpiry,
      profession: editProfession ? editProfession.trim().toUpperCase() : tenant.profession,
      employer: editEmployer ? editEmployer.trim().toUpperCase() : tenant.employer
    };
    setTenant(updatedTenant);
    
    // Update local storage — ensure tenant is persisted even if not yet in stored list
    const stored = localStorage.getItem("gestimmo_locataires");
    const all: any[] = stored ? JSON.parse(stored) : [];
    const tenantExistsInStorage = all.some((t: any) => t.id === tenant.id);
    const updatedAll = tenantExistsInStorage
      ? all.map((t: any) => t.id === tenant.id ? updatedTenant : t)
      : [...all, updatedTenant];
    localStorage.setItem("gestimmo_locataires", JSON.stringify(updatedAll));
    
    setIsEditModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewDocName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDocFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDocument = () => {
    if (!newDocName || !newDocFile) return;

    const newDoc = {
      id: `DOC-${Date.now()}`,
      name: newDocName,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      base64: newDocFile
    };

    const updatedDocuments = tenant.documents ? [newDoc, ...tenant.documents] : [newDoc];
    const updatedTenant = { ...tenant, documents: updatedDocuments };

    // Update local storage — ensure tenant is persisted even if not yet in stored list
    const stored = localStorage.getItem("gestimmo_locataires");
    let all: any[] = stored ? JSON.parse(stored) : [];
    const tenantExistsInStorage = all.some((t: any) => t.id === tenant.id);
    let updatedAll = tenantExistsInStorage
      ? all.map((t: any) => t.id === tenant.id ? updatedTenant : t)
      : [...all, updatedTenant];

    try {
      localStorage.setItem("gestimmo_locataires", JSON.stringify(updatedAll));
      setTenant(updatedTenant);
    } catch (error) {
      console.warn("Storage quota exceeded, trying without base64 content...");
      // Si le fichier est trop gros pour le localStorage, on sauvegarde juste son nom
      const docWithoutFile = { ...newDoc, base64: "" };
      const updatedDocsFallback = tenant.documents ? [docWithoutFile, ...tenant.documents] : [docWithoutFile];
      const updatedTenantFallback = { ...tenant, documents: updatedDocsFallback };
      updatedAll = tenantExistsInStorage
        ? all.map((t: any) => t.id === tenant.id ? updatedTenantFallback : t)
        : [...all, updatedTenantFallback];
      
      try {
        localStorage.setItem("gestimmo_locataires", JSON.stringify(updatedAll));
        setTenant(updatedTenantFallback);
        alert("Le document a été ajouté. (Note: en raison de la limite de stockage du navigateur sans base de données, le fichier réel n'a pas pu être sauvegardé intégralement car il est trop volumineux).");
      } catch (e) {
        alert("Erreur: Le stockage du navigateur est saturé.");
        return;
      }
    }

    setNewDocName("");
    setNewDocFile(null);
    setIsAddDocumentModalOpen(false);
  };

  const handleDeleteDocument = (docId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
      const updatedDocuments = tenant.documents.filter((d: any) => d.id !== docId);
      const updatedTenant = { ...tenant, documents: updatedDocuments };

      const stored = localStorage.getItem("gestimmo_locataires");
      const all: any[] = stored ? JSON.parse(stored) : [];
      const tenantExistsInStorage = all.some((t: any) => t.id === tenant.id);
      const updatedAll = tenantExistsInStorage
        ? all.map((t: any) => t.id === tenant.id ? updatedTenant : t)
        : [...all, updatedTenant];
      localStorage.setItem("gestimmo_locataires", JSON.stringify(updatedAll));

      setTenant(updatedTenant);
    }
  };

  const handleDeleteLeaseDoc = (docToDelete: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le document "${docToDelete.name}" ?`)) {
      const leaseId = docToDelete.leaseId;
      if (leaseId) {
        const stored = localStorage.getItem(`gestimmo_docs_${leaseId}`);
        if (stored) {
          try {
            const docs = JSON.parse(stored);
            const updated = docs.filter((d: any) => d.id !== docToDelete.id && d.name !== docToDelete.name);
            localStorage.setItem(`gestimmo_docs_${leaseId}`, JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
        }
      }
      setLeaseDocuments((prev) => prev.filter((d) => !(d.id === docToDelete.id && d.leaseId === docToDelete.leaseId)));
    }
  };

  const openPaymentModal = () => {
    setEditingPaymentId(null);
    const activeLease = tenantLeases.find((l: any) => l.status === "ACTIF");
    if (activeLease) {
      setNewAmount(activeLease.rent.toString());
    } else {
      setNewAmount(tenant.rent ? tenant.rent.toString() : "");
    }
    setNewDate(new Date().toISOString().split('T')[0]);
    const monthOpts = getLeaseMonthOptions(activeLease, tenantPayments);
    setNewPeriod(monthOpts.firstUnpaidPeriod || "");
    setNewMethod("Virement");
    setNewTransferNumber("");
    setIsPaymentModalOpen(true);
  };

  const handleEditPayment = (payment: any) => {
    setEditingPaymentId(payment.id);
    const dateObj = parseFrenchDate(payment.date);
    if (dateObj) {
      setNewDate(dateObj.toISOString().split('T')[0]);
    } else {
      setNewDate(new Date().toISOString().split('T')[0]);
    }
    setNewPeriod(payment.period || "");
    setNewAmount(payment.amount?.toString() || "");
    setNewMethod(payment.method || "Virement");
    setNewTransferNumber(payment.transferNumber || "");
    setIsPaymentModalOpen(true);
  };

  const handleDeletePayment = (paymentId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce paiement ? L'historique et la dette seront recalculés.")) {
      const storedPaiements = localStorage.getItem("gestimmo_paiements");
      const allPaiements = storedPaiements ? JSON.parse(storedPaiements) : defaultPayments;
      const updatedAll = allPaiements.filter((p: any) => p.id !== paymentId);
      localStorage.setItem("gestimmo_paiements", JSON.stringify(updatedAll));
      
      setTenantPayments(tenantPayments.filter((p: any) => p.id !== paymentId));
    }
  };

  const handleSavePayment = () => {
    const activeLease = tenantLeases.find((l: any) => l.status === "ACTIF");
    const targetUnit = activeLease ? activeLease.unit : tenant.unit;

    if (activeLease) {
      const leaseStartDate = parseFrenchDate(activeLease.start);
      const leaseEndDate = activeLease.end ? parseFrenchDate(activeLease.end) : null;
      
      // Validation date de paiement
      if (newDate && leaseStartDate) {
        const paymentDate = new Date(newDate);
        if (paymentDate < leaseStartDate) {
          alert(`La date d'encaissement ne peut pas être antérieure à la date de début du bail (${activeLease.start}).`);
          return;
        }
      }

      // Validation de la période
      if (newPeriod && leaseStartDate) {
        const parsedP = parsePeriod(newPeriod);
        if (parsedP) {
          const periodValue = parsedP.year * 12 + parsedP.month;
          const startValue = leaseStartDate.getFullYear() * 12 + (leaseStartDate.getMonth() + 1);
          
          if (periodValue < startValue) {
            alert(`La période payée ne peut pas être antérieure au mois de début du bail (${activeLease.start}).`);
            return;
          }

          if (leaseEndDate) {
            const endValue = leaseEndDate.getFullYear() * 12 + (leaseEndDate.getMonth() + 1);
            if (periodValue > endValue) {
              alert(`La période payée ne peut pas être postérieure au mois de fin du bail (${activeLease.end}).`);
              return;
            }
          }
        }
      }
    }

    const storedPaiements = localStorage.getItem("gestimmo_paiements");
    const allPaiements = storedPaiements ? JSON.parse(storedPaiements) : defaultPayments;

    // Verify duplicate payment
    const parsedNewPeriod = parsePeriod(newPeriod);
    const isDuplicate = allPaiements.some((p: any) => {
      const isSameTenantOrUnit = (p.tenant && p.tenant === tenant.name) || (p.unit && p.unit === targetUnit);
      if (!isSameTenantOrUnit || p.status === "REJETÉ" || p.id === editingPaymentId) return false;
      const parsedP = parsePeriod(p.period);
      return parsedP && parsedNewPeriod && parsedP.key === parsedNewPeriod.key;
    });

    if (isDuplicate) {
      alert("Un paiement a déjà été enregistré pour ce locataire à cette période pour ce logement.");
      return;
    }

    const prevCheck = checkPreviousMonthPaid(activeLease, newPeriod, allPaiements);
    if (prevCheck.isPrevMonthUnpaid) {
      alert(`Impossible d'enregistrer le paiement : le locataire doit d'abord régler le mois précédent (${prevCheck.missingPrevMonthLabel}).`);
      return;
    }

    const dateObj = newDate ? new Date(newDate) : new Date();
    const formattedDate = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

    let updatedAllPayments;
    let newOrUpdatedPayment: any;

    if (editingPaymentId) {
      updatedAllPayments = allPaiements.map((p: any) => {
        if (p.id === editingPaymentId) {
          newOrUpdatedPayment = {
            ...p,
            date: formattedDate,
            period: newPeriod,
            amount: parseInt(newAmount) || 0,
            method: newMethod,
            transferNumber: newTransferNumber,
          };
          return newOrUpdatedPayment;
        }
        return p;
      });
    } else {
      newOrUpdatedPayment = {
        id: `P-${Math.floor(2000 + Math.random() * 8000)}`,
        tenant: tenant.name,
        unit: targetUnit,
        date: formattedDate,
        period: newPeriod,
        amount: parseInt(newAmount) || 0,
        method: newMethod,
        transferNumber: newTransferNumber,
        status: "PAYÉ"
      };
      updatedAllPayments = [newOrUpdatedPayment, ...allPaiements];
    }
    
    localStorage.setItem("gestimmo_paiements", JSON.stringify(updatedAllPayments));
    
    if (editingPaymentId) {
      setTenantPayments(tenantPayments.map((p: any) => p.id === editingPaymentId ? newOrUpdatedPayment : p));
    } else {
      setTenantPayments([newOrUpdatedPayment, ...tenantPayments]);
    }
    
    setNewDate("");
    setNewPeriod("");
    setNewAmount("");
    setNewMethod("Virement");
    setNewTransferNumber("");
    setIsPaymentModalOpen(false);
    setEditingPaymentId(null);
  };

  const handleSaveLease = () => {
    const selectedUnit = units.find(u => u.id === newUnit);
    const propertyName = selectedUnit ? selectedUnit.property : "Bien Inconnu";
    const bObj = biens.find(b => b.name === propertyName);
    const ownerName = bObj ? bObj.owner : (leaseOwnerFilter || "Non défini");

    const newLease = {
      id: `B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      tenant: tenant.name,
      tenantId: tenant.id,
      unit: newUnit,
      property: propertyName,
      start: new Date(newStart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      end: new Date(newEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      rent: parseInt(newRent) || 0,
      charges: parseInt(newCharges) || 0,
      cautionMonths: parseInt(newCautionMonths) || 0,
      avanceMonths: parseInt(newAvanceMonths) || 0,
      caution: (parseInt(newCautionMonths) || 0) * ((parseInt(newRent) || 0) + (parseInt(newCharges) || 0)),
      avance: (parseInt(newAvanceMonths) || 0) * ((parseInt(newRent) || 0) + (parseInt(newCharges) || 0)),
      deposit: ((parseInt(newCautionMonths) || 0) + (parseInt(newAvanceMonths) || 0)) * ((parseInt(newRent) || 0) + (parseInt(newCharges) || 0)),
      status: "ACTIF"
    };

    const storedBaux = localStorage.getItem("gestimmo_baux");
    const allBaux = storedBaux ? JSON.parse(storedBaux) : defaultLeases;
    const updatedBaux = [newLease, ...allBaux];
    
    localStorage.setItem("gestimmo_baux", JSON.stringify(updatedBaux));
    setTenantLeases([newLease, ...tenantLeases]);
    setActiveLeases([newLease, ...activeLeases]);

    // Mettre à jour le logement comme OCCUPÉ dans gestimmo_logements
    const storedUnits = localStorage.getItem("gestimmo_logements");
    if (storedUnits) {
      try {
        const parsedUnits = JSON.parse(storedUnits);
        const updatedUnits = parsedUnits.map((u: any) => {
          if (u.id === newUnit || u.unit === newUnit || u.unit_number === newUnit) {
            return { ...u, status: "OCCUPÉ", tenant: tenant.name };
          }
          return u;
        });
        localStorage.setItem("gestimmo_logements", JSON.stringify(updatedUnits));
        setUnits(updatedUnits);
        window.dispatchEvent(new Event("gestimmo_logements_updated"));
      } catch (e) {}
    }

    // Génération automatique des paiements d'avance et caution basés sur Date de début & Nombre de mois d'avance
    const generatedInitialPayments = generateLeaseInitialPayments(
      tenant.name,
      newUnit,
      newStart,
      parseInt(newRent) || 0,
      parseInt(newCharges) || 0,
      parseInt(newAvanceMonths) || 0,
      parseInt(newCautionMonths) || 0
    );

    const storedPaiements = localStorage.getItem("gestimmo_paiements");
    const allPaiements = storedPaiements ? JSON.parse(storedPaiements) : defaultPayments;
    const updatedAllPayments = [...generatedInitialPayments, ...allPaiements];
    localStorage.setItem("gestimmo_paiements", JSON.stringify(updatedAllPayments));
    setTenantPayments([...generatedInitialPayments, ...tenantPayments]);

    setGeneratedReceipt({
      leaseId: newLease.id,
      tenant: tenant,
      property: propertyName,
      owner: ownerName,
      unit: newUnit,
      rent: newLease.rent,
      charges: newLease.charges,
      avanceMonths: newLease.avanceMonths,
      cautionMonths: newLease.cautionMonths,
      avanceTotal: newLease.avance,
      cautionTotal: newLease.caution,
      depositTotal: newLease.deposit,
      startDate: newLease.start,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
    });
    
    setNewUnit("");
    setNewStart("");
    setNewEnd("");
    setNewRent("");
    setNewCharges("0");
    setNewCautionMonths("");
    setNewAvanceMonths("");
    setIsNewLeaseModalOpen(false);
  };

  const filteredModalBiens = leaseOwnerFilter 
    ? biens.filter(b => b.owner === leaseOwnerFilter)
    : biens;

  const filteredModalUnits = units.filter(u => {
    // Exclure rigoureusement les logements déjà occupés (statut, locataire assigné ou bail actif)
    if (isUnitOccupied(u, activeLeases)) return false;

    let matchOwner = true;
    if (leaseOwnerFilter) {
      const bObj = biens.find(b => b.name && u.property && b.name.trim().toUpperCase() === u.property.trim().toUpperCase());
      if (bObj) {
        matchOwner = bObj.owner === leaseOwnerFilter;
      } else {
        matchOwner = false;
      }
    }

    let matchProperty = true;
    if (leasePropertyFilter) {
      matchProperty = u.property && u.property.trim().toUpperCase() === leasePropertyFilter.trim().toUpperCase();
    }

    return matchOwner && matchProperty;
  });

  const mappedPayments = tenantPayments.map(p => {
    let leaseId = null;
    if (p.unit) {
      const pDate = parsePeriodToDate(p.period);
      if (pDate) {
        const matchingLease = tenantLeases.find((l: any) => {
          const start = parseFrenchDate(l.start);
          const end = l.end ? parseFrenchDate(l.end) : null;
          return l.unit === p.unit && start && pDate >= start && (!end || pDate <= end);
        });
        if (matchingLease) leaseId = matchingLease.id;
      }
      if (!leaseId) {
         const fallbackLease = tenantLeases.find((l: any) => l.unit === p.unit);
         if (fallbackLease) leaseId = fallbackLease.id;
      }
    }
    if (!leaseId) {
      const pDate = parsePeriodToDate(p.period);
      if (pDate) {
        const matchingLease = tenantLeases.find((l: any) => {
          const start = parseFrenchDate(l.start);
          const end = l.end ? parseFrenchDate(l.end) : null;
          return start && pDate >= start && (!end || pDate <= end);
        });
        if (matchingLease) leaseId = matchingLease.id;
      }
    }
    if (!leaseId && tenantLeases.length === 1) {
       leaseId = tenantLeases[0].id;
    }
    return { ...p, leaseId };
  });

  const displayedLeases = selectedLeaseId === "all" ? tenantLeases : tenantLeases.filter((l: any) => l.id === selectedLeaseId);
  const displayedPayments = selectedLeaseId === "all" ? mappedPayments : mappedPayments.filter((p: any) => p.leaseId === selectedLeaseId);

  const computeNextPeriodAndAdvance = () => {
    let advance = 0;
    let periodStr = "Non défini";

    const paymentsToUse = displayedPayments;
    const leasesToUse = displayedLeases;

    let maxDate: Date | null = null;
    paymentsToUse.forEach((p: any) => {
      if (p.status === "VALIDÉ" || p.status === "PAYÉ" || p.status === "PAYÉ EN RETARD") {
        const pDate = parsePeriodToDate(p.period);
        if (pDate) {
          if (!maxDate || pDate > maxDate) {
            maxDate = pDate;
          }
        }
      }
    });

    let referenceDate = new Date(); 
    if (leasesToUse.length === 1 && leasesToUse[0].status === "RÉSILIÉ" && leasesToUse[0].end) {
        const endDate = parseFrenchDate(leasesToUse[0].end);
        if (endDate && endDate < referenceDate) {
            referenceDate = endDate;
        }
    }
    
    const currentMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

    if (!maxDate) {
       if (leasesToUse.length === 1 && leasesToUse[0].start) {
           const startDate = parseFrenchDate(leasesToUse[0].start);
           if (startDate) {
               const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
               advance = -((currentMonth.getFullYear() - startMonth.getFullYear()) * 12 + (currentMonth.getMonth() - startMonth.getMonth()) + 1);
               // Générer periodStr même sans paiement
               if (advance < 0) {
                 const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
                 periodStr = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
               }
           }
       }
       return { advance, periodStr, lastPaidPeriodStr: "" };
    }

    const validMaxDate: Date = maxDate!;
    advance = (validMaxDate.getFullYear() - currentMonth.getFullYear()) * 12 + (validMaxDate.getMonth() - currentMonth.getMonth());

    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

    const lastPaidPeriodStr = `${monthNames[validMaxDate.getMonth()]} ${validMaxDate.getFullYear()}`;

    if (advance >= 0) {
      const nextDate = new Date(validMaxDate.getFullYear(), validMaxDate.getMonth() + 1, 1);
      periodStr = `${monthNames[nextDate.getMonth()]} ${nextDate.getFullYear()}`;
    } else {
      periodStr = `${monthNames[validMaxDate.getMonth()]} ${validMaxDate.getFullYear()}`;
    }

    return { advance, periodStr, lastPaidPeriodStr };
  };

const formatPeriodLabel = (periodStr: string) => {
  if (!periodStr) return "-";
  const parsed = parsePeriod(periodStr);
  return parsed ? parsed.label : periodStr;
};

  const { advance: advanceMonths, periodStr, lastPaidPeriodStr } = computeNextPeriodAndAdvance();

  const currentRent = displayedLeases.length > 0 
    ? displayedLeases.filter((l: any) => selectedLeaseId !== "all" || l.status === "ACTIF").reduce((sum: number, l: any) => sum + ((l.rent || 0) + (l.charges || 0)), 0) 
    : tenant.rent;

  const pendingOrOverduePayments = displayedPayments.filter((p: any) => 
    p.status === "EN ATTENTE" || p.status === "EN RETARD" || p.status === "IMPAYÉ" || p.status === "REJETÉ"
  );
  
  const pendingDebt = pendingOrOverduePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const computedDebt = (advanceMonths < 0 ? Math.abs(advanceMonths) * currentRent : 0) + pendingDebt;
  const effectiveAdvance = pendingDebt > 0 ? 0 : advanceMonths;
  const totalPaid = displayedPayments.filter((p: any) => p.status === "VALIDÉ" || p.status === "PAYÉ").reduce((sum: number, p: any) => sum + p.amount, 0);

  const initials = tenant.name ? tenant.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase() : "LO";

  let computedStatus = tenant.status;
  let statusVariant: "success" | "danger" | "alert" | "warning" | "info" | "default" = "default";
  
  const hasActiveLease = tenantLeases.some((l: any) => l.status === "ACTIF");
  if (hasActiveLease) {
    if (computedDebt > 0) {
      computedStatus = "EN RETARD";
    } else {
      computedStatus = "À JOUR";
    }
  } else if (tenantLeases.length > 0 && tenantLeases.every((l: any) => l.status === "RÉSILIÉ")) {
    computedStatus = "INACTIF";
  } else if (!hasActiveLease) {
    computedStatus = "EN ATTENTE";
  }

  if (computedStatus === "IMPAYÉ") statusVariant = "danger";
  else if (computedStatus === "EN RETARD") statusVariant = "alert";
  else if (computedStatus === "À JOUR") statusVariant = "success";
  else if (computedStatus === "EN ATTENTE") statusVariant = "warning";
  else statusVariant = "default";

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/app/locataires">
            <button type="button" className="p-2 bg-white border border-app-border rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg hidden sm:flex">
                {initials}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <Badge dot variant={statusVariant}>
                {computedStatus}
              </Badge>
            </div>
            <div className="flex items-center text-sm text-gray-500 gap-4 mt-2 sm:ml-14">
              <span className="flex items-center"><Phone className="w-4 h-4 mr-1.5" /> {tenant.phone}</span>
              <span className="flex items-center"><Mail className="w-4 h-4 mr-1.5" /> {tenant.email}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/app/locataires/${tenant.id}/documents`}
            className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
          >
            <Upload className="h-4 w-4 mr-2 text-primary" /> Importer documents
          </Link>
          {(() => {
            const hasActiveLease = tenantLeases.some((l: any) => l.status === "ACTIF");
            return (
              <button 
                type="button" 
                onClick={openPaymentModal}
                disabled={!hasActiveLease}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={!hasActiveLease ? "Le locataire n'a aucun bail actif." : ""}
              >
                <CreditCard className="h-4 w-4 mr-2" /> Encaisser
              </button>
            );
          })()}
        </div>
      </div>

      {/* Alerte contrat non importé */}
      {!checkTenantHasImportedContract(tenant, tenantLeases) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Contrat de bail en attente d'importation</p>
              <p className="text-xs text-amber-800 mt-0.5">Aucun contrat numérisé ou signé n'est rattaché au dossier de ce locataire.</p>
            </div>
          </div>
          <Link
            href={`/app/locataires/${tenant.id}/documents?type=contrat`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm shrink-0 whitespace-nowrap self-end sm:self-auto"
          >
            <Upload className="w-3.5 h-3.5" />
            Importer le contrat maintenant
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-app-border overflow-x-auto scrollbar-none">
        <button 
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === "overview" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Vue d'ensemble
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === "documents" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Documents ({(tenant.documents ? tenant.documents.length : 0) + leaseDocuments.length})
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab("communications")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === "communications" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Communications
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          
          {tenantLeases.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/20 gap-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-gray-900">Affichage pour :</span>
              </div>
              <select 
                value={selectedLeaseId} 
                onChange={(e) => setSelectedLeaseId(e.target.value)}
                className="bg-white border border-primary/20 text-sm font-medium text-gray-900 rounded-xl focus:ring-primary focus:border-primary block p-2.5 min-w-[250px] shadow-sm"
              >
                <option value="all">Tous les baux confondus (Vue globale)</option>
                {tenantLeases.map((l: any, idx: number) => (
                  <option key={l.id} value={l.id}>{getLeaseDisplayCode(l)} - {formatUnitDisplay(l.unit, idx + 1)} ({l.status})</option>
                ))}
              </select>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* KPI Loyer */}
            <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3 text-blue-600 group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                {selectedLeaseId !== "all" && displayedLeases[0]?.status === "RÉSILIÉ" ? "Loyer (Ancien)" : "Loyer actuel"}
              </h3>
              <p className="text-base xl:text-lg font-bold text-gray-900 whitespace-nowrap w-full px-1 leading-tight">
                {formatFCFA(currentRent)}
              </p>
            </div>

            {/* KPI Dette */}
            <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity ${computedDebt > 0 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-gray-200 to-gray-300'}`}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${computedDebt > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Dette en cours</h3>
              <p className={`text-base xl:text-lg font-bold whitespace-nowrap w-full px-1 leading-tight ${computedDebt > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {formatFCFA(computedDebt)}
              </p>
            </div>

            {/* KPI Avance / Retard */}
            <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity ${effectiveAdvance > 0 ? 'bg-gradient-to-r from-green-400 to-green-600' : effectiveAdvance < 0 || computedDebt > 0 ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'}`}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${effectiveAdvance > 0 ? 'bg-green-50 text-green-600' : effectiveAdvance < 0 || computedDebt > 0 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                {effectiveAdvance < 0 || computedDebt > 0 ? "Retard / En attente" : "Avance (Mois)"}
              </h3>
              {effectiveAdvance === 0 && computedDebt === 0 ? (
                <p className="text-lg xl:text-xl font-bold text-emerald-600 uppercase mt-1 leading-tight">À JOUR</p>
              ) : (
                <div className="flex flex-col items-center text-center w-full px-1">
                  {effectiveAdvance > 0 ? (
                    <>
                      <span className="text-[11px] sm:text-xs font-semibold text-green-700 uppercase tracking-wider mb-0.5">Prochain paiement</span>
                      <p className="text-base xl:text-lg font-bold text-green-600 leading-tight">
                        {periodStr}
                      </p>
                      <span className="text-[11px] sm:text-xs text-green-600 font-medium mt-1 leading-snug max-w-full break-words">
                        ({effectiveAdvance} mois d'avance - {lastPaidPeriodStr || periodStr})
                      </span>
                    </>
                  ) : (
                    <>
                      <p className={`text-base xl:text-lg font-bold leading-tight ${computedDebt > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                        {computedDebt > 0 ? formatFCFA(computedDebt) : periodStr}
                      </p>
                      {(effectiveAdvance < 0 || computedDebt > 0) && <span className="text-xs text-orange-600 font-medium mt-1 leading-snug">(paiement à régulariser)</span>}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* KPI Total Payé */}
            <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 to-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Total payé</h3>
              <p className="text-base xl:text-lg font-bold text-primary whitespace-nowrap w-full px-1 leading-tight">
                {formatFCFA(totalPaid)}
              </p>
            </div>
          </div>

          {/* Baux Actifs */}
          <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Baux actifs</h2>
              <button 
                type="button" 
                onClick={() => {
                  setLeaseOwnerFilter("");
                  setLeasePropertyFilter("");
                  setNewUnit("");
                  setIsNewLeaseModalOpen(true);
                }}
                className="text-sm font-medium text-primary hover:underline flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Nouveau bail
              </button>
            </div>
            <div className="p-4">
              {displayedLeases.length > 0 ? displayedLeases.map((lease: any) => (
                <div key={lease.id} className="border border-app-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 last:mb-0">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg"><FileText className="w-5 h-5 text-gray-500" /></div>
                    <div>
                      <Link href={`/app/baux/${lease.id}`} className="text-sm font-semibold text-primary hover:underline">
                        Bail {getLeaseDisplayCode(lease)}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">{lease.property} - Nomenclature {lease.unit}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {lease.start} → {lease.end}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="success" className="mb-2">{lease.status}</Badge>
                    <p className="text-sm font-bold text-gray-900">{formatFCFA(lease.rent)} / mois</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500 text-center py-4">Aucun bail actif pour ce locataire.</p>
              )}
            </div>
          </div>

          {/* Historique Table */}
          <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Historique des paiements</h2>
              <Link href="/app/paiements">
                <button type="button" className="text-sm font-medium text-primary hover:underline">Voir tout</button>
              </Link>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                    <th className="px-6 py-3 font-medium">Reçu</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Période</th>
                    {selectedLeaseId === "all" && <th className="px-6 py-3 font-medium">Bail</th>}
                    <th className="px-6 py-3 font-medium text-center">Montant</th>
                    <th className="px-6 py-3 font-medium text-center">Statut</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {displayedPayments.length > 0 ? displayedPayments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        {payment.status === "VALIDÉ" || payment.status === "PAYÉ" ? (
                          <Link href={`/app/paiements/${payment.id}`} className="text-sm font-semibold text-primary hover:underline">
                            {getPaymentDisplayCode(payment)}
                          </Link>
                        ) : (
                          <span className="text-sm font-semibold text-gray-400 cursor-not-allowed">
                            {getPaymentDisplayCode(payment)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {payment.date}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatPeriodLabel(payment.period)}
                      </td>
                      {selectedLeaseId === "all" && (
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                           {getLeaseDisplayCode(payment.leaseId || payment.lease_id || payment.leaseCode || "-")}
                        </td>
                      )}
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                        {formatFCFA(payment.amount)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-center">
                        <Badge dot variant={payment.status === "PAYÉ" ? "success" : "alert"}>
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleEditPayment(payment)}
                            className="p-1.5 text-gray-400 hover:text-primary bg-gray-50 hover:bg-primary/10 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeletePayment(payment.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={selectedLeaseId === "all" ? 7 : 6} className="px-6 py-8 text-center text-gray-500 text-sm">
                        Aucun paiement enregistré.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Infos persos */}
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
              Dossier Locataire
              <button 
                type="button" 
                onClick={openEditModal}
                className="text-xs text-primary hover:underline font-medium"
              >
                Éditer
              </button>
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">N° Pièce d'identité (CNI)</p>
                <p className="text-sm font-medium text-gray-900">{tenant.cni || "Non renseigné"}</p>
                {tenant.cniExpiry && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Valide jusqu'au : <span className={`font-medium ${new Date(tenant.cniExpiry) < new Date() ? 'text-red-500' : 'text-green-600'}`}>
                      {new Date(tenant.cniExpiry).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </p>
                )}
              </div>
              <div className="pt-3 border-t border-app-border">
                <p className="text-xs text-gray-500 mb-1">Profession</p>
                <p className="text-sm text-gray-900">{tenant.profession || "Non renseignée"}</p>
              </div>
              <div className="pt-3 border-t border-app-border">
                <p className="text-xs text-gray-500 mb-1">Employeur</p>
                <p className="text-sm text-gray-900">{tenant.employer || "Non renseigné"}</p>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
              Documents
              <button type="button" onClick={() => setIsAddDocumentModalOpen(true)} className="text-xs text-primary hover:underline font-medium"><Plus className="w-4 h-4" /></button>
            </h2>
            {((tenant.documents && tenant.documents.length > 0) || leaseDocuments.length > 0) ? (
              <div className="space-y-3">
                {/* Documents propres au locataire */}
                {tenant.documents && tenant.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between gap-2 p-3 border border-app-border rounded-xl group hover:border-primary transition-colors overflow-hidden">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><FileText className="w-4 h-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate" title={doc.name}>{doc.name}</p>
                        <p className="text-xs text-gray-500 truncate">Ajouté le {doc.date}</p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-1">
                      {doc.base64 ? (
                        <a href={doc.base64} download={doc.name} className="text-xs font-medium text-primary hover:underline whitespace-nowrap">Télécharger</a>
                      ) : (
                        <span className="text-xs font-medium text-gray-400 cursor-not-allowed whitespace-nowrap" title="Fichier non disponible">Indisponible</span>
                      )}
                    </div>
                  </div>
                ))}
                {/* Documents liés aux baux */}
                {leaseDocuments.map((doc: any) => (
                  <div key={`lease-${doc.id}`} className="flex items-center justify-between gap-2 p-3 border border-app-border rounded-xl hover:border-primary/50 transition-colors bg-primary/[0.02] overflow-hidden">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0"><FileText className="w-4 h-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate" title={doc.name}>{doc.name}</p>
                        <p className="text-xs text-gray-500 truncate">{doc.date}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 ml-1">{getLeaseDisplayCode(doc.leaseId)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Aucun document ajouté.</p>
            )}
          </div>

        </div>
      </div>
      )}

      {/* Modal d'encaissement */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Encaisser un loyer</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de paiement *</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Période payée (Mois) *</label>
                {(() => {
                  const activeLease = tenantLeases.find((l: any) => l.status === "ACTIF");
                  const monthOpts = getLeaseMonthOptions(activeLease, tenantPayments);
                  const prevCheck = checkPreviousMonthPaid(activeLease, newPeriod, tenantPayments);

                  return (
                    <>
                      <select 
                        className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-medium" 
                        value={newPeriod}
                        onChange={(e) => setNewPeriod(e.target.value)}
                      >
                        <option value="" disabled>-- Sélectionner la période --</option>
                        {monthOpts.options.map((opt) => (
                          <option 
                            key={opt.key} 
                            value={opt.value} 
                            disabled={opt.disabled}
                            className={opt.disabled ? "bg-gray-100 text-gray-400 font-normal cursor-not-allowed" : "text-gray-900 font-semibold"}
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {prevCheck.isPrevMonthUnpaid && (
                        <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs shadow-sm">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-amber-900">Mois précédent non réglé ({prevCheck.missingPrevMonthLabel})</p>
                            <p className="text-amber-800 mt-0.5">
                              Le locataire doit d'abord régler le loyer du mois précédent (<strong>{prevCheck.missingPrevMonthLabel}</strong>) avant de pouvoir enregistrer ce paiement.
                            </p>
                          </div>
                        </div>
                      )}
                      {monthOpts.paidPeriodLabels.length > 0 ? (
                        <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mt-1 shrink-0" />
                          <span>
                            <strong>Périodes déjà réglées (grisées) :</strong> {monthOpts.paidPeriodLabels.join(", ")}
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-green-600 mt-1.5">
                          ✓ Aucune période payée pour l'instant depuis le début du bail.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant encaissé (F CFA) *</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ex: 150000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                >
                  <option value="Virement">Virement</option>
                  <option value="Wave">Wave</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="MoMo">MoMo</option>
                  <option value="Moov money">Moov money</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Chèque">Chèque</option>
                </select>
              </div>
              {["Wave", "Orange Money", "MoMo", "Moov money"].includes(newMethod) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de transfert *</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    placeholder="Ex: CI230912..."
                    value={newTransferNumber}
                    onChange={(e) => setNewTransferNumber(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsPaymentModalOpen(false)} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              {(() => {
                const activeLease = tenantLeases.find((l: any) => l.status === "ACTIF");
                const prevCheck = checkPreviousMonthPaid(activeLease, newPeriod, tenantPayments);
                const isSaveDisabled = !newPeriod || !newAmount || prevCheck.isPrevMonthUnpaid || (["Wave", "Orange Money", "MoMo", "Moov money"].includes(newMethod) && !newTransferNumber);

                return (
                  <button 
                    onClick={handleSavePayment}
                    disabled={isSaveDisabled}
                    title={prevCheck.isPrevMonthUnpaid ? `Le mois précédent (${prevCheck.missingPrevMonthLabel}) doit d'abord être réglé.` : ""}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" /> Enregistrer le paiement
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout de document */}
      {isAddDocumentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Ajouter un document</h2>
              <button onClick={() => setIsAddDocumentModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du fichier *</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ex: CNI Recto"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier (PDF ou Image) *</label>
                <input 
                  type="file" 
                  accept="application/pdf, image/png, image/jpeg"
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  onChange={handleFileUpload}
                />
              </div>
            </div>
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsAddDocumentModalOpen(false)} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveDocument}
                disabled={!newDocName || !newDocFile}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" /> Enregistrer le document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Modifier le dossier locataire</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Informations Personnelles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° Pièce d'identité (CNI)</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editCni}
                      onChange={(e) => setEditCni(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Validité CNI</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-600" 
                      value={editCniExpiry}
                      onChange={(e) => setEditCniExpiry(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Coordonnées</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                    <input 
                      type="tel" 
                      inputMode="numeric"
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      placeholder="Ex: 0102030405"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Informations Professionnelles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editProfession}
                      onChange={(e) => setEditProfession(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employeur</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      value={editEmployer}
                      onChange={(e) => setEditEmployer(e.target.value)}
                    />
                  </div>
                </div>
              </div>

            </div>
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleUpdateTenant}
                disabled={!editName || !editPhone}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouveau Bail */}
      {isNewLeaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Nouveau Bail pour {tenant.name}</h2>
              <button onClick={() => setIsNewLeaseModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire</label>
                  <select 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={leaseOwnerFilter}
                    onChange={(e) => {
                      setLeaseOwnerFilter(e.target.value);
                      setLeasePropertyFilter("");
                      setNewUnit("");
                    }}
                  >
                    <option value="">Tous les propriétaires</option>
                    {owners.map(o => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bien immobilier</label>
                  <select 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={leasePropertyFilter}
                    onChange={(e) => {
                      setLeasePropertyFilter(e.target.value);
                      setNewUnit("");
                    }}
                  >
                    <option value="">Tous les biens</option>
                    {filteredModalBiens.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logement *</label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newUnit}
                  onChange={(e) => {
                    setNewUnit(e.target.value);
                    const selected = units.find(u => u.id === e.target.value);
                    if (selected) setNewRent(selected.rent.toString());
                  }}
                >
                  <option value="" disabled>-- Sélectionner un logement --</option>
                  {filteredModalUnits.map(u => (
                    <option key={u.id} value={u.id}>Logement {u.unit || u.id} - {u.property}</option>
                  ))}
                  {filteredModalUnits.length === 0 && <option value="" disabled>Aucun logement trouvé</option>}
                </select>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-2 pt-2">Conditions financières</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loyer de base (F CFA) *</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    value={newRent}
                    onChange={(e) => setNewRent(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Charges (F CFA)</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    value={newCharges}
                    onChange={(e) => setNewCharges(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de mois d'avance</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    value={newAvanceMonths}
                    onChange={(e) => setNewAvanceMonths(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de mois de caution</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    value={newCautionMonths}
                    onChange={(e) => setNewCautionMonths(e.target.value)}
                  />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-2 pt-2 border-t border-app-border">Période de location</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsNewLeaseModalOpen(false)} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveLease}
                disabled={!newUnit || !newStart || !newEnd || !newRent}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" /> Créer le bail
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Documents propres au locataire */}
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Documents du locataire</h2>
                <p className="text-xs text-gray-400 mt-0.5">Documents personnels ajoutés manuellement</p>
              </div>
              <button 
                onClick={() => setIsAddDocumentModalOpen(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </button>
            </div>
            <div className="space-y-3">
              {tenant.documents && tenant.documents.length > 0 ? (
                tenant.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 p-4 border border-app-border rounded-xl group hover:border-primary transition-colors overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate" title={doc.name}>{doc.name}</p>
                        <p className="text-xs text-gray-500 truncate">Ajouté le {doc.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (doc.base64) {
                            const a = document.createElement('a');
                            a.href = doc.base64;
                            a.download = doc.name;
                            a.click();
                          } else {
                            alert("Le fichier source n'est pas disponible pour le téléchargement.");
                          }
                        }}
                        className="text-sm text-primary hover:underline whitespace-nowrap"
                      >
                        Télécharger
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Aucun document personnel</p>
                </div>
              )}
            </div>
          </div>

          {/* Documents liés aux baux */}
          {leaseDocuments.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Documents des baux</h2>
                <p className="text-xs text-gray-400 mt-0.5">Documents liés aux contrats de bail du locataire</p>
              </div>
              <div className="space-y-3">
                {leaseDocuments.map((doc: any) => (
                  <div key={`lease-${doc.id}`} className="flex items-center justify-between gap-3 p-4 border border-app-border rounded-xl hover:border-primary/50 transition-colors overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate" title={doc.name}>{doc.name}</p>
                        <p className="text-xs text-gray-500 truncate">{doc.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <a
                        href={`/app/baux/${doc.leaseId}`}
                        className="text-xs font-medium bg-orange-50 text-orange-600 px-2.5 py-1 rounded-md hover:bg-orange-100 transition-colors whitespace-nowrap shrink-0"
                      >
                        {doc.leaseId}
                      </a>
                      {doc.base64 ? (
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = doc.base64;
                            a.download = doc.name;
                            a.click();
                          }}
                          className="text-sm text-primary hover:underline font-medium whitespace-nowrap"
                        >
                          Télécharger
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 cursor-not-allowed whitespace-nowrap" title="Fichier sans contenu binaire">Indisponible</span>
                      )}
                      <button
                        onClick={() => handleDeleteLeaseDoc(doc)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                        title="Supprimer le document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!tenant.documents?.length && leaseDocuments.length === 0 && (
            <div className="bg-white p-12 rounded-2xl border border-app-border shadow-sm text-center text-gray-400">
              <FileText className="w-14 h-14 mx-auto mb-4 opacity-20" />
              <p className="text-base font-medium">Aucun document pour le moment</p>
              <p className="text-sm mt-1">Ajoutez des documents personnels ou liez des documents via les baux.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "communications" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Signalements d'incidents & Communications
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Historique des réclamations techniques et messages transmis par {tenant.name}
                </p>
              </div>
              <span className="bg-primary/10 text-primary font-bold text-xs px-3 py-1.5 rounded-full w-fit">
                {tenantIncidents.length} incident(s) signalé(s)
              </span>
            </div>

            {tenantIncidents.length > 0 ? (
              <div className="space-y-4">
                {tenantIncidents.map((inc) => (
                  <div key={inc.id} className="p-5 border border-app-border rounded-xl bg-gray-50/50 hover:bg-white transition-colors space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-900 bg-gray-200 px-2 py-0.5 rounded">{getIncidentDisplayCode(inc.id)}</span>
                        <span className="text-xs text-gray-500">{inc.dateStr || inc.createdAt}</span>
                        {inc.isUrgent && (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Urgence
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Statut :</span>
                        <select
                          value={inc.status}
                          onChange={(e) => handleUpdateIncidentStatus(inc.id, e.target.value)}
                          className="text-xs font-semibold px-2.5 py-1 border border-app-border rounded-lg bg-white text-gray-800 cursor-pointer shadow-2xs"
                        >
                          <option value="EN ATTENTE">EN ATTENTE</option>
                          <option value="EN COURS">EN COURS</option>
                          <option value="RÉSOLU">RÉSOLU</option>
                        </select>
                        <Badge
                          dot
                          variant={
                            inc.status === "RÉSOLU" ? "success" : inc.status === "EN COURS" ? "warning" : "info"
                          }
                        >
                          {inc.status}
                        </Badge>
                        <button
                          onClick={() => handleDeleteSingleIncident(inc.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium ml-1"
                          title="Supprimer cet incident"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-900">{inc.type}</p>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed bg-white p-3 rounded-lg border border-app-border/60">
                        {inc.description}
                      </p>
                    </div>

                    {inc.files && inc.files.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Photos / Vidéos jointes ({inc.files.length}) :</p>
                        <div className="flex flex-wrap gap-2.5">
                          {inc.files.map((file: any, index: number) => {
                            const isImg = isImageFile(file);
                            const fileSrc = getFileSource(file);
                            const fileName = file.name || `Photo ${index + 1}`;

                            if (isImg && fileSrc) {
                              return (
                                <div
                                  key={index}
                                  onClick={() => setPreviewIncidentImage({ src: fileSrc, title: fileName })}
                                  className="relative group cursor-pointer overflow-hidden rounded-lg border border-app-border hover:border-primary transition-all bg-white"
                                >
                                  <img src={fileSrc} alt={fileName} className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition-transform" />
                                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={index} className="flex items-center space-x-2 p-2 bg-white border border-app-border rounded-lg">
                                <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded flex items-center justify-center shrink-0">
                                  <Video className="w-4 h-4" />
                                </div>
                                <span className="text-xs text-gray-700 truncate max-w-[120px]">{fileName}</span>
                                {fileSrc && (
                                  <a href={fileSrc} download={fileName} className="text-xs text-primary font-medium hover:underline ml-1">
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-semibold text-gray-700">Aucune communication ni incident signalé</p>
                <p className="text-xs text-gray-400 mt-1">Ce locataire n'a encore transmis aucun signalement technique.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isAddDocumentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Ajouter un document</h2>
              <button onClick={() => setIsAddDocumentModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du document *</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Ex: Contrat de bail, CNI..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier *</label>
                <input 
                  type="file" 
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-gray-500 mt-1">Format PDF, PNG ou JPG. (Moins de 2 Mo recommandé)</p>
              </div>
            </div>
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsAddDocumentModalOpen(false)} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveDocument}
                disabled={!newDocName || !newDocFile}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "communications" && (
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <p className="text-gray-500">Section Communications (à venir)</p>
        </div>
      )}

      {/* Modal Reçu de Bail */}
      {generatedReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-app-border shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Reçu d'Entrée - {generatedReceipt.leaseId}</h2>
              <button onClick={() => setGeneratedReceipt(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1" id="receipt-print-area">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-primary mb-2">REÇU DE PAIEMENT INITIAL</h1>
                <p className="text-gray-500">Date d'émission : {generatedReceipt.date}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4 tracking-wider flex items-center">
                    <IdCard className="w-4 h-4 mr-2 text-primary" />
                    Informations Locataire
                  </h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Nom complet</span> <span className="font-semibold text-gray-900">{generatedReceipt.tenant.name}</span></p>
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Contact</span> <span className="font-medium text-gray-900">{generatedReceipt.tenant.phone}</span></p>
                    {generatedReceipt.tenant.email && <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Email</span> <span className="font-medium text-gray-900">{generatedReceipt.tenant.email}</span></p>}
                    {generatedReceipt.tenant.cni && <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Pièce d'identité (CNI)</span> <span className="font-medium text-gray-900">{generatedReceipt.tenant.cni}</span></p>}
                    {generatedReceipt.tenant.cniExpiry && (
                      <p className="flex flex-col">
                        <span className="text-xs text-gray-400 uppercase">Validité CNI</span>
                        <span className={`font-medium ${new Date(generatedReceipt.tenant.cniExpiry) < new Date() ? 'text-red-500' : 'text-gray-900'}`}>
                          {new Date(generatedReceipt.tenant.cniExpiry).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          {new Date(generatedReceipt.tenant.cniExpiry) < new Date() && " (Expirée)"}
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
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Propriétaire</span> <span className="font-semibold text-gray-900">{generatedReceipt.owner}</span></p>
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Bien Immobilier</span> <span className="font-medium text-gray-900">{generatedReceipt.property}</span></p>
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Logement</span> <span className="font-medium text-gray-900">{generatedReceipt.unit}</span></p>
                    <p className="flex flex-col"><span className="text-xs text-gray-400 uppercase">Prise d'effet</span> <span className="font-medium text-gray-900">{generatedReceipt.startDate}</span></p>
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
                      <td className="px-6 py-4 text-right font-medium text-gray-700">{formatFCFA(generatedReceipt.rent)}</td>
                    </tr>
                    {generatedReceipt.charges > 0 && (
                      <tr className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">Charges locatives</span>
                          <div className="text-xs text-gray-500 mt-1">Forfait mensuel</div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-700">{formatFCFA(generatedReceipt.charges)}</td>
                      </tr>
                    )}
                    {(() => {
                      const totalMonthly = (Number(generatedReceipt.rent) || 0) + (Number(generatedReceipt.charges) || 0);
                      let avanceM = generatedReceipt.avanceMonths !== undefined && generatedReceipt.avanceMonths !== null && Number(generatedReceipt.avanceMonths) > 0 ? Number(generatedReceipt.avanceMonths) : 0;
                      let cautionM = generatedReceipt.cautionMonths !== undefined && generatedReceipt.cautionMonths !== null && Number(generatedReceipt.cautionMonths) > 0 ? Number(generatedReceipt.cautionMonths) : 0;

                      if (avanceM === 0 && cautionM === 0) {
                        if (generatedReceipt.depositTotal && totalMonthly > 0) {
                          const totalM = Math.round(generatedReceipt.depositTotal / totalMonthly);
                          if (totalM >= 4) {
                            avanceM = 2;
                            cautionM = totalM - 2;
                          } else if (totalM === 3) {
                            avanceM = 1;
                            cautionM = 2;
                          } else if (totalM === 2) {
                            avanceM = 2;
                            cautionM = 2;
                          } else {
                            cautionM = totalM;
                          }
                        } else {
                          avanceM = 2;
                          cautionM = 2;
                        }
                      }

                      const avanceTot = generatedReceipt.avanceTotal && generatedReceipt.avanceTotal > 0 ? generatedReceipt.avanceTotal : (avanceM * totalMonthly);
                      const cautionTot = generatedReceipt.cautionTotal && generatedReceipt.cautionTotal > 0 ? generatedReceipt.cautionTotal : (cautionM * totalMonthly);
                      const depositTot = generatedReceipt.depositTotal && generatedReceipt.depositTotal > 0 ? generatedReceipt.depositTotal : (avanceTot + cautionTot);

                      return (
                        <>
                          <tr className="bg-primary/5">
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-900">Avance sur loyer</span>
                              <div className="text-xs text-gray-600 mt-1">
                                Pour {avanceM} mois d'avance
                                {getAdvanceMonthLabels(generatedReceipt.startDate, avanceM) ? ` (${getAdvanceMonthLabels(generatedReceipt.startDate, avanceM)})` : ""}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900">{formatFCFA(avanceTot)}</td>
                          </tr>
                          <tr className="bg-primary/5">
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-900">Dépôt de garantie (Caution)</span>
                              <div className="text-xs text-gray-600 mt-1">Garantie sur {cautionM} mois</div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900">{formatFCFA(cautionTot)}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                  <tfoot className="bg-primary text-white">
                    <tr>
                      <td className="px-6 py-5 text-base font-bold uppercase tracking-wider">Total payé à l'entrée</td>
                      <td className="px-6 py-5 text-right text-xl font-bold">
                        {formatFCFA(generatedReceipt.depositTotal || ((((generatedReceipt.avanceMonths && Number(generatedReceipt.avanceMonths) > 0) ? Number(generatedReceipt.avanceMonths) : 2) + ((generatedReceipt.cautionMonths && Number(generatedReceipt.cautionMonths) > 0) ? Number(generatedReceipt.cautionMonths) : 2)) * ((Number(generatedReceipt.rent) || 0) + (Number(generatedReceipt.charges) || 0))))}
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
                onClick={() => setGeneratedReceipt(null)}
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
                      filename: `Recu-${generatedReceipt.leaseId}.pdf`,
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
                          <title>Reçu d'Entrée - ${generatedReceipt.leaseId}</title>
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
                <FileText className="w-4 h-4 mr-2" />
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Aperçu d'image en grand écran */}
      {previewIncidentImage && (
        <div 
          onClick={() => setPreviewIncidentImage(null)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col w-full"
          >
            <div className="p-3 bg-gray-900/90 text-white flex items-center justify-between border-b border-gray-800">
              <span className="text-xs font-semibold text-gray-200 truncate max-w-lg">{previewIncidentImage.title}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewIncidentImage.src}
                  download={previewIncidentImage.title || "incident-photo.jpg"}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-xs flex items-center gap-1.5 bg-gray-800/60 font-medium"
                  title="Télécharger l'image"
                >
                  <Download className="w-4 h-4" /> Télécharger
                </a>
                <button
                  onClick={() => setPreviewIncidentImage(null)}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/70 overflow-auto max-h-[82vh]">
              <img 
                src={previewIncidentImage.src} 
                alt={previewIncidentImage.title} 
                className="max-h-[78vh] w-auto max-w-full object-contain rounded-lg shadow-lg" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
