"use client";

import { useUpperCaseInputs } from "@/hooks/useUpperCaseInputs";

/**
 * Composant Provider à inclure dans les layouts.
 * Active automatiquement la mise en majuscule de toutes les saisies texte.
 * Il ne rend aucun élément visible — c'est un effet de bord uniquement.
 */
export function UpperCaseInputsProvider({ children }: { children: React.ReactNode }) {
  useUpperCaseInputs();
  return <>{children}</>;
}
