"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Plus, Search, FileText, Calendar, X, Save, Trash2, Key, Copy, Check, CheckCircle2, Download, CheckSquare } from "lucide-react";
import Link from "next/link";
import { ensureTenantCredentials, TenantCredential } from "@/lib/tenantCredentials";
import { getPdfTemplate, getReglementTemplate, getGenericTemplate, getOrGenerateContratTemplate, getOrGenerateReglementTemplate } from "@/lib/storage";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { checkAndAutoRenewLeases } from "@/lib/leaseRenewal";
import { loadAllDataFromDatabase, createLease, deleteLease, createPayment } from "@/lib/dataService";
import { formatUnitDisplay, getLeaseDisplayCode, formatFCFA, isUnitOccupied } from "@/lib/utils";

const initialLeases = [
  { id: "B-2026-084", tenant: "Cora Richards", unit: "A-101", property: "Résidence Les Flamboyants", start: "12 Août 2026", end: "11 Août 2027", rent: 165000, charges: 0, avanceMonths: 2, cautionMonths: 2, deposit: 660000, status: "ACTIF" },
  { id: "B-2026-085", tenant: "Alistair Dunlap", unit: "B-204", property: "Résidence Les Flamboyants", start: "01 Sept 2026", end: "31 Août 2027", rent: 220000, charges: 0, avanceMonths: 2, cautionMonths: 2, deposit: 880000, status: "ACTIF" },
  { id: "B-2026-086", tenant: "Bibi Shelton", unit: "A-102", property: "Résidence Les Flamboyants", start: "15 Sept 2026", end: "14 Sept 2027", rent: 165000, charges: 0, avanceMonths: 2, cautionMonths: 2, deposit: 660000, status: "EN ATTENTE" },
  { id: "B-2025-112", tenant: "Marc Antoine", unit: "A-101", property: "Résidence Les Flamboyants", start: "01 Juil 2024", end: "30 Juin 2026", rent: 165000, charges: 0, avanceMonths: 2, cautionMonths: 2, deposit: 660000, status: "RÉSILIÉ" },
];

const defaultBiens = [
  { id: "B-001", name: "Résidence Les Flamboyants", type: "Immeuble", owner: "Kouadio Invest", units: 24 },
  { id: "B-002", name: "Villa Palmeraie", type: "Villa", owner: "Jean Dupont", units: 1 },
];

const defaultUnits = [
  { id: "A-101", property: "Résidence Les Flamboyants", propertyId: "B-001", type: "3 Pièces", floor: "RDC", rent: 150000, charges: 15000, status: "OCCUPÉ" },
  { id: "A-102", property: "Résidence Les Flamboyants", propertyId: "B-001", type: "4 Pièces", floor: "RDC", rent: 200000, charges: 20000, status: "OCCUPÉ" },
  { id: "B-201", property: "Résidence Les Flamboyants", propertyId: "B-001", type: "3 Pièces", floor: "1er", rent: 150000, charges: 15000, status: "NON OCCUPÉ" },
  { id: "B-204", property: "Résidence Les Flamboyants", propertyId: "B-001", type: "2 Pièces", floor: "2ème", rent: 200000, charges: 20000, status: "OCCUPÉ" },
  { id: "V-001", property: "Villa Palmeraie", propertyId: "B-002", type: "Villa", floor: "RDC", rent: 800000, charges: 50000, status: "OCCUPÉ" },
];

const defaultOwners = [
  { id: "P-001", name: "Kouadio Invest" },
  { id: "P-002", name: "Jean Dupont" },
];

const defaultTenants = [
  { id: "T-892", name: "Cora Richards", phone: "+225 01 02 03 04 05", email: "cora.richards@email.com" },
  { id: "T-893", name: "Alistair Dunlap", phone: "+225 07 08 09 10 11", email: "alistair@email.com" },
  { id: "T-894", name: "Bibi Shelton", phone: "+225 05 06 07 08 09", email: "bibi@email.com" },
];

function BauxContent() {
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const unitParam = searchParams.get("unit") || searchParams.get("unitId");
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const [leases, setLeases] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous statuts");
  const [ownerFilter, setOwnerFilter] = useState("Tous les propriétaires");
  const [propertyFilter, setPropertyFilter] = useState("Tous les biens");

  const [owners, setOwners] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaseToDelete, setLeaseToDelete] = useState<any>(null);
  const [createdCredentials, setCreatedCredentials] = useState<TenantCredential | null>(null);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Bulk deletion states
  const [selectedLeaseIds, setSelectedLeaseIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Custom document templates list
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);

  useEffect(() => {
    let tpls: any[] = [];
    const savedCustom = localStorage.getItem("gestimmo_custom_templates_list");
    if (savedCustom) {
      try {
        tpls = JSON.parse(savedCustom);
      } catch (e) {}
    }
    const storedOwners = localStorage.getItem("gestimmo_proprietaires");
    if (storedOwners) {
      try {
        const owners = JSON.parse(storedOwners);
        owners.forEach((o: any) => {
          if (o.templates?.customTemplates) {
            o.templates.customTemplates.forEach((ct: any) => {
              if (!tpls.some((t: any) => t.id === ct.id || t.fileKey === ct.fileKey)) {
                tpls.push({ ...ct, ownerName: o.name });
              }
            });
          }
        });
      } catch (e) {}
    }
    setCustomTemplates(tpls);
  }, []);

  const handleDownloadCustomTemplate = async (template: any) => {
    try {
      let base64 = await getGenericTemplate(template.fileKey);
      if (!base64) base64 = localStorage.getItem(template.fileKey);
      if (!base64) {
        alert(`Aucun fichier PDF n'a été trouvé pour "${template.title}".`);
        return;
      }
      const a = document.createElement("a");
      a.href = base64;
      a.download = template.fileName.endsWith(".pdf") ? template.fileName : `${template.fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Erreur lors du téléchargement du modèle.");
    }
  };

  const handleDeleteLease = async (leaseId: string) => {
    await deleteLease(leaseId);
    const updated = leases.filter((l: any) => l.id !== leaseId);
    setLeases(updated);
    localStorage.setItem("gestimmo_baux", JSON.stringify(updated));
    setSelectedLeaseIds(prev => prev.filter(id => id !== leaseId));
    setLeaseToDelete(null);
  };

  const toggleSelectLease = (id: string) => {
    setSelectedLeaseIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (filteredLeases.length === 0) return;
    const allFilteredIds = filteredLeases.map(l => l.id);
    const allSelected = allFilteredIds.every(id => selectedLeaseIds.includes(id));
    if (allSelected) {
      setSelectedLeaseIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedLeaseIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleExecuteBulkDelete = async () => {
    for (const id of selectedLeaseIds) {
      await deleteLease(id);
    }
    const updatedLeases = leases.filter(l => !selectedLeaseIds.includes(l.id));
    setLeases(updatedLeases);
    localStorage.setItem("gestimmo_baux", JSON.stringify(updatedLeases));
    setSelectedLeaseIds([]);
    setIsBulkDeleteModalOpen(false);
  };
  
  // Modal form states
  const [newTenant, setNewTenant] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newRent, setNewRent] = useState("");
  const [newCharges, setNewCharges] = useState("0");
  const [newAvanceMonths, setNewAvanceMonths] = useState("");
  const [newCautionMonths, setNewCautionMonths] = useState("");

  // Modal filter states for Logement selection
  const [modalOwnerFilter, setModalOwnerFilter] = useState("");
  const [modalPropertyFilter, setModalPropertyFilter] = useState("");

  useEffect(() => {
    const initData = async () => {
      const dbState = await loadAllDataFromDatabase();
      if (dbState) {
        setLeases(dbState.leases);
        setTenants(dbState.tenants);
        setUnits(dbState.units);
        setOwners(dbState.owners);
        setBiens(dbState.properties);
      } else {
        const storedLeases = localStorage.getItem("gestimmo_baux");
        if (storedLeases) {
          const parsedL = JSON.parse(storedLeases);
          setLeases(checkAndAutoRenewLeases(parsedL));
        } else {
          setLeases(checkAndAutoRenewLeases(initialLeases));
        }
        const storedTenants = localStorage.getItem("gestimmo_locataires");
        setTenants(storedTenants ? JSON.parse(storedTenants) : defaultTenants);
        const storedUnits = localStorage.getItem("gestimmo_logements");
        setUnits(storedUnits ? JSON.parse(storedUnits) : defaultUnits);
        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        if (storedOwners) setOwners(JSON.parse(storedOwners));
        const storedBiens = localStorage.getItem("gestimmo_biens");
        if (storedBiens) setBiens(JSON.parse(storedBiens));
      }
    };

    initData();
  }, []);


  useEffect(() => {
    if (unitParam && units.length > 0 && !hasAutoOpened) {
      const targetId = unitParam.trim().toUpperCase();
      const foundUnit = units.find((u: any) => u.id && u.id.trim().toUpperCase() === targetId);
      if (foundUnit) {
        setNewUnit(foundUnit.id);
        setNewRent(foundUnit.rent ? foundUnit.rent.toString() : "");
        setNewCharges(foundUnit.charges !== undefined ? foundUnit.charges.toString() : "0");
        setModalPropertyFilter(foundUnit.property || "");

        const foundBien = biens.find((b: any) => 
          (b.name && foundUnit.property && b.name.trim().toUpperCase() === foundUnit.property.trim().toUpperCase()) ||
          (b.id && foundUnit.propertyId && b.id === foundUnit.propertyId)
        );

        if (foundBien && foundBien.owner) {
          setModalOwnerFilter(foundBien.owner);
        }
        setIsModalOpen(true);
        setHasAutoOpened(true);
      }
    }
  }, [unitParam, units, biens, hasAutoOpened]);

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

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

  const handleSaveLease = async () => {
    // Find unit to extract property name (scoped by modalPropertyFilter to avoid cross-property collision)
    const selectedUnit = units.find(u => 
      u.id === newUnit && 
      (!modalPropertyFilter || (u.property && u.property.trim().toUpperCase() === modalPropertyFilter.trim().toUpperCase()))
    ) || units.find(u => u.id === newUnit);
    const propertyName = selectedUnit ? selectedUnit.property : (modalPropertyFilter || "Bien Inconnu");
    const propertyId = selectedUnit ? selectedUnit.propertyId : undefined;

    const parsedRent = parseInt(newRent) || 0;
    const parsedCharges = parseInt(newCharges) || 0;
    const avance = parseInt(newAvanceMonths) || 0;
    const caution = parseInt(newCautionMonths) || 0;

    const upperTenant = newTenant.trim().toUpperCase();
    const upperUnit = newUnit.trim().toUpperCase();
    const upperProperty = propertyName.trim().toUpperCase();

    // Find unit_id and tenant_id from loaded data
    const unitObj = units.find(u => u.id === newUnit || u.unit_number === newUnit);
    const tenantObj = tenants.find(t => t.name?.trim().toUpperCase() === upperTenant || t.full_name?.trim().toUpperCase() === upperTenant);

    const dbLease = await createLease({
      unit_id: unitObj ? unitObj.id : null,
      tenant_id: tenantObj ? tenantObj.id : null,
      start_date: newStart,
      end_date: newEnd || null,
      rent_amount: parsedRent,
      charges_amount: parsedCharges,
      deposit_amount: (avance + caution) * (parsedRent + parsedCharges),
      status: 'ACTIF',
      avance_months: avance,
      caution_months: caution,
    });

    const newLeaseId = dbLease ? dbLease.id : `B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const yearStr = newStart ? new Date(newStart).getFullYear() : new Date().getFullYear();
    const leaseCode = `B-${yearStr}-${(dbLease?.id || Math.random().toString(36)).slice(0, 6).toUpperCase()}`;

    const newLease = {
      id: newLeaseId,
      code: leaseCode,
      tenant: upperTenant,
      unit: upperUnit,
      property: upperProperty,
      propertyId: propertyId,
      start: new Date(newStart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      end: new Date(newEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      rent: parsedRent,
      charges: parsedCharges,
      avanceMonths: avance,
      cautionMonths: caution,
      deposit: (avance + caution) * (parsedRent + parsedCharges),
      status: "ACTIF"
    };
    
    const updatedLeases = [newLease, ...leases];
    setLeases(updatedLeases);
    localStorage.setItem("gestimmo_baux", JSON.stringify(updatedLeases));

    // Mettre à jour le logement comme OCCUPÉ dans gestimmo_logements
    const storedUnits = localStorage.getItem("gestimmo_logements");
    if (storedUnits) {
      try {
        const parsedUnits = JSON.parse(storedUnits);
        const updatedUnits = parsedUnits.map((u: any) => {
          if (u.id === newUnit || u.unit === upperUnit || u.unit_number === upperUnit) {
            return { ...u, status: "OCCUPÉ", tenant: upperTenant };
          }
          return u;
        });
        localStorage.setItem("gestimmo_logements", JSON.stringify(updatedUnits));
        setUnits(updatedUnits);
        window.dispatchEvent(new Event("gestimmo_logements_updated"));
      } catch (e) {}
    }
    
    // Automatically generate payments based on Date de début & Nombre de mois d'avance
    const generatedPayments = generateLeaseInitialPayments(
      upperTenant,
      upperUnit,
      newStart,
      parsedRent,
      parsedCharges,
      avance,
      caution
    );

    // Save initial payments to Supabase if created
    for (const p of generatedPayments) {
      await createPayment({
        lease_id: dbLease ? dbLease.id : null,
        unit_id: unitObj ? unitObj.id : null,
        tenant_id: tenantObj ? tenantObj.id : null,
        amount: p.amount,
        payment_date: new Date().toISOString().split('T')[0],
        period_month: p.period,
        payment_method: p.method === 'AVANCE' ? 'ESPÈCES' : 'ESPÈCES',
        status: p.status === 'PAYÉ' ? 'PAYÉ' : 'EN_ATTENTE',
      });
    }

    const storedPayments = localStorage.getItem("gestimmo_paiements");
    let currentPayments = storedPayments ? JSON.parse(storedPayments) : [];
    currentPayments = [...generatedPayments, ...currentPayments];
    localStorage.setItem("gestimmo_paiements", JSON.stringify(currentPayments));

    // Automatically generate/ensure login and password for locataire
    const creds = ensureTenantCredentials(upperTenant, upperUnit, upperProperty, parsedRent + parsedCharges);
    setCreatedCredentials(creds);

    // Reset and close lease form, open credentials modal
    setNewTenant("");
    setNewUnit("");
    setNewStart("");
    setNewEnd("");
    setNewRent("");
    setNewCharges("0");
    setNewAvanceMonths("");
    setNewCautionMonths("");
    setModalOwnerFilter("");
    setModalPropertyFilter("");
    setIsModalOpen(false);
    if (can("locataires", "viewCredentials")) {
      setIsCredentialModalOpen(true);
    }
  };

  const filteredLeases = leases.filter((lease) => {
    const term = searchTerm.toLowerCase();
    const displayCode = getLeaseDisplayCode(lease).toLowerCase();
    const matchSearch = lease.tenant.toLowerCase().includes(term) || 
                        displayCode.includes(term) ||
                        lease.id.toLowerCase().includes(term) ||
                        lease.unit.toLowerCase().includes(term);
    
    let matchStatus = true;
    if (statusFilter !== "Tous statuts") {
      matchStatus = lease.status.toLowerCase() === statusFilter.toLowerCase().replace('é', 'e'); 
      // simple normalize for 'résiliés'
      if (statusFilter === "Résiliés") matchStatus = lease.status === "RÉSILIÉ";
      if (statusFilter === "Actifs") matchStatus = lease.status === "ACTIF";
      if (statusFilter === "En attente") matchStatus = lease.status === "EN ATTENTE";
    }

    let matchOwner = true;
    if (ownerFilter !== "Tous les propriétaires") {
       const propertyObj = biens.find(b => b.name === lease.property);
       if (propertyObj) {
         matchOwner = propertyObj.owner === ownerFilter;
       } else {
         matchOwner = false;
       }
    }

    let matchProperty = true;
    if (propertyFilter !== "Tous les biens") {
       matchProperty = lease.property === propertyFilter;
    }

    return matchSearch && matchStatus && matchOwner && matchProperty;
  }).sort((a, b) => {
    const parseLeaseDate = (item: any) => {
      const raw = item.startDate || item.start_date || item.start || item.createdAt || item.created_at;
      if (!raw) return 0;
      const ts = Date.parse(raw);
      if (!isNaN(ts)) return ts;
      return 0;
    };
    return parseLeaseDate(b) - parseLeaseDate(a);
  });

  const filteredBiens = ownerFilter === "Tous les propriétaires" 
    ? biens 
    : biens.filter(b => b.owner === ownerFilter);

  // Modal computed filters
  const allModalOwners = Array.from(new Set([
    ...owners.map(o => o.name),
    ...biens.map(b => b.owner).filter(Boolean),
    modalOwnerFilter
  ])).filter(Boolean);

  const filteredModalBiens = modalOwnerFilter
    ? biens.filter(b => b.owner === modalOwnerFilter || (modalPropertyFilter && b.name === modalPropertyFilter))
    : biens;

  const filteredModalUnits = units.filter(u => {
    const uId = (u.id || "").toString().trim().toUpperCase();
    const uNum = (u.unit_number || u.unit || u.name || "").toString().trim().toUpperCase();

    // Toujours inclure le logement sélectionné s'il est en cours d'attribution
    if (newUnit) {
      const selectedId = newUnit.toString().trim().toUpperCase();
      if (selectedId && (uId === selectedId || uNum === selectedId)) return true;
    }

    // Exclure rigoureusement les logements occupés (statut, locataire assigné ou bail actif)
    if (isUnitOccupied(u, leases)) return false;

    let matchOwner = true;
    if (modalOwnerFilter) {
      const bObj = biens.find(b => b.name && u.property && b.name.trim().toUpperCase() === u.property.trim().toUpperCase());
      if (bObj) {
        matchOwner = bObj.owner === modalOwnerFilter;
      }
    }

    let matchProperty = true;
    if (modalPropertyFilter) {
      matchProperty = u.property && u.property.trim().toUpperCase() === modalPropertyFilter.trim().toUpperCase();
    }

    return matchOwner && matchProperty;
  });

  const handleDownloadModeleContrat = async () => {
    try {
      let base64: string | null = null;
      let fileName = "Contrat_Bail_Standard_CI.pdf";
      let contratFileKey: string | undefined = undefined;

      if (ownerFilter) {
        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        if (storedOwners) {
          try {
            const owners = JSON.parse(storedOwners);
            const o = owners.find((x: any) => 
              (x.name && x.name.trim().toLowerCase() === ownerFilter.trim().toLowerCase()) ||
              (x.full_name && x.full_name.trim().toLowerCase() === ownerFilter.trim().toLowerCase())
            );
            if (o?.templates?.contratFileKey) {
              contratFileKey = o.templates.contratFileKey;
              base64 = await getGenericTemplate(o.templates.contratFileKey);
              if (o.templates.contratFileName) fileName = o.templates.contratFileName;
            }
          } catch (e) {}
        }
      }
      if (!base64) {
        base64 = await getOrGenerateContratTemplate(ownerFilter || undefined, contratFileKey);
      }
      if (!base64) {
        alert("Impossible de préparer le modèle de contrat.");
        return;
      }
      const rawName = fileName ? fileName.replace(" (Sauvegardé)", "").replace(" (Actif)", "").trim() : "Contrat_Bail_Standard_CI.pdf";
      const a = document.createElement("a");
      a.href = base64;
      a.download = rawName.endsWith(".pdf") ? rawName : `${rawName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Impossible de télécharger le modèle de contrat.");
    }
  };

  const handleDownloadModeleReglement = async () => {
    try {
      let base64: string | null = null;
      let fileName = "Reglement_Interieur_Standard.pdf";
      let reglementFileKey: string | undefined = undefined;

      if (ownerFilter) {
        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        if (storedOwners) {
          try {
            const owners = JSON.parse(storedOwners);
            const o = owners.find((x: any) => 
              (x.name && x.name.trim().toLowerCase() === ownerFilter.trim().toLowerCase()) ||
              (x.full_name && x.full_name.trim().toLowerCase() === ownerFilter.trim().toLowerCase())
            );
            if (o?.templates?.reglementFileKey) {
              reglementFileKey = o.templates.reglementFileKey;
              base64 = await getGenericTemplate(o.templates.reglementFileKey);
              if (o.templates.reglementFileName) fileName = o.templates.reglementFileName;
            }
          } catch (e) {}
        }
      }
      if (!base64) {
        base64 = await getOrGenerateReglementTemplate(ownerFilter || undefined, reglementFileKey);
      }
      if (!base64) {
        alert("Impossible de préparer le modèle de règlement intérieur.");
        return;
      }
      const rawName = fileName ? fileName.replace(" (Sauvegardé)", "").replace(" (Actif)", "").trim() : "Reglement_Interieur_Standard.pdf";
      const a = document.createElement("a");
      a.href = base64;
      a.download = rawName.endsWith(".pdf") ? rawName : `${rawName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Impossible de télécharger le modèle de règlement intérieur.");
    }
  };

  if (!can("baux", "view")) {
    return <AccessDeniedCard moduleName="Baux & Contrats" />;
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 relative">
      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Nouveau Bail</h2>
              <button 
                onClick={() => {
                  setModalOwnerFilter("");
                  setModalPropertyFilter("");
                  setIsModalOpen(false);
                }} 
                className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Informations générales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Locataire *</label>
                  <select 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={newTenant}
                    onChange={(e) => setNewTenant(e.target.value)}
                  >
                    <option value="" disabled>-- Sélectionner un locataire --</option>
                    {tenants.filter(t => !leases.some(l => l.tenant === t.name && l.status === "ACTIF")).map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                    {tenants.filter(t => !leases.some(l => l.tenant === t.name && l.status === "ACTIF")).length === 0 && tenants.length > 0 && <option value="" disabled>Aucun locataire disponible</option>}
                    {tenants.length === 0 && <option value="Nouveau Locataire">Nouveau Locataire (Exemple)</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire</label>
                  <select 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={modalOwnerFilter}
                    onChange={(e) => {
                      setModalOwnerFilter(e.target.value);
                      setModalPropertyFilter("");
                      setNewUnit("");
                    }}
                  >
                    <option value="">Tous les propriétaires</option>
                    {allModalOwners.map(ownerName => (
                      <option key={ownerName} value={ownerName}>{ownerName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bien immobilier</label>
                  <select 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={modalPropertyFilter}
                    onChange={(e) => {
                      setModalPropertyFilter(e.target.value);
                      setNewUnit("");
                    }}
                  >
                    <option value="">Tous les biens</option>
                    {filteredModalBiens.map(b => (
                      <option key={b.id || b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
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
                    {filteredModalUnits.length === 0 && units.length > 0 && <option value="" disabled>Aucun logement disponible</option>}
                    {units.length === 0 && <option value="A-101">Appartement A-101</option>}
                  </select>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-2 pt-2 border-t border-app-border">Conditions financières</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loyer convenu (F CFA) *</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    placeholder="Ex: 150000"
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
              <div className="grid grid-cols-2 gap-4 mb-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin *</label>
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
                onClick={() => {
                  setModalOwnerFilter("");
                  setModalPropertyFilter("");
                  setIsModalOpen(false);
                }} 
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveLease}
                disabled={!newTenant || !newUnit || !newStart || !newEnd || !newRent}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" /> Créer le bail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Baux & Contrats</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez l'ensemble des contrats de location.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleDownloadModeleContrat}
            className="bg-white border border-app-border text-gray-700 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
            title="Télécharger le modèle de contrat de bail en PDF"
          >
            <Download className="h-4 w-4 mr-2 text-primary" /> Modèle Contrat (PDF)
          </button>
          <button
            onClick={handleDownloadModeleReglement}
            className="bg-white border border-app-border text-gray-700 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
            title="Télécharger le modèle de règlement intérieur en PDF"
          >
            <Download className="h-4 w-4 mr-2 text-primary" /> Modèle Règlement Intérieur (PDF)
          </button>
          {customTemplates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleDownloadCustomTemplate(tpl)}
              className="bg-white border border-app-border text-gray-700 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
              title={`Télécharger ${tpl.title} en PDF`}
            >
              <Download className="h-4 w-4 mr-2 text-primary" /> {tpl.title} (PDF)
            </button>
          ))}
          {can("baux", "edit") && (
            <button 
              onClick={() => {
                setModalOwnerFilter("");
                setModalPropertyFilter("");
                setIsModalOpen(true);
              }} 
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm w-fit"
            >
              <Plus className="h-4 w-4 mr-2" /> Nouveau bail
            </button>
          )}
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedLeaseIds.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span>{selectedLeaseIds.length} bail(s) sélectionné(s)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedLeaseIds([])}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Désélectionner tout
            </button>
            {can("baux", "delete") && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Supprimer la sélection ({selectedLeaseIds.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-app-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Rechercher un bail..." 
                className="pl-9 pr-4 py-2 border border-app-border rounded-lg text-sm w-full sm:w-80 outline-none focus:ring-2 focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={ownerFilter}
                onChange={(e) => {
                  setOwnerFilter(e.target.value);
                  setPropertyFilter("Tous les biens"); // Reset property filter
                }}
              >
                <option>Tous les propriétaires</option>
                {Array.from(new Set(owners.map(o => o.name).filter(Boolean))).map(ownerName => (
                  <option key={ownerName} value={ownerName}>{ownerName}</option>
                ))}
              </select>

              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
              >
                <option>Tous les biens</option>
                {filteredBiens.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>

              <select 
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Tous statuts</option>
                <option>Actifs</option>
                <option>En attente</option>
                <option>Résiliés</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                <th className="px-3 py-3.5 text-center w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary cursor-pointer"
                    checked={filteredLeases.length > 0 && filteredLeases.every(l => selectedLeaseIds.includes(l.id))}
                    onChange={toggleSelectAll}
                    title="Sélectionner tous les baux"
                  />
                </th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">N° Bail</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Locataire</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium">Logement</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Période</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Loyer</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-center">Statut</th>
                <th className="px-4 py-3.5 md:px-6 md:py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filteredLeases.length > 0 ? filteredLeases.map((lease, index) => {
                const cleanUnit = formatUnitDisplay(lease.unit, index + 1);
                const displayUnit = cleanUnit.toLowerCase().startsWith("studio") || cleanUnit.toLowerCase().startsWith("appartement") || cleanUnit.toLowerCase().startsWith("villa") || cleanUnit.toLowerCase().startsWith("magasin") ? cleanUnit : `Appartement ${cleanUnit}`;
                return (
                <tr key={lease.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-3 py-4 text-center whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary cursor-pointer"
                      checked={selectedLeaseIds.includes(lease.id)}
                      onChange={() => toggleSelectLease(lease.id)}
                    />
                  </td>
                  <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 mr-2 shrink-0" />
                      <Link href={`/app/baux/${lease.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary hover:underline">
                        {getLeaseDisplayCode(lease)}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {lease.tenant}
                  </td>
                  <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{displayUnit}</p>
                    <p className="text-xs text-gray-500">{lease.property}</p>
                  </td>
                  <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                    <div className="flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0" />
                      {lease.start} → {lease.end}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                    {formatFCFA(lease.rent)}
                  </td>
                  <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-center">
                    <Badge dot variant={lease.status === "ACTIF" ? "success" : lease.status === "EN ATTENTE" ? "warning" : "default"} className={lease.status === "RÉSILIÉ" ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border-none" : ""}>
                      {lease.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 md:px-6 md:py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/app/baux/${lease.id}`}>
                        <button className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5 border border-app-border rounded-lg hover:bg-gray-50">
                          Consulter
                        </button>
                      </Link>
                      {can("baux", "delete") && (
                        <button 
                          onClick={() => setLeaseToDelete(lease)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                          title="Supprimer le bail"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
              }) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Aucun bail trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {leaseToDelete && (
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
              Êtes-vous sûr de vouloir supprimer le bail <strong className="text-gray-900">{getLeaseDisplayCode(leaseToDelete)}</strong> pour le locataire <strong className="text-gray-900">{leaseToDelete.tenant}</strong> ({leaseToDelete.property} - {formatUnitDisplay(leaseToDelete.unit)}) ?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setLeaseToDelete(null)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={() => handleDeleteLease(leaseToDelete.id)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-red-50/50">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Supprimer {selectedLeaseIds.length} bail(s)</h3>
                  <p className="text-xs text-red-600 font-medium">Action irréversible</p>
                </div>
              </div>
              <button onClick={() => setIsBulkDeleteModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Êtes-vous sûr de vouloir supprimer définitivement les <strong>{selectedLeaseIds.length} bail(s)</strong> sélectionnés ?
              </p>
              <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                {leases.filter(l => selectedLeaseIds.includes(l.id)).map(l => (
                  <div key={l.id} className="text-xs text-gray-700 flex justify-between items-center py-1 border-b border-gray-100 last:border-none">
                    <span className="font-semibold text-gray-900">{getLeaseDisplayCode(l)}</span>
                    <span className="text-gray-500">{l.tenant} ({l.property} - {l.unit})</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-app-border bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleExecuteBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Supprimer la sélection ({selectedLeaseIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Credentials Success Modal */}
      {isCredentialModalOpen && createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shrink-0">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Bail créé avec succès !</h3>
                  <p className="text-xs text-gray-500">Identifiants d'accès générés pour le locataire</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCredentialModalOpen(false)} 
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 rounded-xl border border-blue-100 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60 text-xs">
                <span className="text-gray-500">Locataire :</span>
                <span className="font-semibold text-gray-900">{createdCredentials.name}</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Identifiant / Login :</label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-primary select-all">
                    {createdCredentials.login}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Mot de passe temporaire :</label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-emerald-600 select-all">
                    {createdCredentials.password}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center text-xs text-gray-500 bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200">
              <CheckCircle2 className="w-4 h-4 text-amber-600 mr-2 shrink-0" />
              Le locataire peut désormais se connecter sur l'Espace Locataire à l'aide de ces identifiants.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => {
                  const textToCopy = `Bonjour ${createdCredentials.name},\nVoici vos identifiants pour accéder à votre espace locataire GESTIMMO :\nIdentifiant: ${createdCredentials.login}\nMot de passe: ${createdCredentials.password}`;
                  navigator.clipboard.writeText(textToCopy);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 3000);
                }}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
              >
                {isCopied ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : <Copy className="w-4 h-4 mr-2 text-gray-500" />}
                {isCopied ? "Copié !" : "Copier les accès"}
              </button>

              <button 
                onClick={() => setIsCredentialModalOpen(false)}
                className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BauxPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Chargement...</div>}>
      <BauxContent />
    </Suspense>
  );
}
