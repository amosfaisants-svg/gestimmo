"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { 
  ArrowLeft, 
  Save, 
  User, 
  Building2, 
  CreditCard, 
  Key, 
  Check, 
  Copy, 
  CheckCircle2, 
  ShieldCheck, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  X, 
  FileText 
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ensureOwnerCredentials, OwnerCredential } from "@/lib/ownerCredentials";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { Badge } from "@/components/ui/Badge";
import { createOwner, updateOwner, fetchOwners } from "@/lib/dataService";
import { 
  saveGenericTemplate, 
  getGenericTemplate, 
  deleteGenericTemplate, 
  getPdfTemplate, 
  getReglementTemplate, 
  getOrGenerateContratTemplate,
  getOrGenerateReglementTemplate,
  CustomDocumentTemplate 
} from "@/lib/storage";

function NouveauProprietaireForm() {
  const { can } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = !!editId;

  const [nom, setNom] = useState("");
  const [randomInt, setRandomInt] = useState("");
  const [typeProprietaire, setTypeProprietaire] = useState<"particulier" | "entreprise">("particulier");
  const [dateNaissance, setDateNaissance] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");
  const [cni, setCni] = useState("");
  const [etablieLe, setEtablieLe] = useState("");
  const [dateCreation, setDateCreation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [commissionRate, setCommissionRate] = useState<number | string>(10);
  const [modeReversement, setModeReversement] = useState("Virement Bancaire");
  const [nomBanque, setNomBanque] = useState("");
  const [rib, setRib] = useState("");

  const [createdCredentials, setCreatedCredentials] = useState<OwnerCredential | null>(null);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Document templates state for this owner / entreprise
  const [contratName, setContratName] = useState<string | null>(null);
  const [contratFileKey, setContratFileKey] = useState<string | null>(null);
  const [contratBase64, setContratBase64] = useState<string | null>(null);

  const [reglementName, setReglementName] = useState<string | null>(null);
  const [reglementFileKey, setReglementFileKey] = useState<string | null>(null);
  const [reglementBase64, setReglementBase64] = useState<string | null>(null);

  const [customTemplates, setCustomTemplates] = useState<CustomDocumentTemplate[]>([]);

  const contratInputRef = useRef<HTMLInputElement>(null);
  const reglementInputRef = useRef<HTMLInputElement>(null);

  // Add Custom Template Modal state
  const [isAddTemplateModalOpen, setIsAddTemplateModalOpen] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (isEditing && editId) {
      const loadOwnerData = async () => {
        let owner: any = null;

        const stored = localStorage.getItem("gestimmo_proprietaires");
        if (stored) {
          const owners = JSON.parse(stored);
          owner = owners.find((o: any) => o.id === editId || String(o.id) === String(editId));
        }

        if (!owner) {
          const dbOwners = await fetchOwners();
          const found = dbOwners.find((o: any) => o.id === editId || String(o.id) === String(editId));
          if (found) {
            owner = {
              id: found.id,
              code: found.id_card_number || `PR-${found.id.slice(0, 6)}`,
              type: "particulier",
              name: found.full_name,
              phone: found.phone,
              email: found.email || "",
              adresse: found.address || "",
              commissionRate: (found.commission_rate !== undefined && found.commission_rate !== null) ? Number(found.commission_rate) : 10,
              modeReversement: "Virement Bancaire",
              nomBanque: found.bank_details ? found.bank_details.split(" - ")[0] : "",
              rib: found.bank_details ? found.bank_details.split(" - ")[1] || "" : "",
              cni: found.id_card_number || "",
            };
          }
        }

        if (owner) {
          setNom(owner.name || owner.full_name || "");
          setEmail(owner.email || "");
          setPhone(owner.phone || "");
          setTypeProprietaire(owner.type || "particulier");
          setCommissionRate(
            owner.commissionRate !== undefined && owner.commissionRate !== null
              ? owner.commissionRate
              : (owner.commission_rate !== undefined && owner.commission_rate !== null ? owner.commission_rate : 10)
          );
          setModeReversement(owner.modeReversement || "Virement Bancaire");
          setNomBanque(owner.nomBanque || "");
          setRib(owner.rib || "");
          setDateNaissance(owner.dateNaissance || "");
          setLieuNaissance(owner.lieuNaissance || "");
          setCni(owner.cni || owner.id_card_number || "");
          setEtablieLe(owner.etablieLe || "");
          setDateCreation(owner.dateCreation || "");
          setAdresse(owner.adresse || owner.address || "");

          if (owner.code && owner.code.includes("-")) {
            const parts = owner.code.split("-");
            setRandomInt(parts[parts.length - 1] || "");
          } else {
            setRandomInt(Math.floor(100000 + Math.random() * 900000).toString());
          }

          // Load document templates associated with this owner
          let foundTemplates = owner.templates;
          if (!foundTemplates) {
            const cachedTemplates = localStorage.getItem(`gestimmo_owner_${editId}_templates`);
            if (cachedTemplates) {
              try {
                foundTemplates = JSON.parse(cachedTemplates);
              } catch (e) {}
            }
          }
          if (!foundTemplates && owner.id) {
            const cachedTemplates = localStorage.getItem(`gestimmo_owner_${owner.id}_templates`);
            if (cachedTemplates) {
              try {
                foundTemplates = JSON.parse(cachedTemplates);
              } catch (e) {}
            }
          }

          if (foundTemplates) {
            const rawContrat = foundTemplates.contratFileName;
            const isContratCustom = Boolean(foundTemplates.contratFileKey || (rawContrat && !rawContrat.includes("modèle_contrat.pdf")));
            setContratName(isContratCustom && rawContrat ? rawContrat.replace(" (Sauvegardé)", "").replace(" (Actif)", "").trim() : null);
            setContratFileKey(foundTemplates.contratFileKey || null);

            const rawReglement = foundTemplates.reglementFileName;
            const isReglementCustom = Boolean(foundTemplates.reglementFileKey || (rawReglement && !rawReglement.includes("modèle_règlement_intérieur.pdf")));
            setReglementName(isReglementCustom && rawReglement ? rawReglement.replace(" (Sauvegardé)", "").replace(" (Actif)", "").trim() : null);
            setReglementFileKey(foundTemplates.reglementFileKey || null);

            setCustomTemplates(foundTemplates.customTemplates || []);
          } else {
            setContratName(null);
            setContratFileKey(null);
            setReglementName(null);
            setReglementFileKey(null);
            setCustomTemplates([]);
          }
        }
      };
      loadOwnerData();
    } else {
      setRandomInt(Math.floor(100000 + Math.random() * 900000).toString());
      setContratName(null);
      setContratFileKey(null);
      setReglementName(null);
      setReglementFileKey(null);
      setCustomTemplates([]);
    }
  }, [isEditing, editId]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || parts[0] === "") return "";
    return parts.map(p => p[0]?.toUpperCase()).join('').substring(0, 3);
  };

  const generatedCode = nom && randomInt ? `PR-${getInitials(nom)}-${randomInt}` : "";

  // Document template handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        alert("Veuillez sélectionner un fichier PDF valide (.pdf).");
        e.target.value = '';
        return;
      }
      setContratName("Sauvegarde en cours...");
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const key = `owner_${editId || 'draft_' + (randomInt || Date.now())}_contrat`;
          await saveGenericTemplate(key, base64String);
          setContratBase64(base64String);
          setContratFileKey(key);
          const savedFileName = file.name;
          setContratName(savedFileName);

          // Update templates directly in localStorage if editing
          if (isEditing && editId) {
            try {
              const currentTplStr = localStorage.getItem(`gestimmo_owner_${editId}_templates`);
              const currentTpl = currentTplStr ? JSON.parse(currentTplStr) : {};
              currentTpl.contratFileName = savedFileName;
              currentTpl.contratFileKey = key;
              localStorage.setItem(`gestimmo_owner_${editId}_templates`, JSON.stringify(currentTpl));

              const storedOwners = localStorage.getItem("gestimmo_proprietaires");
              if (storedOwners) {
                const ownersList = JSON.parse(storedOwners);
                const updatedList = ownersList.map((o: any) => {
                  if (o.id === editId || String(o.id) === String(editId)) {
                    return {
                      ...o,
                      templates: {
                        ...(o.templates || {}),
                        contratFileName: savedFileName,
                        contratFileKey: key,
                      }
                    };
                  }
                  return o;
                });
                localStorage.setItem("gestimmo_proprietaires", JSON.stringify(updatedList));
              }
            } catch (err) {
              console.warn("Error updating local template cache", err);
            }
          }

          showToast("Modèle de contrat associé à ce propriétaire avec succès !");
        } catch (error) {
          console.error(error);
          alert("Erreur lors de la sauvegarde du modèle.");
          setContratName(null);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleReglementFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        alert("Veuillez sélectionner un fichier PDF valide (.pdf).");
        e.target.value = '';
        return;
      }
      setReglementName("Sauvegarde en cours...");
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const key = `owner_${editId || 'draft_' + (randomInt || Date.now())}_reglement`;
          await saveGenericTemplate(key, base64String);
          setReglementBase64(base64String);
          setReglementFileKey(key);
          const savedFileName = file.name;
          setReglementName(savedFileName);

          // Update templates directly in localStorage if editing
          if (isEditing && editId) {
            try {
              const currentTplStr = localStorage.getItem(`gestimmo_owner_${editId}_templates`);
              const currentTpl = currentTplStr ? JSON.parse(currentTplStr) : {};
              currentTpl.reglementFileName = savedFileName;
              currentTpl.reglementFileKey = key;
              localStorage.setItem(`gestimmo_owner_${editId}_templates`, JSON.stringify(currentTpl));

              const storedOwners = localStorage.getItem("gestimmo_proprietaires");
              if (storedOwners) {
                const ownersList = JSON.parse(storedOwners);
                const updatedList = ownersList.map((o: any) => {
                  if (o.id === editId || String(o.id) === String(editId)) {
                    return {
                      ...o,
                      templates: {
                        ...(o.templates || {}),
                        reglementFileName: savedFileName,
                        reglementFileKey: key,
                      }
                    };
                  }
                  return o;
                });
                localStorage.setItem("gestimmo_proprietaires", JSON.stringify(updatedList));
              }
            } catch (err) {
              console.warn("Error updating local template cache", err);
            }
          }

          showToast("Modèle de règlement intérieur associé à ce propriétaire avec succès !");
        } catch (error) {
          console.error(error);
          alert("Erreur lors de la sauvegarde du modèle de règlement intérieur.");
          setReglementName(null);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleDownloadDefaultContrat = async () => {
    try {
      let base64 = contratBase64;
      if (!base64 && contratFileKey) {
        base64 = await getGenericTemplate(contratFileKey);
      }
      if (!base64) {
        base64 = await getOrGenerateContratTemplate(nom, contratFileKey || undefined);
      }
      if (!base64) {
        alert("Impossible de préparer le modèle de contrat.");
        return;
      }
      const rawName = contratName ? contratName.replace(" (Sauvegardé)", "").trim() : `Contrat_Bail_${(nom || "Standard").replace(/\s+/g, '_')}.pdf`;
      const a = document.createElement("a");
      a.href = base64;
      a.download = rawName.endsWith(".pdf") ? rawName : `${rawName}.pdf`;
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
      let base64 = reglementBase64;
      if (!base64 && reglementFileKey) {
        base64 = await getGenericTemplate(reglementFileKey);
      }
      if (!base64) {
        base64 = await getOrGenerateReglementTemplate(nom, reglementFileKey || undefined);
      }
      if (!base64) {
        alert("Impossible de préparer le modèle de règlement intérieur.");
        return;
      }
      const rawName = reglementName ? reglementName.replace(" (Sauvegardé)", "").trim() : `Reglement_Interieur_${(nom || "Standard").replace(/\s+/g, '_')}.pdf`;
      const a = document.createElement("a");
      a.href = base64;
      a.download = rawName.endsWith(".pdf") ? rawName : `${rawName}.pdf`;
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

    const isPdf = newTemplateFile.type === "application/pdf" || newTemplateFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      alert("Veuillez sélectionner un fichier PDF valide (.pdf).");
      return;
    }

    const fileKey = `owner_${editId || 'draft_' + (randomInt || Date.now())}_custom_${Date.now()}`;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await saveGenericTemplate(fileKey, base64String);

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

        // Update localStorage if editing
        if (isEditing && editId) {
          try {
            const raw = localStorage.getItem(`gestimmo_owner_${editId}_templates`);
            const cfg = raw ? JSON.parse(raw) : {};
            cfg.customTemplates = updated;
            localStorage.setItem(`gestimmo_owner_${editId}_templates`, JSON.stringify(cfg));

            const storedOwners = localStorage.getItem("gestimmo_proprietaires");
            if (storedOwners) {
              const ownersList = JSON.parse(storedOwners);
              const updatedList = ownersList.map((o: any) => {
                if (o.id === editId || String(o.id) === String(editId)) {
                  return {
                    ...o,
                    templates: {
                      ...(o.templates || {}),
                      customTemplates: updated,
                    }
                  };
                }
                return o;
              });
              localStorage.setItem("gestimmo_proprietaires", JSON.stringify(updatedList));
            }
          } catch (e) {}
        }

        showToast(`Modèle "${newTemplateTitle}" ajouté avec succès pour ce propriétaire !`);
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
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      alert("Veuillez sélectionner un fichier PDF valide (.pdf).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await saveGenericTemplate(template.fileKey, base64String);

        const updated = customTemplates.map((t) =>
          t.id === template.id ? { ...t, fileName: file.name } : t
        );
        setCustomTemplates(updated);

        // Update localStorage if editing
        if (isEditing && editId) {
          try {
            const raw = localStorage.getItem(`gestimmo_owner_${editId}_templates`);
            const cfg = raw ? JSON.parse(raw) : {};
            cfg.customTemplates = updated;
            localStorage.setItem(`gestimmo_owner_${editId}_templates`, JSON.stringify(cfg));

            const storedOwners = localStorage.getItem("gestimmo_proprietaires");
            if (storedOwners) {
              const ownersList = JSON.parse(storedOwners);
              const updatedList = ownersList.map((o: any) => {
                if (o.id === editId || String(o.id) === String(editId)) {
                  return {
                    ...o,
                    templates: {
                      ...(o.templates || {}),
                      customTemplates: updated,
                    }
                  };
                }
                return o;
              });
              localStorage.setItem("gestimmo_proprietaires", JSON.stringify(updatedList));
            }
          } catch (e) {}
        }

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
    } catch (e) {
      console.error(e);
    }
    const updated = customTemplates.filter((t) => t.id !== template.id);
    setCustomTemplates(updated);
    showToast(`Modèle "${template.title}" supprimé.`);
  };

  const handleSave = async () => {
    if (!nom.trim()) {
      alert("Veuillez renseigner le nom complet / raison sociale du propriétaire.");
      return;
    }

    const stored = localStorage.getItem("gestimmo_proprietaires");
    let owners = stored ? JSON.parse(stored) : [];
    let oldOwnerName: string | null = null;
    const trimmedNewNom = nom.trim().toUpperCase();
    const upperNomBanque = nomBanque.trim().toUpperCase();

    const parsedRate = commissionRate === "" ? 0 : Number(commissionRate);
    const validRate = isNaN(parsedRate) ? 10 : parsedRate;

    const cleanPhone = phone.replace(/\D/g, '');

    // Ensure credentials automatically for owner / entreprise
    const creds = ensureOwnerCredentials(trimmedNewNom, typeProprietaire, email, cleanPhone, generatedCode);

    let createdDbOwnerId: string | null = null;
    if (!isEditing || !editId) {
      const dbCreated = await createOwner({
        full_name: trimmedNewNom,
        email,
        phone: cleanPhone,
        commission_rate: validRate,
        bank_details: `${upperNomBanque} - ${rib}`,
        account_status: 'Actif',
        address: adresse,
        id_card_number: cni,
      });
      if (dbCreated) createdDbOwnerId = dbCreated.id;
    }

    const ownerFinalId = editId || createdDbOwnerId || (creds.id || `O-${Math.floor(100 + Math.random() * 900)}`);

    // Ensure templates are committed with proper keys
    let finalContratKey = contratFileKey;
    if (contratBase64) {
      finalContratKey = `owner_${ownerFinalId}_contrat`;
      await saveGenericTemplate(finalContratKey, contratBase64);
    }
    let finalReglementKey = reglementFileKey;
    if (reglementBase64) {
      finalReglementKey = `owner_${ownerFinalId}_reglement`;
      await saveGenericTemplate(finalReglementKey, reglementBase64);
    }

    const templatesConfig = {
      contratFileName: contratName || undefined,
      contratFileKey: finalContratKey || undefined,
      reglementFileName: reglementName || undefined,
      reglementFileKey: finalReglementKey || undefined,
      customTemplates: customTemplates,
    };

    try {
      localStorage.setItem(`gestimmo_owner_${ownerFinalId}_templates`, JSON.stringify(templatesConfig));
      if (editId && editId !== ownerFinalId) {
        localStorage.setItem(`gestimmo_owner_${editId}_templates`, JSON.stringify(templatesConfig));
      }
    } catch (e) {}

    if (isEditing && editId) {
      const existingOwner = owners.find((o: any) => o.id === editId || String(o.id) === String(editId));
      if (existingOwner) oldOwnerName = existingOwner.name || existingOwner.full_name;

      try {
        await updateOwner(editId, {
          full_name: trimmedNewNom,
          email,
          phone: cleanPhone,
          commission_rate: validRate,
          bank_details: `${upperNomBanque} - ${rib}`,
          address: adresse,
          id_card_number: cni,
        });
      } catch (err) {
        console.warn("Supabase updateOwner error:", err);
      }

      let updatedExisting = false;
      owners = owners.map((o: any) => {
        if (o.id === editId || String(o.id) === String(editId)) {
          updatedExisting = true;
          return {
            ...o,
            name: trimmedNewNom,
            type: typeProprietaire,
            email,
            phone: cleanPhone,
            code: generatedCode || o.code,
            commissionRate: validRate,
            modeReversement,
            nomBanque: upperNomBanque,
            rib,
            login: creds.login,
            password: creds.password,
            dateNaissance,
            lieuNaissance,
            cni,
            etablieLe,
            dateCreation,
            adresse,
            templates: templatesConfig,
          };
        }
        return o;
      });

      if (!updatedExisting) {
        owners.push({
          id: editId,
          code: generatedCode,
          type: typeProprietaire,
          name: trimmedNewNom,
          email,
          phone: cleanPhone,
          commissionRate: validRate,
          modeReversement,
          nomBanque: upperNomBanque,
          rib,
          login: creds.login,
          password: creds.password,
          dateNaissance,
          lieuNaissance,
          cni,
          etablieLe,
          dateCreation,
          adresse,
          propertiesCount: 0,
          totalCollected: 0,
          balance: 0,
          templates: templatesConfig,
        });
      }
    } else {
      const newOwner = {
        id: ownerFinalId,
        code: generatedCode,
        type: typeProprietaire,
        name: trimmedNewNom,
        email: email,
        phone: cleanPhone,
        commissionRate: validRate,
        modeReversement,
        nomBanque: upperNomBanque,
        rib,
        login: creds.login,
        password: creds.password,
        dateNaissance,
        lieuNaissance,
        cni,
        etablieLe,
        dateCreation,
        adresse,
        propertiesCount: 0,
        totalCollected: 0,
        balance: 0,
        templates: templatesConfig,
      };
      owners = [newOwner, ...owners];
    }

    localStorage.setItem("gestimmo_proprietaires", JSON.stringify(owners));

    // Cascade update if owner name changed
    if (oldOwnerName && oldOwnerName !== trimmedNewNom) {
      // 1. Update gestimmo_biens
      const storedBiens = localStorage.getItem("gestimmo_biens");
      if (storedBiens) {
        const allBiens = JSON.parse(storedBiens);
        const updatedBiens = allBiens.map((b: any) =>
          b.owner === oldOwnerName ? { ...b, owner: trimmedNewNom } : b
        );
        localStorage.setItem("gestimmo_biens", JSON.stringify(updatedBiens));
      }

      // 2. Update gestimmo_gerants
      const storedGerants = localStorage.getItem("gestimmo_gerants");
      if (storedGerants) {
        const allGerants = JSON.parse(storedGerants);
        const updatedGerants = allGerants.map((g: any) =>
          g.bénéficiaire === oldOwnerName ? { ...g, bénéficiaire: trimmedNewNom } : g
        );
        localStorage.setItem("gestimmo_gerants", JSON.stringify(updatedGerants));
      }
    }

    setCreatedCredentials(creds);
    if (can("biens", "viewCredentials")) {
      setIsCredentialModalOpen(true);
    } else {
      router.push("/app/proprietaires");
    }
  };

  if (!can("biens", "edit")) {
    return <AccessDeniedCard moduleName="Biens & Propriétaires" />;
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/app/proprietaires">
            <button className="p-2 bg-white border border-app-border rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEditing ? "Modifier le propriétaire" : "Nouveau propriétaire"}</h1>
            <p className="text-sm text-gray-500 mt-1">{isEditing ? "Modifiez les informations de ce propriétaire." : "Ajoutez un nouveau propriétaire et configurez ses paramètres de gestion."}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/proprietaires">
            <button className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Annuler
            </button>
          </Link>
          <button onClick={handleSave} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm">
            <Save className="h-4 w-4 mr-2" /> Enregistrer
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Type de propriétaire */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500" /> Type de propriétaire
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center p-4 border border-app-border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" name="type" className="text-primary focus:ring-primary h-4 w-4" checked={typeProprietaire === 'particulier'} onChange={() => setTypeProprietaire('particulier')} />
              <div className="ml-3">
                <span className="block text-sm font-medium text-gray-900">Particulier</span>
                <span className="block text-xs text-gray-500 mt-0.5">Personne physique</span>
              </div>
            </label>
            <label className="flex items-center p-4 border border-app-border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" name="type" className="text-primary focus:ring-primary h-4 w-4" checked={typeProprietaire === 'entreprise'} onChange={() => setTypeProprietaire('entreprise')} />
              <div className="ml-3">
                <span className="block text-sm font-medium text-gray-900">Entreprise</span>
                <span className="block text-xs text-gray-500 mt-0.5">Personne morale (SCI, SARL, etc.)</span>
              </div>
            </label>
          </div>
        </div>

        {/* Informations générales */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" /> Informations générales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input type="text" className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder={typeProprietaire === 'particulier' ? "Ex: Kouadio Jean" : "Ex: MOUAGNE SA"} value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code Propriétaire</label>
              <input type="text" className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-gray-50 text-gray-500 font-mono focus:outline-none" placeholder="Généré automatiquement" value={generatedCode} readOnly />
            </div>
            {typeProprietaire === "particulier" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                  <input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de naissance</label>
                  <input type="text" value={lieuNaissance} onChange={(e) => setLieuNaissance(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: Abidjan" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro d'identité (CNI, etc.)</label>
                  <input type="text" value={cni} onChange={(e) => setCni(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Numéro de la pièce" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Établie le</label>
                  <input type="date" value={etablieLe} onChange={(e) => setEtablieLe(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de création</label>
                <input type="date" value={dateCreation} onChange={(e) => setDateCreation(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="contact@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
              <input type="tel" inputMode="numeric" className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: 0102030405" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse complète</label>
              <input type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Rue, Quartier, Ville" />
            </div>
          </div>
        </div>

        {/* Paramètres Financiers */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-500" /> Paramètres Financiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taux de commission GESTIMMO (%) *</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8"
                  placeholder="10"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Sera prélevé sur les loyers encaissés.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode de reversement</label>
              <select
                className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                value={modeReversement}
                onChange={(e) => setModeReversement(e.target.value)}
              >
                <option value="Virement Bancaire">Virement Bancaire</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Chèque">Chèque</option>
                <option value="Espèces">Espèces</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la banque</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: SGCI"
                value={nomBanque}
                onChange={(e) => setNomBanque(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RIB / IBAN</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="CI032 01001 00001234567 89"
                value={rib}
                onChange={(e) => setRib(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Modèles de documents */}
        <div id="modeles-documents" className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Modèles de documents</h2>
              <p className="text-sm text-gray-500 mt-0.5">Importez vos modèles de contrats, règlements intérieurs et documents types pour ce propriétaire.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewTemplateTitle("");
                setNewTemplateDescription("");
                setNewTemplateFile(null);
                setIsAddTemplateModalOpen(true);
              }}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" /> Ajouter un modèle de document
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Default Template 1: Contrat de Bail */}
            <div className="border border-app-border rounded-xl p-5 hover:border-gray-300 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">Modèle de Contrat de Bail</h3>
                    {contratName ? (
                      <Badge variant="success" dot className="text-xs">Personnalisé</Badge>
                    ) : (
                      <Badge variant="info" dot className="text-xs">Standard Loi 2019-576</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {contratName 
                      ? "Modèle PDF personnalisé associé à ce propriétaire."
                      : "Modèle standard GESTIMMO conforme à la Loi N° 2019-576 sur le bail d'habitation en Côte d'Ivoire."}
                  </p>
                  
                  <div className="pt-3 flex flex-wrap items-center gap-3">
                    <input
                      ref={contratInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                      onChange={handleFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => contratInputRef.current?.click()}
                      className="cursor-pointer bg-white border border-app-border text-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                      {contratName ? "Remplacer le PDF" : "Importer un modèle personnalisé"}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadDefaultContrat}
                      className="bg-white border border-app-border text-primary px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-50 transition-colors flex items-center shadow-sm cursor-pointer"
                      title="Télécharger le modèle de contrat en PDF"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5 text-primary" /> Télécharger ({contratName ? "Personnalisé" : "Standard"})
                    </button>

                    {contratName ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600 font-semibold flex items-center">
                          ✓ {contratName}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Rétablir le modèle de contrat standard GESTIMMO pour ce propriétaire ?")) {
                              setContratName(null);
                              setContratFileKey(null);
                              setContratBase64(null);
                            }
                          }}
                          className="text-[11px] text-gray-400 hover:text-red-600 underline cursor-pointer"
                        >
                          Rétablir le modèle standard
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-blue-600 font-medium flex items-center">
                        ✓ Modèle standard GESTIMMO actif
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Default Template 2: Règlement Intérieur */}
            <div className="border border-app-border rounded-xl p-5 hover:border-gray-300 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">Modèle de Règlement Intérieur</h3>
                    {reglementName ? (
                      <Badge variant="success" dot className="text-xs">Personnalisé</Badge>
                    ) : (
                      <Badge variant="info" dot className="text-xs">Standard Copropriété</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {reglementName
                      ? "Modèle PDF personnalisé de règlement intérieur associé à ce propriétaire."
                      : "Modèle standard GESTIMMO pour immeubles et parties communes (hygiène, sécurité et tranquillité)."}
                  </p>
                  
                  <div className="pt-3 flex flex-wrap items-center gap-3">
                    <input
                      ref={reglementInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                      onChange={handleReglementFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => reglementInputRef.current?.click()}
                      className="cursor-pointer bg-white border border-app-border text-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                      {reglementName ? "Remplacer le PDF" : "Importer un modèle personnalisé"}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadDefaultReglement}
                      className="bg-white border border-app-border text-primary px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-50 transition-colors flex items-center shadow-sm cursor-pointer"
                      title="Télécharger le modèle de règlement intérieur en PDF"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5 text-primary" /> Télécharger ({reglementName ? "Personnalisé" : "Standard"})
                    </button>

                    {reglementName ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600 font-semibold flex items-center">
                          ✓ {reglementName}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Rétablir le modèle de règlement intérieur standard GESTIMMO pour ce propriétaire ?")) {
                              setReglementName(null);
                              setReglementFileKey(null);
                              setReglementBase64(null);
                            }
                          }}
                          className="text-[11px] text-gray-400 hover:text-red-600 underline cursor-pointer"
                        >
                          Rétablir le modèle standard
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-blue-600 font-medium flex items-center">
                        ✓ Modèle standard GESTIMMO actif
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
                        type="button"
                        onClick={() => handleDeleteCustomTemplate(template)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                        title="Supprimer ce modèle de document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-500">{template.description}</p>
                    )}

                    <div className="pt-3 flex flex-wrap items-center gap-3">
                      <input
                        id={`custom-template-file-${template.id}`}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleReplaceCustomTemplateFile(template, f);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById(`custom-template-file-${template.id}`)?.click()}
                        className="cursor-pointer bg-white border border-app-border text-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                        Remplacer le PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadCustomTemplate(template)}
                        className="bg-white border border-app-border text-primary px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-50 transition-colors flex items-center shadow-sm cursor-pointer"
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
      </div>

      {/* Modal d'affichage des identifiants créés */}
      {isCredentialModalOpen && createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 border border-app-border animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 border-b border-app-border pb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isEditing ? "Identifiants du Propriétaire" : "Propriétaire Enregistré avec Succès !"}
                </h3>
                <p className="text-xs text-gray-500">Compte Espace Propriétaire généré automatiquement</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Bénéficiaire :</span>
                <span className="font-bold text-gray-900">{createdCredentials.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Type de compte :</span>
                <span className="font-semibold text-primary uppercase">{createdCredentials.type || typeProprietaire}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 space-y-2">
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

            <div className="flex items-center text-xs text-gray-600 bg-amber-50 text-amber-900 p-3 rounded-xl border border-amber-200">
              <CheckCircle2 className="w-4 h-4 text-amber-600 mr-2 shrink-0" />
              Le propriétaire ({createdCredentials.type === "entreprise" ? "Entreprise" : "Particulier"}) peut désormais se connecter sur l'Espace Propriétaire avec ces accès.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => {
                  const textToCopy = `Bonjour ${createdCredentials.name},\nVoici vos accès pour votre Espace Propriétaire GESTIMMO :\nIdentifiant: ${createdCredentials.login}\nMot de passe: ${createdCredentials.password}`;
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
                onClick={() => {
                  setIsCredentialModalOpen(false);
                  router.push("/app/proprietaires");
                }}
                className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Document Template */}
      {isAddTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
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
                type="button"
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
                  accept=".pdf,application/pdf"
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function NouveauProprietairePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Chargement...</div>}>
      <NouveauProprietaireForm />
    </Suspense>
  );
}

