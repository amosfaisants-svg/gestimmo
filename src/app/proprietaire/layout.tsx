"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarProprietaire from "@/components/layout/SidebarProprietaire";
import { getPortalSession } from "@/lib/authSession";
import { recordOwnerLoginEvent } from "@/lib/ownerCredentials";

export default function ProprietaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const session = getPortalSession('PROPRIETAIRE');
      return !!(session && session.user);
    }
    return true;
  });

  useEffect(() => {
    const session = getPortalSession('PROPRIETAIRE');

    if (!session || !session.user) {
      setIsAuthorized(false);
      router.replace("/connexion");
      return;
    }

    setIsAuthorized(true);

    // Enregistrer la session active dans le journal de connexion (1 fois par onglet/session)
    if (typeof window !== "undefined") {
      const sessionLogKey = `gestimmo_owner_session_logged_${session.user.code || session.user.name || "active"}`;
      if (!sessionStorage.getItem(sessionLogKey)) {
        sessionStorage.setItem(sessionLogKey, "1");
      }
    }
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg text-gray-500 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Connexion en cours...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-app-bg text-gray-900 font-sans">
      <SidebarProprietaire />
      <main className="flex-1 h-screen overflow-y-auto pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
