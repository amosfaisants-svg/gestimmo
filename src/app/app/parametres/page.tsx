"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Save, 
  Building, 
  FileText, 
  Users, 
  CreditCard, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  Shield, 
  Mail, 
  Phone, 
  X, 
  Check, 
  CheckCircle2, 
  AlertCircle,
  Key,
  Lock,
  UserPlus,
  Copy,
  Eye,
  Sliders,
  Download,
  Power,
  Database,
  Archive,
  RefreshCw,
  FileJson,
  AlertTriangle,
  HardDrive,
  CheckSquare,
  History
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { 
  savePdfTemplate, 
  getPdfTemplate, 
  saveReglementTemplate, 
  getReglementTemplate,
  saveGenericTemplate,
  getGenericTemplate,
  deleteGenericTemplate,
  getAllStoredFiles,
  restoreStoredFiles
} from "@/lib/storage";
import { syncRestoredDataToSupabase, isSupabaseConfigured, DEFAULT_COMPANY_ID } from "@/lib/dataService";
import { supabase } from "@/lib/supabase";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { UserPermissionRights, ModulePermissions, getDefaultPermissions } from "@/lib/companyCredentials";
import { cn } from "@/lib/utils";
import { getStoredCompanyInfo, saveStoredCompanyInfo } from "@/lib/companyInfo";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  login: string;
  password: string;
  role: "Administrateur" | "Gestionnaire" | "Comptable" | "Agent de terrain";
  status: "Actif" | "En attente" | "Inactif";
  dateAdded: string;
  permissions: UserPermissionRights;
}

export interface CustomDocumentTemplate {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileKey: string;
  dateAdded: string;
}

const defaultUsersList: UserAccount[] = [
  {
    id: "USR-001",
    name: "Kouassi Jean-Philippe",
    email: "jp.kouassi@immogestion-pro.ci",
    phone: "+225 07 01 02 03 04",
    login: "jp.kouassi@immogestion-pro.ci",
    password: "Admin1234!",
    role: "Administrateur",
    status: "Actif",
    dateAdded: "15 Janv 2026",
    permissions: getDefaultPermissions("Administrateur"),
  },
  {
    id: "USR-002",
    name: "Konan Patricia",
    email: "patricia.konan@immogestion-pro.ci",
    phone: "+225 05 08 09 10 11",
    login: "patricia.konan@immogestion-pro.ci",
    password: "Gest5678!",
    role: "Gestionnaire",
    status: "Actif",
    dateAdded: "01 Mars 2026",
    permissions: getDefaultPermissions("Gestionnaire"),
  },
  {
    id: "USR-003",
    name: "Yao Armand",
    email: "armand.yao@immogestion-pro.ci",
    phone: "+225 01 44 55 66 77",
    login: "armand.yao@immogestion-pro.ci",
    password: "Compta9012!",
    role: "Comptable",
    status: "Actif",
    dateAdded: "10 Juin 2026",
    permissions: getDefaultPermissions("Comptable"),
  },
  {
    id: "USR-004",
    name: "konan othniel",
    email: "oty@yahoo.fr",
    phone: "0174820983",
    login: "oty@yahoo.fr",
    password: "Agent1234!",
    role: "Agent de terrain",
    status: "Actif",
    dateAdded: "05 oct. 2026",
    permissions: getDefaultPermissions("Agent de terrain"),
  },
];

export default function SettingsPage() {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState("infos");
  const [modeleName, setModeleName] = useState<string | null>(null);
  const [modeleReglementName, setModeleReglementName] = useState<string | null>(null);

  // Custom document templates list
  const [customTemplates, setCustomTemplates] = useState<CustomDocumentTemplate[]>([]);
  const [isAddTemplateModalOpen, setIsAddTemplateModalOpen] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);

  // Users state
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);

  // Credentials Success Modal state
  const [viewedCredentials, setViewedCredentials] = useState<{
    user: UserAccount;
    isNew: boolean;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Form states for new/edited user
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userRole, setUserRole] = useState<UserAccount["role"]>("Gestionnaire");
  const [userStatus, setUserStatus] = useState<UserAccount["status"]>("Actif");
  const [userPermissions, setUserPermissions] = useState<UserPermissionRights>(getDefaultPermissions("Gestionnaire"));

  // Notification feedback
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };
  const [isSavedCompany, setIsSavedCompany] = useState(false);
  const [isSavedBank, setIsSavedBank] = useState(false);

  // Facturation & RIB state
  const [bankInfo, setBankInfo] = useState({
    bankName: "NSIA Banque Côte d'Ivoire",
    iban: "CI93 CI01 2011 0123 4567 8901 2345",
    bic: "NSIA CIBJ",
    accountOwner: "IMMO GESTION PRO SARL",
    waveMerchant: "+225 07 00 11 22 33",
    orangeMoney: "+225 01 00 11 22 33",
    note: "Mentions légales figurant sur les reçus de paiement et avis d'échéance.",
  });

  // Company Info state
  const [companyInfo, setCompanyInfo] = useState({
    name: "ImmoGestion Pro",
    rccm: "CI-ABJ-03-2022-B12-12345",
    address: "Cocody II Plateaux, Vallons, Abidjan",
    phone: "0102030405",
    email: "contact@immogestion-pro.ci",
    logo: "",
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    try {
      localStorage.setItem("gestimmo_settings_active_tab", tab);
    } catch (e) {}
  };

  const handleSaveCompanyInfo = async () => {
    if (!companyInfo.name || !companyInfo.name.trim()) {
      alert("Veuillez renseigner le nom de l'entreprise.");
      return;
    }

    setIsSavingSettings(true);
    try {
      const saved = saveStoredCompanyInfo(companyInfo);
      setCompanyInfo(saved);
      setIsSavedCompany(true);
      setTimeout(() => setIsSavedCompany(false), 3000);
      showToast("Informations de l'entreprise enregistrées avec succès !");
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'enregistrement de l'entreprise.");
    } finally {
      setTimeout(() => setIsSavingSettings(false), 200);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Fichier trop volumineux. Taille max recommandée : 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCompanyInfo((prev) => ({ ...prev, logo: base64 }));
      localStorage.setItem("gestimmo_company_logo", base64);
      showToast("Logo de l'entreprise mis à jour avec succès !");
    };
    reader.readAsDataURL(file);
  };

  // Backup & Restore state
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    appName?: string;
    version?: string;
    exportDate?: string;
    formattedDate?: string;
    storage?: Record<string, any>;
    files?: Record<string, string>;
    [key: string]: any;
  } | null>(null);

  useEffect(() => {
    // Load Last Backup Date
    // Load Active Tab
    const savedTab = localStorage.getItem("gestimmo_settings_active_tab");
    if (savedTab && ["infos", "facturation", "modeles", "users", "archivage"].includes(savedTab)) {
      setActiveTab(savedTab);
    }

    // Load Last Backup Date
    const savedBackupDate = localStorage.getItem("gestimmo_last_backup_date");
    if (savedBackupDate) {
      setLastBackupDate(savedBackupDate);
    }

    // Load Custom Templates
    const savedCustom = localStorage.getItem("gestimmo_custom_templates_list");
    if (savedCustom) {
      try {
        setCustomTemplates(JSON.parse(savedCustom));
      } catch (e) {}
    }

    // Load Users
    const savedUsers = localStorage.getItem("gestimmo_company_users");
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        // Ensure all users have permissions structure
        const normalized = parsed.map((u: any) => ({
          ...u,
          login: u.login || u.email,
          password: u.password || "Gest1234!",
          permissions: u.permissions || getDefaultPermissions(u.role || "Gestionnaire"),
        }));
        setUsersList(normalized);
      } catch (e) {
        setUsersList(defaultUsersList);
      }
    } else {
      setUsersList(defaultUsersList);
      localStorage.setItem("gestimmo_company_users", JSON.stringify(defaultUsersList));
    }

    // Load Bank Info
    const savedBank = localStorage.getItem("gestimmo_bank_info");
    if (savedBank) {
      try {
        setBankInfo(JSON.parse(savedBank));
      } catch (e) {}
    }

    // Load Company Info & Logo
    const initialCompany = getStoredCompanyInfo();
    setCompanyInfo(initialCompany);

    // Load Templates
    getPdfTemplate().then((savedModele) => {
      if (savedModele) {
        setModeleName("modèle_contrat.pdf (Sauvegardé)");
      } else {
        const old = localStorage.getItem("gestimmo_modele_contrat");
        if (old) setModeleName("modèle_contrat.pdf (Sauvegardé)");
      }
    });

    getReglementTemplate().then((savedReglement) => {
      if (savedReglement) {
        const savedName = localStorage.getItem("gestimmo_modele_reglement_name") || "modèle_règlement_intérieur.pdf";
        setModeleReglementName(`${savedName} (Sauvegardé)`);
      } else {
        const old = localStorage.getItem("gestimmo_modele_reglement");
        if (old) {
          const savedName = localStorage.getItem("gestimmo_modele_reglement_name") || "modèle_règlement_intérieur.pdf";
          setModeleReglementName(`${savedName} (Sauvegardé)`);
        }
      }
    });
  }, []);

  const getStorageStats = () => {
    if (typeof window === "undefined") return { biens: 0, logements: 0, proprietaires: 0, locataires: 0, baux: 0, paiements: 0, reversements: 0, incidents: 0 };
    const parseLen = (key: string) => {
      try {
        const item = localStorage.getItem(key);
        if (!item) return 0;
        const parsed = JSON.parse(item);
        return Array.isArray(parsed) ? parsed.length : 1;
      } catch {
        return 0;
      }
    };
    return {
      biens: parseLen("gestimmo_biens"),
      logements: parseLen("gestimmo_logements"),
      proprietaires: parseLen("gestimmo_proprietaires"),
      locataires: parseLen("gestimmo_locataires"),
      baux: parseLen("gestimmo_baux"),
      paiements: parseLen("gestimmo_paiements"),
      reversements: parseLen("gestimmo_reversements"),
      incidents: parseLen("gestimmo_incidents"),
    };
  };

  const handleExportArchive = async () => {
    setIsExporting(true);
    try {
      const localStorageData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("gestimmo_")) {
          const val = localStorage.getItem(key);
          if (val !== null) {
            try {
              localStorageData[key] = JSON.parse(val);
            } catch {
              localStorageData[key] = val;
            }
          }
        }
      }

      // Collect IndexedDB files
      const indexedDBFiles = await getAllStoredFiles();

      const now = new Date();
      const formattedDate = now.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const backupPayload = {
        appName: "GESTIMMO",
        version: "1.0",
        exportDate: now.toISOString(),
        formattedDate: formattedDate,
        storage: localStorageData,
        files: indexedDBFiles,
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const downloadLink = document.createElement("a");
      const dateSuffix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}h${String(now.getMinutes()).padStart(2, "0")}`;
      downloadLink.href = url;
      downloadLink.download = `GESTIMMO_Archive_${dateSuffix}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      localStorage.setItem("gestimmo_last_backup_date", formattedDate);
      setLastBackupDate(formattedDate);
      showToast("Archive des données générée et téléchargée avec succès !");
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la création de l'archive.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      alert("Veuillez sélectionner un fichier de sauvegarde JSON valide (.json).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || typeof parsed !== "object") {
          alert("Le fichier sélectionné ne contient pas une sauvegarde GESTIMMO valide.");
          return;
        }

        const storage = parsed.storage || parsed;
        const hasGestimmoKeys = Object.keys(storage).some((k) => k.startsWith("gestimmo_"));

        if (!hasGestimmoKeys && !parsed.appName) {
          alert("Le fichier sélectionné ne contient pas une sauvegarde GESTIMMO valide.");
          return;
        }

        setImportPreview(parsed);
        setIsRestoreModalOpen(true);
      } catch (err) {
        console.error(err);
        alert("Erreur de lecture du fichier. Assurez-vous qu'il s'agit d'un fichier JSON valide.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmRestore = async () => {
    if (!importPreview) return;

    setIsImporting(true);
    try {
      const storageObj = importPreview.storage || importPreview;

      // Clean existing gestimmo keys to avoid ghost data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("gestimmo_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Restore localStorage entries
      Object.entries(storageObj).forEach(([key, val]) => {
        if (key.startsWith("gestimmo_")) {
          let stringVal: string;
          if (typeof val === "string") {
            stringVal = val;
          } else {
            stringVal = JSON.stringify(val);
          }
          localStorage.setItem(key, stringVal);
        }
      });

      // Restore IndexedDB files if present
      if (importPreview.files) {
        await restoreStoredFiles(importPreview.files);
      }

      // Sync restored data to Supabase database if configured
      await syncRestoredDataToSupabase(storageObj);

      setIsRestoreModalOpen(false);
      showToast("Données restaurées avec succès ! Rechargement de l'application...");

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la restauration des données.");
    } finally {
      setIsImporting(false);
    }
  };


  const handleSaveUsersList = (updated: UserAccount[]) => {
    setUsersList(updated);
    localStorage.setItem("gestimmo_company_users", JSON.stringify(updated));
  };

  const handleRoleChange = (newRole: UserAccount["role"]) => {
    setUserRole(newRole);
    setUserPermissions(getDefaultPermissions(newRole));
  };

  const togglePermission = (moduleKey: keyof UserPermissionRights, permType: "view" | "edit" | "delete" | "viewCredentials") => {
    setUserPermissions((prev) => {
      const currentVal = prev[moduleKey]?.[permType];
      const newVal = permType === "viewCredentials" ? currentVal === false : !currentVal;
      return {
        ...prev,
        [moduleKey]: {
          ...prev[moduleKey],
          [permType]: newVal,
        },
      };
    });
  };

  const handleCreateOrUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) {
      alert("Veuillez renseigner le nom et l'adresse email.");
      return;
    }

    if (editingUser) {
      const updatedUser: UserAccount = {
        ...editingUser,
        name: userName,
        email: userEmail,
        phone: userPhone,
        role: userRole,
        status: userStatus,
        permissions: userPermissions,
      };

      const updatedList = usersList.map((u) => (u.id === editingUser.id ? updatedUser : u));
      handleSaveUsersList(updatedList);
      showToast(`Utilisateur "${userName}" mis à jour avec succès.`);
      setIsAddUserModalOpen(false);
      setEditingUser(null);
    } else {
      // Automatic password generation
      const prefix = userRole === "Administrateur" ? "Admin" : userRole === "Comptable" ? "Compta" : "Gest";
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const generatedPassword = `${prefix}${randomDigits}!`;
      const generatedLogin = userEmail.trim().toLowerCase();

      const newUser: UserAccount = {
        id: `USR-${String(usersList.length + 1).padStart(3, "0")}`,
        name: userName.trim(),
        email: userEmail.trim(),
        phone: userPhone.trim(),
        login: generatedLogin,
        password: generatedPassword,
        role: userRole,
        status: userStatus,
        dateAdded: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
        permissions: userPermissions,
      };

      const updatedList = [...usersList, newUser];
      handleSaveUsersList(updatedList);
      setIsAddUserModalOpen(false);

      // Open Success Credentials Modal
      setViewedCredentials({
        user: newUser,
        isNew: true,
      });
    }

    // Reset Form
    setUserName("");
    setUserEmail("");
    setUserPhone("");
    setUserRole("Gestionnaire");
    setUserStatus("Actif");
    setUserPermissions(getDefaultPermissions("Gestionnaire"));
  };

  const handleOpenEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserPhone(user.phone);
    setUserRole(user.role);
    setUserStatus(user.status || "Actif");
    setUserPermissions(user.permissions || getDefaultPermissions(user.role));
    setIsAddUserModalOpen(true);
  };

  const handleDeleteUser = (id: string) => {
    const updated = usersList.filter((u) => u.id !== id);
    handleSaveUsersList(updated);
    setUserToDelete(null);
    showToast("Utilisateur supprimé de la gestion d'entreprise.");
  };

  const handleToggleUserStatus = (user: UserAccount) => {
    const nextStatus = user.status === "Actif" ? "Inactif" : "Actif";
    const updated = usersList.map((u) => (u.id === user.id ? { ...u, status: nextStatus as any } : u));
    handleSaveUsersList(updated);
    showToast(`Statut de ${user.name} passé à "${nextStatus}".`);
  };

  const handleSaveBankInfo = async () => {
    setIsSavingSettings(true);
    try {
      localStorage.setItem("gestimmo_bank_info", JSON.stringify(bankInfo));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
      }
      setIsSavedBank(true);
      setTimeout(() => setIsSavedBank(false), 3000);
      showToast("Coordonnées bancaires & RIB sauvegardés avec succès !");
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'enregistrement du RIB.");
    } finally {
      setTimeout(() => setIsSavingSettings(false), 200);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      if (activeTab === "infos") {
        await handleSaveCompanyInfo();
      } else if (activeTab === "facturation") {
        await handleSaveBankInfo();
      } else if (activeTab === "users") {
        handleSaveUsersList(usersList);
        showToast("Liste des utilisateurs mise à jour avec succès !");
      } else {
        await handleSaveCompanyInfo();
        await handleSaveBankInfo();
        showToast("Modifications enregistrées avec succès !");
      }
    } catch (err) {
      console.error(err);
      showToast("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setTimeout(() => setIsSavingSettings(false), 300);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setModeleName("Sauvegarde en cours...");
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          await savePdfTemplate(base64String);
          setModeleName(`${file.name} (Sauvegardé)`);
          showToast("Modèle de contrat sauvegardé avec succès !");
        } catch (error) {
          console.error(error);
          alert("Erreur lors de la sauvegarde du modèle.");
          setModeleName(null);
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert("Veuillez sélectionner un fichier PDF valide.");
    }
  };

  const handleReglementFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setModeleReglementName("Sauvegarde en cours...");
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          await saveReglementTemplate(base64String);
          try {
            localStorage.setItem("gestimmo_modele_reglement", base64String);
            localStorage.setItem("gestimmo_modele_reglement_name", file.name);
          } catch (err) {
            console.error(err);
          }
          setModeleReglementName(`${file.name} (Sauvegardé)`);
          showToast("Modèle de règlement intérieur sauvegardé avec succès !");
        } catch (error) {
          console.error(error);
          alert("Erreur lors de la sauvegarde du modèle de règlement intérieur.");
          setModeleReglementName(null);
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert("Veuillez sélectionner un fichier PDF valide.");
    }
  };

  const handleDownloadDefaultContrat = async () => {
    try {
      let base64 = await getPdfTemplate();
      if (!base64) base64 = localStorage.getItem("gestimmo_modele_contrat");
      if (!base64) {
        alert("Aucun fichier PDF n'a été importé pour ce modèle.");
        return;
      }
      const a = document.createElement("a");
      a.href = base64;
      a.download = "modèle_contrat.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Erreur lors du téléchargement.");
    }
  };

  const handleDownloadDefaultReglement = async () => {
    try {
      let base64 = await getReglementTemplate();
      if (!base64) base64 = localStorage.getItem("gestimmo_modele_reglement");
      if (!base64) {
        alert("Aucun fichier PDF n'a été importé pour ce modèle.");
        return;
      }
      const name = localStorage.getItem("gestimmo_modele_reglement_name") || "modèle_règlement_intérieur.pdf";
      const a = document.createElement("a");
      a.href = base64;
      a.download = name.endsWith(".pdf") ? name : `${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Erreur lors du téléchargement.");
    }
  };

  const handleCreateCustomTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim() || !newTemplateFile) {
      alert("Veuillez renseigner le titre du modèle et sélectionner un fichier PDF.");
      return;
    }

    if (newTemplateFile.type !== "application/pdf") {
      alert("Veuillez sélectionner un fichier PDF valide.");
      return;
    }

    const fileKey = `gestimmo_custom_template_${Date.now()}`;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await saveGenericTemplate(fileKey, base64String);
        try {
          localStorage.setItem(fileKey, base64String);
        } catch (err) {}

        const newTemplate: CustomDocumentTemplate = {
          id: `TPL-${Date.now()}`,
          title: newTemplateTitle.trim(),
          description: newTemplateDescription.trim(),
          fileName: newTemplateFile.name,
          fileKey: fileKey,
          dateAdded: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
        };

        const updated = [...customTemplates, newTemplate];
        setCustomTemplates(updated);
        localStorage.setItem("gestimmo_custom_templates_list", JSON.stringify(updated));

        showToast(`Modèle "${newTemplateTitle}" ajouté avec succès !`);
        setIsAddTemplateModalOpen(false);
        setNewTemplateTitle("");
        setNewTemplateDescription("");
        setNewTemplateFile(null);
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la sauvegarde du fichier PDF modèle.");
      }
    };
    reader.readAsDataURL(newTemplateFile);
  };

  const handleReplaceCustomTemplateFile = (template: CustomDocumentTemplate, file: File) => {
    if (file.type !== "application/pdf") {
      alert("Veuillez sélectionner un fichier PDF valide.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await saveGenericTemplate(template.fileKey, base64String);
        try {
          localStorage.setItem(template.fileKey, base64String);
        } catch (err) {}

        const updated = customTemplates.map((t) =>
          t.id === template.id ? { ...t, fileName: file.name } : t
        );
        setCustomTemplates(updated);
        localStorage.setItem("gestimmo_custom_templates_list", JSON.stringify(updated));

        showToast(`Fichier PDF pour "${template.title}" mis à jour !`);
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la mise à jour du fichier.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadCustomTemplate = async (template: CustomDocumentTemplate) => {
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

  const handleDeleteCustomTemplate = async (template: CustomDocumentTemplate) => {
    if (!confirm(`Voulez-vous vraiment supprimer le modèle "${template.title}" ?`)) return;
    try {
      await deleteGenericTemplate(template.fileKey);
      localStorage.removeItem(template.fileKey);
    } catch (e) {
      console.error(e);
    }
    const updated = customTemplates.filter((t) => t.id !== template.id);
    setCustomTemplates(updated);
    localStorage.setItem("gestimmo_custom_templates_list", JSON.stringify(updated));
    showToast(`Modèle "${template.title}" supprimé.`);
  };

  const getRoleBadgeVariant = (role: UserAccount["role"]) => {
    switch (role) {
      case "Administrateur":
        return "danger";
      case "Gestionnaire":
        return "info";
      case "Comptable":
        return "success";
      case "Agent de terrain":
        return "warning";
      default:
        return "default";
    }
  };

  const moduleLabels: Record<keyof UserPermissionRights, { title: string; desc: string }> = {
    biens: { title: "Biens & Logements", desc: "Consultation, création et modification des biens" },
    locataires: { title: "Locataires & Propriétaires", desc: "Fiches contacts et informations personnelles" },
    baux: { title: "Baux & Contrats", desc: "Établissement, signature et annulation des baux" },
    paiements: { title: "Paiements & Reçus", desc: "Encaissement des loyers, quittances et comptabilité" },
    incidents: { title: "Incidents & Constats", desc: "États des lieux et suivi des demandes de réparation" },
    parametres: { title: "Paramètres Entreprise", desc: "Modification des modèles et options générales" },
  };

  if (!can("parametres", "view")) {
    return <AccessDeniedCard moduleName="Paramètres & Gestion des utilisateurs" />;
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 max-w-5xl mx-auto relative">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres de l'entreprise</h1>
          <p className="text-sm text-gray-500 mt-1">Configurez votre compte, vos préférences, utilisateurs et modèles.</p>
        </div>
        <button 
          type="button"
          onClick={handleSaveSettings}
          disabled={isSavingSettings}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center shadow-sm w-fit cursor-pointer disabled:opacity-75",
            isSavedCompany || isSavedBank
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-primary text-white hover:bg-primary/90"
          )}
        >
          {isSavingSettings ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...
            </>
          ) : (isSavedCompany || isSavedBank) ? (
            <>
              <Check className="h-4 w-4 mr-2" /> Modifications enregistrées !
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Enregistrer les modifications
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="space-y-1">
          <button 
            type="button"
            onClick={() => handleTabChange("infos")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 font-medium rounded-lg text-sm transition-colors text-left ${activeTab === 'infos' ? 'bg-primary-50 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Building className="w-4 h-4" /> Infos Entreprise
          </button>
          <button 
            type="button"
            onClick={() => handleTabChange("facturation")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 font-medium rounded-lg text-sm transition-colors text-left ${activeTab === 'facturation' ? 'bg-primary-50 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <CreditCard className="w-4 h-4" /> Facturation & RIB
          </button>
          <button 
            type="button"
            onClick={() => handleTabChange("modeles")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 font-medium rounded-lg text-sm transition-colors text-left ${activeTab === 'modeles' ? 'bg-primary-50 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <FileText className="w-4 h-4" /> Modèles de documents ({2 + customTemplates.length})
          </button>
          <button 
            type="button"
            onClick={() => handleTabChange("users")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 font-medium rounded-lg text-sm transition-colors text-left ${activeTab === 'users' ? 'bg-primary-50 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Users className="w-4 h-4" /> Utilisateurs ({usersList.length})
          </button>
          <button 
            type="button"
            onClick={() => handleTabChange("archivage")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 font-medium rounded-lg text-sm transition-colors text-left ${activeTab === 'archivage' ? 'bg-primary-50 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Database className="w-4 h-4" /> Archivage & Restauration
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          {/* TAB 1: INFOS ENTREPRISE */}
          {activeTab === "infos" && (
            <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Informations Générales</h2>
                  <p className="text-sm text-gray-500 mt-1">Identité légale et coordonnées officielles de votre agence immobilière.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 pb-6 border-b border-app-border">
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <div 
                  onClick={() => logoInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden group relative"
                  title="Cliquer pour téléverser votre logo"
                >
                  {companyInfo.logo ? (
                    <img src={companyInfo.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="text-xs text-gray-500 font-medium text-center px-2 group-hover:text-primary transition-colors">
                      Ajouter Logo
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Logo de l'entreprise</h3>
                  <p className="text-xs text-gray-500 mb-3">Format recommandé : PNG ou JPG (max 2MB). Affiché sur vos contrats et quittances.</p>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 border border-app-border text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Parcourir...
                    </button>
                    {companyInfo.logo && (
                      <button 
                        type="button"
                        onClick={() => {
                          setCompanyInfo(prev => ({ ...prev, logo: "" }));
                          localStorage.removeItem("gestimmo_company_logo");
                          showToast("Logo supprimé.");
                        }}
                        className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'entreprise</label>
                  <input 
                    type="text" 
                    value={companyInfo.name} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro RCCM / SIRET</label>
                  <input 
                    type="text" 
                    value={companyInfo.rccm} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, rccm: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-mono" 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse du siège social</label>
                  <input 
                    type="text" 
                    value={companyInfo.address} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone contact</label>
                  <input 
                    type="tel" 
                    value={companyInfo.phone} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de contact</label>
                  <input 
                    type="email" 
                    value={companyInfo.email} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-medium" 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-app-border flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveCompanyInfo}
                  disabled={isSavingSettings}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center shadow-sm cursor-pointer disabled:opacity-75",
                    isSavedCompany
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                      : "bg-primary text-white hover:bg-primary/90"
                  )}
                >
                  {isSavingSettings ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...
                    </>
                  ) : isSavedCompany ? (
                    <>
                      <Check className="w-4 h-4 mr-2" /> Informations enregistrées !
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Enregistrer les informations
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: FACTURATION & RIB */}
          {activeTab === "facturation" && (
            <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Coordonnées Bancaires & RIB</h2>
                <p className="text-sm text-gray-500 mt-1">Ces informations bancaires et marchandes sont affichées sur les appels de loyers et reçus de paiement.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de la Banque</label>
                  <input 
                    type="text" 
                    value={bankInfo.bankName}
                    onChange={(e) => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-medium" 
                    placeholder="Ex: NSIA Banque"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Titulaire du Compte</label>
                  <input 
                    type="text" 
                    value={bankInfo.accountOwner}
                    onChange={(e) => setBankInfo({ ...bankInfo, accountOwner: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-medium" 
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">IBAN / Numéro de Compte RIB</label>
                  <input 
                    type="text" 
                    value={bankInfo.iban}
                    onChange={(e) => setBankInfo({ ...bankInfo, iban: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-semibold" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Code BIC / SWIFT</label>
                  <input 
                    type="text" 
                    value={bankInfo.bic}
                    onChange={(e) => setBankInfo({ ...bankInfo, bic: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 text-gray-900" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Paiement Mobile Wave Merchant</label>
                  <input 
                    type="text" 
                    value={bankInfo.waveMerchant}
                    onChange={(e) => setBankInfo({ ...bankInfo, waveMerchant: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Paiement Orange Money Merchant</label>
                  <input 
                    type="text" 
                    value={bankInfo.orangeMoney}
                    onChange={(e) => setBankInfo({ ...bankInfo, orangeMoney: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900" 
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="button"
                  onClick={handleSaveBankInfo}
                  disabled={isSavingSettings}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center disabled:opacity-75 cursor-pointer",
                    isSavedBank
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-primary text-white hover:bg-primary/90"
                  )}
                >
                  {isSavingSettings ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...
                    </>
                  ) : isSavedBank ? (
                    <>
                      <Check className="w-4 h-4 mr-2" /> RIB enregistré !
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Enregistrer le RIB
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MODÈLES DE DOCUMENTS */}
          {activeTab === "modeles" && (
            <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Modèles de documents</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Importez vos modèles de contrats, règlements intérieurs et documents types.</p>
                </div>
                <button
                  onClick={() => {
                    setNewTemplateTitle("");
                    setNewTemplateDescription("");
                    setNewTemplateFile(null);
                    setIsAddTemplateModalOpen(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" /> Ajouter un modèle de document
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Default Template 1: Contrat de Bail */}
                <div className="border border-app-border rounded-xl p-5 hover:border-gray-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-gray-900">Modèle de Contrat de Bail</h3>
                      <p className="text-sm text-gray-500">Importez un fichier PDF contenant des pointillés. Le système remplira automatiquement les données du locataire par-dessus.</p>
                      
                      <div className="pt-3 flex flex-wrap items-center gap-3">
                        <label className="cursor-pointer bg-white border border-app-border text-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm">
                          <Upload className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                          {modeleName ? "Remplacer le PDF" : "Importer un PDF"}
                          <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                        </label>

                        {modeleName && (
                          <button
                            onClick={handleDownloadDefaultContrat}
                            className="bg-white border border-app-border text-primary px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-50 transition-colors flex items-center shadow-sm"
                            title="Télécharger le modèle de contrat en PDF"
                          >
                            <Download className="w-3.5 h-3.5 mr-1.5 text-primary" /> Télécharger
                          </button>
                        )}

                        {modeleName && (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center">
                            ✓ {modeleName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Default Template 2: Règlement Intérieur */}
                <div className="border border-app-border rounded-xl p-5 hover:border-gray-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-gray-900">Modèle de Règlement Intérieur</h3>
                      <p className="text-sm text-gray-500">Importez un fichier PDF contenant le règlement intérieur à utiliser comme modèle.</p>
                      
                      <div className="pt-3 flex flex-wrap items-center gap-3">
                        <label className="cursor-pointer bg-white border border-app-border text-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm">
                          <Upload className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                          {modeleReglementName ? "Remplacer le PDF" : "Importer un PDF"}
                          <input type="file" accept="application/pdf" className="hidden" onChange={handleReglementFileUpload} />
                        </label>

                        {modeleReglementName && (
                          <button
                            onClick={handleDownloadDefaultReglement}
                            className="bg-white border border-app-border text-primary px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-50 transition-colors flex items-center shadow-sm"
                            title="Télécharger le modèle de règlement intérieur en PDF"
                          >
                            <Download className="w-3.5 h-3.5 mr-1.5 text-primary" /> Télécharger
                          </button>
                        )}

                        {modeleReglementName && (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center">
                            ✓ {modeleReglementName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom User Added Templates */}
                {customTemplates.map((template) => (
                  <div key={template.id} className="border border-app-border rounded-xl p-5 hover:border-gray-300 transition-colors relative">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-gray-900">{template.title}</h3>
                          <button
                            onClick={() => handleDeleteCustomTemplate(template)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                            title="Supprimer ce modèle de document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-500">{template.description}</p>
                        )}

                        <div className="pt-3 flex flex-wrap items-center gap-3">
                          <label className="cursor-pointer bg-white border border-app-border text-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm">
                            <Upload className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                            Remplacer le PDF
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleReplaceCustomTemplateFile(template, f);
                              }}
                            />
                          </label>

                          <button
                            onClick={() => handleDownloadCustomTemplate(template)}
                            className="bg-white border border-app-border text-primary px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-50 transition-colors flex items-center shadow-sm"
                            title="Télécharger ce modèle en PDF"
                          >
                            <Download className="w-3.5 h-3.5 mr-1.5 text-primary" /> Télécharger
                          </button>

                          <span className="text-xs text-emerald-600 font-semibold flex items-center">
                            ✓ {template.fileName} (Sauvegardé)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: UTILISATEURS (3) */}
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Top Banner / Add User Button */}
              <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Utilisateurs & Gestionnaires de l'entreprise</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Gérez les comptes d'accès et définissez les droits par module pour vos collaborateurs.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setUserName("");
                    setUserEmail("");
                    setUserPhone("");
                    setUserRole("Gestionnaire");
                    setUserStatus("Actif");
                    setUserPermissions(getDefaultPermissions("Gestionnaire"));
                    setIsAddUserModalOpen(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm shrink-0"
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Ajouter un utilisateur
                </button>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border">
                        <th className="px-6 py-4 font-medium">Utilisateur</th>
                        <th className="px-6 py-4 font-medium">Contact</th>
                        <th className="px-6 py-4 font-medium text-center">Rôle</th>
                        <th className="px-6 py-4 font-medium text-center">Statut</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {usersList.length > 0 ? (
                        usersList.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                            {/* User Info */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 border border-primary/20">
                                  {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                                  <p className="text-xs text-gray-400">Ajouté le {user.dateAdded}</p>
                                </div>
                              </div>
                            </td>

                            {/* Contact */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-0.5">
                                <div className="flex items-center text-xs text-gray-600">
                                  <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0" />
                                  {user.email}
                                </div>
                                {user.phone && (
                                  <div className="flex items-center text-xs text-gray-500">
                                    <Phone className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0" />
                                    {user.phone}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Role */}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <Badge variant={getRoleBadgeVariant(user.role)}>
                                {user.role}
                              </Badge>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                title="Cliquer pour modifier le statut"
                                className="inline-flex cursor-pointer"
                              >
                                <Badge 
                                  dot 
                                  variant={user.status === "Actif" ? "success" : user.status === "En attente" ? "warning" : "default"}
                                >
                                  {user.status}
                                </Badge>
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                {can("parametres", "edit") && (
                                  <button
                                    onClick={() => handleToggleUserStatus(user)}
                                    className={`p-1.5 rounded-lg transition-colors border ${
                                      user.status === "Actif"
                                        ? "text-emerald-600 bg-emerald-50 hover:bg-red-50 hover:text-red-600 border-emerald-200 hover:border-red-200"
                                        : "text-red-500 bg-red-50 hover:bg-emerald-50 hover:text-emerald-600 border-red-200 hover:border-emerald-200"
                                    }`}
                                    title={user.status === "Actif" ? "Désactiver le compte de cet utilisateur" : "Activer le compte de cet utilisateur"}
                                  >
                                    <Power className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setViewedCredentials({ user, isNew: false })}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200"
                                  title="Consulter les identifiants d'accès"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(user)}
                                  className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100"
                                  title="Modifier l'utilisateur & ses droits"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setUserToDelete(user)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                  title="Supprimer l'utilisateur"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            Aucun utilisateur trouvé.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ARCHIVAGE & DONNÉES */}
          {activeTab === "archivage" && (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Archivage et Restauration des Données</h2>
                    <p className="text-sm text-gray-500">Sauvegardez l'ensemble de vos données de gestion ou restaurez un fichier d'archive JSON.</p>
                  </div>
                </div>

                {/* Storage metrics summary */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-app-border">
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Biens & Logements</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">
                      {getStorageStats().biens} bien(s) / {getStorageStats().logements} logt(s)
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Locataires & Propriétaires</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">
                      {getStorageStats().locataires} loc. / {getStorageStats().proprietaires} prop.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Baux & Paiements</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">
                      {getStorageStats().baux} bail(aux) / {getStorageStats().paiements} paie.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Statut Base de Données</p>
                    <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500 shrink-0" /> Données actives
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Card */}
                <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col justify-between space-y-4 hover:border-gray-300 transition-colors">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <Archive className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Archiver / Exporter les Données</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Générez un fichier d'archive JSON complet contenant l'intégralité de la base de données : biens, baux, locataires, paiements, utilisateurs et modèles PDF.
                      </p>
                    </div>

                    {lastBackupDate ? (
                      <div className="inline-flex items-center text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <History className="w-3.5 h-3.5 text-gray-400 mr-1.5 shrink-0" />
                        Dernier archivage : <span className="font-semibold text-gray-900 ml-1">{lastBackupDate}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 font-medium">
                        • Aucun archivage n'a encore été enregistré sur cet appareil.
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-app-border">
                    <button
                      onClick={handleExportArchive}
                      disabled={isExporting}
                      className="w-full bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50"
                    >
                      {isExporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Génération de l'archive...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" /> Exporter l'archive (.json)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Import Card */}
                <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm flex flex-col justify-between space-y-4 hover:border-gray-300 transition-colors">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Restaurer / Importer une Archive</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Restaurez vos données à partir d'un fichier de sauvegarde GESTIMMO (.json) précédemment exporté.
                      </p>
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Attention :</strong> La restauration remplacera l'ensemble de vos données actuelles par le contenu du fichier importé.
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-app-border space-y-2.5">
                    <label className="w-full bg-white border border-app-border text-gray-800 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm cursor-pointer">
                      <FileJson className="w-4 h-4 mr-2 text-primary" /> Importer un fichier de sauvegarde (.json)
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={handleSelectImportFile}
                      />
                    </label>

                    <button
                      onClick={async () => {
                        setIsImporting(true);
                        try {
                          const ok = await syncRestoredDataToSupabase();
                          if (ok) {
                            showToast("Données synchronisées et enregistrées dans la base de données Supabase !");
                            setTimeout(() => window.location.reload(), 1200);
                          } else {
                            alert("Aucune donnée locale à synchroniser ou erreur de connexion Supabase.");
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Erreur lors de la synchronisation vers la base de données.");
                        } finally {
                          setIsImporting(false);
                        }
                      }}
                      disabled={isImporting}
                      className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Enregistrement en cours...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4 mr-2" /> Enregistrer les données vers Supabase
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Custom Document Template */}
      {isAddTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Ajouter un modèle de document</h3>
                  <p className="text-xs text-gray-500">Importez un nouveau fichier PDF modèle</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddTemplateModalOpen(false)}
                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre du document *</label>
                <input
                  type="text"
                  required
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  placeholder="Ex: Acte de caution solidaire"
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnelle)</label>
                <textarea
                  rows={2}
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Ex: Document à faire signer par la caution solidaire avant la remise des clés."
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier PDF du modèle *</label>
                <input
                  type="file"
                  required
                  accept="application/pdf"
                  onChange={(e) => setNewTemplateFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary hover:file:bg-primary-100 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-app-border mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddTemplateModalOpen(false)}
                  className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Créer le modèle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal with Permissions */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingUser ? "Modifier l'utilisateur et ses droits" : "Nouveau membre & création automatique de compte"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingUser ? "Ajustez les accès et permissions pour cette personne" : "Définissez le profil et les permissions pour générer ses accès"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateUser} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Profile Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Informations du compte
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom et Prénom *</label>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Ex: Kouame Thierry"
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse E-mail (Identifiant) *</label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="Ex: thierry@immogestion-pro.ci"
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de Téléphone</label>
                    <input
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="Ex: +225 07 00 00 00 00"
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rôle principal *</label>
                    <select
                      value={userRole}
                      onChange={(e) => handleRoleChange(e.target.value as any)}
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-medium"
                    >
                      <option value="Administrateur">Administrateur (Accès total)</option>
                      <option value="Gestionnaire">Gestionnaire (Baux, Logements, Locataires)</option>
                      <option value="Comptable">Comptable (Loyers, Quittances, Reçus)</option>
                      <option value="Agent de terrain">Agent de terrain (Constats & Incidents)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut du compte *</label>
                    <select
                      value={userStatus}
                      onChange={(e) => setUserStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-medium"
                    >
                      <option value="Actif">Actif (Accès autorisé)</option>
                      <option value="Inactif">Inactif (Accès désactivé)</option>
                      <option value="En attente">En attente</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Rights & Granular Permissions */}
              <div className="space-y-3 pt-4 border-t border-app-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" /> Droits d'utilisation de l'application
                  </h4>
                  <span className="text-xs text-gray-400">Personalisez les accès module par module</span>
                </div>

                <div className="bg-gray-50/80 rounded-xl border border-app-border overflow-hidden divide-y divide-app-border">
                  {(Object.keys(moduleLabels) as Array<keyof UserPermissionRights>).map((moduleKey) => {
                    const info = moduleLabels[moduleKey];
                    const perms = userPermissions[moduleKey];
                    return (
                      <div key={moduleKey} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{info.title}</p>
                          <p className="text-xs text-gray-500">{info.desc}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs shrink-0">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={perms.view}
                              onChange={() => togglePermission(moduleKey, "view")}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                            />
                            <span className="text-gray-700 font-medium">Lecture</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={perms.edit}
                              onChange={() => togglePermission(moduleKey, "edit")}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                            />
                            <span className="text-gray-700 font-medium">Modification</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={perms.delete}
                              onChange={() => togglePermission(moduleKey, "delete")}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                            />
                            <span className="text-gray-700 font-medium">Suppression</span>
                          </label>

                          {moduleKey === "biens" && (
                            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-amber-50 px-2 py-1 rounded-md border border-amber-200 hover:bg-amber-100/70 transition-colors">
                              <input
                                type="checkbox"
                                checked={perms.viewCredentials !== false}
                                onChange={() => togglePermission(moduleKey, "viewCredentials")}
                                className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                              />
                              <span className="text-amber-900 font-medium flex items-center gap-1">
                                <Key className="w-3.5 h-3.5 text-amber-600" /> Identifiants Espace Propriétaire
                              </span>
                            </label>
                          )}

                          {moduleKey === "locataires" && (
                            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100/70 transition-colors">
                              <input
                                type="checkbox"
                                checked={perms.viewCredentials !== false}
                                onChange={() => togglePermission(moduleKey, "viewCredentials")}
                                className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                              />
                              <span className="text-emerald-900 font-medium flex items-center gap-1">
                                <Key className="w-3.5 h-3.5 text-emerald-600" /> Accès Espace Locataire
                              </span>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-app-border shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {editingUser ? "Enregistrer les modifications" : "Créer le compte & Générer l'accès"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Credentials Success & View Modal */}
      {viewedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shrink-0">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {viewedCredentials.isNew ? "Compte utilisateur créé !" : "Identifiants d'accès utilisateur"}
                  </h3>
                  <p className="text-xs text-gray-500">Accès généré pour l'Espace Administration</p>
                </div>
              </div>
              <button
                onClick={() => setViewedCredentials(null)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 rounded-xl border border-blue-100 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60 text-xs">
                <span className="text-gray-500">Utilisateur :</span>
                <span className="font-semibold text-gray-900">{viewedCredentials.user.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60 text-xs">
                <span className="text-gray-500">Rôle :</span>
                <Badge variant={getRoleBadgeVariant(viewedCredentials.user.role)}>
                  {viewedCredentials.user.role}
                </Badge>
              </div>

              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">
                    Identifiant / E-mail de connexion :
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-primary select-all">
                    {viewedCredentials.user.login || viewedCredentials.user.email}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">
                    Mot de passe temporaire :
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-emerald-600 select-all">
                    {viewedCredentials.user.password || "Gest1234!"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <CheckCircle2 className="w-4 h-4 text-amber-600 mr-2 shrink-0" />
              Cet utilisateur peut désormais se connecter sur la page de Connexion avec ces accès.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  const textToCopy = `Bonjour ${viewedCredentials.user.name},\nVoici vos accès pour l'Espace Administration GESTIMMO :\nIdentifiant: ${viewedCredentials.user.login || viewedCredentials.user.email}\nMot de passe: ${viewedCredentials.user.password || "Gest1234!"}`;
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
                onClick={() => setViewedCredentials(null)}
                className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Supprimer l'utilisateur</h3>
                <p className="text-xs text-gray-500">Action irréversible</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Êtes-vous sûr de vouloir retirer l'utilisateur <strong className="text-gray-900">{userToDelete.name}</strong> ({userToDelete.email}) de l'équipe de votre entreprise ?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteUser(userToDelete.id)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {isRestoreModalOpen && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Confirmer la restauration des données</h3>
                  <p className="text-xs text-gray-500">Remplacement de la base de données</p>
                </div>
              </div>
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
              <p className="font-semibold text-sm text-amber-950 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1.5 text-amber-700 shrink-0" /> Action à fort impact
              </p>
              <p>
                La restauration des données va <strong>écraser définitivement</strong> la base de données actuelle pour réinstaller les données du fichier importé.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-2">
              <p className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-2">Aperçu du fichier d'archive :</p>
              <div className="flex justify-between border-b border-gray-200 pb-1.5">
                <span className="text-gray-500">Application :</span>
                <span className="font-semibold text-gray-900">{importPreview.appName || "GESTIMMO"}</span>
              </div>
              {importPreview.formattedDate && (
                <div className="flex justify-between border-b border-gray-200 pb-1.5">
                  <span className="text-gray-500">Date d'exportation :</span>
                  <span className="font-semibold text-gray-900">{importPreview.formattedDate}</span>
                </div>
              )}
              <div className="flex justify-between pb-1">
                <span className="text-gray-500">Tables de données trouvées :</span>
                <span className="font-semibold text-emerald-600">
                  {Object.keys(importPreview.storage || importPreview).filter((k) => k.startsWith("gestimmo_")).length} module(s)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={isImporting}
                className="bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shadow-sm flex items-center disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Restauration...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" /> Restaurer les données
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


