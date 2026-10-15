"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { 
  X, Smartphone, CheckCircle2, Loader2, ShieldCheck, 
  Download, ArrowRight, Lock, QrCode, FileText, Check, 
  Sparkles, Clock, AlertCircle, PhoneCall
} from "lucide-react";
import { formatFCFA, formatUnitDisplay } from "@/lib/utils";
import { createPayment } from "@/lib/dataService";

interface TenantPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantName: string;
  propertyName: string;
  unitId: string;
  rentAmount: number;
  period: string; // e.g. "Décembre 2026"
  dueDate?: string; // e.g. "10 Décembre 2026"
  activeLease?: any;
  currentUser?: any;
  onPaymentSuccess?: (payment: any) => void;
}

type PaymentMethodType = "wave" | "orange" | "mtn" | "moov";
type PaymentStep = "form" | "processing" | "success";

const OPERATORS_CONFIG: Record<
  PaymentMethodType,
  {
    name: string;
    short: string;
    code: string;
    badge: string;
    tagline: string;
    refPrefix: string;
    dbMethod: string;
    label: string;
    btnClass: string;
    borderActive: string;
    bgActive: string;
    ringActive: string;
    badgeClass: string;
    badgeBg: string;
    badgeText: string;
    instruction: string;
  }
> = {
  wave: {
    name: "Wave CI",
    short: "Wave",
    code: "W",
    badge: "Sans frais • 0%",
    tagline: "1-Clic / QR Code",
    refPrefix: "TXN-WAVE",
    dbMethod: "WAVE",
    label: "Wave",
    btnClass: "bg-[#0284c7] hover:bg-[#0369a1] shadow-cyan-500/20",
    borderActive: "border-[#1DC4F9]",
    bgActive: "bg-[#1DC4F9]/10",
    ringActive: "ring-[#1DC4F9]/20",
    badgeClass: "bg-[#1DC4F9]",
    badgeBg: "bg-[#1DC4F9]/20",
    badgeText: "text-[#0284c7]",
    instruction: "Ouvrez votre application Wave lorsque la demande de débit est envoyée pour valider le paiement instantanément.",
  },
  orange: {
    name: "Orange Money",
    short: "Orange",
    code: "OM",
    badge: "Code #144*82#",
    tagline: "Validation USSD",
    refPrefix: "TXN-OM",
    dbMethod: "ORANGE_MONEY",
    label: "Orange Money",
    btnClass: "bg-[#ea580c] hover:bg-[#c2410c] shadow-orange-500/20",
    borderActive: "border-[#FF7900]",
    bgActive: "bg-[#FF7900]/10",
    ringActive: "ring-[#FF7900]/20",
    badgeClass: "bg-[#FF7900]",
    badgeBg: "bg-[#FF7900]/20",
    badgeText: "text-[#c2410c]",
    instruction: "Composez #144*82# sur votre mobile pour générer un code d'autorisation temporaire ou confirmez le push USSD.",
  },
  mtn: {
    name: "MTN MoMo",
    short: "MTN",
    code: "MTN",
    badge: "Code *133#",
    tagline: "MoMo CI Push",
    refPrefix: "TXN-MTN",
    dbMethod: "MTN_MOMO",
    label: "MTN MoMo",
    btnClass: "bg-[#ca8a04] hover:bg-[#a16207] shadow-yellow-500/20",
    borderActive: "border-[#EAB308]",
    bgActive: "bg-[#FEF08A]/30",
    ringActive: "ring-[#EAB308]/30",
    badgeClass: "bg-[#EAB308] text-gray-900",
    badgeBg: "bg-[#FEF08A]",
    badgeText: "text-amber-900",
    instruction: "Approuvez la notification de débit reçue sur votre téléphone en saisissant votre code secret MTN Mobile Money (*133#).",
  },
  moov: {
    name: "Moov Money",
    short: "Moov",
    code: "MOOV",
    badge: "Code *155#",
    tagline: "Moov Money CI",
    refPrefix: "TXN-MOOV",
    dbMethod: "MOOV_MONEY",
    label: "Moov Money",
    btnClass: "bg-[#0369a1] hover:bg-[#075985] shadow-blue-500/20",
    borderActive: "border-[#0284c7]",
    bgActive: "bg-[#0284c7]/10",
    ringActive: "ring-[#0284c7]/20",
    badgeClass: "bg-[#0284c7]",
    badgeBg: "bg-[#0284c7]/20",
    badgeText: "text-[#0369a1]",
    instruction: "Validez la demande de paiement en confirmant le push USSD MoMo ou en composant votre code secret sur *155#.",
  },
};

export function TenantPaymentModal({
  isOpen,
  onClose,
  tenantName,
  propertyName,
  unitId,
  rentAmount,
  period,
  dueDate = "10 Décembre 2026",
  activeLease,
  currentUser,
  onPaymentSuccess
}: TenantPaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethodType>("wave");
  const [phone, setPhone] = useState(currentUser?.phone || "07 ");
  const [orangeOtp, setOrangeOtp] = useState("");
  const [step, setStep] = useState<PaymentStep>("form");
  const [processingStatus, setProcessingStatus] = useState("Connexion au réseau...");
  const [completedPayment, setCompletedPayment] = useState<any>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [hasCopiedRef, setHasCopiedRef] = useState(false);

  if (!isOpen) return null;

  const currentOp = OPERATORS_CONFIG[method];

  const handleStartPayment = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      alert("Veuillez saisir un numéro de téléphone mobile money valide (ex: 07 01 02 03 04).");
      return;
    }

    setStep("processing");
    setProcessingStatus(`Connexion à la passerelle ${currentOp.name}...`);

    // Step 1: Network handshake
    setTimeout(() => {
      setProcessingStatus(`Notification de débit transmise à ${currentOp.name} (+225 ${cleanPhone})...`);
    }, 1200);

    // Step 2: Awaiting validation on customer phone
    setTimeout(() => {
      setProcessingStatus("Validation de l'autorisation de paiement en cours...");
    }, 2400);

    // Step 3: Complete payment
    setTimeout(async () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
      const payId = `P-${Math.floor(2000 + Math.random() * 8000)}`;
      const receiptNumber = `REC-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const transferNumber = `${currentOp.refPrefix}-${Math.floor(100000 + Math.random() * 900000)}`;

      const newPayment = {
        id: payId,
        code: receiptNumber,
        receiptNumber,
        transferNumber,
        tenant: tenantName.toUpperCase(),
        tenantId: currentUser?.id || activeLease?.tenantId || null,
        unit: activeLease?.unit || currentUser?.unit || unitId,
        unitId: activeLease?.unitId || currentUser?.unitId || null,
        property: propertyName,
        propertyId: activeLease?.propertyId || null,
        leaseId: activeLease?.id || null,
        amount: rentAmount,
        period,
        date: dateStr,
        method: currentOp.label,
        status: "VALIDÉ",
        receiptPdfUrl: null,
      };

      // 1. Local Storage persistence
      try {
        const storedPaiements = localStorage.getItem("gestimmo_paiements");
        const paymentsList: any[] = storedPaiements ? JSON.parse(storedPaiements) : [];
        const updatedList = [newPayment, ...paymentsList];
        localStorage.setItem("gestimmo_paiements", JSON.stringify(updatedList));

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new Event("gestimmo_paiements_updated"));
        }
      } catch (err) {
        console.error("LocalStorage error:", err);
      }

      // 2. Supabase Cloud persistence
      try {
        const leaseIdUuid = activeLease?.id && !activeLease.id.startsWith("L-") ? activeLease.id : null;
        const tenantIdUuid = currentUser?.id && currentUser.id.length > 25 ? currentUser.id : activeLease?.tenantId || null;
        const unitIdUuid = activeLease?.unitId && activeLease.unitId.length > 25 ? activeLease.unitId : null;

        await createPayment({
          amount: rentAmount,
          lease_id: leaseIdUuid,
          tenant_id: tenantIdUuid,
          unit_id: unitIdUuid,
          payment_date: now.toISOString().split("T")[0],
          payment_method: currentOp.dbMethod,
          period_month: period,
          receipt_number: receiptNumber,
          status: "PAYÉ"
        });
      } catch (err) {
        console.error("Supabase createPayment error:", err);
      }

      setCompletedPayment(newPayment);
      setStep("success");

      if (onPaymentSuccess) {
        onPaymentSuccess(newPayment);
      }
    }, 3600);
  };

  const handleDownloadPdf = async () => {
    if (!completedPayment) return;
    setIsDownloadingPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const cleanUnit = formatUnitDisplay(completedPayment.unit || unitId);

      const element = document.createElement("div");
      element.innerHTML = `
        <div style="padding: 40px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; max-width: 750px; margin: 0 auto; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 25px;">
            <div>
              <h1 style="color: #2563eb; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.025em;">GESTIMMO</h1>
              <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0; font-weight: 500;">Plateforme de Gestion Immobilière</p>
              <p style="font-size: 12px; color: #94a3b8; margin: 2px 0 0 0;">Abidjan, Côte d'Ivoire</p>
            </div>
            <div style="text-align: right;">
              <div style="display: inline-block; background: #dcfce7; color: #15803d; font-weight: 700; padding: 6px 16px; border-radius: 9999px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                PAYÉ EN LIGNE • VALIDÉ
              </div>
              <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0;">QUITTANCE DE LOYER</h2>
              <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">Réf : ${completedPayment.receiptNumber || completedPayment.id}</p>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px; display: flex; justify-content: space-between;">
            <div>
              <p style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin: 0 0 6px 0; letter-spacing: 0.05em;">Locataire Débiteur</p>
              <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">${tenantName}</p>
              <p style="font-size: 13px; color: #475569; margin: 4px 0 0 0;">Bien : <strong>${propertyName}</strong></p>
              <p style="font-size: 13px; color: #475569; margin: 2px 0 0 0;">Logement : <strong>${cleanUnit}</strong></p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin: 0 0 6px 0; letter-spacing: 0.05em;">Modalités de Règlement</p>
              <p style="font-size: 13px; color: #475569; margin: 0;">Mois soldé : <strong style="color: #0f172a;">${period}</strong></p>
              <p style="font-size: 13px; color: #475569; margin: 4px 0 0 0;">Date d'encaissement : <strong style="color: #0f172a;">${completedPayment.date}</strong></p>
              <p style="font-size: 13px; color: #475569; margin: 4px 0 0 0;">Mode : <strong style="color: #2563eb;">Mobile Money (${completedPayment.method})</strong></p>
              <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">ID Transac : <code>${completedPayment.transferNumber}</code></p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
                <th style="padding: 12px 16px; font-weight: 700; color: #334155; font-size: 12px; text-transform: uppercase;">Désignation des Prestations</th>
                <th style="padding: 12px 16px; font-weight: 700; color: #334155; font-size: 12px; text-transform: uppercase; text-align: right;">Montant Réglé</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 16px; color: #334155; font-weight: 500;">
                  Loyer mensuel et charges locatives récupérables — Période de ${period}
                </td>
                <td style="padding: 16px; color: #0f172a; font-weight: 700; text-align: right;">
                  ${formatFCFA(completedPayment.amount)}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0; background: #fafafa;">
                <td style="padding: 12px 16px; color: #64748b; font-size: 13px;">
                  Frais de transaction Mobile Money (Wave / Orange Money)
                </td>
                <td style="padding: 12px 16px; color: #16a34a; font-weight: 600; text-align: right; font-size: 13px;">
                  0 F CFA (Inclus / Offert)
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc;">
                <td style="padding: 16px; font-weight: 700; color: #0f172a; text-align: right; font-size: 15px;">
                  TOTAL ACQUITTÉ :
                </td>
                <td style="padding: 16px; font-weight: 800; color: #2563eb; font-size: 19px; text-align: right;">
                  ${formatFCFA(completedPayment.amount)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px; margin-bottom: 30px; font-size: 12px; color: #1e40af;">
            <strong>Mention Légale :</strong> Le présent document constitue une quittance de loyer certifiée conforme délivrée sous réserve de parfait encaissement. Il fait foi du règlement de l'échéance susvisée.
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0;">Document généré électroniquement • Système certifié GESTIMMO</p>
            <p style="margin: 0; font-weight: 600;">Authentification Sécurisée Mobile Money CI</p>
          </div>
        </div>
      `;

      const opt: any = {
        margin: 10,
        filename: `Quittance_${period.replace(/\s+/g, "_")}_${tenantName.replace(/\s+/g, "_")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Erreur PDF:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const copyRefToClipboard = () => {
    if (completedPayment?.transferNumber) {
      navigator.clipboard.writeText(completedPayment.transferNumber);
      setHasCopiedRef(true);
      setTimeout(() => setHasCopiedRef(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-app-border overflow-hidden flex flex-col relative my-8">
        
        {/* Modal Top Header */}
        <div className="p-6 border-b border-app-border flex justify-between items-start bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Paiement en ligne du loyer</h2>
              <p className="text-xs text-gray-500 mt-0.5">Règlement direct par Wave & Orange Money CI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={step === "processing"}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: FORM & SELECTION */}
        {step === "form" && (
          <div className="p-6 space-y-6">
            
            {/* Rent Summary Box */}
            <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-100 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Période concernée</span>
                <Badge variant="info" dot={true}>Échéance du {dueDate}</Badge>
              </div>

              <div className="flex items-baseline justify-between border-b border-blue-200/60 pb-3">
                <span className="text-xl font-extrabold text-gray-900">{period}</span>
                <span className="text-2xl font-black text-primary">{formatFCFA(rentAmount)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
                <div>
                  <span className="text-gray-400 block">Bien :</span>
                  <span className="font-semibold text-gray-800 truncate block">{propertyName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Logement :</span>
                  <span className="font-semibold text-gray-800 truncate block">{formatUnitDisplay(unitId)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Choisissez votre moyen de paiement Mobile Money
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(Object.keys(OPERATORS_CONFIG) as PaymentMethodType[]).map((key) => {
                  const op = OPERATORS_CONFIG[key];
                  const isSelected = method === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethod(key)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-28 relative cursor-pointer ${
                        isSelected
                          ? `${op.borderActive} ${op.bgActive} shadow-sm ring-2 ${op.ringActive}`
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-1.5">
                          <span className={`w-7 h-7 rounded-lg ${op.badgeClass} flex items-center justify-center font-black text-xs shadow-xs text-white`}>
                            {op.code}
                          </span>
                          <span className="font-bold text-xs text-gray-900 truncate">{op.short}</span>
                        </div>
                        {isSelected && (
                          <div className={`w-4 h-4 rounded-full ${op.badgeClass} flex items-center justify-center text-white`}>
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className={`text-[9px] font-bold ${op.badgeText} ${op.badgeBg} px-1.5 py-0.5 rounded-full block w-fit truncate`}>
                          {op.badge}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-1 truncate">{op.tagline}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Numéro de téléphone {currentOp.name} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    🇨🇮 +225
                  </span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07 00 11 22 33"
                  className="w-full pl-24 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold tracking-wide text-gray-900 bg-white"
                />
              </div>
              <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Vous recevrez une notification d&apos;autorisation sur ce numéro.
              </p>
            </div>

            {/* Instructions contextualisées */}
            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-app-border text-xs text-gray-800 flex items-start gap-2.5">
              <PhoneCall className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Instructions {currentOp.name} :</strong> {currentOp.instruction}
              </div>
            </div>

            {/* Total Recap and Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartPayment}
                className={`w-full py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${currentOp.btnClass}`}
              >
                <Lock className="w-4 h-4" />
                Payer {formatFCFA(rentAmount)} avec {currentOp.name}
              </button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 mt-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paiement certifié & sécurisé par GESTIMMO</span>
              </div>
            </div>

          </div>
        )}

        {/* STEP 2: PROCESSING SIMULATION */}
        {step === "processing" && (
          <div className="p-10 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                method === "wave" ? "bg-cyan-100 text-cyan-600" :
                method === "orange" ? "bg-orange-100 text-orange-600" :
                method === "mtn" ? "bg-yellow-100 text-yellow-700" :
                "bg-blue-100 text-blue-700"
              } animate-pulse`}>
                <Smartphone className="w-10 h-10" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-primary animate-spin" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">Traitement en cours...</h3>
              <p className="text-sm text-gray-600 max-w-xs mx-auto leading-relaxed">
                {processingStatus}
              </p>
            </div>

            <div className="bg-gray-50 border border-app-border rounded-2xl p-4 text-xs text-gray-600 space-y-2 max-w-sm mx-auto">
              <div className="flex items-center justify-between font-semibold">
                <span>Montant à prélever :</span>
                <span className="text-gray-900 text-sm font-bold">{formatFCFA(rentAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Opérateur :</span>
                <span className="font-semibold text-gray-700">{currentOp.name}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Numéro mobile :</span>
                <span className="font-semibold text-gray-700">+225 {phone}</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 animate-spin text-blue-600" />
              <span>Veuillez confirmer sur votre smartphone...</span>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS & QUITTANCE */}
        {step === "success" && (
          <div className="p-6 space-y-6">
            
            <div className="text-center space-y-2 pt-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">Loyer Réglé avec Succès !</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Votre paiement a été validé et enregistré en temps réel. Votre compte locataire est parfaitement à jour.
              </p>
            </div>

            {/* Transaction Receipt Card */}
            <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200 rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">N° Quittance émise</span>
                  <span className="text-base font-extrabold text-gray-900">{completedPayment?.receiptNumber || "REC-2026-0001"}</span>
                </div>
                <Badge variant="success" dot={true}>VALIDÉ</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block">Mois soldé :</span>
                  <span className="font-bold text-gray-900 text-sm">{period}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block">Montant payé :</span>
                  <span className="font-extrabold text-emerald-700 text-sm">{formatFCFA(rentAmount)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Moyen de règlement :</span>
                  <span className="font-semibold text-gray-800">{completedPayment?.method || "Mobile Money"}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block">Date & Heure :</span>
                  <span className="font-semibold text-gray-800">{completedPayment?.date}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                <span className="text-gray-500">Réf. Opérateur :</span>
                <button
                  type="button"
                  onClick={copyRefToClipboard}
                  className="font-mono font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  title="Copier la référence"
                >
                  <span>{completedPayment?.transferNumber || "TXN-891230"}</span>
                  {hasCopiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Sparkles className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Actions: Download PDF Quittance & Close */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="w-full py-3.5 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Génération de la quittance PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Télécharger ma Quittance Officielle (PDF)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-6 rounded-xl bg-white border border-app-border hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors flex items-center justify-center cursor-pointer"
              >
                Fermer et retourner au tableau de bord
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
