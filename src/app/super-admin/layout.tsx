"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPortalSession } from "@/lib/authSession";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const session = getPortalSession("SUPER_ADMIN");
      return !!(session && session.user);
    }
    return true;
  });

  useEffect(() => {
    const session = getPortalSession("SUPER_ADMIN");
    if (!session || !session.user) {
      setIsAuthorized(false);
      router.replace("/connexion");
      return;
    }
    setIsAuthorized(true);
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-app-bg text-gray-500 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Chargement de la Console Super-Admin...</span>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen bg-app-bg text-gray-900 font-sans">{children}</div>;
}

