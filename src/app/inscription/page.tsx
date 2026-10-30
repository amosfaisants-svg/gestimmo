"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building, User, Mail, Phone, Lock } from "lucide-react";
import { createProfile } from "@/lib/dataService";
import { registerNewSaaSAgency } from "@/lib/superAdminService";
import { setPortalSession } from "@/lib/authSession";
import { getDefaultPermissions } from "@/lib/companyCredentials";

export default function InscriptionPage() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCgu, setShowCgu] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fullName = `${firstname.trim()} ${lastname.trim()}`.trim().toUpperCase();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.replace(/\D/g, "");

      if (fullName && cleanEmail) {
        const createdAgency = await registerNewSaaSAgency({
          companyName: company.trim() || `Agence ${fullName}`,
          adminName: fullName,
          email: cleanEmail,
          phone: cleanPhone,
          password: password || "Admin1234!",
          plan: "Essai Gratuit",
          status: "En essai",
        });

        await createProfile({
          full_name: fullName,
          email: cleanEmail,
          phone: cleanPhone,
          role: "ADMINISTRATEUR",
          permissions: { all: true },
        });

        setPortalSession("ADMIN", {
          id: createdAgency.id,
          companyId: createdAgency.id,
          companyName: createdAgency.name,
          name: fullName,
          email: cleanEmail,
          phone: cleanPhone,
          login: cleanEmail,
          role: "Administrateur",
          userRole: "ADMIN",
          status: "Actif",
          permissions: getDefaultPermissions("Administrateur"),
        });
      }
    } catch (err) {
      console.error("Erreur lors de l'inscription:", err);
    } finally {
      setLoading(false);
      router.push("/app");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center text-3xl font-extrabold text-primary tracking-tight mb-6">
          GESTIMMO
        </Link>
        <h2 className="text-center text-2xl font-bold text-gray-900">Créez votre entreprise</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Vous avez déjà un compte ? <Link href="/connexion" className="font-medium text-primary hover:text-primary/80 transition-colors">Connectez-vous</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            <div className="pb-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2 text-primary" /> Informations de l'Agence
              </h3>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">Nom de l'entreprise (ou Agence)</label>
                <div className="mt-1">
                  <input id="company" name="company" type="text" value={company} onChange={(e) => setCompany(e.target.value)} required className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-colors" placeholder="Ex: ImmoGestion Pro" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-primary" /> Vos informations
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="firstname" className="block text-sm font-medium text-gray-700">Prénom</label>
                  <div className="mt-1">
                    <input id="firstname" name="firstname" type="text" value={firstname} onChange={(e) => setFirstname(e.target.value)} required className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastname" className="block text-sm font-medium text-gray-700">Nom</label>
                  <div className="mt-1">
                    <input id="lastname" name="lastname" type="text" value={lastname} onChange={(e) => setLastname(e.target.value)} required className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email professionnel</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Téléphone</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input id="phone" name="phone" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} required placeholder="0102030405" className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mot de passe</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
              </div>

            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input id="terms" name="terms" type="checkbox" required className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
              </div>
              <div className="ml-2 text-sm">
                <label htmlFor="terms" className="text-gray-500">
                  J'accepte les{" "}
                  <button
                    type="button"
                    onClick={() => setShowCgu(true)}
                    className="font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0 inline"
                  >
                    conditions générales d'utilisation
                  </button>{" "}
                  et la politique de confidentialité.
                </label>
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 cursor-pointer">
                {loading ? "Création en cours..." : "Créer mon entreprise (Essai de 14 jours)"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL CGU */}
      {showCgu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-app-border space-y-4 max-h-[85vh] flex flex-col">
            <h3 className="text-lg font-bold text-gray-900">Conditions Générales d'Utilisation (CGU)</h3>
            <div className="text-sm text-gray-600 space-y-3 overflow-y-auto pr-2 flex-1">
              <p>
                <strong>1. Objet du Service :</strong> GESTIMMO est une plateforme logicielle SaaS destinée à la gestion locative immobilière, au suivi des baux, quittances et encaissements.
              </p>
              <p>
                <strong>2. Période d'essai :</strong> Votre inscription donne droit à une période d'essai gratuit de 14 jours, sans engagement et sans saisie de carte bancaire préalable.
              </p>
              <p>
                <strong>3. Confidentialité des Données :</strong> Toutes les données relatives à vos biens, propriétaires et locataires restent la propriété exclusive de votre entreprise et sont chiffrées.
              </p>
              <p>
                <strong>4. Responsabilité :</strong> L'agence utilisatrice reste responsable de la conformité légale des montants de loyers, clauses et quittances délivrées à ses locataires.
              </p>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCgu(false)}
                className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                J'ai compris et j'accepte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
