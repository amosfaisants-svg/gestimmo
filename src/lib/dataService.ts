import { supabase } from './supabase';
import { Database } from './types/database';
import { getStoredVaultCredential, saveStoredVaultCredential } from './authSession';
import { sortPaymentsDesc, calculateTenantDelay } from './utils';

export type OwnerRow = Database['public']['Tables']['owners']['Row'];
export type PropertyRow = Database['public']['Tables']['properties']['Row'];
export type UnitRow = Database['public']['Tables']['units']['Row'];
export type TenantRow = Database['public']['Tables']['tenants']['Row'];
export type LeaseRow = Database['public']['Tables']['leases']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type PayoutRow = Database['public']['Tables']['payouts']['Row'];
export type LeaseNoticeRow = Database['public']['Tables']['lease_notices']['Row'];
export type IncidentRow = Database['public']['Tables']['incidents']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && url.startsWith('http'));
};

// Default Company ID for single-company app context
export const DEFAULT_COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const toUuid = (str: string | null | undefined): string | null => {
  if (!str) return null;
  const cleaned = String(str).trim();
  if (!cleaned) return null;
  if (uuidPattern.test(cleaned)) return cleaned;

  let hash1 = 5381, hash2 = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 << 5) - hash2 + char;
  }
  const h1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const h2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const h3 = Math.abs(hash1 ^ hash2).toString(16).padStart(8, '0');
  const lastBlock = (h2 + h3).slice(0, 12).padStart(12, '0');
  return `${h1.slice(0, 8)}-${h2.slice(0, 4)}-4${h3.slice(0, 3)}-8${h1.slice(0, 3)}-${lastBlock}`;
};

export const normalizeIncidentStatus = (st?: string) => {
  if (!st) return 'SIGNALÉ';
  const s = st.toUpperCase().replace(/\s+/g, '_');
  if (s.includes('RESOLU') || s.includes('RÉSOLU')) return 'RÉSOLU';
  if (s.includes('COURS')) return 'EN_COURS';
  return 'SIGNALÉ';
};

export const normalizeIncidentPriority = (p?: string, isUrgent?: boolean) => {
  if (isUrgent) return 'URGENTE';
  if (!p) return 'MOYENNE';
  const upper = p.toUpperCase();
  if (upper.includes('URG')) return 'URGENTE';
  if (upper.includes('FAIB')) return 'FAIBLE';
  return 'MOYENNE';
};

// 1. OWNERS / PROPRIÉTAIRES
export const fetchOwners = async (): Promise<OwnerRow[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('owners').select('*').order('full_name');
    if (error) {
      console.warn('Supabase fetchOwners error:', error);
      return [];
    }
    return (data as unknown as OwnerRow[]) || [];
  } catch (err) {
    console.error('fetchOwners failed:', err);
    return [];
  }
};

export const createOwner = async (owner: Database['public']['Tables']['owners']['Insert']): Promise<OwnerRow | null> => {
  if (!isSupabaseConfigured()) return null;
  const payload = { company_id: DEFAULT_COMPANY_ID, ...owner };
  const { data, error } = await supabase.from('owners').insert(payload as any).select().single();
  if (error) {
    console.error('createOwner error:', error);
    return null;
  }
  return data as unknown as OwnerRow;
};

export const updateOwner = async (id: string, updates: Database['public']['Tables']['owners']['Update']): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await (supabase.from('owners') as any).update(updates).eq('id', id);
  return !error;
};

export const deleteOwner = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('owners').delete().eq('id', id);
  return !error;
};

// 2. PROPERTIES / BIENS
export const fetchProperties = async (): Promise<PropertyRow[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('properties').select('*').order('name');
    if (error) {
      console.warn('Supabase fetchProperties error:', error);
      return [];
    }
    return (data as unknown as PropertyRow[]) || [];
  } catch (err) {
    console.error('fetchProperties failed:', err);
    return [];
  }
};

export const createProperty = async (property: Database['public']['Tables']['properties']['Insert']): Promise<PropertyRow | null> => {
  if (!isSupabaseConfigured()) return null;
  const payload = { company_id: DEFAULT_COMPANY_ID, ...property };
  const { data, error } = await supabase.from('properties').insert(payload as any).select().single();
  if (error) {
    console.error('createProperty error:', error);
    return null;
  }
  return data as unknown as PropertyRow;
};

export const updateProperty = async (id: string, updates: Database['public']['Tables']['properties']['Update']): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await (supabase.from('properties') as any).update(updates).eq('id', id);
  return !error;
};

export const deleteProperty = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('properties').delete().eq('id', id);
  return !error;
};

// 3. UNITS / LOGEMENTS
export const fetchUnits = async (): Promise<UnitRow[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('units').select('*').order('unit_number');
    if (error) {
      console.warn('Supabase fetchUnits error:', error);
      return [];
    }
    return (data as unknown as UnitRow[]) || [];
  } catch (err) {
    console.error('fetchUnits failed:', err);
    return [];
  }
};

export const createUnit = async (unit: Database['public']['Tables']['units']['Insert']): Promise<UnitRow | null> => {
  if (!isSupabaseConfigured()) return null;
  const payload = { company_id: DEFAULT_COMPANY_ID, ...unit };
  const { data, error } = await supabase.from('units').insert(payload as any).select().single();
  if (error) {
    console.error('createUnit error:', error);
    return null;
  }
  return data as unknown as UnitRow;
};

export const updateUnitStatus = async (id: string, status: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await (supabase.from('units') as any).update({ status }).eq('id', id);
  return !error;
};

export const updateUnit = async (id: string, updates: Database['public']['Tables']['units']['Update']): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await (supabase.from('units') as any).update(updates).eq('id', id);
  return !error;
};

export const deleteUnit = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('units').delete().eq('id', id);
  return !error;
};

// 4. TENANTS / LOCATAIRES
export const fetchTenants = async (): Promise<TenantRow[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('tenants').select('*').order('full_name');
    if (error) {
      console.warn('Supabase fetchTenants error:', error);
      return [];
    }
    return (data as unknown as TenantRow[]) || [];
  } catch (err) {
    console.error('fetchTenants failed:', err);
    return [];
  }
};

export const createTenant = async (tenant: Database['public']['Tables']['tenants']['Insert']): Promise<TenantRow | null> => {
  if (!isSupabaseConfigured()) return null;
  const payload = { company_id: DEFAULT_COMPANY_ID, ...tenant };
  const { data, error } = await supabase.from('tenants').insert(payload as any).select().single();
  if (error) {
    console.error('createTenant error:', error);
    return null;
  }
  return data as unknown as TenantRow;
};

export const updateTenant = async (id: string, updates: Database['public']['Tables']['tenants']['Update']): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await (supabase.from('tenants') as any).update(updates).eq('id', id);
  return !error;
};

export const deleteTenant = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('tenants').delete().eq('id', id);
  return !error;
};

// 5. LEASES / BAUX
export const fetchLeases = async (): Promise<LeaseRow[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('leases').select('*').order('start_date', { ascending: false });
    if (error) {
      console.warn('Supabase fetchLeases error:', error);
      return [];
    }
    return (data as unknown as LeaseRow[]) || [];
  } catch (err) {
    console.error('fetchLeases failed:', err);
    return [];
  }
};

export const createLease = async (lease: Database['public']['Tables']['leases']['Insert']): Promise<LeaseRow | null> => {
  if (!isSupabaseConfigured()) return null;
  const payload = { company_id: DEFAULT_COMPANY_ID, ...lease };
  const { data, error } = await supabase.from('leases').insert(payload as any).select().single();
  if (error) {
    console.error('createLease error:', error);
    return null;
  }
  return data as unknown as LeaseRow;
};

export const updateLease = async (id: string, updates: Database['public']['Tables']['leases']['Update']): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await (supabase.from('leases') as any).update(updates).eq('id', id);
  return !error;
};

export const deleteLease = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('leases').delete().eq('id', id);
  return !error;
};

// 6. PAYMENTS / ENCAISSEMENTS
export const fetchPayments = async (): Promise<PaymentRow[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('payments').select('*').order('payment_date', { ascending: false }).order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase fetchPayments error:', error);
      return [];
    }
    return (data as unknown as PaymentRow[]) || [];
  } catch (err) {
    console.error('fetchPayments failed:', err);
    return [];
  }
};

export const createPayment = async (payment: Database['public']['Tables']['payments']['Insert']): Promise<PaymentRow | null> => {
  if (!isSupabaseConfigured()) return null;
  const payload = { company_id: DEFAULT_COMPANY_ID, ...payment };
  const { data, error } = await supabase.from('payments').insert(payload as any).select().single();
  if (error) {
    console.error('createPayment error:', error);
    return null;
  }
  return data as unknown as PaymentRow;
};

export const updatePayment = async (id: string, updates: Database['public']['Tables']['payments']['Update']): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await (supabase.from('payments') as any).update(updates).eq('id', id);
  return !error;
};

export const deletePayment = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('payments').delete().eq('id', id);
  return !error;
};

// 7. PAYOUTS / REVERSEMENTS
export const fetchPayouts = async (): Promise<PayoutRow[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('payouts').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase fetchPayouts error:', error);
      return [];
    }
    return (data as unknown as PayoutRow[]) || [];
  } catch (err) {
    console.error('fetchPayouts failed:', err);
    return [];
  }
};

export const createPayout = async (payout: Database['public']['Tables']['payouts']['Insert']): Promise<PayoutRow | null> => {
  invalidateDatabaseCache();
  if (!isSupabaseConfigured()) return null;
  const repairsDeduction = Number((payout as any).repairs_deduction ?? payout.repairs_deducted) || 0;
  const cleanPayout: any = { ...payout };
  delete cleanPayout.repairs_deducted;
  cleanPayout.repairs_deduction = repairsDeduction;

  const payload = { company_id: DEFAULT_COMPANY_ID, ...cleanPayout };
  const { data, error } = await supabase.from('payouts').insert(payload as any).select().single();
  if (error) {
    console.error('createPayout error:', error);
    return null;
  }
  invalidateDatabaseCache();
  return data as unknown as PayoutRow;
};

export const updatePayout = async (id: string, updates: Database['public']['Tables']['payouts']['Update']): Promise<boolean> => {
  invalidateDatabaseCache();
  if (!isSupabaseConfigured()) return false;
  const { error } = await (supabase.from('payouts') as any).update(updates).eq('id', id);
  invalidateDatabaseCache();
  return !error;
};

export const deletePayout = async (id: string): Promise<boolean> => {
  invalidateDatabaseCache();
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("gestimmo_reversements");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((r: any) => r.id !== id);
          localStorage.setItem("gestimmo_reversements", JSON.stringify(filtered));
        }
      }
    } catch (e) {
      console.error("deletePayout localStorage cleanup error:", e);
    }
  }
  if (!isSupabaseConfigured()) return true;
  const { error } = await supabase.from('payouts').delete().eq('id', id);
  invalidateDatabaseCache();
  return !error;
};

// 8. LEASE NOTICES / PRÉAVIS
export const fetchLeaseNotices = async (): Promise<LeaseNoticeRow[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('lease_notices').select('*').order('notification_date', { ascending: false });
    if (error) {
      console.warn('Supabase fetchLeaseNotices error:', error);
      return [];
    }
    return (data as unknown as LeaseNoticeRow[]) || [];
  } catch (err) {
    console.error('fetchLeaseNotices failed:', err);
    return [];
  }
};

export const createLeaseNotice = async (notice: Database['public']['Tables']['lease_notices']['Insert']): Promise<LeaseNoticeRow | null> => {
  if (!isSupabaseConfigured()) return null;
  const payload = { company_id: DEFAULT_COMPANY_ID, ...notice };
  const { data, error } = await supabase.from('lease_notices').insert(payload as any).select().single();
  if (error) {
    console.error('createLeaseNotice error:', error);
    return null;
  }
  return data as unknown as LeaseNoticeRow;
};

export const updateLeaseNotice = async (id: string, updates: Database['public']['Tables']['lease_notices']['Update']): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await (supabase.from('lease_notices') as any).update(updates).eq('id', id);
  return !error;
};

export const deleteLeaseNotice = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('lease_notices').delete().eq('id', id);
  return !error;
};

// 9. INCIDENTS
export const fetchIncidents = async (): Promise<IncidentRow[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase fetchIncidents error:', error);
      return [];
    }
    return (data as unknown as IncidentRow[]) || [];
  } catch (err) {
    console.error('fetchIncidents failed:', err);
    return [];
  }
};

export const createIncident = async (incident: Database['public']['Tables']['incidents']['Insert'] | Record<string, any>): Promise<IncidentRow | null> => {
  if (!isSupabaseConfigured()) return null;
  const payload = { 
    company_id: DEFAULT_COMPANY_ID, 
    ...incident,
    files: incident.files || [],
    priority: normalizeIncidentPriority(incident.priority),
    status: normalizeIncidentStatus(incident.status),
  };
  const { data, error } = await supabase.from('incidents').insert(payload as any).select().single();
  if (error) {
    console.error('createIncident error:', error);
    return null;
  }
  return data as unknown as IncidentRow;
};

export const updateIncident = async (id: string, updates: Database['public']['Tables']['incidents']['Update'] | Record<string, any>): Promise<boolean> => {
  const normStatus = updates.status ? normalizeIncidentStatus(updates.status) : undefined;
  const normPriority = updates.priority ? normalizeIncidentPriority(updates.priority) : undefined;

  // Always update local cache immediately for reactive UI
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('gestimmo_incidents');
      if (stored) {
        const incidents: any[] = JSON.parse(stored);
        const updated = incidents.map((inc) => {
          if (inc.id === id) {
            let nextStatus = inc.status;
            if (normStatus) {
              nextStatus = normStatus === 'RÉSOLU' ? 'RÉSOLU' : normStatus === 'EN_COURS' ? 'EN COURS' : 'EN ATTENTE';
            }
            return {
              ...inc,
              ...updates,
              status: nextStatus,
              isUrgent: normPriority ? (normPriority === 'URGENTE') : inc.isUrgent,
            };
          }
          return inc;
        });
        localStorage.setItem('gestimmo_incidents', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('gestimmo_incidents_updated'));
      }
    } catch (e) {
      console.error('Error updating localStorage incidents:', e);
    }
  }

  if (!isSupabaseConfigured()) return true;

  const validUuid = uuidPattern.test(id) ? id : toUuid(id);
  if (!validUuid) return true;

  const payload: any = { ...updates };
  if (normStatus) payload.status = normStatus;
  if (normPriority) payload.priority = normPriority;
  if (updates.files !== undefined) payload.files = updates.files;

  const { error } = await (supabase.from('incidents') as any).update(payload).eq('id', validUuid);
  if (error) {
    console.error('updateIncident error in Supabase:', error);
    return false;
  }
  return true;
};

export const deleteIncident = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('incidents').delete().eq('id', id);
  return !error;
};

// 10. PROFILES / ÉQUIPE & UTILISATEURS
export const fetchProfiles = async (): Promise<ProfileRow[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');
    if (error) {
      console.warn('Supabase fetchProfiles error:', error);
      return [];
    }
    return (data as unknown as ProfileRow[]) || [];
  } catch (err) {
    console.error('fetchProfiles failed:', err);
    return [];
  }
};

export const createProfile = async (profile: Database['public']['Tables']['profiles']['Insert']): Promise<ProfileRow | null> => {
  if (!isSupabaseConfigured()) return null;
  const payload = { company_id: DEFAULT_COMPANY_ID, ...profile };
  const { data, error } = await supabase.from('profiles').insert(payload as any).select().single();
  if (error) {
    console.error('createProfile error:', error);
    return null;
  }
  return data as unknown as ProfileRow;
};

export const updateProfile = async (id: string, updates: Database['public']['Tables']['profiles']['Update']): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await (supabase.from('profiles') as any).update(updates).eq('id', id);
  return !error;
};

export const deleteProfile = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  return !error;
};

// Unified full database loader & sync helper
export interface FullDatabaseState {
  owners: any[];
  properties: any[];
  units: any[];
  tenants: any[];
  leases: any[];
  payments: any[];
  payouts: any[];
  incidents: any[];
  leaseNotices: any[];
  profiles: ProfileRow[];
}

let cachedDbState: FullDatabaseState | null = null;
let lastDbFetchTime = 0;
let inFlightDbPromise: Promise<FullDatabaseState | null> | null = null;
const CACHE_TTL_MS = 10000; // 10 secondes de cache mémoire pour fluidifier la navigation sans spammer Supabase

export const invalidateDatabaseCache = () => {
  cachedDbState = null;
  lastDbFetchTime = 0;
  inFlightDbPromise = null;
};

export const loadAllDataFromDatabase = async (forceRefresh = false): Promise<FullDatabaseState | null> => {
  if (!isSupabaseConfigured()) return null;

  const now = Date.now();
  if (!forceRefresh && cachedDbState && (now - lastDbFetchTime < CACHE_TTL_MS)) {
    return cachedDbState;
  }

  if (inFlightDbPromise) {
    return inFlightDbPromise;
  }

  inFlightDbPromise = (async () => {
    try {
    const getLocalFallback = (key: string) => {
      if (typeof window === "undefined") return [];
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
      } catch {
        return [];
      }
    };

    const existingOwners = getLocalFallback('gestimmo_proprietaires');
    const existingTenants = getLocalFallback('gestimmo_locataires');
    const existingEquipe = getLocalFallback('gestimmo_equipe');
    const existingIncidents = getLocalFallback('gestimmo_incidents');

    const [rawOwners, rawProperties, rawUnits, rawTenants, rawLeases, rawPayments, rawPayouts, rawIncidents, rawNotices, rawProfiles] = await Promise.all([
      fetchOwners(),
      fetchProperties(),
      fetchUnits(),
      fetchTenants(),
      fetchLeases(),
      fetchPayments(),
      fetchPayouts(),
      fetchIncidents(),
      fetchLeaseNotices(),
      fetchProfiles()
    ]);

    // Map Owners (preserving login, password and accountStatus)
    const owners = rawOwners.map((o) => {
      const localMatch = Array.isArray(existingOwners) 
        ? existingOwners.find((m: any) => m.id === o.id || (m.name && o.full_name && m.name.toLowerCase().trim() === o.full_name.toLowerCase().trim()) || (m.email && o.email && m.email.toLowerCase().trim() === o.email.toLowerCase().trim()))
        : null;

      const vaultLogin = getStoredVaultCredential(o.id, 'login');
      const vaultPass = getStoredVaultCredential(o.id, 'password');

      let finalLogin = localMatch?.login || vaultLogin || (o.email ? o.email.toLowerCase() : `bailleur.${o.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
      let finalPass = localMatch?.password || vaultPass;
      if (!finalPass || finalPass.includes('••••')) {
        finalPass = `Proprio${o.id.slice(0, 4)}!`;
      }

      saveStoredVaultCredential(o.id, 'login', finalLogin);
      saveStoredVaultCredential(o.id, 'password', finalPass);

      // Recover templates from localMatch or gestimmo_owner_${o.id}_templates
      let templates = localMatch?.templates;
      if (!templates && typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(`gestimmo_owner_${o.id}_templates`);
          if (cached) templates = JSON.parse(cached);
        } catch {}
      }

      return {
        id: o.id,
        code: o.id_card_number || `PR-${o.id.slice(0, 6)}`,
        type: localMatch?.type || "particulier",
        name: o.full_name,
        phone: o.phone || localMatch?.phone || "",
        email: o.email || localMatch?.email || "",
        address: o.address || localMatch?.address || "",
        commissionRate: (o.commission_rate !== undefined && o.commission_rate !== null) ? Number(o.commission_rate) : (localMatch?.commissionRate ?? 10),
        login: finalLogin,
        password: finalPass,
        accountStatus: localMatch?.accountStatus || "Actif",
        dateAdded: localMatch?.dateAdded || "01 Janv 2026",
        modeReversement: localMatch?.modeReversement || "Virement Bancaire (Mensuel)",
        nomBanque: localMatch?.nomBanque || "",
        rib: localMatch?.rib || "",
        dateNaissance: localMatch?.dateNaissance || "",
        lieuNaissance: localMatch?.lieuNaissance || "",
        cni: localMatch?.cni || o.id_card_number || "",
        etablieLe: localMatch?.etablieLe || "",
        dateCreation: localMatch?.dateCreation || "",
        templates: templates || undefined,
      };
    });

    // Map Properties
    const properties = rawProperties.map((p) => {
      const ownerObj = rawOwners.find((o) => o.id === p.owner_id);
      return {
        id: p.id,
        name: p.name,
        type: p.type === "IMMEUBLE" ? "Immeuble" : p.type === "VILLA" ? "Villa" : p.type,
        address: p.address || "",
        city: p.city || "Abidjan",
        owner: ownerObj ? ownerObj.full_name : "Inconnu",
        ownerId: p.owner_id || "",
        units: p.units_count || 1,
      };
    });

    // 0. Helper to check if string is UUID
    const isUUID = (str?: string) => {
      if (!str || typeof str !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
    };

    // Map Units with clean nomenclature fallback
    const propertyUnitCounters: Record<string, number> = {};
    const unitNomenclatureMap = new Map<string, string>();

    // Helper to read local units to preserve specific types if not encoded
    const localUnitsMap = new Map<string, any>();
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("gestimmo_logements");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item.id) localUnitsMap.set(item.id, item);
              if (item.unit) localUnitsMap.set(item.unit, item);
            });
          }
        }
      } catch (e) {}
    }

    const units = rawUnits.map((u) => {
      const propObj = rawProperties.find((p) => p.id === u.property_id);
      const ownerObj = propObj ? rawOwners.find((o) => o.id === propObj.owner_id) : null;
      const activeLease = rawLeases.find((l) => l.unit_id === u.id && (l.status === "ACTIF" || l.status === "EN_PRÉAVIS"));
      const tenantObj = activeLease ? rawTenants.find((t) => t.id === activeLease.tenant_id) : null;

      let uiStatus = "Occupé";
      if (activeLease) {
        uiStatus = activeLease.status === "EN_PRÉAVIS" ? "En préavis" : "Occupé";
      } else if (u.status === "VACANT") {
        uiStatus = "Vacant";
      } else if (u.status === "EN_PRÉAVIS") {
        uiStatus = "En préavis";
      } else if (u.status === "EN_MAINTENANCE") {
        uiStatus = "En maintenance";
      } else if (u.status === "OCCUPÉ") {
        uiStatus = "Occupé";
      } else {
        uiStatus = "Vacant";
      }

      let uiType = "Appartement";
      const rawUType = (u.type || "").toUpperCase();
      if (rawUType === "STUDIO") uiType = "Studio";
      else if (rawUType === "MAGASIN" || rawUType === "BOUTIQUE") uiType = "Magasin";
      else if (rawUType === "VILLA") uiType = "Villa";
      else if (rawUType === "BUREAU") uiType = "Bureau";

      let cleanDescription = u.description || "";
      if (cleanDescription.startsWith("[TYPE:") && cleanDescription.includes("]")) {
        const match = cleanDescription.match(/^\[TYPE:\s*([^\]]+)\]\s*([\s\S]*)$/);
        if (match) {
          uiType = match[1].trim();
          cleanDescription = match[2].trim();
        }
      } else {
        const localMatch = localUnitsMap.get(u.id) || (u.unit_number ? localUnitsMap.get(u.unit_number) : null);
        if (localMatch && localMatch.type && localMatch.type !== "-" && localMatch.type !== "Appartement") {
          uiType = localMatch.type;
        }
      }

      const propKey = u.property_id || "default";
      propertyUnitCounters[propKey] = (propertyUnitCounters[propKey] || 0) + 1;
      const unitIndex = propertyUnitCounters[propKey];

      let rawUnitNum = u.unit_number;
      if (!rawUnitNum || isUUID(rawUnitNum) || rawUnitNum.length > 25) {
        rawUnitNum = `${uiType} ${unitIndex}`;
      } else {
        const trimmed = rawUnitNum.trim();
        const lower = trimmed.toLowerCase();
        if (
          lower.startsWith("appartement") ||
          lower.startsWith("studio") ||
          lower.startsWith("villa") ||
          lower.startsWith("magasin") ||
          lower.startsWith("bureau") ||
          lower.startsWith("chambre") ||
          lower.startsWith("porte")
        ) {
          rawUnitNum = trimmed;
        } else {
          rawUnitNum = `${uiType} ${trimmed}`;
        }
      }

      unitNomenclatureMap.set(u.id, rawUnitNum);
      if (u.unit_number) unitNomenclatureMap.set(u.unit_number, rawUnitNum);

      return {
        id: u.id,
        unit: rawUnitNum,
        name: rawUnitNum,
        unit_number: u.unit_number || rawUnitNum,
        property: propObj ? propObj.name : "Inconnu",
        propertyId: u.property_id || "",
        owner: ownerObj ? ownerObj.full_name : "Inconnu",
        ownerId: propObj?.owner_id || "",
        type: uiType,
        rent: Number(u.rent_amount) || 0,
        charges: Number(u.charges_amount) || 0,
        status: uiStatus,
        tenant: tenantObj ? tenantObj.full_name : "-",
        tenantId: activeLease?.tenant_id || "",
        leaseId: activeLease?.id || "",
        description: cleanDescription,
      };
    });

    const getCleanUnitLabel = (unitId?: string | null, rawFallback?: string | null) => {
      if (unitId && unitNomenclatureMap.has(unitId)) {
        return unitNomenclatureMap.get(unitId)!;
      }
      if (rawFallback && unitNomenclatureMap.has(rawFallback)) {
        return unitNomenclatureMap.get(rawFallback)!;
      }
      if (rawFallback && !isUUID(rawFallback) && rawFallback.length <= 25) {
        return rawFallback;
      }
      if (unitId && !isUUID(unitId) && unitId.length <= 25) {
        return unitId;
      }
      return "-";
    };

    // Map Tenants (preserving login, password and accountStatus)
    const tenants = rawTenants.map((t) => {
      const activeLease = rawLeases.find((l) => l.tenant_id === t.id && (l.status === "ACTIF" || l.status === "EN_PRÉAVIS"));
      const unitObj = activeLease ? rawUnits.find((u) => u.id === activeLease.unit_id) : null;
      const propObj = unitObj ? rawProperties.find((p) => p.id === unitObj.property_id) : null;
      const ownerObj = propObj ? rawOwners.find((o) => o.id === propObj.owner_id) : null;

      const localMatch = Array.isArray(existingTenants)
        ? existingTenants.find((m: any) => m.id === t.id || (m.name && t.full_name && m.name.toLowerCase().trim() === t.full_name.toLowerCase().trim()) || (m.email && t.email && m.email.toLowerCase().trim() === t.email.toLowerCase().trim()))
        : null;

      const vaultLogin = getStoredVaultCredential(t.id, 'login');
      const vaultPass = getStoredVaultCredential(t.id, 'password');

      let finalLogin = localMatch?.login || vaultLogin || (t.email ? t.email.toLowerCase() : `locataire.${t.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
      let finalPass = localMatch?.password || vaultPass;
      if (!finalPass || finalPass.includes('••••')) {
        finalPass = `Locat${t.id.slice(0, 4)}!`;
      }

      saveStoredVaultCredential(t.id, 'login', finalLogin);
      saveStoredVaultCredential(t.id, 'password', finalPass);

      const delayInfo = calculateTenantDelay(
        { id: t.id, name: t.full_name },
        activeLease,
        rawPayments
      );

      let computedStatus = "EN ATTENTE";
      if (activeLease) {
        computedStatus = delayInfo.isOverdue ? "EN RETARD" : "À JOUR";
      } else if (localMatch?.status) {
        computedStatus = localMatch.status;
      }

      return {
        id: t.id,
        name: t.full_name,
        email: t.email || localMatch?.email || "",
        phone: t.phone || localMatch?.phone || "",
        profession: t.profession || localMatch?.profession || "",
        unit: getCleanUnitLabel(activeLease?.unit_id, unitObj ? unitObj.unit_number : "-"),
        property: propObj ? propObj.name : "-",
        owner: ownerObj ? ownerObj.full_name : "-",
        status: computedStatus,
        unpaidMonths: delayInfo.unpaidMonths,
        unpaidAmount: delayInfo.unpaidAmount,
        unpaidPeriods: delayInfo.unpaidPeriods,
        lastPaidPeriod: delayInfo.lastPaidPeriod,
        delayDays: delayInfo.delayDays,
        rent: activeLease ? (Number(activeLease.rent_amount) || 0) : (localMatch?.rent || 0),
        login: finalLogin,
        password: finalPass,
        accountStatus: localMatch?.accountStatus || "Actif",
        dateAdded: localMatch?.dateAdded || "01 Janv 2026",
      };
    });

    // Map Leases
    const leases = rawLeases.map((l) => {
      const tenantObj = rawTenants.find((t) => t.id === l.tenant_id);
      const unitObj = rawUnits.find((u) => u.id === l.unit_id);
      const propObj = unitObj ? rawProperties.find((p) => p.id === unitObj.property_id) : null;
      const ownerObj = propObj ? rawOwners.find((o) => o.id === propObj.owner_id) : null;

      const leaseYear = l.start_date ? new Date(l.start_date).getFullYear() : 2026;
      const leaseCode = (l as any).code || (l as any).lease_number || `B-${leaseYear}-${l.id.slice(0, 6).toUpperCase()}`;

      const rentAmount = Number(l.rent_amount) || 0;
      const chargesAmount = Number(l.charges_amount) || 0;
      const depositAmount = Number(l.deposit_amount) || 0;
      const monthlyTotal = rentAmount + chargesAmount;

      let avanceMonths = l.avance_months !== null && l.avance_months !== undefined 
        ? Number(l.avance_months) 
        : ((l as any).avanceMonths !== undefined ? Number((l as any).avanceMonths) : 0);
      let cautionMonths = l.caution_months !== null && l.caution_months !== undefined 
        ? Number(l.caution_months) 
        : ((l as any).cautionMonths !== undefined ? Number((l as any).cautionMonths) : 0);

      // Si non renseignés directement mais qu'un montant de dépôt existe (ex: 400 000 F CFA pour loyer 100 000 F CFA)
      if (avanceMonths === 0 && cautionMonths === 0 && depositAmount > 0 && monthlyTotal > 0) {
        const totalMonths = Math.round(depositAmount / monthlyTotal);
        if (totalMonths >= 2) {
          avanceMonths = Math.floor(totalMonths / 2);
          cautionMonths = totalMonths - avanceMonths;
        } else {
          cautionMonths = totalMonths;
        }
      }

      return {
        id: l.id,
        code: leaseCode,
        tenant: tenantObj ? tenantObj.full_name : "Inconnu",
        tenantId: l.tenant_id || "",
        unit: getCleanUnitLabel(l.unit_id, unitObj ? unitObj.unit_number : "Inconnu"),
        unitId: l.unit_id || "",
        property: propObj ? propObj.name : "Inconnu",
        propertyId: propObj ? propObj.id : (unitObj ? unitObj.property_id : ""),
        owner: ownerObj ? ownerObj.full_name : "Inconnu",
        ownerId: propObj?.owner_id || (ownerObj ? ownerObj.id : ""),
        rent: rentAmount,
        charges: chargesAmount,
        deposit: depositAmount > 0 ? depositAmount : (avanceMonths + cautionMonths) * monthlyTotal,
        avanceMonths,
        cautionMonths,
        status: l.status || "ACTIF",
        start: l.start_date ? new Date(l.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
        end: l.end_date ? new Date(l.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
        startDate: l.start_date || "",
        endDate: l.end_date || "",
      };
    });

    // Map Payments
    const payments = rawPayments.map((pm) => {
      const tenantObj = rawTenants.find((t) => t.id === pm.tenant_id);
      const unitObj = rawUnits.find((u) => u.id === pm.unit_id);
      const propObj = unitObj ? rawProperties.find((p) => p.id === unitObj.property_id) : null;
      const ownerObj = propObj ? rawOwners.find((o) => o.id === propObj.owner_id) : null;

      let methodStr = "Mobile Money";
      if (pm.payment_method === "ESPÈCES") methodStr = "Espèces";
      else if (pm.payment_method === "VIREMENT") methodStr = "Virement";
      else if (pm.payment_method === "CHÈQUE") methodStr = "Chèque";
      else if (pm.payment_method === "WAVE") methodStr = "Wave";
      else if (pm.payment_method === "ORANGE_MONEY") methodStr = "Orange Money";
      else if (pm.payment_method === "MTN_MOMO") methodStr = "MTN MoMo";
      else if (pm.payment_method === "MOOV_MONEY") methodStr = "Moov Money";

      const payCode = (pm as any).code || (pm as any).receipt_number || (pm.id.length > 20 ? `REC-${pm.id.slice(0, 8).toUpperCase()}` : pm.id);
      return {
        id: pm.id,
        code: payCode,
        leaseId: pm.lease_id,
        tenant: tenantObj ? tenantObj.full_name : "Inconnu",
        tenantId: pm.tenant_id,
        unit: getCleanUnitLabel(pm.unit_id, unitObj ? unitObj.unit_number : "Inconnu"),
        unitId: pm.unit_id,
        property: propObj ? propObj.name : "Inconnu",
        propertyId: propObj ? propObj.id : (unitObj ? unitObj.property_id : ""),
        owner: ownerObj ? ownerObj.full_name : "Inconnu",
        ownerId: propObj?.owner_id || (ownerObj ? ownerObj.id : ""),
        date: pm.payment_date,
        payment_date: pm.payment_date,
        created_at: pm.created_at,
        createdAt: pm.created_at,
        period: pm.period_month,
        amount: (() => {
          const rawAmt = Number(pm.amount) || 0;
          let cleanAmt = Math.round(rawAmt);
          if (Math.abs(cleanAmt - Math.round(cleanAmt / 1000) * 1000) < 10) {
            cleanAmt = Math.round(cleanAmt / 1000) * 1000;
          }
          return cleanAmt;
        })(),
        method: methodStr,
        status: pm.status === "PAYÉ" ? "VALIDÉ" : pm.status,
        receiptNumber: pm.receipt_number || payCode,
      };
    });

    // Map Payouts
    const payouts = rawPayouts.map((po) => {
      const ownerObj = rawOwners.find((o) => o.id === po.owner_id);
      const ownerProp = rawProperties.find((p) => p.owner_id === po.owner_id);

      const rawGross = Number(po.gross_amount) || 0;
      let cleanGross = Math.round(rawGross);
      if (Math.abs(cleanGross - Math.round(cleanGross / 1000) * 1000) < 10) {
        cleanGross = Math.round(cleanGross / 1000) * 1000;
      }

      const rawNet = Number(po.net_amount) || 0;
      let cleanNet = Math.round(rawNet);
      if (Math.abs(cleanNet - Math.round(cleanNet / 1000) * 1000) < 10) {
        cleanNet = Math.round(cleanNet / 1000) * 1000;
      }

      return {
        id: po.id,
        period: po.period_month,
        owner: ownerObj ? ownerObj.full_name : "Inconnu",
        ownerId: po.owner_id,
        property: ownerProp ? ownerProp.name : "Multi-biens",
        bien: ownerProp ? ownerProp.name : "Tous les biens",
        logement: "Tous les logements",
        collected: cleanGross,
        commission: Number(po.agency_commission) || 0,
        repairs: Number(po.repairs_deduction) || 0,
        amount: cleanNet,
        status: "EFFECTUÉ",
        payment_method: po.payment_method,
        method: po.payment_method || "Virement bancaire",
        date: po.created_at ? po.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        reference: `VIR-${po.id.slice(0, 6).toUpperCase()}`,
        gerant: "Direction GESTIMMO",
      };
    });

    // Map Incidents
    const incidents = rawIncidents.map((inc) => {
      const localMatch = Array.isArray(existingIncidents)
        ? existingIncidents.find((m: any) => m.id === inc.id || (m.title === inc.title && m.description === inc.description))
        : null;

      const tenantObj = rawTenants.find((t) => t.id === inc.tenant_id);
      let unitObj = rawUnits.find((u) => u.id === inc.unit_id);
      if (!unitObj && inc.tenant_id) {
        const activeLease = rawLeases.find((l) => l.tenant_id === inc.tenant_id && l.status === "ACTIF");
        if (activeLease && activeLease.unit_id) {
          unitObj = rawUnits.find((u) => u.id === activeLease.unit_id);
        }
      }
      const propObj = unitObj ? rawProperties.find((p) => p.id === unitObj.property_id) : null;
      const incidentTitle = inc.title || (inc as any).type || "Incident";

      // Robust file array extraction (merges Supabase and local additions seamlessly)
      const rawFiles = (inc as any).files;
      let incFiles: any[] = [];
      if (Array.isArray(rawFiles)) {
        incFiles = [...rawFiles];
      }
      if (Array.isArray(localMatch?.files)) {
        localMatch.files.forEach((lf: any) => {
          if (!lf) return;
          const alreadyExists = incFiles.some((f: any) => 
            (f.name && lf.name && f.name === lf.name) || 
            (f.dataUrl && lf.dataUrl && f.dataUrl === lf.dataUrl) ||
            (f.url && lf.url && f.url === lf.url)
          );
          if (!alreadyExists) {
            incFiles.push(lf);
          }
        });
      }

      return {
        id: inc.id,
        tenant: tenantObj ? tenantObj.full_name : (localMatch?.tenant || "Inconnu"),
        tenantId: inc.tenant_id,
        unit: getCleanUnitLabel(unitObj?.id || inc.unit_id, unitObj ? unitObj.unit_number : (localMatch?.unit || "Inconnu")),
        unitId: unitObj?.id || inc.unit_id,
        property: propObj ? propObj.name : (localMatch?.property || "Inconnu"),
        title: incidentTitle,
        type: incidentTitle,
        description: inc.description || "",
        isUrgent: inc.priority === "HAUTE" || inc.priority === "URGENTE",
        priority: inc.priority || "MOYENNE",
        status: inc.status === "RÉSOLU" ? "RÉSOLU" : inc.status === "EN_COURS" ? "EN COURS" : "EN ATTENTE",
        cost: Number(inc.cost) || 0,
        files: incFiles,
        createdAt: inc.created_at || localMatch?.createdAt,
        dateStr: inc.created_at ? new Date(inc.created_at).toLocaleDateString('fr-FR') : (localMatch?.dateStr || ""),
      };
    });

    // Merge any locally created incidents not yet synced
    if (Array.isArray(existingIncidents)) {
      existingIncidents.forEach((li: any) => {
        if (li && li.id && !incidents.some((i) => i.id === li.id)) {
          incidents.push(li);
        }
      });
    }

    // Map Notices
    const leaseNotices = rawNotices.map((n) => {
      const tenantObj = rawTenants.find((t) => t.id === n.tenant_id);
      const unitObj = rawUnits.find((u) => u.id === n.unit_id);
      const propObj = unitObj ? rawProperties.find((p) => p.id === unitObj.property_id) : null;

      return {
        id: n.id,
        leaseId: n.lease_id,
        tenant: tenantObj ? tenantObj.full_name : "Inconnu",
        tenantId: n.tenant_id,
        unit: getCleanUnitLabel(n.unit_id, unitObj ? unitObj.unit_number : "Inconnu"),
        unitId: n.unit_id,
        property: propObj ? propObj.name : "Inconnu",
        notificationDate: n.notification_date,
        effectiveExitDate: n.effective_exit_date,
        noticeMonths: n.notice_months || 1,
        initiative: n.initiative || "LOCATAIRE",
        reason: n.reason || "",
        depositRefunded: Number(n.deposit_refunded) || 0,
        repairsDeducted: Number(n.repairs_deducted) || 0,
        status: n.status || "EN_PRÉAVIS",
      };
    });

    const localRev = getLocalFallback('gestimmo_reversements');
    const finalPayouts = [...payouts];
    if (!isSupabaseConfigured() || payouts.length === 0) {
      localRev.forEach((lr: any) => {
        if (lr && lr.id) {
          let cleanAmt = typeof lr.amount === "number" ? lr.amount : parseFloat(String(lr.amount || 0).replace(/[^0-9.-]+/g, ""));
          if (isNaN(cleanAmt)) cleanAmt = 0;
          cleanAmt = Math.round(cleanAmt);
          if (Math.abs(cleanAmt - Math.round(cleanAmt / 1000) * 1000) < 10) {
            cleanAmt = Math.round(cleanAmt / 1000) * 1000;
          }

          let cleanColl = typeof lr.collected === "number" ? lr.collected : parseFloat(String(lr.collected || 0).replace(/[^0-9.-]+/g, ""));
          if (isNaN(cleanColl)) cleanColl = 0;
          cleanColl = Math.round(cleanColl);
          if (Math.abs(cleanColl - Math.round(cleanColl / 1000) * 1000) < 10) {
            cleanColl = Math.round(cleanColl / 1000) * 1000;
          }

          const updatedLr = { ...lr, amount: cleanAmt, collected: cleanColl };
          const idx = finalPayouts.findIndex((p: any) => p.id === lr.id);
          if (idx >= 0) {
            finalPayouts[idx] = updatedLr;
          } else {
            finalPayouts.push(updatedLr);
          }
        }
      });
    } else {
      // When Supabase is configured and has payouts, Supabase is the definitive source of truth!
      // Purge any legacy/ghost R- records from localStorage so they don't corrupt history or calculations
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("gestimmo_reversements");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((lr: any) => lr && lr.id && !String(lr.id).startsWith("R-"));
              if (cleaned.length !== parsed.length) {
                localStorage.setItem("gestimmo_reversements", JSON.stringify(cleaned));
              }
            }
          }
        } catch (e) {
          console.error("Cleanup ghost reversements error:", e);
        }
      }
    }

    const state: FullDatabaseState = {
      owners,
      properties,
      units,
      tenants,
      leases,
      payments: sortPaymentsDesc(payments),
      payouts: finalPayouts,
      incidents,
      leaseNotices,
      profiles: rawProfiles
    };

    // Synchronize to localStorage for offline / fast synchronous render fallback
    if (typeof window !== 'undefined') {
      const existingEquipe = getLocalFallback('gestimmo_equipe');
      const equipeList = rawProfiles.map((p) => {
        const localMatch = Array.isArray(existingEquipe) ? existingEquipe.find((m: any) => m.id === p.id || m.email?.toLowerCase() === p.email?.toLowerCase()) : null;
        let realPassword = localMatch?.password;
        if (!realPassword || realPassword.includes('••••')) {
          realPassword = getStoredVaultCredential(p.id, 'password') || 'Gest1234!';
        }
        saveStoredVaultCredential(p.id, 'password', realPassword);

        return {
          id: p.id,
          name: p.full_name,
          role: p.role === 'ADMINISTRATEUR' ? 'Super Admin' : p.role === 'COMPTABLE' ? 'Comptable' : p.role === 'AGENT_TERRAIN' ? 'Agent de terrain' : 'Gérant',
          phone: p.phone || '',
          email: p.email,
          login: p.email,
          password: realPassword,
          status: localMatch?.status || 'Actif',
          propertiesCount: localMatch?.propertiesCount || 0,
          performance: localMatch?.performance || 0,
          collected: localMatch?.collected || 0,
          assignedLogements: localMatch?.assignedLogements || [],
          gerantPermissions: localMatch?.gerantPermissions || p.permissions || { canViewReceipts: true, canManageContracts: true, canManageDocuments: true, canManageLogements: true }
        };
      });

      localStorage.setItem('gestimmo_equipe', JSON.stringify(equipeList));
      localStorage.setItem('gestimmo_proprietaires', JSON.stringify(owners));
      localStorage.setItem('gestimmo_biens', JSON.stringify(properties));
      localStorage.setItem('gestimmo_logements', JSON.stringify(units));
      localStorage.setItem('gestimmo_locataires', JSON.stringify(tenants));
      localStorage.setItem('gestimmo_baux', JSON.stringify(leases));
      localStorage.setItem('gestimmo_paiements', JSON.stringify(payments));
      localStorage.setItem('gestimmo_reversements', JSON.stringify(finalPayouts));
      localStorage.setItem('gestimmo_incidents', JSON.stringify(incidents));
      localStorage.setItem('gestimmo_preavis', JSON.stringify(leaseNotices));

      // Synchronize company info from Supabase
      if (isSupabaseConfigured()) {
        (supabase.from("companies") as any)
          .select("*")
          .eq("id", DEFAULT_COMPANY_ID)
          .maybeSingle()
          .then(({ data }: any) => {
            if (data && typeof window !== "undefined") {
              try {
                const currentRaw = localStorage.getItem("gestimmo_company_info");
                const current = currentRaw ? JSON.parse(currentRaw) : {};
                const merged = {
                  ...current,
                  name: data.name || current.name || "ImmoGestion Pro",
                  address: data.address || current.address || "",
                  phone: data.phone || current.phone || "",
                  email: data.email || current.email || "",
                  logo: current.logo || data.logo_url || "",
                };
                localStorage.setItem("gestimmo_company_info", JSON.stringify(merged));
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new CustomEvent("gestimmo_company_updated", { detail: merged }));
              } catch (e) {}
            }
          })
          .catch(() => {});
      }
    }

      cachedDbState = state;
      lastDbFetchTime = Date.now();
      return state;
    } catch (err) {
      console.error('loadAllDataFromDatabase error:', err);
      return null;
    } finally {
      inFlightDbPromise = null;
    }
  })();

  return inFlightDbPromise;
};

/**
 * Helper to safely extract an array from a JSON string or object.
 */
const getRestoreArray = (val: any): any[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeLeaseStatus = (st?: string) => {
  if (!st) return 'ACTIF';
  const s = st.toUpperCase().replace(/\s+/g, '_');
  if (s.includes('PREAVIS') || s.includes('PRÉAVIS')) return 'EN_PRÉAVIS';
  if (s.includes('RESILIE') || s.includes('RÉSILIÉ')) return 'RÉSILIÉ';
  if (s.includes('EXPIRE') || s.includes('EXPIRÉ')) return 'EXPIRÉ';
  return 'ACTIF';
};

const normalizePaymentStatus = (st?: string) => {
  if (!st) return 'PAYÉ';
  const s = st.toUpperCase().replace(/\s+/g, '_');
  if (s === 'VALIDÉ' || s === 'VALIDE' || s === 'PAYÉ' || s === 'PAYE') return 'PAYÉ';
  if (s.includes('RETARD')) return 'EN_RETARD';
  if (s.includes('ATTENTE')) return 'EN_ATTENTE';
  if (s.includes('IMPAYE') || s.includes('IMPAYÉ')) return 'IMPAYÉ';
  if (s.includes('AVANCE')) return 'PAYÉ_D_AVANCE';
  return 'PAYÉ';
};

const normalizeProfileRole = (r?: string) => {
  if (!r) return 'GESTIONNAIRE';
  const upper = r.toUpperCase();
  if (upper.includes('ADMIN')) return 'ADMINISTRATEUR';
  if (upper.includes('COMPTA')) return 'COMPTABLE';
  if (upper.includes('AGENT') || upper.includes('TERRAIN')) return 'AGENT_TERRAIN';
  if (upper.includes('LOCATAIRE')) return 'LOCATAIRE';
  if (upper.includes('PROPRIETAIRE') || upper.includes('PROPRIÉTAIRE')) return 'PROPRIETAIRE';
  return 'GESTIONNAIRE';
};

const normalizeUnitStatus = (st?: string) => {
  if (!st) return 'VACANT';
  const s = st.toUpperCase().replace(/\s+/g, '_');
  if (s.includes('OCCUP')) return 'OCCUPÉ';
  if (s.includes('PREAVIS') || s.includes('PRÉAVIS')) return 'EN_PRÉAVIS';
  if (s.includes('MAINTENANCE')) return 'EN_MAINTENANCE';
  return 'VACANT';
};

const normalizeUnitType = (t?: string) => {
  if (!t) return 'APPARTEMENT';
  const upper = t.toUpperCase();
  if (upper.includes('STUDIO')) return 'STUDIO';
  if (upper.includes('MAGASIN') || upper.includes('BOUTIQUE') || upper.includes('LOCAL')) return 'MAGASIN';
  if (upper.includes('VILLA')) return 'VILLA';
  if (upper.includes('BUREAU')) return 'BUREAU';
  return 'APPARTEMENT';
};

const normalizePropertyType = (t?: string) => {
  if (!t) return 'IMMEUBLE';
  const upper = t.toUpperCase();
  if (upper.includes('VILLA')) return 'VILLA';
  return 'IMMEUBLE';
};

/**
 * Synchronize restored archive data into Supabase tables if configured.
 */
export const syncRestoredDataToSupabase = async (storageObj?: Record<string, any>): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  let targetStorage = storageObj;
  if (!targetStorage && typeof window !== "undefined") {
    targetStorage = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("gestimmo_")) {
        const val = localStorage.getItem(key);
        if (val !== null) targetStorage[key] = val;
      }
    }
  }

  if (!targetStorage || Object.keys(targetStorage).length === 0) return false;

  try {
    // 0. Ensure Company Record exists to satisfy FK constraints
    const { error: companyErr } = await (supabase.from("companies") as any).upsert(
      {
        id: DEFAULT_COMPANY_ID,
        name: "ImmoGestion Pro",
      },
      { onConflict: "id" }
    );
    if (companyErr) console.warn("Supabase sync: company upsert warning:", companyErr);

    // 1. Owners
    const ownersList = getRestoreArray(targetStorage["gestimmo_proprietaires"]);
    if (ownersList.length > 0) {
      const dbOwners = ownersList.map((o: any) => ({
        id: toUuid(o.id) || crypto.randomUUID(),
        company_id: DEFAULT_COMPANY_ID,
        full_name: o.name || o.full_name || "Propriétaire",
        phone: o.phone || "0000000000",
        email: o.email || null,
        address: o.address || null,
        commission_rate: (o.commissionRate !== undefined && o.commissionRate !== null && String(o.commissionRate) !== "") ? Number(o.commissionRate) : 10,
        id_card_number: o.code || o.id_card_number || null,
      }));
      const { error } = await supabase.from("owners").upsert(dbOwners as any, { onConflict: "id" });
      if (error) console.error("Supabase sync owners error:", error);
    }

    // 2. Properties
    const propertiesList = getRestoreArray(targetStorage["gestimmo_biens"]);
    if (propertiesList.length > 0) {
      const dbProperties = propertiesList.map((p: any) => {
        let ownerId = toUuid(p.ownerId);
        if (!ownerId && p.owner) {
          const matchedOwner = ownersList.find((o: any) => o.name === p.owner || o.full_name === p.owner);
          if (matchedOwner) ownerId = toUuid(matchedOwner.id);
        }
        return {
          id: toUuid(p.id) || crypto.randomUUID(),
          company_id: DEFAULT_COMPANY_ID,
          name: p.name || "Bien Sans Nom",
          type: normalizePropertyType(p.type),
          address: p.address || "Abidjan",
          city: p.city || "Abidjan",
          owner_id: ownerId,
          units_count: Number(p.units) || 1,
        };
      });
      const { error } = await supabase.from("properties").upsert(dbProperties as any, { onConflict: "id" });
      if (error) console.error("Supabase sync properties error:", error);
    }

    // 3. Units
    const unitsList = getRestoreArray(targetStorage["gestimmo_logements"]);
    if (unitsList.length > 0) {
      const dbUnits = unitsList.map((u: any) => {
        let propertyId = toUuid(u.propertyId);
        if (!propertyId && u.property) {
          const matchedProp = propertiesList.find((pr: any) => pr.name === u.property);
          if (matchedProp) propertyId = toUuid(matchedProp.id);
        }
        return {
          id: toUuid(u.id) || crypto.randomUUID(),
          company_id: DEFAULT_COMPANY_ID,
          property_id: propertyId,
          unit_number: u.unit || u.unit_number || "U-01",
          type: normalizeUnitType(u.type),
          rent_amount: Number(u.rent || u.rent_amount) || 0,
          charges_amount: Number(u.charges || u.charges_amount) || 0,
          status: normalizeUnitStatus(u.status),
          description: u.description || "",
        };
      });
      const { error } = await supabase.from("units").upsert(dbUnits as any, { onConflict: "id" });
      if (error) console.error("Supabase sync units error:", error);
    }

    // 4. Tenants
    const tenantsList = getRestoreArray(targetStorage["gestimmo_locataires"]);
    if (tenantsList.length > 0) {
      const dbTenants = tenantsList.map((t: any) => ({
        id: toUuid(t.id) || crypto.randomUUID(),
        company_id: DEFAULT_COMPANY_ID,
        full_name: t.name || t.full_name || "Locataire",
        email: t.email || null,
        phone: t.phone || "0000000000",
        profession: t.profession || null,
      }));
      const { error } = await supabase.from("tenants").upsert(dbTenants as any, { onConflict: "id" });
      if (error) console.error("Supabase sync tenants error:", error);
    }

    // 5. Leases
    const leasesList = getRestoreArray(targetStorage["gestimmo_baux"]);
    if (leasesList.length > 0) {
      const dbLeases = leasesList.map((l: any) => {
        let tenantId = toUuid(l.tenantId);
        if (!tenantId && l.tenant) {
          const matchedT = tenantsList.find((t: any) => t.name === l.tenant || t.full_name === l.tenant);
          if (matchedT) tenantId = toUuid(matchedT.id);
        }
        let unitId = toUuid(l.unitId);
        if (!unitId && l.unit) {
          const matchedU = unitsList.find((u: any) => u.unit === l.unit || u.unit_number === l.unit);
          if (matchedU) unitId = toUuid(matchedU.id);
        }
        return {
          id: toUuid(l.id) || crypto.randomUUID(),
          company_id: DEFAULT_COMPANY_ID,
          tenant_id: tenantId,
          unit_id: unitId,
          rent_amount: Number(l.rent || l.rent_amount) || 0,
          charges_amount: Number(l.charges || l.charges_amount) || 0,
          deposit_amount: Number(l.deposit || l.deposit_amount) || 0,
          start_date: l.startDate || l.start_date || new Date().toISOString().slice(0, 10),
          end_date: l.endDate || l.end_date || null,
          status: normalizeLeaseStatus(l.status),
        };
      });
      const { error } = await supabase.from("leases").upsert(dbLeases as any, { onConflict: "id" });
      if (error) console.error("Supabase sync leases error:", error);
    }

    // 6. Payments
    const paymentsList = getRestoreArray(targetStorage["gestimmo_paiements"]);
    if (paymentsList.length > 0) {
      const dbPayments = paymentsList.map((pm: any) => {
        let tenantId = toUuid(pm.tenantId);
        if (!tenantId && pm.tenant) {
          const matchedT = tenantsList.find((t: any) => t.name === pm.tenant || t.full_name === pm.tenant);
          if (matchedT) tenantId = toUuid(matchedT.id);
        }
        let unitId = toUuid(pm.unitId);
        if (!unitId && pm.unit) {
          const matchedU = unitsList.find((u: any) => u.unit === pm.unit || u.unit_number === pm.unit);
          if (matchedU) unitId = toUuid(matchedU.id);
        }
        return {
          id: toUuid(pm.id) || crypto.randomUUID(),
          company_id: DEFAULT_COMPANY_ID,
          lease_id: toUuid(pm.leaseId),
          tenant_id: tenantId,
          unit_id: unitId,
          amount: Number(pm.amount) || 0,
          payment_date: pm.date || pm.payment_date || new Date().toISOString().slice(0, 10),
          payment_method: pm.method === "Espèces" ? "ESPÈCES" : pm.method === "Virement" ? "VIREMENT" : pm.method === "Chèque" ? "CHÈQUE" : "MOBILE_MONEY",
          period_month: pm.period || pm.period_month || "",
          receipt_number: pm.receiptNumber || pm.receipt_number || "",
          status: normalizePaymentStatus(pm.status),
        };
      });
      const { error } = await supabase.from("payments").upsert(dbPayments as any, { onConflict: "id" });
      if (error) console.error("Supabase sync payments error:", error);
    }

    // 7. Payouts
    const payoutsList = getRestoreArray(targetStorage["gestimmo_reversements"]);
    if (payoutsList.length > 0) {
      const dbPayouts = payoutsList.map((po: any) => {
        let ownerId = toUuid(po.ownerId);
        if (!ownerId && po.owner) {
          const matchedO = ownersList.find((o: any) => o.name === po.owner || o.full_name === po.owner);
          if (matchedO) ownerId = toUuid(matchedO.id);
        }
        return {
          id: toUuid(po.id) || crypto.randomUUID(),
          company_id: DEFAULT_COMPANY_ID,
          owner_id: ownerId,
          period_month: po.period || po.period_month || "",
          gross_amount: Number(po.collected || po.gross_amount || po.amount) || 0,
          agency_commission: Number(po.commission || po.agency_commission) || 0,
          repairs_deduction: Number(po.repairs || po.repairs_deduction) || 0,
          net_amount: Number(po.amount || po.net_amount) || 0,
          payment_method: po.payment_method || "Virement",
        };
      });
      const { error } = await supabase.from("payouts").upsert(dbPayouts as any, { onConflict: "id" });
      if (error) console.error("Supabase sync payouts error:", error);
    }

    // 8. Incidents
    const incidentsList = getRestoreArray(targetStorage["gestimmo_incidents"]);
    if (incidentsList.length > 0) {
      const dbIncidents = incidentsList.map((inc: any) => {
        let tenantId = toUuid(inc.tenantId);
        if (!tenantId && inc.tenant) {
          const matchedT = tenantsList.find((t: any) => t.name === inc.tenant || t.full_name === inc.tenant);
          if (matchedT) tenantId = toUuid(matchedT.id);
        }
        let unitId = toUuid(inc.unitId);
        if (!unitId && inc.unit) {
          const matchedU = unitsList.find((u: any) => u.unit === inc.unit || u.unit_number === inc.unit);
          if (matchedU) unitId = toUuid(matchedU.id);
        }
        return {
          id: toUuid(inc.id) || crypto.randomUUID(),
          company_id: DEFAULT_COMPANY_ID,
          tenant_id: tenantId,
          unit_id: unitId,
          title: inc.type || inc.title || "Incident",
          description: inc.description || "",
          priority: normalizeIncidentPriority(inc.priority, inc.isUrgent),
          status: normalizeIncidentStatus(inc.status),
          cost: Number(inc.cost) || 0,
        };
      });
      const { error } = await supabase.from("incidents").upsert(dbIncidents as any, { onConflict: "id" });
      if (error) console.error("Supabase sync incidents error:", error);
    }

    // 9. Lease Notices
    const noticesList = getRestoreArray(targetStorage["gestimmo_preavis"]);
    if (noticesList.length > 0) {
      const dbNotices = noticesList.map((n: any) => {
        let tenantId = toUuid(n.tenantId);
        if (!tenantId && n.tenant) {
          const matchedT = tenantsList.find((t: any) => t.name === n.tenant || t.full_name === n.tenant);
          if (matchedT) tenantId = toUuid(matchedT.id);
        }
        let unitId = toUuid(n.unitId);
        if (!unitId && n.unit) {
          const matchedU = unitsList.find((u: any) => u.unit === n.unit || u.unit_number === n.unit);
          if (matchedU) unitId = toUuid(matchedU.id);
        }
        return {
          id: toUuid(n.id) || crypto.randomUUID(),
          company_id: DEFAULT_COMPANY_ID,
          lease_id: toUuid(n.leaseId),
          tenant_id: tenantId,
          unit_id: unitId,
          notification_date: n.notificationDate || n.notification_date || new Date().toISOString().slice(0, 10),
          effective_exit_date: n.effectiveExitDate || n.effective_exit_date || new Date().toISOString().slice(0, 10),
          notice_months: Number(n.noticeMonths || n.notice_months) || 1,
          initiative: n.initiative || "LOCATAIRE",
          reason: n.reason || "",
          deposit_refunded: Number(n.depositRefunded || n.deposit_refunded) || 0,
          repairs_deducted: Number(n.repairsDeducted || n.repairs_deducted) || 0,
          status: normalizeLeaseStatus(n.status),
        };
      });
      const { error } = await supabase.from("lease_notices").upsert(dbNotices as any, { onConflict: "id" });
      if (error) console.error("Supabase sync lease_notices error:", error);
    }

    // 10. Profiles
    const profilesList = getRestoreArray(targetStorage["gestimmo_company_users"]);
    if (profilesList.length > 0) {
      const dbProfiles = profilesList.map((p: any) => ({
        id: toUuid(p.id) || crypto.randomUUID(),
        company_id: DEFAULT_COMPANY_ID,
        full_name: p.name || p.full_name || "Utilisateur",
        email: p.email || p.login || "",
        phone: p.phone || "",
        role: normalizeProfileRole(p.role),
        permissions: p.permissions || null,
      }));
      const { error } = await supabase.from("profiles").upsert(dbProfiles as any, { onConflict: "id" });
      if (error) console.error("Supabase sync profiles error:", error);
    }

    return true;
  } catch (err) {
    console.error("syncRestoredDataToSupabase error:", err);
    return false;
  }
};

