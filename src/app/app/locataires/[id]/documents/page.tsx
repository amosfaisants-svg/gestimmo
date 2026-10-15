"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  FileCheck, 
  FileWarning, 
  Download, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  X, 
  Building2, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Plus, 
  File, 
  Image as ImageIcon 
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatFCFA, formatUnitDisplay, checkTenantHasImportedContract, getLeaseDisplayCode } from "@/lib/utils";
import { saveGenericTemplate, getGenericTemplate } from "@/lib/storage";

const DOCUMENT_TYPES = [
  { id: "contrat", label: "Contrat de bail signé", isContract: true },
  { id: "cni", label: "Pièce d'identité (CNI / Passeport)", isContract: false },
  { id: "etat_des_lieux", label: "État des lieux d'entrée", isContract: false },
  { id: "quittance", label: "Reçu / Quittance d'entrée", isContract: false },
  { id: "autre", label: "Autre document justificatif", isContract: false },
];

export default function TenantDocumentsPage({ params }: { params: { id: string } }) {
  const [tenant, setTenant] = useState<any>(null);
  const [tenantLeases, setTenantLeases] = useState<any[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>("");
  
  // Existing documents
  const [personalDocs, setPersonalDocs] = useState<any[]>([]);
  const [leaseDocs, setLeaseDocs] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Form states
  const [docType, setDocType] = useState<string>("contrat");
  const [docTitle, setDocTitle] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Load tenant and leases
  const loadTenantData = () => {
    const storedTenants = localStorage.getItem("gestimmo_locataires");
    let allTenants: any[] = [];
    if (storedTenants) {
      try {
        allTenants = JSON.parse(storedTenants);
      } catch (e) {
        console.error(e);
      }
    }

    const found = allTenants.find((t: any) => t.id === params.id);
    if (found) {
      setTenant(found);
      setPersonalDocs(Array.isArray(found.documents) ? found.documents : []);
    } else {
      setTenant({ id: params.id, name: "Locataire", phone: "Non renseigné", email: "" });
    }

    // Leases
    const storedBaux = localStorage.getItem("gestimmo_baux");
    let leases: any[] = [];
    if (storedBaux) {
      try {
        const allBaux = JSON.parse(storedBaux);
        leases = allBaux.filter((b: any) => 
          (b.tenantId && b.tenantId === params.id) || 
          (found && b.tenant && found.name && b.tenant.trim().toLowerCase() === found.name.trim().toLowerCase())
        );
        setTenantLeases(leases);
        if (leases.length > 0) {
          setSelectedLeaseId(leases[0].id);
        }

        // Load all docs from leases
        const allLDocs: any[] = [];
        leases.forEach((lease: any) => {
          const stored = localStorage.getItem(`gestimmo_docs_${lease.id}`);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                parsed.forEach((d: any) => {
                  allLDocs.push({ ...d, leaseId: lease.id, fromLease: true });
                });
              }
            } catch (e) {}
          }
        });
        setLeaseDocs(allLDocs);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadTenantData();

    // Check URL parameters for preset docType
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      const typeParam = search.get("type");
      if (typeParam && DOCUMENT_TYPES.some(t => t.id === typeParam)) {
        setDocType(typeParam);
      }
    }
  }, [params.id]);

  // Adjust suggested docTitle when docType changes
  useEffect(() => {
    if (!tenant) return;
    const cleanName = tenant.name ? tenant.name.replace(/\s+/g, '_') : "Locataire";
    if (docType === "contrat") {
      setDocTitle(`Contrat_Bail_Signé_${cleanName}.pdf`);
    } else if (docType === "cni") {
      setDocTitle(`Piece_Identite_CNI_${cleanName}`);
    } else if (docType === "etat_des_lieux") {
      setDocTitle(`Etat_Des_Lieux_Entree_${cleanName}.pdf`);
    } else if (docType === "quittance") {
      setDocTitle(`Recu_Paiement_Caution_${cleanName}.pdf`);
    } else if (!selectedFile) {
      setDocTitle("");
    }
  }, [docType, tenant]);

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    // Format file size
    const sizeInKb = file.size / 1024;
    if (sizeInKb > 1024) {
      setFileSizeStr(`${(sizeInKb / 1024).toFixed(2)} Mo`);
    } else {
      setFileSizeStr(`${Math.round(sizeInKb)} Ko`);
    }

    // Default title if empty or default
    if (!docTitle || docTitle.startsWith("Contrat_Bail_Signé_") || docTitle.startsWith("Piece_Identite_")) {
      const cleanName = tenant?.name ? tenant.name.replace(/\s+/g, '_') : "Locataire";
      if (docType === "contrat") {
        setDocTitle(file.name.toLowerCase().includes("contrat") ? file.name : `Contrat_Bail_Signé_${cleanName}.pdf`);
      } else {
        setDocTitle(file.name);
      }
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelection(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !fileBase64 || !tenant) {
      alert("Veuillez sélectionner un fichier à importer.");
      return;
    }

    setIsUploading(true);

    const docId = `DOC-${Date.now()}`;
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    const isContractType = docType === "contrat";
    const selectedTypeObj = DOCUMENT_TYPES.find(t => t.id === docType);

    // Save heavy binary in IndexedDB
    try {
      await saveGenericTemplate(`doc_binary_${docId}`, fileBase64);
    } catch (err) {
      console.warn("IndexedDB binary save note:", err);
    }

    const newDocumentRecord = {
      id: docId,
      name: docTitle.trim() || selectedFile.name,
      fileName: selectedFile.name,
      fileSize: fileSizeStr,
      fileType: selectedFile.type,
      category: selectedTypeObj?.label || "Document",
      type: docType.toUpperCase(),
      date: today,
      isContract: isContractType,
      isImported: true,
      leaseId: selectedLeaseId || null,
      base64: fileBase64.length < 500000 ? fileBase64 : "", // store inline if small, otherwise fetched from IndexedDB
      binaryKey: `doc_binary_${docId}`
    };

    // 1. If it's a contract, save it to the lease's storage gestimmo_docs_${leaseId}
    if (selectedLeaseId) {
      try {
        const storedLeaseDocs = localStorage.getItem(`gestimmo_docs_${selectedLeaseId}`);
        const existingLDocs: any[] = storedLeaseDocs ? JSON.parse(storedLeaseDocs) : [];
        const filteredLDocs = isContractType 
          ? existingLDocs.filter((d: any) => !d.isContract && d.name !== "Contrat_Bail_Signé.pdf")
          : existingLDocs;
        const updatedLDocs = [newDocumentRecord, ...filteredLDocs];
        localStorage.setItem(`gestimmo_docs_${selectedLeaseId}`, JSON.stringify(updatedLDocs));
      } catch (e) {
        console.error("Error saving to lease docs:", e);
      }
    }

    // 2. Save in tenant.documents in gestimmo_locataires
    try {
      const storedTenants = localStorage.getItem("gestimmo_locataires");
      let allTenants: any[] = storedTenants ? JSON.parse(storedTenants) : [];
      
      const currentTenantDocs = Array.isArray(tenant.documents) ? tenant.documents : [];
      const updatedTenantDocs = [newDocumentRecord, ...currentTenantDocs];
      const updatedTenant = { ...tenant, documents: updatedTenantDocs };

      const tenantExists = allTenants.some((t: any) => t.id === tenant.id);
      const updatedAll = tenantExists
        ? allTenants.map((t: any) => t.id === tenant.id ? updatedTenant : t)
        : [...allTenants, updatedTenant];

      try {
        localStorage.setItem("gestimmo_locataires", JSON.stringify(updatedAll));
      } catch {
        // Fallback without large base64 inline
        const docWithoutBase64 = { ...newDocumentRecord, base64: "" };
        const safeDocs = [docWithoutBase64, ...currentTenantDocs];
        const safeTenant = { ...tenant, documents: safeDocs };
        const safeAll = tenantExists
          ? allTenants.map((t: any) => t.id === tenant.id ? safeTenant : t)
          : [...allTenants, safeTenant];
        localStorage.setItem("gestimmo_locataires", JSON.stringify(safeAll));
      }

      setTenant(updatedTenant);
      setPersonalDocs(updatedTenantDocs);
    } catch (e) {
      console.error("Error updating tenant in storage:", e);
    }

    // Trigger storage event for reactive updates in other components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("gestimmo_locataires_updated"));
    }

    // Reload data
    loadTenantData();

    setIsUploading(false);
    setSelectedFile(null);
    setFileBase64(null);
    setFileSizeStr("");
    setSuccessMessage(isContractType ? "Le contrat de bail a été importé et validé avec succès !" : "Document importé et rattaché avec succès !");

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleDeleteDocument = (doc: any) => {
    if (!window.confirm(`Supprimer le document "${doc.name}" ?`)) return;

    // Remove from tenant documents
    if (tenant && Array.isArray(tenant.documents)) {
      const filtered = tenant.documents.filter((d: any) => d.id !== doc.id && d.name !== doc.name);
      const updatedTenant = { ...tenant, documents: filtered };
      
      const stored = localStorage.getItem("gestimmo_locataires");
      if (stored) {
        try {
          const all: any[] = JSON.parse(stored);
          const updatedAll = all.map((t: any) => t.id === tenant.id ? updatedTenant : t);
          localStorage.setItem("gestimmo_locataires", JSON.stringify(updatedAll));
        } catch (e) {}
      }
      setTenant(updatedTenant);
      setPersonalDocs(filtered);
    }

    // Remove from lease docs if attached
    if (doc.leaseId) {
      const stored = localStorage.getItem(`gestimmo_docs_${doc.leaseId}`);
      if (stored) {
        try {
          const all = JSON.parse(stored);
          const filtered = all.filter((d: any) => d.id !== doc.id && d.name !== doc.name);
          localStorage.setItem(`gestimmo_docs_${doc.leaseId}`, JSON.stringify(filtered));
        } catch (e) {}
      }
      setLeaseDocs(prev => prev.filter(d => !(d.id === doc.id && d.leaseId === doc.leaseId)));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
    }
  };

  const handleOpenPreview = async (doc: any) => {
    let base64 = doc.base64;
    if (!base64 && doc.binaryKey) {
      base64 = await getGenericTemplate(doc.binaryKey);
    }
    setPreviewDoc({ ...doc, base64: base64 || doc.base64 });
  };

  const handleDownloadDoc = async (doc: any) => {
    let base64 = doc.base64;
    if (!base64 && doc.binaryKey) {
      base64 = await getGenericTemplate(doc.binaryKey);
    }
    if (!base64) {
      alert("Le fichier source n'est pas disponible pour le téléchargement.");
      return;
    }
    const a = document.createElement("a");
    a.href = base64;
    a.download = doc.name.endsWith(".pdf") || doc.name.endsWith(".png") || doc.name.endsWith(".jpg")
      ? doc.name
      : `${doc.name}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const hasImportedContract = checkTenantHasImportedContract(tenant, tenantLeases);

  // Combine and deduplicate documents for display
  const allCombinedDocs = (() => {
    const list: any[] = [...personalDocs];
    leaseDocs.forEach((ld) => {
      if (!list.some(d => d.id === ld.id || (d.name === ld.name && d.date === ld.date))) {
        list.push(ld);
      }
    });
    return list;
  })();

  const filteredDocs = allCombinedDocs.filter((doc) => {
    if (activeFilter === "contrats") {
      return doc.isContract || doc.type === "CONTRAT" || (doc.name && doc.name.toLowerCase().includes("contrat"));
    }
    if (activeFilter === "identite") {
      return doc.type === "CNI" || (doc.name && (doc.name.toLowerCase().includes("cni") || doc.name.toLowerCase().includes("identit")));
    }
    if (activeFilter === "baux") {
      return doc.leaseId || doc.fromLease;
    }
    return true;
  });

  const activeLease = tenantLeases.find((l: any) => l.status === "ACTIF") || tenantLeases[0];

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href={`/app/locataires/${params.id}`}>
            <button
              type="button"
              className="p-2.5 bg-white border border-app-border rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-2xs"
              title="Retour au locataire"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Documents & Contrats
              </h1>
              <Badge variant={hasImportedContract ? "success" : "alert"} dot>
                {hasImportedContract ? "Contrat importé" : "Contrat manquant"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-3">
              <span className="font-semibold text-gray-900">{tenant?.name || "Locataire"}</span>
              {tenant?.phone && (
                <span className="flex items-center text-gray-500">
                  <Phone className="w-3.5 h-3.5 mr-1 text-gray-400" /> {tenant.phone}
                </span>
              )}
              {activeLease && (
                <span className="flex items-center text-primary font-medium">
                  <Building2 className="w-3.5 h-3.5 mr-1" /> {formatUnitDisplay(activeLease.unit)} ({activeLease.property})
                </span>
              )}
            </p>
          </div>
        </div>

        <Link
          href={`/app/locataires/${params.id}`}
          className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          Voir la fiche du locataire
        </Link>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Contract Alert if not yet imported */}
      {!hasImportedContract && (
        <div className="p-5 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Action requise : Contrat de bail non encore importé
              </p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Ce locataire figure dans la liste des « Contrats à importer ». Déposez ci-dessous le scan ou la version signée du contrat pour valider son dossier.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDocType("contrat");
              const el = document.getElementById("document-upload-card");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs font-semibold px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm shrink-0 whitespace-nowrap self-end sm:self-auto"
          >
            Importer le contrat
          </button>
        </div>
      )}

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Documents enregistrés</p>
            <p className="text-xl font-bold text-gray-900">{allCombinedDocs.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl ${hasImportedContract ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
            {hasImportedContract ? <FileCheck className="w-6 h-6" /> : <FileWarning className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Statut du contrat</p>
            <p className="text-base font-bold text-gray-900">
              {hasImportedContract ? "Contrat numérisé & actif" : "À importer"}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Bail associé</p>
            <p className="text-base font-bold text-gray-900 truncate">
              {activeLease ? getLeaseDisplayCode(activeLease) : "Aucun bail"}
            </p>
            {activeLease && (
              <p className="text-xs text-gray-400">
                Loyer: {formatFCFA(activeLease.rent)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Upload / Import Card */}
      <div id="document-upload-card" className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
        <div className="flex items-center justify-between mb-5 border-b border-app-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Importer un document pour {tenant?.name || "ce locataire"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Téléversez un contrat signé, une pièce d'identité ou un état des lieux.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveDocument} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Type de document */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type de document *
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-app-border rounded-xl text-sm font-medium text-gray-900 bg-white outline-none focus:ring-2 focus:ring-primary/20"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bail rattaché (si multiple) */}
            {tenantLeases.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Bail rattaché
                </label>
                <select
                  value={selectedLeaseId}
                  onChange={(e) => setSelectedLeaseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-app-border rounded-xl text-sm font-medium text-gray-900 bg-white outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {tenantLeases.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {getLeaseDisplayCode(l)} — {formatUnitDisplay(l.unit)} ({l.property})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Intitulé du document */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Intitulé / Nom du document *
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Ex: Contrat_Bail_Signé_Amadou_Diallo.pdf"
              className="w-full px-3.5 py-2.5 border border-app-border rounded-xl text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          {/* Drag & Drop File Zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fichier source (PDF, PNG ou JPG) *
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer relative ${
                isDragging 
                  ? "border-primary bg-primary/5 scale-[1.005]" 
                  : selectedFile 
                    ? "border-emerald-300 bg-emerald-50/30" 
                    : "border-app-border hover:border-primary/50 hover:bg-gray-50/50"
              }`}
            >
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload-input"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl mb-2">
                    <FileCheck className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Taille : <span className="font-semibold text-gray-700">{fileSizeStr}</span> • Format : {selectedFile.type || "Fichier"}
                  </p>
                  <span className="mt-3 text-xs text-primary font-semibold underline">
                    Cliquez ou glissez un autre fichier pour remplacer
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="p-3 bg-gray-100 text-gray-500 rounded-xl mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    Glissez-déposez le document ici, ou <span className="text-primary underline">parcourez vos fichiers</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Formats acceptés : PDF, JPG, PNG (moins de 10 Mo recommandé)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs text-gray-500">
              {docType === "contrat" && (
                <span className="text-emerald-700 font-medium">
                  ✓ L'importation de ce contrat marquera immédiatement ce locataire comme « Contrat importé ».
                </span>
              )}
            </p>

            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="w-full sm:w-auto bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? "Enregistrement en cours..." : "Importer et enregistrer"}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Documents List */}
      <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Documents rattachés au locataire ({filteredDocs.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Historique des contrats et pièces justificatives archivés
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tous ({allCombinedDocs.length})
            </button>
            <button
              onClick={() => setActiveFilter("contrats")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === "contrats" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Contrats ({allCombinedDocs.filter(d => d.isContract || (d.name && d.name.toLowerCase().includes("contrat"))).length})
            </button>
            <button
              onClick={() => setActiveFilter("identite")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === "identite" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pièces d'identité
            </button>
            <button
              onClick={() => setActiveFilter("baux")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === "baux" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Liés aux baux
            </button>
          </div>
        </div>

        {filteredDocs.length > 0 ? (
          <div className="divide-y divide-app-border">
            {filteredDocs.map((doc: any) => {
              const isContract = doc.isContract || doc.type === "CONTRAT" || (doc.name && doc.name.toLowerCase().includes("contrat"));
              const isPdf = (doc.name && doc.name.toLowerCase().endsWith(".pdf")) || doc.fileType === "application/pdf";
              const isImage = (doc.name && (doc.name.endsWith(".png") || doc.name.endsWith(".jpg") || doc.name.endsWith(".jpeg"))) || (doc.fileType && doc.fileType.startsWith("image"));

              return (
                <div key={doc.id || doc.name} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors group">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className={`p-3 rounded-xl shrink-0 ${
                      isContract ? "bg-orange-50 text-orange-600" : isPdf ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                    }`}>
                      {isContract ? <FileCheck className="w-5 h-5" /> : isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        {isContract && (
                          <Badge variant="success" dot className="text-[11px] py-0 px-2">
                            Contrat validé
                          </Badge>
                        )}
                        {doc.leaseId && (
                          <Link 
                            href={`/app/baux/${doc.leaseId}`}
                            className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            Bail #{doc.leaseId}
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <span>Importé le {doc.date}</span>
                        {doc.fileSize && <span>• {doc.fileSize}</span>}
                        {doc.category && <span>• {doc.category}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(doc)}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-app-border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" /> Aperçu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(doc)}
                      className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Télécharger
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer ce document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="text-base font-semibold text-gray-700">Aucun document dans cette catégorie</p>
            <p className="text-xs text-gray-500 mt-1">
              Utilisez le formulaire ci-dessus pour importer les contrats et justificatifs de ce locataire.
            </p>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div 
          onClick={() => setPreviewDoc(null)} 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-app-border flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-bold text-gray-900 truncate">{previewDoc.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewDoc)}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto max-h-[78vh] flex items-center justify-center bg-gray-100">
              {previewDoc.base64 ? (
                previewDoc.base64.startsWith("data:image") ? (
                  <img
                    src={previewDoc.base64}
                    alt={previewDoc.name}
                    className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
                  />
                ) : (
                  <iframe
                    src={previewDoc.base64}
                    title={previewDoc.name}
                    className="w-full h-[72vh] rounded-lg border border-app-border bg-white"
                  />
                )
              ) : (
                <div className="text-center p-10 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aperçu direct non disponible pour ce fichier.</p>
                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(previewDoc)}
                    className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold"
                  >
                    Télécharger pour consulter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
