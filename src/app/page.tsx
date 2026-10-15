"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPortalSession } from "@/lib/authSession";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 1. Tab-level portal check
    const tabPortal = typeof window !== "undefined" ? sessionStorage.getItem("gestimmo_tab_portal") : null;
    if (tabPortal === "LOCATAIRE" && getPortalSession("LOCATAIRE")) {
      router.replace("/locataire");
      return;
    }
    if (tabPortal === "PROPRIETAIRE" && getPortalSession("PROPRIETAIRE")) {
      router.replace("/proprietaire");
      return;
    }
    if (tabPortal === "ADMIN" && getPortalSession("ADMIN")) {
      router.replace("/app");
      return;
    }

    // 2. Global portal check
    if (getPortalSession("ADMIN")) {
      router.replace("/app");
      return;
    }
    if (getPortalSession("LOCATAIRE")) {
      router.replace("/locataire");
      return;
    }
    if (getPortalSession("PROPRIETAIRE")) {
      router.replace("/proprietaire");
      return;
    }

    router.replace("/connexion");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-app-bg text-gray-500 font-sans">
      Redirection vers votre espace...
    </div>
  );
}

