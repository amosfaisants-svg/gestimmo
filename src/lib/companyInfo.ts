import { isSupabaseConfigured, DEFAULT_COMPANY_ID } from "./dataService";
import { supabase } from "./supabase";

export interface CompanyInfo {
  name: string;
  rccm: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
}

export const defaultCompanyInfo: CompanyInfo = {
  name: "ImmoGestion Pro",
  rccm: "CI-ABJ-03-2022-B12-12345",
  address: "Cocody II Plateaux, Vallons, Abidjan",
  phone: "0102030405",
  email: "contact@immogestion-pro.ci",
  logo: "",
};

export function getStoredCompanyInfo(): CompanyInfo {
  if (typeof window === "undefined") return defaultCompanyInfo;
  try {
    const raw = localStorage.getItem("gestimmo_company_info");
    const logo = localStorage.getItem("gestimmo_company_logo") || "";
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultCompanyInfo,
        ...parsed,
        logo: typeof parsed.logo === "string" ? parsed.logo : (logo || ""),
      };
    }
    if (logo) {
      return { ...defaultCompanyInfo, logo };
    }
  } catch (e) {
    console.error("Erreur lecture informations entreprise:", e);
  }
  return defaultCompanyInfo;
}

export async function fetchCompanyFromSupabase(): Promise<CompanyInfo | null> {
  if (!isSupabaseConfigured() || typeof window === "undefined") return null;
  try {
    const { data, error } = await (supabase.from("companies") as any)
      .select("*")
      .eq("id", DEFAULT_COMPANY_ID)
      .maybeSingle();

    if (error || !data) return null;

    const current = getStoredCompanyInfo();
    const merged: CompanyInfo = {
      name: data.name || current.name || defaultCompanyInfo.name,
      rccm: current.rccm || defaultCompanyInfo.rccm,
      address: data.address || current.address || defaultCompanyInfo.address,
      phone: data.phone || current.phone || defaultCompanyInfo.phone,
      email: data.email || current.email || defaultCompanyInfo.email,
      logo: current.logo || data.logo_url || "",
    };

    localStorage.setItem("gestimmo_company_info", JSON.stringify(merged));
    if (merged.logo) {
      localStorage.setItem("gestimmo_company_logo", merged.logo);
    }
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("gestimmo_company_updated", { detail: merged }));
    return merged;
  } catch (err) {
    console.warn("Erreur chargement entreprise depuis Supabase:", err);
    return null;
  }
}

export function saveStoredCompanyInfo(info: Partial<CompanyInfo>): CompanyInfo {
  if (typeof window === "undefined") return defaultCompanyInfo;
  const current = getStoredCompanyInfo();
  const updated: CompanyInfo = {
    ...current,
    ...info,
    name: info.name !== undefined ? String(info.name).trim() : current.name,
    rccm: info.rccm !== undefined ? String(info.rccm).trim() : current.rccm,
    address: info.address !== undefined ? String(info.address).trim() : current.address,
    phone: info.phone !== undefined ? String(info.phone).trim() : current.phone,
    email: info.email !== undefined ? String(info.email).trim() : current.email,
    logo: info.logo !== undefined ? String(info.logo) : current.logo,
  };

  try {
    localStorage.setItem("gestimmo_company_info", JSON.stringify(updated));
    if (updated.logo) {
      localStorage.setItem("gestimmo_company_logo", updated.logo);
    } else {
      localStorage.removeItem("gestimmo_company_logo");
    }
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("gestimmo_company_updated", { detail: updated }));
  } catch (e) {
    console.error("Erreur enregistrement informations entreprise (localStorage):", e);
  }

  // Synchronisation Supabase en arrière-plan sans bloquer l'interface
  if (isSupabaseConfigured()) {
    try {
      (supabase.from("companies") as any)
        .upsert(
          {
            id: DEFAULT_COMPANY_ID,
            name: updated.name || "ImmoGestion Pro",
            address: updated.address || null,
            phone: updated.phone || null,
            email: updated.email || null,
            logo_url: updated.logo ? (updated.logo.length < 500000 ? updated.logo : null) : null,
          },
          { onConflict: "id" }
        )
        .then(() => {
          // Sync OK
        })
        .catch((err: any) => {
          console.warn("Avertissement synchronisation Supabase company:", err);
        });
    } catch (err) {
      console.warn("Erreur d'appel Supabase company:", err);
    }
  }

  return updated;
}
