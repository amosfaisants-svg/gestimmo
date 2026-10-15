"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserCheck, Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { setPortalSession } from "@/lib/authSession";

export default function ActiverComptePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 6) {
      setError("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Create active gerant session for Marc Dubois
      const activatedUser = {
        id: "M-003",
        name: "Marc Dubois",
        role: "Gérant",
        phone: "+225 0506070809",
        email: "marc@gestimmo.ci",
        login: "marc@gestimmo.ci",
        status: "Actif",
        assignedLogements: ["B-201"],
        gerantPermissions: { canViewReceipts: true, canManageContracts: true, canManageDocuments: true, canManageLogements: true },
      };

      setPortalSession("ADMIN", activatedUser);
      setIsLoading(false);
      setIsSuccess(true);

      setTimeout(() => {
        router.push("/app");
      }, 1000);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center text-3xl font-extrabold text-primary tracking-tight mb-6">
          GESTIMMO
        </Link>
        <h2 className="text-center text-2xl font-bold text-gray-900">Activer votre compte</h2>
        <p className="mt-2 text-center text-sm text-gray-600 px-4">
          Vous avez été invité(e) par <span className="font-semibold text-gray-900">ImmoGestion Pro</span> à rejoindre leur espace de gestion.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          {isSuccess ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Compte activé avec succès !</h3>
              <p className="text-xs text-gray-500">Redirection vers votre espace de gestion...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start">
                <UserCheck className="w-5 h-5 text-blue-600 mt-0.5 mr-3 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Bienvenue, Marc Dubois</p>
                  <p className="text-xs text-blue-700 mt-1">Veuillez définir votre mot de passe pour finaliser l'activation de votre compte Gérant.</p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Définir un mot de passe</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Minimum 6 caractères"
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password-confirm" className="block text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="password-confirm"
                    name="password-confirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    placeholder="Répétez le mot de passe"
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activation en cours...
                    </>
                  ) : (
                    "Activer mon compte"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
