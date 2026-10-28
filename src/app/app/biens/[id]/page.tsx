"use client";

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { 
  ArrowLeft, Building2, MapPin, Pencil, Trash2, Search, Plus, Home, X, Save, 
  Loader2, FileText, Download, Eye, Upload, File, FileCheck, CheckCircle2, 
  AlertCircle, Clock, Banknote, Percent, TrendingUp, Calendar, Filter, 
  ExternalLink, Printer, Shield, FolderOpen, ArrowRightLeft, FileSpreadsheet,
  Check, FilePlus, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatUnitDisplay, formatFCFA, cn } from "@/lib/utils";
import { loadAllDataFromDatabase, updateProperty, deleteProperty } from "@/lib/dataService";
import { saveGenericTemplate, getGenericTemplate, deleteGenericTemplate } from "@/lib/storage";

export interface PropertyDocument {
  id: string;
  title: string;
  category: "Titre de propriété" | "Mandat de gestion" | "Assurance" | "Plans & Architecture" | "Règlement intérieur" | "Factures & Travaux" | "Autre";
  dateAdded: string;
  fileName: string;
  fileSize?: string;
  fileKey?: string;
  description?: string;
}

const defaultProperties = [
  { id: "B-001", name: "Résidence Les Flamboyants", type: "Immeuble", address: "Rue des Jardins, Cocody, Abidjan", owner: "Kouadio Invest", unitsCount: 24, occupiedCount: 22, revenue: 3500000, unpaid: 150000, description: "Immeuble R+4 de haut standing comprenant 24 appartements (3 et 4 pièces) avec parking souterrain et sécurité 24/7.", commission: 10 },
  { id: "B-002", name: "Villa Palmeraie", type: "Villa", address: "Palmeraie, Cocody", owner: "Jean Dupont", unitsCount: 1, occupiedCount: 1, revenue: 850000, unpaid: 0, description: "Villa duplex 6 pièces avec piscine.", commission: 8 },
];

const defaultUnits = [
  { id: "A-101", type: "3 Pièces", floor: "RDC", tenant: "Cora Richards", rent: 150000, status: "OCCUPÉ" },
  { id: "A-102", type: "4 Pièces", floor: "RDC", tenant: "Bibi Shelton", rent: 200000, status: "OCCUPÉ" },
  { id: "B-201", type: "3 Pièces", floor: "1er", tenant: "-", rent: 150000, status: "NON OCCUPÉ" },
  { id: "B-202", type: "4 Pièces", floor: "1er", tenant: "Alistair Dunlap", rent: 200000, status: "OCCUPÉ" },
];

export default function PropertyDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [property, setProperty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "logements" | "finances" | "documents">("overview");

  const [logements, setLogements] = useState<any[]>([]);
  const [baux, setBaux] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [locataires, setLocataires] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [reversements, setReversements] = useState<any[]>([]);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);

  // Finances tab state
  const [financialSubTab, setFinancialSubTab] = useState<"encaissements" | "reversements">("encaissements");
  const [financialSearch, setFinancialSearch] = useState("");
  const [financialPeriodFilter, setFinancialPeriodFilter] = useState("all");
  const [financialStatusFilter, setFinancialStatusFilter] = useState("all");

  // Documents tab state
  const [docCategoryFilter, setDocCategoryFilter] = useState("all");
  const [docSearch, setDocSearch] = useState("");
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocCategory, setNewDocCategory] = useState<PropertyDocument["category"]>("Titre de propriété");
  const [newDocFileName, setNewDocFileName] = useState("");
  const [newDocFileSize, setNewDocFileSize] = useState("");
  const [newDocFileBase64, setNewDocFileBase64] = useState<string | null>(null);
  const [newDocDescription, setNewDocDescription] = useState("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PropertyDocument | null>(null);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("Immeuble");
  const [editAddress, setEditAddress] = useState("");
  const [editCommission, setEditCommission] = useState(10);
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openEditModal = () => {
    if (!property) return;
    setEditName(property.name || "");
    setEditType(property.type || "Immeuble");
    setEditAddress(property.address || "");
    setEditCommission(property.commission !== undefined && property.commission !== null ? property.commission : 10);
    setEditDescription(property.description || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!property || !editName.trim()) return;
    setIsSaving(true);
    try {
      const updatedFields = {
        name: editName.trim(),
        type: editType,
        address: editAddress.trim(),
        commission: Number(editCommission) || 10,
        description: editDescription.trim(),
      };
      await updateProperty(property.id, updatedFields);

      const updatedProp = { ...property, ...updatedFields };
      setProperty(updatedProp);

      const stored = localStorage.getItem("gestimmo_biens");
      if (stored) {
        const list = JSON.parse(stored);
        const idx = list.findIndex((p: any) => p.id === property.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...updatedFields };
          localStorage.setItem("gestimmo_biens", JSON.stringify(list));
        }
      }
      setIsEditModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!property) return;
    setIsDeleting(true);
    try {
      await deleteProperty(property.id);
      const stored = localStorage.getItem("gestimmo_biens");
      if (stored) {
        const list = JSON.parse(stored).filter((p: any) => p.id !== property.id);
        localStorage.setItem("gestimmo_biens", JSON.stringify(list));
      }
      router.push("/app/biens");
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
    }
  };

  const loadDocuments = (propId: string) => {
    try {
      const storageKey = `gestimmo_property_documents_${propId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setDocuments(JSON.parse(stored));
        return;
      }

      // Default initial templates for standard property
      const defaultDocs: PropertyDocument[] = [
        {
          id: `DOC-TF-${propId}`,
          title: "Titre Foncier N° 45.892 - Cocody Danga",
          category: "Titre de propriété",
          dateAdded: "12 Janv 2024",
          fileName: "Titre_Foncier_45892.pdf",
          fileSize: "2.4 Mo",
          description: "Certificat d'inscription foncière et titre de propriété notarié."
        },
        {
          id: `DOC-MDG-${propId}`,
          title: "Mandat de Gestion Exclusive N° MDG-2024-08",
          category: "Mandat de gestion",
          dateAdded: "15 Janv 2024",
          fileName: "Mandat_Gestion_Gestimmo.pdf",
          fileSize: "1.8 Mo",
          description: "Contrat de gestion locative tripartite avec commission de gérance."
        },
        {
          id: `DOC-ASSUR-${propId}`,
          title: "Police Assurance Multirisque Immeuble - Sanlam CI",
          category: "Assurance",
          dateAdded: "01 Fév 2026",
          fileName: "Assurance_Multirisque_2026.pdf",
          fileSize: "3.1 Mo",
          description: "Couverture incendie, dégâts des eaux, responsabilité civile immeuble."
        },
        {
          id: `DOC-PLAN-${propId}`,
          title: "Plan de masse architectural R+4 & Coupes",
          category: "Plans & Architecture",
          dateAdded: "20 Oct 2023",
          fileName: "Plans_Architecturaux_R+4.pdf",
          fileSize: "5.2 Mo",
          description: "Plans d'exécution cotés avec distribution des 24 appartements."
        },
        {
          id: `DOC-REG-${propId}`,
          title: "Règlement intérieur de la Résidence",
          category: "Règlement intérieur",
          dateAdded: "15 Janv 2024",
          fileName: "Reglement_Interieur_Residence.pdf",
          fileSize: "850 Ko",
          description: "Règles d'occupation, parties communes, sécurité et nuisances."
        }
      ];
      localStorage.setItem(storageKey, JSON.stringify(defaultDocs));
      setDocuments(defaultDocs);
    } catch (e) {
      console.error("Error loading property documents:", e);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const dbState = await loadAllDataFromDatabase();
      if (dbState) {
        const found = dbState.properties.find((p: any) => p.id === params.id || p.name === params.id);
        setProperty(found);
        setLogements(dbState.units || []);
        setBaux(dbState.leases || []);
        setPaiements(dbState.payments || []);
        setLocataires(dbState.tenants || []);
        setOwners(dbState.owners || []);
        setReversements(dbState.payouts || []);
      } else {
        const stored = localStorage.getItem("gestimmo_biens");
        const all = stored ? JSON.parse(stored) : defaultProperties;
        const found = all.find((p: any) => p.id === params.id || p.name === params.id);
        setProperty(found);

        const storedLogements = localStorage.getItem("gestimmo_logements");
        if (storedLogements) setLogements(JSON.parse(storedLogements));

        const storedBaux = localStorage.getItem("gestimmo_baux");
        if (storedBaux) setBaux(JSON.parse(storedBaux));

        const storedPaiements = localStorage.getItem("gestimmo_paiements");
        if (storedPaiements) setPaiements(JSON.parse(storedPaiements));
        
        const storedLocataires = localStorage.getItem("gestimmo_locataires");
        if (storedLocataires) setLocataires(JSON.parse(storedLocataires));

        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        if (storedOwners) setOwners(JSON.parse(storedOwners));

        const storedReversements = localStorage.getItem("gestimmo_reversements");
        if (storedReversements) setReversements(JSON.parse(storedReversements));
      }

      loadDocuments(params.id);
    };

    loadData();

    const handleSync = () => loadData();
    window.addEventListener("storage", handleSync);
    window.addEventListener("gestimmo_logements_updated", handleSync);
    window.addEventListener("gestimmo_paiements_updated", handleSync);
    window.addEventListener("gestimmo_reversements_updated", handleSync);
    window.addEventListener("gestimmo_property_documents_updated", handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("gestimmo_logements_updated", handleSync);
      window.removeEventListener("gestimmo_paiements_updated", handleSync);
      window.removeEventListener("gestimmo_reversements_updated", handleSync);
      window.removeEventListener("gestimmo_property_documents_updated", handleSync);
    };
  }, [params.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewDocFileName(file.name);
    const sizeInMo = (file.size / (1024 * 1024)).toFixed(1);
    const sizeInKo = Math.round(file.size / 1024);
    setNewDocFileSize(file.size >= 1024 * 1024 ? `${sizeInMo} Mo` : `${sizeInKo} Ko`);

    if (!newDocTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setNewDocTitle(cleanName);
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewDocFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDocument = async () => {
    if (!property || !newDocTitle.trim()) return;
    setIsUploadingDoc(true);
    try {
      const docId = `DOC-${Date.now()}`;
      const fileKey = `doc_prop_${property.id}_${docId}`;

      if (newDocFileBase64) {
        await saveGenericTemplate(fileKey, newDocFileBase64);
      }

      const newDoc: PropertyDocument = {
        id: docId,
        title: newDocTitle.trim(),
        category: newDocCategory,
        dateAdded: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
        fileName: newDocFileName || `${newDocTitle.trim().replace(/\s+/g, "_")}.pdf`,
        fileSize: newDocFileSize || "Fichier PDF",
        fileKey: newDocFileBase64 ? fileKey : undefined,
        description: newDocDescription.trim() || undefined
      };

      const updatedDocs = [newDoc, ...documents];
      setDocuments(updatedDocs);
      localStorage.setItem(`gestimmo_property_documents_${property.id}`, JSON.stringify(updatedDocs));
      window.dispatchEvent(new Event("gestimmo_property_documents_updated"));

      setNewDocTitle("");
      setNewDocCategory("Titre de propriété");
      setNewDocFileName("");
      setNewDocFileSize("");
      setNewDocFileBase64(null);
      setNewDocDescription("");
      setIsAddDocModalOpen(false);
    } catch (e) {
      console.error("Error saving document:", e);
      alert("Erreur lors de l'enregistrement du document.");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!property || !window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce document ?")) return;
    try {
      const doc = documents.find(d => d.id === docId);
      if (doc?.fileKey) {
        await deleteGenericTemplate(doc.fileKey);
      }
      const updatedDocs = documents.filter(d => d.id !== docId);
      setDocuments(updatedDocs);
      localStorage.setItem(`gestimmo_property_documents_${property.id}`, JSON.stringify(updatedDocs));
      window.dispatchEvent(new Event("gestimmo_property_documents_updated"));
    } catch (e) {
      console.error("Error deleting document:", e);
    }
  };

  const handleDownloadDocument = async (doc: PropertyDocument) => {
    try {
      if (doc.fileKey) {
        const base64 = await getGenericTemplate(doc.fileKey);
        if (base64) {
          const a = document.createElement("a");
          a.href = base64;
          a.download = doc.fileName || `${doc.title}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
      }

      // Generate a structured certified PDF document on the fly if no raw base64 is in IndexedDB
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      page.drawText("GESTIMMO - RÉFÉRENTIEL IMMOBILIER", {
        x: 50,
        y: 800,
        size: 16,
        font: fontBold,
        color: rgb(0.12, 0.23, 0.54)
      });
      page.drawText(`Bien: ${property?.name || "Bien immobilier"}`, {
        x: 50,
        y: 775,
        size: 12,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3)
      });
      page.drawText(`Document: ${doc.title}`, {
        x: 50,
        y: 730,
        size: 14,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1)
      });
      page.drawText(`Catégorie: ${doc.category}`, {
        x: 50,
        y: 705,
        size: 11,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4)
      });
      page.drawText(`Date d'enregistrement: ${doc.dateAdded}`, {
        x: 50,
        y: 685,
        size: 11,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4)
      });
      if (doc.description) {
        page.drawText(`Description: ${doc.description}`, {
          x: 50,
          y: 655,
          size: 11,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2)
        });
      }
      page.drawText("Ce document certifié est archivé électroniquement dans la gestion technique du bien.", {
        x: 50,
        y: 600,
        size: 10,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5)
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName || `${doc.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error downloading document:", e);
      alert("Impossible de télécharger le document.");
    }
  };

  const propertyLogements = property ? logements.filter(l => (
    (l.property && property.name && l.property.trim().toUpperCase() === property.name.trim().toUpperCase()) ||
    (l.propertyId && property.id && l.propertyId === property.id)
  )) : [];

  const propertyLogementsWithDynamicStatus = propertyLogements.map(unit => {
    const isPropertyMatch = (record: any) => {
      if (!record || !property) return false;
      if (record.propertyId && property.id) return record.propertyId === property.id;
      if (record.property && property.name) return record.property.trim().toUpperCase() === property.name.trim().toUpperCase();
      return false;
    };

    const unitNomenclature = (unit.unit || unit.id || "").toString();
    const activeLease = baux.find((b: any) => {
      const isStatusActive = (b.status || "").trim().toUpperCase() === "ACTIF";
      if (!isStatusActive) return false;
      const isUnitMatch = (b.unitId && unit.id && b.unitId === unit.id) ||
        (b.unit && (b.unit.trim().toUpperCase() === unitNomenclature.trim().toUpperCase() || b.unit.trim().toUpperCase() === (unit.id || "").trim().toUpperCase()));
      return isUnitMatch && isPropertyMatch(b);
    });

    const activeLocataire = locataires.find((t: any) => 
      t.unit && 
      (t.unit.trim().toUpperCase() === unitNomenclature.trim().toUpperCase() || t.unit.trim().toUpperCase() === (unit.id || "").trim().toUpperCase()) &&
      isPropertyMatch(t)
    );

    if (activeLease || activeLocataire) {
      const matchedTenant = activeLease?.tenant || activeLocataire?.name || unit.tenant;
      return { ...unit, status: "OCCUPÉ", tenant: matchedTenant && matchedTenant !== "-" ? matchedTenant : "Locataire Actuel" };
    }
    return { ...unit, status: "NON OCCUPÉ", tenant: "-" };
  });

  const configuredUnits = Number(property?.units || property?.unitsCount || property?.units_count || 0);
  const unitsCount = Math.max(configuredUnits, propertyLogementsWithDynamicStatus.length, 1);
  const occupiedCount = Math.min(unitsCount, propertyLogementsWithDynamicStatus.filter(l => l.status === "OCCUPÉ").length);
  const occupationRate = unitsCount > 0 ? Math.round((occupiedCount / unitsCount) * 100) : 0;
  
  const propertyUnitsIds = propertyLogementsWithDynamicStatus.map(l => l.id);
  const propertyUnitsLabels = propertyLogementsWithDynamicStatus.map(l => (l.unit || "").toString().trim().toLowerCase()).filter(Boolean);

  const propertyBaux = useMemo(() => {
    if (!property) return [];
    return baux.filter((b: any) => {
      const isStatusActive = (b.status || "").trim().toUpperCase() === "ACTIF";
      if (!isStatusActive) return false;
      const isPropMatch = (b.propertyId && property.id && b.propertyId === property.id) ||
        (b.property && property.name && b.property.trim().toLowerCase() === property.name.trim().toLowerCase());
      const isUnitMatch = (b.unitId && propertyUnitsIds.includes(b.unitId)) ||
        (b.unit && (propertyUnitsIds.includes(b.unit) || propertyUnitsLabels.includes(b.unit.toString().trim().toLowerCase())));
      return isPropMatch || isUnitMatch;
    });
  }, [baux, property, propertyUnitsIds, propertyUnitsLabels]);

  const bauxMonthlyRent = propertyBaux.reduce((sum: number, b: any) => sum + (Number(b.rent || b.loyer) || 0), 0);
  const occupiedLogementsRent = propertyLogementsWithDynamicStatus
    .filter(l => l.status === "OCCUPÉ")
    .reduce((sum: number, l: any) => sum + (Number(l.rent) || 0), 0);
  const fallbackRevenue = Number(property?.revenue) || 0;
  const revenue = bauxMonthlyRent > 0 ? bauxMonthlyRent : (occupiedLogementsRent > 0 ? occupiedLogementsRent : fallbackRevenue);
  
  const activeLeases = property ? baux.filter(b => b.property === property.name && b.status === "ACTIF") : [];
  let unpaid = 0;
  if (activeLeases.length > 0 && locataires.length > 0) {
    activeLeases.forEach(lease => {
      const tenant = locataires.find(t => t.name === lease.tenant);
      if (tenant && tenant.debt && tenant.debt > 0) {
        unpaid += tenant.debt;
      } else if (tenant && tenant.status === "IMPAYÉ") {
        unpaid += lease.rent * 2;
      } else if (tenant && tenant.status === "EN RETARD") {
        unpaid += lease.rent;
      }
    });
  }
  if (unpaid === 0) unpaid = property?.unpaid || 0;

  const unitsToDisplay = property?.id === "B-001" && propertyLogementsWithDynamicStatus.length === 0 ? defaultUnits : propertyLogementsWithDynamicStatus;

  // Payments strictly linked to this property
  const propertyPaiements = useMemo(() => {
    if (!property) return [];
    return paiements.filter((p: any) => {
      if (p.propertyId && property.id && p.propertyId === property.id) return true;
      if (p.property && property.name && p.property.trim().toLowerCase() === property.name.trim().toLowerCase()) return true;
      if (p.unitId && propertyUnitsIds.includes(p.unitId)) return true;
      if (p.unit && (propertyUnitsIds.includes(p.unit) || propertyUnitsLabels.includes(p.unit.toString().trim().toLowerCase()))) return true;
      if (p.leaseId && propertyBaux.some((b: any) => b.id === p.leaseId)) return true;
      return false;
    });
  }, [paiements, property, propertyUnitsIds, propertyUnitsLabels, propertyBaux]);

  // Reversements strictly linked to this property or its owner
  const propertyReversements = useMemo(() => {
    if (!property) return [];
    return reversements.filter((r: any) => {
      if (r.propertyId && property.id && r.propertyId === property.id) return true;
      if (r.property && property.name && r.property.trim().toLowerCase() === property.name.trim().toLowerCase()) return true;
      const ownerId = property.ownerId || property.owner_id;
      const ownerName = property.owner || "";
      if (ownerId && r.ownerId && r.ownerId === ownerId) return true;
      if (ownerName && r.owner && r.owner.trim().toLowerCase() === ownerName.trim().toLowerCase()) return true;
      return false;
    });
  }, [reversements, property]);

  // Financial statistics
  const validPaiements = propertyPaiements.filter((p: any) => p.status === "VALIDÉ" || p.status === "PAYÉ");
  const totalCollected = validPaiements.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const commissionRate = property?.commission !== undefined && property?.commission !== null ? Number(property.commission) : 10;
  const totalCommission = Math.round((totalCollected * commissionRate) / 100);
  const netEstimated = totalCollected - totalCommission;

  const totalPayoutsPaid = propertyReversements
    .filter((r: any) => r.status === "EFFECTUÉ")
    .reduce((sum, r) => sum + (Number(r.amount || r.net_amount) || 0), 0);

  const periodsList = useMemo(() => {
    const set = new Set<string>();
    propertyPaiements.forEach((p: any) => {
      const per = p.period || p.period_month;
      if (per) set.add(per);
    });
    return Array.from(set);
  }, [propertyPaiements]);

  // Filtered payments
  const filteredPaiements = useMemo(() => {
    return propertyPaiements.filter((p: any) => {
      const matchSearch = !financialSearch.trim() || 
        (p.tenant && p.tenant.toLowerCase().includes(financialSearch.toLowerCase())) ||
        (p.unit && p.unit.toLowerCase().includes(financialSearch.toLowerCase())) ||
        (p.id && p.id.toLowerCase().includes(financialSearch.toLowerCase())) ||
        (p.method && p.method.toLowerCase().includes(financialSearch.toLowerCase()));
      
      const period = p.period || p.period_month || "";
      const matchPeriod = financialPeriodFilter === "all" || period === financialPeriodFilter;

      const st = (p.status || "").toUpperCase();
      const matchStatus = financialStatusFilter === "all" ||
        (financialStatusFilter === "VALIDÉ" && (st === "VALIDÉ" || st === "PAYÉ")) ||
        (financialStatusFilter === "EN ATTENTE" && (st === "EN ATTENTE" || st === "EN_ATTENTE" || st === "EN RETARD"));

      return matchSearch && matchPeriod && matchStatus;
    });
  }, [propertyPaiements, financialSearch, financialPeriodFilter, financialStatusFilter]);

  // Filtered reversements
  const filteredReversements = useMemo(() => {
    return propertyReversements.filter((r: any) => {
      const matchSearch = !financialSearch.trim() || 
        (r.reference && r.reference.toLowerCase().includes(financialSearch.toLowerCase())) ||
        (r.period && r.period.toLowerCase().includes(financialSearch.toLowerCase())) ||
        (r.owner && r.owner.toLowerCase().includes(financialSearch.toLowerCase()));
      
      const period = r.period || r.period_month || "";
      const matchPeriod = financialPeriodFilter === "all" || period === financialPeriodFilter;

      return matchSearch && matchPeriod;
    });
  }, [propertyReversements, financialSearch, financialPeriodFilter]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchCategory = docCategoryFilter === "all" || doc.category === docCategoryFilter;
      const matchSearch = !docSearch.trim() ||
        doc.title.toLowerCase().includes(docSearch.toLowerCase()) ||
        (doc.fileName && doc.fileName.toLowerCase().includes(docSearch.toLowerCase())) ||
        (doc.description && doc.description.toLowerCase().includes(docSearch.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [documents, docCategoryFilter, docSearch]);

  const documentCategories: Array<PropertyDocument["category"]> = [
    "Titre de propriété",
    "Mandat de gestion",
    "Assurance",
    "Plans & Architecture",
    "Règlement intérieur",
    "Factures & Travaux",
    "Autre"
  ];

  const getCategoryBadgeClass = (category: PropertyDocument["category"]) => {
    switch (category) {
      case "Titre de propriété": return "bg-purple-50 text-purple-700 border-purple-200";
      case "Mandat de gestion": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Assurance": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Plans & Architecture": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Règlement intérieur": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Factures & Travaux": return "bg-orange-50 text-orange-700 border-orange-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  if (!property) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-gray-700">Chargement des détails du bien...</p>
        <p className="text-xs text-gray-400 mt-1">Veuillez patienter quelques instants</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/app/biens">
            <button type="button" className="p-2 bg-white border border-app-border rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
              <Badge variant="default" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">{property.type}</Badge>
            </div>
            <div className="flex items-center text-sm text-gray-500 gap-4">
              <span className="flex items-center"><Building2 className="w-4 h-4 mr-1.5" /> ID: {property.id}</span>
              <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> {property.address || "-"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openEditModal} className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm cursor-pointer">
            <Pencil className="h-4 w-4 mr-2" /> Modifier
          </button>
          <button type="button" onClick={() => setIsDeleteModalOpen(true)} className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center shadow-sm cursor-pointer">
            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-app-border overflow-x-auto scrollbar-none">
        <button 
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "overview" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Vue d'ensemble
        </button>
        <button 
          onClick={() => setActiveTab("logements")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "logements" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Logements ({unitsCount})
        </button>
        <button 
          onClick={() => setActiveTab("finances")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "finances" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Finances & Relevés
        </button>
        <button 
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "documents" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-900"}`}
        >
          Documents ({documents.length})
        </button>
      </div>

      {/* TAB: VUE D'ENSEMBLE */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-app-border shadow-sm flex flex-col">
                <h3 className="text-xs font-medium text-gray-500 mb-1">Occupation</h3>
                <p className="text-xl font-bold text-gray-900 mb-2">{occupationRate}%</p>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${occupationRate >= 90 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${occupationRate}%` }}></div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-app-border shadow-sm flex flex-col">
                <h3 className="text-xs font-medium text-gray-500 mb-1">Logements</h3>
                <p className="text-xl font-bold text-gray-900">{occupiedCount} <span className="text-sm font-normal text-gray-400">/ {unitsCount}</span></p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-app-border shadow-sm flex flex-col">
                <h3 className="text-xs font-medium text-gray-500 mb-1">Revenus attendus</h3>
                <p className="text-xl font-bold text-gray-900">{formatFCFA(revenue)}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-app-border shadow-sm flex flex-col">
                <h3 className="text-xs font-medium text-gray-500 mb-1">Impayés actuels</h3>
                <p className="text-xl font-bold text-red-600">{formatFCFA(unpaid)}</p>
              </div>
            </div>

            {/* Logements Preview Table */}
            <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-app-border flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Aperçu des logements</h2>
                <button 
                  type="button" 
                  onClick={() => setActiveTab("logements")} 
                  className="text-sm font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  Voir tout
                </button>
              </div>
              <div className="overflow-x-auto w-full flex-1">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                      <th className="px-6 py-3 font-medium">Appartement</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium text-center">Loyer</th>
                      <th className="px-6 py-3 font-medium text-center">Statut</th>
                      <th className="px-6 py-3 font-medium">Locataire</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {unitsToDisplay.map((unit: any, idx: number) => (
                      <tr key={unit.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap">
                          <Link href={`/app/logements/${unit.id}`} className="text-sm font-semibold text-primary hover:underline">
                            {formatUnitDisplay(unit.unit || unit.name || unit.id, idx + 1, unit.type || "Appartement")}
                          </Link>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                          {unit.type}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                          {formatFCFA(unit.rent)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <Badge dot variant={unit.status === "OCCUPÉ" ? "success" : "default"} className={unit.status === "NON OCCUPÉ" ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border-none" : ""}>
                            {unit.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                          {unit.tenant}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right space-x-2">
                          {unit.status === "NON OCCUPÉ" && (
                            <Link href={`/app/baux?unit=${unit.id}`}>
                              <button className="text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors cursor-pointer">
                                Créer un bail
                              </button>
                            </Link>
                          )}
                          <Link href={`/app/logements/${unit.id}`}>
                            <button className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors px-3 py-1.5 border border-app-border rounded-lg hover:bg-gray-50 cursor-pointer">
                              Détails
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {unitsToDisplay.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                          Aucun logement enregistré pour ce bien.
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
            <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
              <div className="aspect-video w-full rounded-xl bg-gray-100 mb-6 overflow-hidden flex items-center justify-center border border-app-border">
                 <Building2 className="w-12 h-12 text-gray-300" />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-900">{property.description || "Aucune description fournie."}</p>
                </div>
                <div className="pt-4 border-t border-app-border">
                  <p className="text-xs text-gray-500 mb-1">Propriétaire</p>
                  {property.owner ? (
                    <Link 
                      href={
                        owners.find((o: any) => 
                          (property.ownerId && o.id === property.ownerId) ||
                          (o.name && o.name.trim().toUpperCase() === property.owner.trim().toUpperCase())
                        )?.id 
                          ? `/app/proprietaires/${owners.find((o: any) => (property.ownerId && o.id === property.ownerId) || (o.name && o.name.trim().toUpperCase() === property.owner.trim().toUpperCase()))?.id}`
                          : `/app/proprietaires`
                      } 
                      className="text-sm font-semibold text-primary hover:underline flex items-center"
                    >
                      {property.owner}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-400">Non assigné</span>
                  )}
                </div>
                <div className="pt-4 border-t border-app-border">
                  <p className="text-xs text-gray-500 mb-1">Commission GESTIMMO</p>
                  <p className="text-sm font-semibold text-gray-900">{property.commission !== undefined && property.commission !== null ? property.commission : 10}% des encaissements</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: LOGEMENTS */}
      {activeTab === "logements" && (
        <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900">Tous les logements ({unitsCount})</h2>
            <Link href={`/app/logements?bien=${encodeURIComponent(property.name)}`}>
              <button className="text-sm font-medium text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors flex items-center shadow-sm cursor-pointer">
                <Plus className="w-4 h-4 mr-2" /> Ajouter un logement
              </button>
            </Link>
          </div>
          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                  <th className="px-6 py-4 font-medium">Appartement</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium text-center">Loyer</th>
                  <th className="px-6 py-4 font-medium text-center">Statut</th>
                  <th className="px-6 py-4 font-medium">Locataire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {unitsToDisplay.map((unit: any, idx: number) => (
                  <tr key={unit.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/app/logements/${unit.id}`} className="text-sm font-semibold text-primary hover:underline">
                        {formatUnitDisplay(unit.unit || unit.id, idx + 1)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {unit.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                      {formatFCFA(unit.rent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge dot variant={unit.status === "OCCUPÉ" ? "success" : "default"} className={unit.status === "NON OCCUPÉ" ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border-none" : ""}>
                        {unit.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {unit.tenant}
                    </td>
                  </tr>
                ))}
                {unitsToDisplay.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                      Aucun logement enregistré pour ce bien.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: FINANCES & RELEVÉS */}
      {activeTab === "finances" && (
        <div className="space-y-6">
          {/* Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Encaissé</span>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatFCFA(totalCollected)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-app-border">
                <span>{validPaiements.length} paiement(s) perçu(s)</span>
                <span className="text-emerald-600 font-medium">Validés</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Taux de recouvrement</span>
                <p className="text-xl font-bold text-emerald-600 mt-1">{revenue > 0 ? `${Math.min(100, Math.round((totalCollected / (totalCollected + unpaid)) * 100))}%` : "100%"}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-app-border">
                <span>Attendu / mois</span>
                <span className="font-semibold text-gray-900">{formatFCFA(revenue)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Impayés constatés</span>
                <p className="text-xl font-bold text-red-600 mt-1">{formatFCFA(unpaid)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-app-border">
                <span>Statut relances</span>
                <Badge variant={unpaid > 0 ? "alert" : "success"} dot className="text-[10px] py-0">
                  {unpaid > 0 ? "À suivre" : "À jour"}
                </Badge>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Commissions Agence</span>
                <p className="text-xl font-bold text-primary mt-1">{formatFCFA(totalCommission)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-app-border">
                <span>Taux de gérance</span>
                <span className="font-semibold text-primary">{commissionRate}%</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reversé au Propriétaire</span>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatFCFA(totalPayoutsPaid)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-app-border">
                <span className="truncate" title={property.owner || "Bailleur"}>{property.owner || "Bailleur"}</span>
                <Link href="/app/reversements" className="text-primary hover:underline font-medium">Relevés →</Link>
              </div>
            </div>
          </div>

          {/* Subtabs and Filters */}
          <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-app-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/50">
              {/* Subtabs */}
              <div className="flex items-center space-x-2 bg-gray-200/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFinancialSubTab("encaissements")}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    financialSubTab === "encaissements" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Encaissements Locataires ({propertyPaiements.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialSubTab("reversements")}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    financialSubTab === "reversements" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Reversements Propriétaire ({propertyReversements.length})
                </button>
              </div>

              {/* Filters & Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={financialSearch}
                    onChange={(e) => setFinancialSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-app-border rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {periodsList.length > 0 && (
                  <select
                    value={financialPeriodFilter}
                    onChange={(e) => setFinancialPeriodFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-app-border rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="all">Toutes les périodes</option>
                    {periodsList.map((period) => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                )}

                {financialSubTab === "encaissements" && (
                  <select
                    value={financialStatusFilter}
                    onChange={(e) => setFinancialStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-app-border rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="VALIDÉ">Validés / Payés</option>
                    <option value="EN ATTENTE">En attente / Retards</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-white border border-app-border text-gray-700 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm cursor-pointer"
                  title="Imprimer l'état financier"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5 text-gray-500" /> Imprimer
                </button>

                {financialSubTab === "encaissements" ? (
                  <Link href={`/app/paiements`}>
                    <button className="bg-primary text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center shadow-sm cursor-pointer">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Encaisser
                    </button>
                  </Link>
                ) : (
                  <Link href={`/app/reversements`}>
                    <button className="bg-primary text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center shadow-sm cursor-pointer">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Reversement
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* DATA TABLE: ENCAISSEMENTS */}
            {financialSubTab === "encaissements" && (
              <div className="overflow-x-auto w-full flex-1">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Logement & Locataire</th>
                      <th className="px-6 py-4 font-medium">Période</th>
                      <th className="px-6 py-4 font-medium text-right">Montant Brut</th>
                      <th className="px-6 py-4 font-medium text-center">Mode</th>
                      <th className="px-6 py-4 font-medium text-right">Commission ({commissionRate}%)</th>
                      <th className="px-6 py-4 font-medium text-center">Statut</th>
                      <th className="px-6 py-4 font-medium text-right">Reçu / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {filteredPaiements.map((p: any) => {
                      const amount = Number(p.amount) || 0;
                      const comm = Math.round((amount * commissionRate) / 100);
                      const isValid = p.status === "VALIDÉ" || p.status === "PAYÉ";

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {p.date || p.payment_date || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm font-semibold text-gray-900">{p.unit || "-"}</p>
                            <p className="text-xs text-gray-500">{p.tenant || "-"}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                            {p.period || p.period_month || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                            {formatFCFA(amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 text-center">
                            <span className="px-2 py-1 bg-gray-100 rounded-md">{p.method || p.payment_method || "Virement"}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary font-medium text-right">
                            {formatFCFA(comm)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Badge variant={isValid ? "success" : "alert"} dot>
                              {isValid ? "Validé" : (p.status || "En attente")}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Link href={`/app/paiements`}>
                              <button className="text-xs font-medium text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer">
                                Voir reçu →
                              </button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPaiements.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          <Banknote className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm font-medium text-gray-700">Aucun encaissement trouvé pour ce bien.</p>
                          <p className="text-xs text-gray-400 mt-1">Les règlements de loyers enregistrés apparaîtront automatiquement dans ce tableau.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* DATA TABLE: REVERSEMENTS */}
            {financialSubTab === "reversements" && (
              <div className="overflow-x-auto w-full flex-1">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                      <th className="px-6 py-4 font-medium">Référence</th>
                      <th className="px-6 py-4 font-medium">Période</th>
                      <th className="px-6 py-4 font-medium">Date de versement</th>
                      <th className="px-6 py-4 font-medium text-right">Brut collecté</th>
                      <th className="px-6 py-4 font-medium text-right">Commission déduite</th>
                      <th className="px-6 py-4 font-medium text-right">Net reversé</th>
                      <th className="px-6 py-4 font-medium text-center">Statut</th>
                      <th className="px-6 py-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {filteredReversements.map((r: any) => {
                      const gross = Number(r.collected || r.gross_amount) || 0;
                      const comm = Number(r.commission || r.agency_commission) || 0;
                      const net = Number(r.amount || r.net_amount) || 0;

                      return (
                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                            {r.reference || r.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {r.period || r.period_month || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {r.date || r.created_at?.slice(0, 10) || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                            {formatFCFA(gross)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium text-right">
                            - {formatFCFA(comm)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">
                            {formatFCFA(net)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Badge variant={r.status === "EFFECTUÉ" ? "success" : "alert"} dot>
                              {r.status || "EFFECTUÉ"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Link href="/app/reversements">
                              <button className="text-xs font-medium text-primary hover:underline transition-colors cursor-pointer">
                                Voir décharge →
                              </button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredReversements.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          <ArrowRightLeft className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm font-medium text-gray-700">Aucun reversement enregistré pour ce bien.</p>
                          <p className="text-xs text-gray-400 mt-1">Générez un reversement dans le module Reversements pour alimenter cet historique.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: DOCUMENTS */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Header & Actions */}
          <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" /> Documents du bien ({documents.length})
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Titres fonciers, mandats de gestion, polices d'assurance, plans d'architecte et pièces justificatives de l'immeuble.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAddDocModalOpen(true)}
                className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm flex items-center cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" /> Ajouter un document
              </button>
            </div>
          </div>

          {/* Filters & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setDocCategoryFilter("all")}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                  docCategoryFilter === "all" ? "bg-primary text-white shadow-sm" : "bg-white border border-app-border text-gray-600 hover:bg-gray-50"
                )}
              >
                Tous ({documents.length})
              </button>
              {documentCategories.map((cat) => {
                const count = documents.filter(d => d.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setDocCategoryFilter(cat)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                      docCategoryFilter === cat ? "bg-primary text-white shadow-sm" : "bg-white border border-app-border text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {cat} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-app-border rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
              />
            </div>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredDocuments.map((doc) => (
              <div 
                key={doc.id}
                className="bg-white p-5 rounded-2xl border border-app-border shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg border", getCategoryBadgeClass(doc.category))}>
                      {doc.category}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                      PDF
                    </span>
                  </div>

                  <div className="flex items-start gap-3 mt-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate" title={doc.title}>
                        {doc.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {doc.description || "Aucune description détaillée."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-app-border flex items-center justify-between">
                  <div className="text-[11px] text-gray-400">
                    <p>{doc.dateAdded}</p>
                    <p className="font-medium text-gray-500">{doc.fileSize || "Document numérique"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadDocument(doc)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                      title="Télécharger / Visualiser"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDocuments.length === 0 && (
            <div className="bg-white p-12 rounded-2xl border border-app-border shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 text-gray-400">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun document trouvé</h3>
              <p className="text-sm text-gray-500 max-w-md mb-6">
                Aucun document ne correspond à vos filtres actuels. Importez vos pièces administratives ou certificats techniques pour ce bien.
              </p>
              <button
                type="button"
                onClick={() => setIsAddDocModalOpen(true)}
                className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm flex items-center cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" /> Ajouter un document
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL AJOUTER UN DOCUMENT */}
      {isAddDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-app-border space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-app-border">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-primary" /> Ajouter un document au bien
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAddDocModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom / Titre du document *</label>
                <input
                  type="text"
                  placeholder="Ex: Titre foncier notarié 2026, Contrat d'assurance..."
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catégorie de document</label>
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 cursor-pointer"
                >
                  {documentCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Fichier à joindre (PDF, PNG, JPG)</label>
                <div className="border-2 border-dashed border-app-border rounded-xl p-4 text-center hover:bg-gray-50/50 transition-colors">
                  <input
                    type="file"
                    id="property-doc-upload"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="property-doc-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-8 h-8 text-primary/60 mb-2" />
                    <span className="text-xs font-semibold text-primary hover:underline">
                      {newDocFileName ? newDocFileName : "Cliquez pour sélectionner un fichier"}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1">
                      {newDocFileSize ? `Taille: ${newDocFileSize}` : "Formats acceptés : PDF, PNG, JPG, DOC (Max 10 Mo)"}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Notes complémentaires</label>
                <textarea
                  rows={2}
                  placeholder="Notes, date de validité, coordonnées de l'organisme émetteur..."
                  value={newDocDescription}
                  onChange={(e) => setNewDocDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-app-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddDocModalOpen(false)}
                className="px-4 py-2 border border-app-border text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isUploadingDoc || !newDocTitle.trim()}
                onClick={handleSaveDocument}
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 text-sm font-semibold flex items-center disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {isUploadingDoc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer le document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER LE BIEN */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-app-border space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-app-border">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Pencil className="w-5 h-5 mr-2 text-primary" /> Modifier le bien
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du bien / Résidence</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Type de bien</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 cursor-pointer"
                  >
                    <option value="Immeuble">Immeuble</option>
                    <option value="Villa">Villa</option>
                    <option value="Résidence fermée">Résidence fermée</option>
                    <option value="Complexe commercial">Complexe commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Commission Agence (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editCommission}
                    onChange={(e) => setEditCommission(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Adresse physique / Quartier</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Remarques</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-app-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-app-border text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSaving || !editName.trim()}
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 text-sm font-semibold flex items-center disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRIMER LE BIEN */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-app-border space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Supprimer ce bien ?</h3>
              <p className="text-sm text-gray-600 mt-2">
                Êtes-vous sûr de vouloir supprimer définitivement <strong className="text-gray-900">{property.name}</strong> ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-app-border text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-semibold flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
