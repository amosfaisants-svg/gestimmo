"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarProprietaire from "@/components/layout/SidebarProprietaire";
import { getPortalSession } from "@/lib/authSession";

export default function ProprietaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const session = getPortalSession('PROPRIETAIRE');

    if (!session || !session.user) {
      router.replace("/connexion");
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg text-gray-500 font-sans">
        Chargement de l'espace propriétaire...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-app-bg text-gray-900 font-sans">
      <div className="hidden md:block">
        <SidebarProprietaire />
      </div>
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
