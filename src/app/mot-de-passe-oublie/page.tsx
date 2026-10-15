"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    // Simulation of password reset email sending
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center text-3xl font-extrabold text-primary tracking-tight mb-6">
          GESTIMMO
        </Link>
        <h2 className="text-center text-2xl font-bold text-gray-900">Mot de passe oublié ?</h2>
        <p className="mt-2 text-center text-sm text-gray-600 px-4">
          Entrez votre adresse email et nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Email de réinitialisation envoyé</h3>
              <p className="text-sm text-gray-600">
                Si un compte existe avec l'adresse <strong className="text-gray-900">{email}</strong>, un lien sécurisé de réinitialisation vient d'y être expédié.
              </p>
              <div className="pt-4">
                <Link
                  href="/connexion"
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la connexion
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email professionnel ou personnel</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900"
                    placeholder="contact@votre-domaine.com"
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
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi en cours...
                    </>
                  ) : (
                    "Envoyer le lien de réinitialisation"
                  )}
                </button>
              </div>

              <div className="text-center mt-4">
                <Link href="/connexion" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
