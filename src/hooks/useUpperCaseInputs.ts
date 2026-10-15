"use client";

import { useEffect } from "react";

/**
 * Hook global qui force la mise en majuscule de toutes les saisies texte
 * dans les champs input et textarea de l'application.
 *
 * Exclusions automatiques :
 * - input[type="email"]    → les emails restent en minuscules (convention)
 * - input[type="password"] → les mots de passe ne sont pas modifiés
 * - input[type="number"], input[type="date"], input[type="month"], etc.
 * - Tout élément avec data-no-upper="true"
 */
export function useUpperCaseInputs() {
  useEffect(() => {
    const EXCLUDED_TYPES = new Set([
      "email",
      "password",
      "number",
      "date",
      "month",
      "time",
      "datetime-local",
      "range",
      "color",
      "file",
      "hidden",
      "checkbox",
      "radio",
      "submit",
      "reset",
      "button",
      "image",
    ]);

    // Flag pour éviter la boucle infinie lors du re-dispatch
    let isProcessing = false;

    function handleBeforeInput(event: Event) {
      if (isProcessing) return;

      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target) return;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      if (target instanceof HTMLInputElement && EXCLUDED_TYPES.has(target.type)) return;
      if (target.dataset.noUpper === "true") return;

      // Marquer temporairement pour éviter la re-entrée
      isProcessing = true;

      // Utiliser requestAnimationFrame pour appliquer après que React ait mis à jour le DOM
      requestAnimationFrame(() => {
        const upperValue = target.value.toUpperCase();
        if (target.value !== upperValue) {
          // Sauvegarder la position du curseur
          let start: number | null = null;
          let end: number | null = null;
          try {
            start = target.selectionStart;
            end = target.selectionEnd;
          } catch { /* certains types ne supportent pas selectionStart */ }

          // Modifier via le setter natif pour que React détecte le changement
          const proto =
            target instanceof HTMLInputElement
              ? window.HTMLInputElement.prototype
              : window.HTMLTextAreaElement.prototype;
          const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;

          if (nativeSetter) {
            nativeSetter.call(target, upperValue);
            target.dispatchEvent(new Event("input", { bubbles: true }));
            target.dispatchEvent(new Event("change", { bubbles: true }));
          }

          // Restaurer le curseur
          try {
            if (start !== null && end !== null) {
              target.setSelectionRange(start, end);
            }
          } catch { /* ignore */ }
        }
        isProcessing = false;
      });
    }

    document.addEventListener("input", handleBeforeInput, true);

    return () => {
      document.removeEventListener("input", handleBeforeInput, true);
    };
  }, []);
}
