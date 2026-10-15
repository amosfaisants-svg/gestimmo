"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Trash2, Download, Printer, CheckCircle2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface TextAnnotation {
  id: string;
  pageIndex: number;
  pdfX: number;
  pdfY: number;
  canvasX: number;
  canvasY: number;
  text: string;
  fontSize: number;
}

interface Props {
  base64Pdf: string;
  signatureCode: string;
  leaseName: string;
  initialPage?: number;
  onSave: (annotations: TextAnnotation[]) => void;
  onClose: () => void;
}

export default function PdfContractEditor({ base64Pdf, signatureCode, leaseName, initialPage = 1, onSave, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [pageViewport, setPageViewport] = useState<{ width: number; height: number; pdfWidth: number; pdfHeight: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);

  useEffect(() => {
    const loadPdfJs = () => {
      if ((window as any).pdfjsLib) {
        setPdfjsLib((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setPdfjsLib((window as any).pdfjsLib);
      };
      document.head.appendChild(script);
    };
    loadPdfJs();
  }, []);

  useEffect(() => {
    if (!pdfjsLib || !base64Pdf) return;
    const loadPdf = async () => {
      setIsLoading(true);
      try {
        const base64Data = base64Pdf.includes(",") ? base64Pdf.split(",")[1] : base64Pdf;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        if (initialPage && initialPage > 1) {
          const targetPage = Math.min(initialPage - 1, doc.numPages - 1);
          setCurrentPage(Math.max(0, targetPage));
        } else {
          setCurrentPage(0);
        }
      } catch (err) {
        console.error("PDF load error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [pdfjsLib, base64Pdf, initialPage]);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage + 1);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setPageViewport({
        width: viewport.width,
        height: viewport.height,
        pdfWidth: page.getViewport({ scale: 1 }).width,
        pdfHeight: page.getViewport({ scale: 1 }).height,
      });
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error("Render error:", err);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => { renderPage(); }, [renderPage]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddMode || !canvasRef.current || !pageViewport) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const pdfX = (canvasX / pageViewport.width) * pageViewport.pdfWidth;
    const pdfY = pageViewport.pdfHeight - (canvasY / pageViewport.height) * pageViewport.pdfHeight;
    const ann: TextAnnotation = {
      id: `ann-${Date.now()}`,
      pageIndex: currentPage,
      pdfX, pdfY, canvasX, canvasY,
      text: "",
      fontSize: 11,
    };
    setAnnotations((prev) => [...prev, ann]);
    setSelectedId(ann.id);
    setIsAddMode(false);
  };

  const updateText = (id: string, text: string) =>
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, text } : a)));

  const deleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setSelectedId(null);
  };

  const generateFinalPdf = async (): Promise<Uint8Array> => {
    const base64Data = base64Pdf.includes(",") ? base64Pdf.split(",")[1] : base64Pdf;
    const existingPdfBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const doc = await PDFDocument.load(existingPdfBytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    for (const ann of annotations) {
      if (!ann.text.trim()) continue;
      const page = pages[ann.pageIndex];
      if (!page) continue;
      page.drawText(ann.text, { x: ann.pdfX, y: ann.pdfY, size: ann.fontSize, font, color: rgb(0.05, 0.05, 0.5) });
    }
    const lastPage = pages[pages.length - 1];
    lastPage.drawText(`Signature electronique: ${signatureCode}`, { x: 50, y: 40, size: 8, font, color: rgb(0.2, 0.4, 0.8) });
    lastPage.drawText(`Valide le ${new Date().toLocaleDateString("fr-FR")} - GESTIMMO`, { x: 50, y: 28, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
    return await doc.save();
  };

  const handleDownload = async () => {
    setIsSaving(true);
    try {
      const pdfBytes = await generateFinalPdf();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${leaseName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Erreur lors de la generation du PDF."); }
    finally { setIsSaving(false); }
  };

  const handlePrint = async () => {
    setIsSaving(true);
    try {
      const pdfBytes = await generateFinalPdf();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) win.onload = () => setTimeout(() => win.print(), 500);
    } catch { alert("Erreur impression."); }
    finally { setIsSaving(false); }
  };

  const currentPageAnnotations = annotations.filter((a) => a.pageIndex === currentPage);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-900/90">
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="font-bold text-gray-900 text-sm">{leaseName}</p>
            <p className="text-xs text-gray-500">Mode édition PDF</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(3, s + 0.2))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={() => { setIsAddMode((v) => !v); setSelectedId(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isAddMode ? "bg-primary text-white animate-pulse" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
          >
            <Plus className="w-4 h-4" /> {isAddMode ? "Cliquez sur le PDF…" : "Ajouter du texte"}
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button onClick={handlePrint} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 text-gray-700 disabled:opacity-50">
            <Printer className="w-4 h-4" /> Imprimer
          </button>
          <button onClick={handleDownload} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 text-gray-700 disabled:opacity-50">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
          </button>
          <button onClick={() => onSave(annotations)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar: annotations list */}
        <div className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Zones de texte ({annotations.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {annotations.length === 0 && (
              <div className="text-center mt-6 px-3">
                <Plus className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Cliquez "+ Ajouter du texte" puis cliquez sur le PDF</p>
              </div>
            )}
            {annotations.map((ann) => (
              <div key={ann.id}
                onClick={() => { setSelectedId(ann.id); setCurrentPage(ann.pageIndex); }}
                className={`p-2 rounded-lg border cursor-pointer transition-colors ${selectedId === ann.id ? "border-primary bg-primary/5" : "border-gray-100 hover:border-gray-300"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Page {ann.pageIndex + 1}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={ann.text}
                  onChange={(e) => updateText(ann.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-primary"
                  placeholder="Texte..."
                  autoFocus={selectedId === ann.id && ann.text === ""}
                />
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-gray-100 bg-blue-50 shrink-0">
            <p className="text-xs font-semibold text-blue-700 mb-1">Signature électronique</p>
            <p className="font-mono text-xs text-blue-800 break-all">{signatureCode}</p>
          </div>
        </div>

        {/* PDF canvas area */}
        <div className="flex-1 overflow-auto bg-gray-600 flex flex-col items-center py-6 gap-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-white gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Chargement du PDF…</p>
            </div>
          ) : (
            <>
              {numPages > 1 && (
                <div className="flex items-center gap-3 bg-black/30 rounded-xl px-4 py-2">
                  <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-1 text-white disabled:opacity-30 hover:bg-white/20 rounded">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-white text-sm font-medium">Page {currentPage + 1} / {numPages}</span>
                  <button onClick={() => setCurrentPage((p) => Math.min(numPages - 1, p + 1))} disabled={currentPage === numPages - 1} className="p-1 text-white disabled:opacity-30 hover:bg-white/20 rounded">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div
                ref={containerRef}
                className={`relative shadow-2xl ${isAddMode ? "cursor-crosshair" : "cursor-default"}`}
                style={{ width: pageViewport?.width, height: pageViewport?.height, minHeight: 200 }}
                onClick={handleCanvasClick}
              >
                <canvas ref={canvasRef} className="block" />
                {currentPageAnnotations.map((ann) => (
                  <div
                    key={ann.id}
                    style={{ position: "absolute", left: ann.canvasX, top: ann.canvasY - 10, zIndex: selectedId === ann.id ? 20 : 10 }}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); }}
                  >
                    <div className="relative">
                      <input
                        type="text"
                        value={ann.text}
                        onChange={(e) => updateText(ann.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-blue-900 font-semibold bg-yellow-200/90 border-b-2 px-1 outline-none min-w-[60px] max-w-[250px] ${selectedId === ann.id ? "border-primary shadow-lg" : "border-yellow-500"}`}
                        style={{ fontSize: ann.fontSize, fontFamily: "Arial, sans-serif", background: "rgba(255,240,100,0.85)" }}
                        placeholder="…"
                        autoFocus={selectedId === ann.id && ann.text === ""}
                      />
                      {selectedId === ann.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >×</button>
                      )}
                    </div>
                  </div>
                ))}
                {isAddMode && (
                  <div className="absolute inset-0 border-2 border-dashed border-primary/60 bg-primary/5 pointer-events-none flex items-center justify-center">
                    <div className="bg-white/90 rounded-xl px-4 py-2 shadow text-sm font-semibold text-primary">
                      Cliquez pour placer du texte ici
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
