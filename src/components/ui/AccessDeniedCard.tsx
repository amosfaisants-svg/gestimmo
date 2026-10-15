"use client";

import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AccessDeniedCardProps {
  title?: string;
  message?: string;
  moduleName?: string;
}

export function AccessDeniedCard({
  title = "Accès Restreint",
  message = "Vos droits d'accès actuels ne vous permettent pas de consulter ce module.",
  moduleName,
}: AccessDeniedCardProps) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-app-border shadow-sm text-center max-w-2xl mx-auto my-12 font-sans space-y-6">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          {message}
          {moduleName && <span className="block mt-1 font-semibold text-gray-700">Module : {moduleName}</span>}
        </p>
      </div>

      <div className="pt-4 border-t border-app-border flex justify-center">
        <Link
          href="/app"
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour au Tableau de bord
        </Link>
      </div>
    </div>
  );
}
