"use client";

import { useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { getPortalSession } from "@/lib/authSession";

export default function Home() {
  const router = useRouter();

  const performRedirect = () => {
    if (typeof window === "undefined") return;

    try {
      const tabPortal = sessionStorage.getItem("gestimmo_tab_portal");
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
    } catch {
      router.replace("/connexion");
    }
  };

  useLayoutEffect(() => {
    performRedirect();
  }, []);

  useEffect(() => {
    performRedirect();
  }, []);

  return (
    <>
      {/* Redirection synchrone immédiate (0ms) dès le parsing HTML avant même le chargement de React */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var tab = sessionStorage.getItem('gestimmo_tab_portal');
                var admin = localStorage.getItem('gestimmo_admin_user') || localStorage.getItem('gestimmo_current_user');
                var loc = localStorage.getItem('gestimmo_locataire_user');
                var prop = localStorage.getItem('gestimmo_proprietaire_user');

                if (tab === 'LOCATAIRE' && loc) { window.location.replace('/locataire'); return; }
                if (tab === 'PROPRIETAIRE' && prop) { window.location.replace('/proprietaire'); return; }
                if (tab === 'ADMIN' && admin) { window.location.replace('/app'); return; }

                if (admin) { window.location.replace('/app'); return; }
                if (loc) { window.location.replace('/locataire'); return; }
                if (prop) { window.location.replace('/proprietaire'); return; }

                window.location.replace('/connexion');
              } catch(e) {
                window.location.replace('/connexion');
              }
            })();
          `,
        }}
      />
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-700 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-md animate-pulse">
            G
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
            <span className="text-sm font-semibold text-gray-700">Connexion à votre espace...</span>
          </div>
        </div>
      </div>
    </>
  );
}
