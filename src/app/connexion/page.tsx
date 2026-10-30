"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, AlertCircle } from "lucide-react";
import { authenticateLocataire } from "@/lib/tenantCredentials";
import { authenticateProprietaire } from "@/lib/ownerCredentials";
import { authenticateCompanyUser } from "@/lib/companyCredentials";
import { authenticateSuperAdmin, isAgencySuspendedForUser } from "@/lib/superAdminService";
import { setPortalSession, getPortalSession } from "@/lib/authSession";

export default function ConnexionPage() {
  const router = useRouter();
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    router.prefetch("/super-admin");
    router.prefetch("/app");
    router.prefetch("/locataire");
    router.prefetch("/proprietaire");

    const tabPortal = typeof window !== "undefined" ? sessionStorage.getItem("gestimmo_tab_portal") : null;
    if (tabPortal === "SUPER_ADMIN" && getPortalSession("SUPER_ADMIN")) {
      router.replace("/super-admin");
    } else if (tabPortal === "LOCATAIRE" && getPortalSession("LOCATAIRE")) {
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

    // 1. Authentification Super-Administrateur SaaS (Propriétaire de la plateforme GESTIMMO)
    const superAdmin = authenticateSuperAdmin(loginInput, passwordInput);
    if (superAdmin) {
      setPortalSession("SUPER_ADMIN", superAdmin, "SUPER_ADMIN");
      setPortalSession("ADMIN", { ...superAdmin, role: "Administrateur", userRole: "ADMIN" }, "ADMIN");
      router.replace("/super-admin");
      return;
    }

    // 2. Vérifier si l'agence est suspendue
    const suspensionCheck = isAgencySuspendedForUser(loginInput);
    if (suspensionCheck.suspended) {
      setErrorMsg(
        `L'abonnement de l'agence "${suspensionCheck.agencyName}" est actuellement suspendu ou expiré. Veuillez contacter le support GESTIMMO.`
      );
      setIsLoading(false);
      return;
    }

    // 3. Authentification Locataire
    const tenant = authenticateLocataire(loginInput, passwordInput);
    if (tenant) {
      if (tenant.accountStatus === "Inactif") {
        setErrorMsg("Ce compte Espace Locataire a été désactivé. Veuillez contacter votre gestionnaire.");
        setIsLoading(false);
        return;
      }
      const tenantUser = {
        ...tenant,
        role: "Locataire",
      };
      setPortalSession("LOCATAIRE", tenantUser);
      router.replace("/locataire");
      return;
    }

    // 4. Authentification Propriétaire
    const owner = authenticateProprietaire(loginInput, passwordInput);
    if (owner) {
      if (owner.accountStatus === "Inactif") {
        setErrorMsg("Ce compte Espace Propriétaire a été désactivé. Veuillez contacter votre gestionnaire.");
        setIsLoading(false);
        return;
      }
      const ownerUser = {
        ...owner,
        role: "Propriétaire",
      };
      setPortalSession("PROPRIETAIRE", ownerUser);
      router.replace("/proprietaire");
      return;
    }

    // 5. Authentification Agence / Collaborateurs (Administrateurs, Gérants, Gestionnaires, Comptables, Agents)
    const companyUser = authenticateCompanyUser(loginInput, passwordInput);
    if (companyUser) {
      if (companyUser.status === "Inactif") {
        setErrorMsg("Ce compte utilisateur ou l'abonnement de votre agence a été suspendu. Veuillez contacter l'administration.");
        setIsLoading(false);
        return;
      }
      const isGerant =
        companyUser.role?.toUpperCase().includes("GÉRANT") ||
        companyUser.role?.toUpperCase().includes("GERANT") ||
        Boolean((companyUser as any).assignedLogements);
      const roleKey = isGerant ? "GERANT" : companyUser.role?.toUpperCase() || "ADMIN";

      setPortalSession("ADMIN", { ...companyUser, userRole: roleKey });
      router.replace("/app");
      return;
    }

    setErrorMsg("Identifiant ou mot de passe incorrect. Vérifiez vos identifiants ou contactez votre gestionnaire.");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center text-3xl font-extrabold text-primary tracking-tight mb-6">
          GESTIMMO
        </Link>
        <h2 className="text-center text-2xl font-bold text-gray-900">Connectez-vous à votre espace</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ou{" "}
          <Link href="/inscription" className="font-medium text-primary hover:text-primary/80 transition-colors">
            créez un compte agence gratuitement
          </Link>
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
                  placeholder="Votre adresse email ou téléphone"
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
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Se souvenir de moi
                </label>
              </div>

              <div className="text-sm">
                <Link href="/mot-de-passe-oublie" className="font-medium text-primary hover:text-primary/80 transition-colors">
                  Mot de passe oublié ?
                </Link>
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
        </div>
      </div>
    </div>
  );
}
