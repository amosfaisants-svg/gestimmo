"use client";

import { useState, useRef, useEffect } from "react";
import { Send, UploadCloud, Video, X, CheckCircle2, Loader2, AlertTriangle, FileText, Clock, Eye, Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn, formatUnitDisplay, getIncidentDisplayCode, isUUID } from "@/lib/utils";
import { loadAllDataFromDatabase, createIncident } from "@/lib/dataService";
import { getPortalSession } from "@/lib/authSession";
import { compressImageFile, isImageFile, getFileSource } from "@/lib/imageCompressor";
import { IncidentDetailModal } from "@/components/ui/IncidentDetailModal";


interface UploadedFile {
  name: string;
  size: string;
  type: string;
  dataUrl: string;
}

export default function LocataireIncidentsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [incidentTitle, setIncidentTitle] = useState("");
  const [typeProblem, setTypeProblem] = useState("");
  const [description, setDescription] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccessId, setSubmittedSuccessId] = useState<string | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const [selectedIncidentForModal, setSelectedIncidentForModal] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadIncidents = async () => {
    await loadAllDataFromDatabase();

    let user: any = getPortalSession("LOCATAIRE");
    if (user) {
      setCurrentUser(user);
    } else {
      const storedUser = localStorage.getItem("gestimmo_current_user");
      if (storedUser) {
        try {
          user = JSON.parse(storedUser);
          setCurrentUser(user);
        } catch (e) {
          console.error(e);
        }
      }
    }

    const tenantName = user?.name || "Cora Richards";
    const storedIncidents = localStorage.getItem("gestimmo_incidents");
    if (storedIncidents) {
      try {
        const parsed: any[] = JSON.parse(storedIncidents);
        const filtered = parsed.filter((inc) => {
          if (!inc) return false;
          const incTenant = (inc.tenant || "").trim().toLowerCase();
          const curName = tenantName.trim().toLowerCase();
          const incTenantId = inc.tenantId || inc.tenant_id;
          const curId = user?.id;
          const incUnit = (inc.unit || "").trim().toLowerCase();
          const curUnit = (user?.unit || "").trim().toLowerCase();

          return (
            (curId && incTenantId && curId === incTenantId) ||
            (incTenant && curName && (incTenant === curName || incTenant.includes(curName) || curName.includes(incTenant))) ||
            (curUnit && incUnit && curUnit !== "-" && (incUnit === curUnit || incUnit.includes(curUnit)))
          );
        });
        setRecentIncidents(filtered);
      } catch (e) {
        console.error(e);
      }
    } else {
      setRecentIncidents([]);
    }
  };

  useEffect(() => {
    loadIncidents();

    const handleUpdate = () => {
      loadIncidents();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("gestimmo_incidents_updated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("gestimmo_incidents_updated", handleUpdate);
    };
  }, []);


  const processFiles = async (fileList: File[]) => {
    for (const file of fileList) {
      if (file.size > 15 * 1024 * 1024) {
        alert(`Le fichier "${file.name}" dépasse la taille maximale autorisée de 15MB.`);
        continue;
      }
      try {
        const processed = await compressImageFile(file);
        setFiles((prev) => [...prev, processed]);
      } catch (err) {
        console.error("Erreur de compression fichier:", err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeProblem) {
      alert("Veuillez sélectionner le type de problème.");
      return;
    }
    if (!description.trim()) {
      alert("Veuillez préciser la description détaillée de l'incident.");
      return;
    }

    setIsSubmitting(true);

    const tenantName = currentUser?.name || "Cora Richards";
    const cleanTitle = incidentTitle.trim() || typeProblem;

    // Resolve tenant DB ID and Unit DB ID
    let tenantDbId = currentUser?.id && isUUID(currentUser.id) ? currentUser.id : null;
    let unitDbId = currentUser?.unitId && isUUID(currentUser.unitId) ? currentUser.unitId : null;

    const storedLocs = localStorage.getItem("gestimmo_locataires");
    if (storedLocs) {
      try {
        const locs = JSON.parse(storedLocs);
        const foundLoc = locs.find((l: any) => 
          (l.name && l.name.trim().toLowerCase() === tenantName.trim().toLowerCase()) ||
          (currentUser?.email && l.email && l.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase())
        );
        if (foundLoc && isUUID(foundLoc.id)) {
          tenantDbId = foundLoc.id;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const storedBaux = localStorage.getItem("gestimmo_baux");
    if (storedBaux) {
      try {
        const baux = JSON.parse(storedBaux);
        const foundLease = baux.find((b: any) => 
          (b.tenant && b.tenant.trim().toLowerCase() === tenantName.trim().toLowerCase()) && b.status === "ACTIF"
        );
        if (foundLease) {
          if (!tenantDbId && isUUID(foundLease.tenantId)) tenantDbId = foundLease.tenantId;
          if (!unitDbId && isUUID(foundLease.unitId)) unitDbId = foundLease.unitId;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const processedFilesList = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      dataUrl: f.dataUrl,
    }));

    (async () => {
      let dbInc: any = null;
      try {
        dbInc = await createIncident({
          title: cleanTitle,
          description: description.trim(),
          priority: isUrgent ? "URGENTE" : "MOYENNE",
          status: "SIGNALÉ",
          tenant_id: tenantDbId,
          unit_id: unitDbId,
          files: processedFilesList,
        });
      } catch (e) {
        console.error("DB createIncident error:", e);
      }

      const assignedId = dbInc?.id || `INC-${Math.floor(1000 + Math.random() * 9000)}`;

      const newIncident = {
        id: assignedId,
        tenant: tenantName,
        tenantId: tenantDbId,
        unit: currentUser?.unit || "A-101",
        unitId: unitDbId,
        property: currentUser?.property || "Résidence Les Flamboyants",
        title: cleanTitle,
        type: cleanTitle,
        category: typeProblem,
        description: description.trim(),
        isUrgent,
        files: processedFilesList,
        status: "EN ATTENTE",
        createdAt: new Date().toISOString(),
        dateStr: new Date().toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const stored = localStorage.getItem("gestimmo_incidents");
      let allIncidents: any[] = [];
      if (stored) {
        try {
          allIncidents = JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }

      const updatedIncidents = [newIncident, ...allIncidents.filter((inc) => inc.id !== newIncident.id)];
      localStorage.setItem("gestimmo_incidents", JSON.stringify(updatedIncidents));

      // Enregistrer immédiatement une notification pour l'administrateur
      const storedNotifs = localStorage.getItem("gestimmo_notifications");
      let allNotifs: any[] = [];
      if (storedNotifs) {
        try {
          allNotifs = JSON.parse(storedNotifs);
        } catch (e) {
          console.error(e);
        }
      }

      const notifId = `auto-inc-${newIncident.id}`;
      const newAdminNotif = {
        id: notifId,
        type: isUrgent ? "ALERT" : "WARNING",
        title: isUrgent 
          ? `URGENT - Incident signalé : ${cleanTitle}` 
          : `Incident signalé : ${cleanTitle}`,
        message: `Signalé par ${tenantName} (${currentUser?.property || "Bien"} - ${currentUser?.unit || "Logement"}) : "${description.trim().slice(0, 100)}${description.trim().length > 100 ? "..." : ""}"`,
        date: "À l'instant",
        read: false,
        link: "/app#incidents",
        category: "incident",
      };

      const updatedNotifs = [newAdminNotif, ...allNotifs.filter((n: any) => n.id !== notifId)];
      localStorage.setItem("gestimmo_notifications", JSON.stringify(updatedNotifs));

      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("gestimmo_incidents_updated"));
      window.dispatchEvent(new Event("gestimmo_notifications_updated"));

      const tenantFiltered = updatedIncidents.filter((inc) => {
        if (!inc) return false;
        const incTenant = (inc.tenant || "").trim().toLowerCase();
        const curName = tenantName.trim().toLowerCase();
        const incTenantId = inc.tenantId || inc.tenant_id;
        const curId = currentUser?.id;
        const incUnit = (inc.unit || "").trim().toLowerCase();
        const curUnit = (currentUser?.unit || "").trim().toLowerCase();

        return (
          (curId && incTenantId && curId === incTenantId) ||
          (incTenant && curName && (incTenant === curName || incTenant.includes(curName) || curName.includes(incTenant))) ||
          (curUnit && incUnit && curUnit !== "-" && (incUnit === curUnit || incUnit.includes(curUnit)))
        );
      });

      setRecentIncidents(tenantFiltered);
      setSubmittedSuccessId(assignedId);
      setIsSubmitting(false);

      // Reset form
      setIncidentTitle("");
      setTypeProblem("");
      setDescription("");
      setIsUrgent(false);
      setFiles([]);
    })();
  };

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12 max-w-3xl mx-auto font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Signaler un incident</h1>
        <p className="text-sm text-gray-500 mt-1">Déclarez un problème technique dans votre logement pour une intervention rapide.</p>
      </div>

      {/* Confirmation de succès */}
      {submittedSuccessId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm flex items-start justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start space-x-3.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">Signalement transmis avec succès !</h3>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Votre déclaration <strong>N° {getIncidentDisplayCode(submittedSuccessId)}</strong> a été enregistrée. L'équipe de gestion et les techniciens d'intervention ont été notifiés.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSubmittedSuccessId(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1.5 hover:bg-emerald-100 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Formulaire de signalement */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-app-border shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre de l'incident *</label>
            <input
              type="text"
              required
              value={incidentTitle}
              onChange={(e) => setIncidentTitle(e.target.value)}
              placeholder="Ex: Prise électrique non fonctionnelle, Fuite lavabo..."
              className="w-full px-3.5 py-2.5 border border-app-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 bg-white font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de problème *</label>
            <select
              required
              value={typeProblem}
              onChange={(e) => setTypeProblem(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-app-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 bg-white font-medium"
            >
              <option value="" disabled>
                Sélectionnez une catégorie...
              </option>
              <option value="Plomberie (Fuite, Canalisation bouchée...)">Plomberie (Fuite, Canalisation bouchée...)</option>
              <option value="Électricité (Coupure, Prise défectueuse...)">Électricité (Coupure, Prise défectueuse...)</option>
              <option value="Climatisation (Ne refroidit plus, Bruit...)">Climatisation (Ne refroidit plus, Bruit...)</option>
              <option value="Menuiserie / Serrurerie (Porte bloquée, Fenêtre...)">Menuiserie / Serrurerie (Porte bloquée, Fenêtre...)</option>
              <option value="Autre incident technique">Autre incident technique</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description détaillée *</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème avec le plus de détails possible (localisation exacte dans le logement, manifestations, quand le problème a commencé...)"
              className="w-full px-3.5 py-2.5 border border-app-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Photos ou Vidéos (Optionnel)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  processFiles(Array.from(e.target.files));
                  e.target.value = "";
                }
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                isDragging
                  ? "border-primary bg-primary/5 shadow-inner scale-[0.99]"
                  : "border-gray-300 hover:border-primary hover:bg-gray-50/80"
              )}
            >
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Cliquez pour uploader un fichier</p>
              <p className="text-xs text-gray-500 mt-1">ou glissez-déposez ici (JPG, PNG, MP4 - Max 10MB)</p>
            </div>

            {/* Previews */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Fichiers ajoutés ({files.length}) :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-app-border rounded-xl group hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {file.type.startsWith("image/") ? (
                          <img
                            src={file.dataUrl}
                            alt={file.name}
                            className="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0 border border-amber-200">
                            <Video className="w-5 h-5" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-semibold text-gray-900 truncate">{file.name}</p>
                          <p className="text-[11px] text-gray-400">{file.size}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles((prev) => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-app-border">
            <input
              type="checkbox"
              id="urgency"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="rounded text-primary focus:ring-primary h-4 w-4 border-gray-300 cursor-pointer"
            />
            <label htmlFor="urgency" className="text-sm font-semibold text-red-600 cursor-pointer select-none">
              Ceci est une urgence (Risque de dégâts matériels importants)
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white px-4 py-3.5 rounded-xl text-sm font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Envoyer le signalement
              </>
            )}
          </button>
        </form>
      </div>

      {/* Liste des récents signalements */}
      {recentIncidents.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center justify-between">
            <span>Mes signalements récents</span>
            <span className="text-xs font-normal text-gray-500">{recentIncidents.length} signalement(s)</span>
          </h2>

          <div className="space-y-3">
            {recentIncidents.map((inc) => (
              <div key={inc.id} className="p-4 border border-app-border rounded-xl hover:border-gray-300 transition-colors space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                      {getIncidentDisplayCode(inc.id)}
                    </span>
                    {inc.isUrgent && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Urgence
                      </span>
                    )}
                  </div>
                  <Badge
                    dot
                    variant={
                      inc.status === "RÉSOLU"
                        ? "success"
                        : inc.status === "EN COURS"
                        ? "warning"
                        : "info"
                    }
                  >
                    {inc.status}
                  </Badge>
                </div>

                <p className="text-sm font-semibold text-gray-900">{inc.title || inc.type}</p>
                <p className="text-xs text-gray-600 line-clamp-2">{inc.description}</p>

                {inc.files && inc.files.length > 0 && (
                  <div className="pt-1.5 space-y-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-600">{inc.files.length} photo(s) / pièce(s) jointe(s)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {inc.files.map((file: any, fIdx: number) => {
                        const isImg = isImageFile(file);
                        const src = getFileSource(file);
                        return isImg && src ? (
                          <div
                            key={fIdx}
                            onClick={() => setPreviewImage({ src, title: file.name || inc.title })}
                            className="relative group cursor-pointer overflow-hidden rounded-lg border border-app-border hover:border-primary transition-all"
                          >
                            <img src={src} alt={file.name || "Photo incident"} className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-gray-400 pt-2.5 border-t border-gray-100">
                  <div className="flex items-center justify-between sm:justify-start gap-4">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {inc.dateStr || "Récemment"}
                    </span>
                    <span>{formatUnitDisplay(inc.unit).toLowerCase().startsWith("studio") || formatUnitDisplay(inc.unit).toLowerCase().startsWith("appartement") || formatUnitDisplay(inc.unit).toLowerCase().startsWith("villa") || formatUnitDisplay(inc.unit).toLowerCase().startsWith("magasin") ? formatUnitDisplay(inc.unit) : `Appartement ${formatUnitDisplay(inc.unit)}`}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIncidentForModal(inc)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-semibold transition-colors cursor-pointer self-stretch sm:self-auto shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Consulter le signalement & photos</span>
                    {inc.files && inc.files.length > 0 && (
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                        {inc.files.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal interactif complet pour consulter le dossier d'incident & visualiser toutes les photos */}
      <IncidentDetailModal
        incident={selectedIncidentForModal}
        isOpen={Boolean(selectedIncidentForModal)}
        onClose={() => setSelectedIncidentForModal(null)}
        isTenantView={true}
        onIncidentUpdated={(updated) => {
          setSelectedIncidentForModal(updated);
          setRecentIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        }}
      />

      {/* Lightbox Aperçu d'image plein écran */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-3xl max-h-[90vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-3 bg-gray-900/90 text-white flex items-center justify-between border-b border-gray-800">
              <span className="text-xs font-medium text-gray-300 truncate max-w-md">{previewImage.title}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.src}
                  download={previewImage.title || "incident-photo.jpg"}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-xs flex items-center gap-1"
                  title="Télécharger l'image"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/50 overflow-auto max-h-[80vh]">
              <img 
                src={previewImage.src} 
                alt={previewImage.title} 
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-md" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

