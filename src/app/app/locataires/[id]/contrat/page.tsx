"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Upload, FileText, Download, CheckCircle } from "lucide-react";
import Link from "next/link";
import { generateContratBail } from "@/lib/pdfGenerator";
import { getPdfTemplate, getGenericTemplate, getOrGenerateContratTemplate } from "@/lib/storage";

export default function GenererContratPage({ params }: { params: { id: string } }) {
  const [tenant, setTenant] = useState<any>(null);
  const [cniRecto, setCniRecto] = useState<string | null>(null);
  const [cniVerso, setCniVerso] = useState<string | null>(null);
  
  // Custom fields
  const [dateDebut, setDateDebut] = useState("");
  const [montantLoyer, setMontantLoyer] = useState("");
  const [caution, setCaution] = useState("");
  const [montantAvance, setMontantAvance] = useState("");
  const [ownerName, setOwnerName] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const parseFrenchDateToYMD = (dateStr: string) => {
    if (!dateStr) return "";
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    const months: { [key: string]: string } = { 
      'janv.': '01', 'janvier': '01', 'févr.': '02', 'février': '02', 'mars': '03', 'avr.': '04', 'avril': '04', 'mai': '05', 'juin': '06', 'juil.': '07', 'juillet': '07', 'août': '08', 'sept.': '09', 'septembre': '09', 'oct.': '10', 'octobre': '10', 'nov.': '11', 'novembre': '11', 'déc.': '12', 'décembre': '12' 
    };
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length >= 3) {
      const day = parts[0].padStart(2, '0');
      const month = months[parts[1]];
      const year = parts[2];
      if (month && year) return `${year}-${month}-${day}`;
    }
    return "";
  };

  useEffect(() => {
    const storedTenants = localStorage.getItem("gestimmo_locataires");
    const storedBaux = localStorage.getItem("gestimmo_baux");
    
    if (storedTenants) {
      const allTenants = JSON.parse(storedTenants);
      const foundTenant = allTenants.find((t: any) => t.id === params.id);
      
      if (foundTenant) {
        setTenant(foundTenant);
        
        let activeLease = null;
        if (storedBaux) {
          const allBaux = JSON.parse(storedBaux);
          activeLease = allBaux.find((b: any) => (b.tenantId === params.id || b.tenant === foundTenant.name) && b.status === "ACTIF");
        }
        
        if (activeLease) {
          if (activeLease.start) setDateDebut(parseFrenchDateToYMD(activeLease.start));
          if (activeLease.rent !== undefined) setMontantLoyer(activeLease.rent.toString());
          
          if (activeLease.caution !== undefined) {
            setCaution(activeLease.caution.toString());
          } else if (activeLease.rent !== undefined) {
            // Fallback si la caution n'était pas renseignée dans les vieux baux (ex: 2 mois de loyer)
            setCaution((activeLease.rent * 2).toString());
          }

          if (activeLease.avance !== undefined) {
            setMontantAvance(activeLease.avance.toString());
          } else if (activeLease.rent !== undefined) {
            // Fallback si l'avance n'était pas renseignée dans les vieux baux (ex: 1 mois de loyer)
            setMontantAvance(activeLease.rent.toString());
          }

          // Fetch owner from property
          const storedBiens = localStorage.getItem("gestimmo_biens");
          if (storedBiens) {
            const allBiens = JSON.parse(storedBiens);
            const propertyObj = allBiens.find((b: any) => b.name === activeLease.property);
            if (propertyObj) {
              setOwnerName(propertyObj.owner);
            }
          }
        } else {
          setMontantLoyer(foundTenant.rent ? foundTenant.rent.toString() : "");
        }
      }
    }
  }, [params.id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setBase64: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Veuillez sélectionner une image au format JPG ou PNG.");
    }
  };

  const handleGenerate = async () => {
    let base64Pdf = null;
    if (ownerName) {
      try {
        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        if (storedOwners) {
          const owners = JSON.parse(storedOwners);
          const o = owners.find((x: any) => 
            (x.name && x.name.trim().toLowerCase() === ownerName.trim().toLowerCase()) ||
            (x.full_name && x.full_name.trim().toLowerCase() === ownerName.trim().toLowerCase()) ||
            (x.id && x.id === ownerName)
          );
          if (o?.templates?.contratFileKey) {
            base64Pdf = await getGenericTemplate(o.templates.contratFileKey);
          }
        }
      } catch (e) {}
    }
    if (!base64Pdf) {
      base64Pdf = await getOrGenerateContratTemplate(ownerName);
    }

    setIsGenerating(true);
    
    try {
      const customFields = { dateDebut, montantLoyer, caution, montantAvance, ownerName };
      const pdfBytes = await generateContratBail(base64Pdf, tenant, customFields, cniRecto, cniVerso);
      
      // Téléchargement du fichier
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Contrat_Bail_${tenant.name.replace(/ /g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsSuccess(true);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF", error);
      alert("Une erreur est survenue lors de la génération du contrat.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!tenant) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/app/locataires/${tenant.id}`}>
          <button type="button" className="p-2 bg-white border border-app-border rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Générer le contrat</h1>
          <p className="text-sm text-gray-500 mt-1">Locataire : {tenant.name}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-primary" /> Informations du contrat
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de début du bail</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900" 
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant du loyer</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900" 
              value={montantLoyer}
              onChange={(e) => setMontantLoyer(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant de la caution</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900" 
              value={caution}
              onChange={(e) => setCaution(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant de l'avance</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-app-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-gray-900" 
              value={montantAvance}
              onChange={(e) => setMontantAvance(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Upload className="w-5 h-5 mr-2 text-primary" /> Pièce d'identité (CNI)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">CNI Recto (Image)</label>
            <div className="border-2 border-dashed border-app-border rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative overflow-hidden h-48">
              {cniRecto ? (
                <img src={cniRecto} alt="CNI Recto" className="absolute inset-0 w-full h-full object-contain bg-gray-100" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700">Cliquez pour importer</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG acceptés</p>
                </>
              )}
              <input 
                type="file" 
                accept="image/png, image/jpeg" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handleImageUpload(e, setCniRecto)}
              />
            </div>
            {cniRecto && (
               <button onClick={() => setCniRecto(null)} className="text-xs text-red-500 mt-2 hover:underline">Supprimer l'image</button>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">CNI Verso (Image)</label>
            <div className="border-2 border-dashed border-app-border rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative overflow-hidden h-48">
              {cniVerso ? (
                <img src={cniVerso} alt="CNI Verso" className="absolute inset-0 w-full h-full object-contain bg-gray-100" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700">Cliquez pour importer</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG acceptés</p>
                </>
              )}
              <input 
                type="file" 
                accept="image/png, image/jpeg" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handleImageUpload(e, setCniVerso)}
              />
            </div>
            {cniVerso && (
               <button onClick={() => setCniVerso(null)} className="text-xs text-red-500 mt-2 hover:underline">Supprimer l'image</button>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`px-6 py-3 rounded-xl text-sm font-medium text-white shadow-sm flex items-center transition-colors ${
            isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'
          } ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isGenerating ? (
            "Génération en cours..."
          ) : isSuccess ? (
            <><CheckCircle className="w-5 h-5 mr-2" /> Contrat Généré</>
          ) : (
            <><Download className="w-5 h-5 mr-2" /> Générer le contrat (PDF)</>
          )}
        </button>
      </div>
      {isSuccess && (
        <p className="text-sm text-green-600 text-right mt-2">
          Le contrat a été généré et téléchargé avec succès !
        </p>
      )}
    </div>
  );
}
