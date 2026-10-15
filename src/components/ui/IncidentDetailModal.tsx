"use client";

import React, { useState } from "react";
import { 
  X, 
  AlertTriangle, 
  Eye, 
  Download, 
  Trash2, 
  Plus, 
  Video, 
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatUnitDisplay, getIncidentDisplayCode } from "@/lib/utils";
import { updateIncident } from "@/lib/dataService";
import { isImageFile, getFileSource, compressImageFile } from "@/lib/imageCompressor";

export interface IncidentDetailModalProps {
  incident: any | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, newStatus: string) => void | Promise<void>;
  onIncidentUpdated?: (updatedIncident: any) => void;
  isTenantView?: boolean;
}

export function IncidentDetailModal({
  incident,
  isOpen,
  onClose,
  onStatusChange,
  onIncidentUpdated,
  isTenantView = false,
}: IncidentDetailModalProps) {
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string; index?: number } | null>(null);
  const [currentIncident, setCurrentIncident] = useState<any>(incident);

  // Sync internal state when prop changes
  React.useEffect(() => {
    setCurrentIncident(incident);
  }, [incident]);

  if (!isOpen || !currentIncident) return null;

  const handleStatusChange = async (newStatus: string) => {
    const updated = { ...currentIncident, status: newStatus };
    setCurrentIncident(updated);
    onIncidentUpdated?.(updated);
    if (onStatusChange) {
      await onStatusChange(currentIncident.id, newStatus);
    } else {
      await updateIncident(currentIncident.id, { status: newStatus });
    }
  };

  const handleAddFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesList = Array.from(e.target.files);
    const newProcessed: any[] = [];
    for (const f of filesList) {
      try {
        const compressed = await compressImageFile(f);
        newProcessed.push(compressed);
      } catch (err) {
        console.error("Erreur ajout photo incident:", err);
      }
    }
    if (newProcessed.length === 0) return;

    const currentFiles = currentIncident.files || [];
    const updatedFiles = [...currentFiles, ...newProcessed];
    const updated = { ...currentIncident, files: updatedFiles };

    setCurrentIncident(updated);
    onIncidentUpdated?.(updated);
    await updateIncident(currentIncident.id, { files: updatedFiles });
    e.target.value = "";
  };

  const handleRemoveFile = async (indexToRemove: number) => {
    const currentFiles = currentIncident.files || [];
    const updatedFiles = currentFiles.filter((_: any, idx: number) => idx !== indexToRemove);
    const updated = { ...currentIncident, files: updatedFiles };

    setCurrentIncident(updated);
    onIncidentUpdated?.(updated);
    await updateIncident(currentIncident.id, { files: updatedFiles });
  };

  const rawFiles = currentIncident.files || [];

  return (
    <>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl border border-app-border shadow-xl max-w-xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-5 border-b border-app-border flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    {getIncidentDisplayCode(currentIncident.id)}
                  </span>
                  <h3 className="text-base font-bold text-gray-900">
                    {currentIncident.title || currentIncident.type || "Détails de l'incident"}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{currentIncident.dateStr || "Récemment"}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-4 text-sm text-gray-800">
            {/* Locataire details */}
            <div className="bg-gray-50 border border-app-border rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Locataire concerné</p>
                <p className="font-bold text-gray-900 text-base mt-0.5">{currentIncident.tenant || "Non renseigné"}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {formatUnitDisplay(currentIncident.unit).toLowerCase().startsWith("studio") || 
                   formatUnitDisplay(currentIncident.unit).toLowerCase().startsWith("appartement") || 
                   formatUnitDisplay(currentIncident.unit).toLowerCase().startsWith("villa") || 
                   formatUnitDisplay(currentIncident.unit).toLowerCase().startsWith("magasin") 
                    ? formatUnitDisplay(currentIncident.unit) 
                    : `Appartement ${formatUnitDisplay(currentIncident.unit)}`} 
                  {" — "} 
                  {currentIncident.property || "Résidence"}
                </p>
              </div>
              <Badge 
                dot 
                variant={
                  currentIncident.status === "RÉSOLU" 
                    ? "success" 
                    : currentIncident.status === "EN COURS" 
                    ? "warning" 
                    : "info"
                }
              >
                {currentIncident.status}
              </Badge>
            </div>

            {/* Urgence */}
            {currentIncident.isUrgent && (
              <div className="bg-red-50 border border-red-200/60 rounded-xl p-3 flex items-center gap-2.5 text-red-800 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>URGENT : Risque de dégâts matériels importants signalé !</span>
              </div>
            )}

            {/* Type & Titre */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Titre de l'incident
              </label>
              <p className="font-bold text-gray-900">{currentIncident.title || currentIncident.type}</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Description
              </label>
              <div className="bg-gray-50 border border-app-border rounded-xl p-4 text-xs leading-relaxed text-gray-800 font-medium whitespace-pre-wrap">
                {currentIncident.description || "Aucune description fournie."}
              </div>
            </div>

            {/* Attached files & Photos */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span>Photos & Pièces jointes ({rawFiles.length})</span>
                  </label>
                  {isTenantView && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Dossier complet : photos déclarées et pièces ajoutées par l'administration.
                    </p>
                  )}
                </div>
                <label className="text-xs text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto pt-1 sm:pt-0">
                  <Plus className="w-3.5 h-3.5" /> {isTenantView ? "Ajouter une photo complémentaire" : "Ajouter une photo"}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleAddFile}
                  />
                </label>
              </div>

              {rawFiles.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rawFiles.map((file: any, index: number) => {
                      const isImg = isImageFile(file);
                      const fileSrc = getFileSource(file);
                      const fileName = file.name || `Photo ${index + 1}`;

                      if (isImg && fileSrc) {
                        return (
                          <div
                            key={index}
                            className="group relative bg-gray-50 border border-app-border rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                          >
                            <div
                              onClick={() => setPreviewImage({ src: fileSrc, title: fileName, index })}
                              className="relative h-44 w-full bg-gray-100 cursor-pointer overflow-hidden flex items-center justify-center"
                            >
                              <img
                                src={fileSrc}
                                alt={fileName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <span className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                                  <Eye className="w-3.5 h-3.5" /> Agrandir
                                </span>
                              </div>
                            </div>
                            <div className="p-2.5 bg-white border-t border-app-border flex items-center justify-between text-xs">
                              <div className="truncate mr-2">
                                <p className="font-semibold text-gray-900 truncate" title={fileName}>
                                  {fileName}
                                </p>
                                {file.size && <p className="text-[10px] text-gray-400">{file.size}</p>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={fileSrc}
                                  download={fileName}
                                  className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Télécharger l'image"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                {!isTenantView && (
                                  <button
                                    onClick={() => handleRemoveFile(index)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Retirer ce fichier"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Vidéo ou document
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-app-border rounded-xl bg-gray-50"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0 border border-amber-200">
                              <Video className="w-5 h-5" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold text-gray-900 truncate">{fileName}</p>
                              <p className="text-[10px] text-gray-400">{file.size || "Fichier joint"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {fileSrc && (
                              <a
                                href={fileSrc}
                                download={fileName}
                                className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                                title="Télécharger"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                            {!isTenantView && (
                              <button
                                onClick={() => handleRemoveFile(index)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Retirer ce fichier"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/60 text-center">
                  <p className="text-xs text-gray-500">Aucune photo jointe pour le moment.</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-app-border bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
            {isTenantView ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-gray-500">Statut du dossier :</span>
                <Badge
                  dot
                  variant={
                    currentIncident.status === "RÉSOLU"
                      ? "success"
                      : currentIncident.status === "EN COURS"
                      ? "warning"
                      : "info"
                  }
                >
                  {currentIncident.status}
                </Badge>
                {currentIncident.status === "RÉSOLU" && (
                  <span className="text-[11px] text-emerald-600 font-medium hidden sm:inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Traité par l'agence
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Statut :</span>
                <select
                  value={currentIncident.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 border border-app-border rounded-lg bg-white text-gray-900 shadow-xs cursor-pointer"
                >
                  <option value="EN ATTENTE">EN ATTENTE</option>
                  <option value="EN COURS">EN COURS</option>
                  <option value="RÉSOLU">RÉSOLU</option>
                </select>
              </div>
            )}
            <button
              onClick={onClose}
              className={`w-full sm:w-auto px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isTenantView 
                  ? "bg-primary text-white hover:bg-primary/90 shadow-xs" 
                  : "bg-white border border-app-border text-gray-700 hover:bg-gray-50"
              }`}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox plein écran avec navigation multi-photos */}
      {previewImage && (() => {
        const imageFilesList = rawFiles
          .map((f: any, idx: number) => ({ file: f, src: getFileSource(f), name: f.name || `Photo ${idx + 1}` }))
          .filter((item: any) => isImageFile(item.file) && Boolean(item.src));

        const currentIndex = typeof previewImage.index === "number" 
          ? previewImage.index 
          : imageFilesList.findIndex((it: any) => it.src === previewImage.src);

        const handlePrevImage = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (imageFilesList.length <= 1) return;
          const prevIdx = (currentIndex - 1 + imageFilesList.length) % imageFilesList.length;
          setPreviewImage({
            src: imageFilesList[prevIdx].src,
            title: imageFilesList[prevIdx].name,
            index: prevIdx,
          });
        };

        const handleNextImage = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (imageFilesList.length <= 1) return;
          const nextIdx = (currentIndex + 1) % imageFilesList.length;
          setPreviewImage({
            src: imageFilesList[nextIdx].src,
            title: imageFilesList[nextIdx].name,
            index: nextIdx,
          });
        };

        return (
          <div 
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="relative max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col w-full"
            >
              <div className="p-3 bg-gray-900/90 text-white flex items-center justify-between border-b border-gray-800">
                <div className="flex items-center gap-2 truncate max-w-lg">
                  <span className="text-xs font-semibold text-gray-200 truncate">{previewImage.title}</span>
                  {imageFilesList.length > 1 && (
                    <span className="text-[11px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full font-medium">
                      {(currentIndex >= 0 ? currentIndex : 0) + 1} / {imageFilesList.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewImage.src}
                    download={previewImage.title || "incident-photo.jpg"}
                    className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-xs flex items-center gap-1.5 bg-gray-800/60 font-medium"
                    title="Télécharger l'image"
                  >
                    <Download className="w-4 h-4" /> Télécharger
                  </a>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="relative p-2 flex items-center justify-center bg-black/70 overflow-auto max-h-[82vh] min-h-[300px]">
                {imageFilesList.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md z-10 hover:scale-105"
                      title="Photo précédente"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md z-10 hover:scale-105"
                      title="Photo suivante"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
                <img 
                  src={previewImage.src} 
                  alt={previewImage.title} 
                  className="max-h-[78vh] w-auto max-w-full object-contain rounded-lg shadow-lg" 
                />
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
