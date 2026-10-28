"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarLocataire from "@/components/layout/SidebarLocataire";
import { getPortalSession } from "@/lib/authSession";

export default function LocataireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const session = getPortalSession('LOCATAIRE');
      return !!(session && session.user);
    }
    return true;
  });

  useEffect(() => {
    const session = getPortalSession('LOCATAIRE');

    if (!session || !session.user) {
      setIsAuthorized(false);
      router.replace("/connexion");
      return;
    }

    setIsAuthorized(true);
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
      <div className="hidden md:block">
        <SidebarLocataire />
      </div>
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
