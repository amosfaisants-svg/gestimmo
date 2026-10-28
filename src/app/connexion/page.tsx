"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building, Lock, Mail, AlertCircle, ArrowRight, UserCheck } from "lucide-react";
import { authenticateLocataire } from "@/lib/tenantCredentials";
import { authenticateProprietaire } from "@/lib/ownerCredentials";
import { authenticateCompanyUser } from "@/lib/companyCredentials";
import { setPortalSession, getPortalSession } from "@/lib/authSession";

export default function ConnexionPage() {
  const router = useRouter();
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Prefetch all destination spaces in the background for instant transition
    router.prefetch("/app");
    router.prefetch("/locataire");
    router.prefetch("/proprietaire");

    // Only redirect if this specific tab already has an active session established
    const tabPortal = typeof window !== "undefined" ? sessionStorage.getItem("gestimmo_tab_portal") : null;
    if (tabPortal === "LOCATAIRE" && getPortalSession("LOCATAIRE")) {
      router.replace("/locataire");
    } else if (tabPortal === "PROPRIETAIRE" && getPortalSession("PROPRIETAIRE")) {
      router.replace("/proprietaire");
    } else if (tabPortal === "ADMIN" && getPortalSession("ADMIN")) {
      router.replace("/app");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    if (!loginInput.trim() || !passwordInput.trim()) {
      setErrorMsg("Veuillez saisir votre identifiant et mot de passe.");
      setIsLoading(false);
      return;
    }

    // Attempt Locataire authentication
    const tenant = authenticateLocataire(loginInput, passwordInput);

    if (tenant) {
      if (tenant.accountStatus === "Inactif") {
        setErrorMsg("Ce compte Espace Locataire a été désactivé. Veuillez contacter votre gestionnaire.");
        setIsLoading(false);
        return;
      }
      // Successfully authenticated locataire
      const tenantUser = {
        ...tenant,
        role: "Locataire"
      };
      setPortalSession("LOCATAIRE", tenantUser);
      router.replace("/locataire");
      return;
    }

    // Attempt Proprietaire authentication
    const owner = authenticateProprietaire(loginInput, passwordInput);

    if (owner) {
      if (owner.accountStatus === "Inactif") {
        setErrorMsg("Ce compte Espace Propriétaire a été désactivé. Veuillez contacter votre gestionnaire.");
        setIsLoading(false);
        return;
      }
      // Successfully authenticated proprietaire
      const ownerUser = {
        ...owner,
        role: "Propriétaire"
      };
      setPortalSession("PROPRIETAIRE", ownerUser);
      router.replace("/proprietaire");
      return;
    }

    // Attempt Company Users (Administrateurs, Gérants, Gestionnaires, Comptables, Agents de terrain) authentication
    const companyUser = authenticateCompanyUser(loginInput, passwordInput);

    if (companyUser) {
      if (companyUser.status === "Inactif") {
        setErrorMsg("Ce compte utilisateur a été désactivé. Veuillez contacter votre administrateur.");
        setIsLoading(false);
        return;
      }
      const isGerant = companyUser.role?.toUpperCase().includes("GÉRANT") || 
                       companyUser.role?.toUpperCase().includes("GERANT") ||
                       Boolean((companyUser as any).assignedLogements);
      const roleKey = isGerant ? "GERANT" : (companyUser.role?.toUpperCase() || "ADMIN");

      setPortalSession("ADMIN", { ...companyUser, userRole: roleKey });
      router.replace("/app");
      return;
    }

    // Strictly report authentication failure. Never promote unknown users to Administrateur.
    setErrorMsg("Identifiant ou mot de passe incorrect. Vérifiez vos identifiants ou contactez votre gestionnaire.");
    setIsLoading(false);
  };

  const handleDemoLogin = (type: "LOCATAIRE" | "PROPRIETAIRE" | "GERANT" | "ADMIN") => {
    if (type === "LOCATAIRE") {
      const demoTenant = {
        id: "T-892",
        name: "Cora Richards",
        email: "cora@email.com",
        phone: "+225 0102030405",
        login: "cora@email.com",
        unit: "A-101",
        property: "Résidence Les Flamboyants",
        rent: 165000,
        role: "Locataire",
        accountStatus: "Actif",
      };
      setPortalSession("LOCATAIRE", demoTenant);
      router.push("/locataire");
    } else if (type === "PROPRIETAIRE") {
      const demoOwner = {
        id: "O-123",
        name: "Kouadio Invest",
        code: "PR-KI-100123",
        type: "entreprise",
        email: "contact@kouadio-invest.com",
        phone: "+225 0102030405",
        login: "contact@kouadio-invest.com",
        role: "Propriétaire",
        accountStatus: "Actif",
      };
      setPortalSession("PROPRIETAIRE", demoOwner);
      router.push("/proprietaire");
    } else if (type === "GERANT") {
      const demoGerant = {
        id: "M-002",
        name: "Sarah Kone",
        role: "Gérante",
        phone: "+225 0708091011",
        email: "sarah@gestimmo.ci",
        login: "sarah@gestimmo.ci",
        status: "Actif",
        assignedLogements: ["A-101", "V-001"],
        gerantPermissions: { canViewReceipts: true, canManageContracts: true, canManageDocuments: true, canManageLogements: true },
      };
      setPortalSession("ADMIN", demoGerant);
      router.push("/app");
    } else {
      const demoAdmin = {
        id: "USR-001",
        name: "Kouassi Jean-Philippe",
        email: "jp.kouassi@immogestion-pro.ci",
        phone: "+225 07 01 02 03 04",
        login: "jp.kouassi@immogestion-pro.ci",
        role: "Administrateur",
        status: "Actif",
      };
      setPortalSession("ADMIN", demoAdmin);
      router.push("/app");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center text-3xl font-extrabold text-primary tracking-tight mb-6">
          GESTIMMO
        </Link>
        <h2 className="text-center text-2xl font-bold text-gray-900">Connectez-vous à votre espace</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ou <Link href="/inscription" className="font-medium text-primary hover:text-primary/80 transition-colors">créez un compte gratuitement</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          
          {errorMsg && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Identifiant, Email ou Téléphone
              </label>
              <div className="relative">
                <input 
                  id="email" 
                  name="email" 
                  type="text" 
                  required 
                  className="appearance-none block w-full px-3 py-2.5 pl-10 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-colors" 
                  placeholder="Ex: cora@email.com, contact@kouadio-invest.com ou sarah@gestimmo.ci" 
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  className="appearance-none block w-full px-3 py-2.5 pl-10 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-colors" 
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">Se souvenir de moi</label>
              </div>

              <div className="text-sm">
                <Link href="/mot-de-passe-oublie" className="font-medium text-primary hover:text-primary/80 transition-colors">Mot de passe oublié ?</Link>
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? "Connexion..." : "Se connecter"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 font-medium">Accès démo par espace</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleDemoLogin("LOCATAIRE")}
                className="inline-flex items-center justify-center py-2 px-3 border border-emerald-200 rounded-xl bg-emerald-50/50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" /> Espace Locataire
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("PROPRIETAIRE")}
                className="inline-flex items-center justify-center py-2 px-3 border border-amber-200 rounded-xl bg-amber-50/50 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <Building className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" /> Espace Propriétaire
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("GERANT")}
                className="inline-flex items-center justify-center py-2 px-3 border border-indigo-200 rounded-xl bg-indigo-50/50 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Building className="w-3.5 h-3.5 mr-1.5 text-indigo-600 shrink-0" /> Espace Gérant
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("ADMIN")}
                className="inline-flex items-center justify-center py-2 px-3 border border-primary/30 rounded-xl bg-primary-50/50 text-xs font-semibold text-primary hover:bg-primary-100 transition-colors cursor-pointer"
              >
                <Building className="w-3.5 h-3.5 mr-1.5 text-primary shrink-0" /> Administration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

