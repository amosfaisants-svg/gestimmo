"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Send, 
  User, 
  Users, 
  Building, 
  AlertCircle, 
  CheckCircle2, 
  Shield, 
  Search, 
  Filter, 
  RotateCcw, 
  Building2, 
  Phone, 
  Mail, 
  DoorClosed, 
  Check 
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { 
  sendMessage, 
  MessageRecipientType, 
  MessagePriority, 
  UserMessage 
} from "@/lib/messagesService";
import { getPortalSession } from "@/lib/authSession";
import { getCompanyUsers } from "@/lib/companyCredentials";

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMessageSent?: (msg: UserMessage) => void;
  defaultRecipientType?: MessageRecipientType;
  defaultRecipientId?: string;
  defaultRecipientName?: string;
}

interface RecipientOption {
  id: string;
  name: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  unit?: string;
  property?: string;
  role?: string;
  ownerType?: string;
  isBroadcast?: boolean;
  type: MessageRecipientType;
}

export function SendMessageModal({
  isOpen,
  onClose,
  onMessageSent,
  defaultRecipientType = "locataire",
  defaultRecipientId = "",
  defaultRecipientName = "",
}: SendMessageModalProps) {
  const [recipientType, setRecipientType] = useState<MessageRecipientType>(defaultRecipientType);
  const [recipientsList, setRecipientsList] = useState<RecipientOption[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(defaultRecipientId);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<MessagePriority>("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senderName, setSenderName] = useState("Administration GESTIMMO");
  const [senderRole, setSenderRole] = useState("Agence");

  // Filter states to refine "Destinataire précis"
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all"); // 'all' | 'individual' | 'broadcast'
  const [roleFilter, setRoleFilter] = useState("all");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("all"); // 'all' | 'particulier' | 'entreprise'
  const [availableProperties, setAvailableProperties] = useState<string[]>([]);

  // Load current sender info
  useEffect(() => {
    const adminSession = getPortalSession("ADMIN");
    if (adminSession) {
      setSenderName(adminSession.name || "Kouassi Jean-Philippe");
      setSenderRole(adminSession.role || "Administrateur");
    }
  }, []);

  // Reset filters when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setPropertyFilter("all");
      setScopeFilter("all");
      setRoleFilter("all");
      setOwnerTypeFilter("all");
    }
  }, [isOpen]);

  // Load available recipients based on selected recipient type
  useEffect(() => {
    const options: RecipientOption[] = [];
    const propsSet = new Set<string>();

    // Load available properties from gestimmo_biens for filters
    try {
      const storedBiens = localStorage.getItem("gestimmo_biens");
      if (storedBiens) {
        const biens = JSON.parse(storedBiens);
        if (Array.isArray(biens)) {
          biens.forEach((b: any) => {
            if (b.name) propsSet.add(b.name.trim());
          });
        }
      }
    } catch (e) {}

    // Load active leases to enrich tenants without property info
    let bauxList: any[] = [];
    try {
      const storedBaux = localStorage.getItem("gestimmo_baux");
      if (storedBaux) {
        bauxList = JSON.parse(storedBaux);
      }
    } catch (e) {}

    if (recipientType === "locataire") {
      options.push({
        id: "all_tenants",
        name: "📢 Tous les locataires",
        subtitle: "Diffusion globale à l'ensemble des locataires",
        type: "locataire",
        isBroadcast: true,
      });

      try {
        const stored = localStorage.getItem("gestimmo_locataires");
        const list = stored ? JSON.parse(stored) : [];
        if (Array.isArray(list) && list.length > 0) {
          list.forEach((t: any) => {
            let tProp = t.property && t.property !== "-" ? t.property : "";
            let tUnit = t.unit && t.unit !== "-" ? t.unit : "";

            if (!tProp && Array.isArray(bauxList)) {
              const matchedLease = bauxList.find(
                (b) => b.tenant && t.name && b.tenant.trim().toLowerCase() === t.name.trim().toLowerCase()
              );
              if (matchedLease) {
                if (matchedLease.property) tProp = matchedLease.property;
                if (!tUnit && matchedLease.unit) tUnit = matchedLease.unit;
              }
            }

            if (tProp) propsSet.add(tProp.trim());

            let sub = "";
            if (tUnit && tProp) {
              sub = `Logement ${tUnit} • ${tProp}`;
            } else if (tUnit) {
              sub = `Logement ${tUnit}`;
            } else if (tProp) {
              sub = tProp;
            } else {
              sub = "Locataire";
            }

            options.push({
              id: t.id || `loc-${t.name}`,
              name: t.name || "Locataire",
              subtitle: sub,
              email: t.email,
              phone: t.phone,
              unit: tUnit,
              property: tProp,
              isBroadcast: false,
              type: "locataire",
            });
          });
        } else {
          // Fallback defaults
          const defaultTenants = [
            { id: "LOC-101", name: "Cora Richards", unit: "A-101", property: "Résidence Les Flamboyants" },
            { id: "LOC-204", name: "Alistair Dunlap", unit: "B-204", property: "Résidence Les Flamboyants" },
            { id: "LOC-003", name: "Marc Antoine", unit: "A-102", property: "Résidence Les Flamboyants" },
            { id: "LOC-004", name: "Bibi Shelton", unit: "B-205", property: "Résidence Les Flamboyants" },
            { id: "LOC-005", name: "Jean Dupont", unit: "V-001", property: "Villa Palmeraie" }
          ];
          defaultTenants.forEach((dt) => {
            propsSet.add(dt.property);
            options.push({
              id: dt.id,
              name: dt.name,
              subtitle: `Logement ${dt.unit} • ${dt.property}`,
              unit: dt.unit,
              property: dt.property,
              isBroadcast: false,
              type: "locataire",
            });
          });
        }
      } catch (e) {
        options.push({
          id: "LOC-101",
          name: "Cora Richards",
          subtitle: "Logement A-101",
          unit: "A-101",
          isBroadcast: false,
          type: "locataire",
        });
      }
    } else if (recipientType === "gerant" || recipientType === "equipe") {
      options.push({
        id: "all_team",
        name: "👥 Toute l'équipe & Gérants",
        subtitle: "Diffusion interne à tous les collaborateurs",
        type: "gerant",
        isBroadcast: true,
      });

      const companyUsers = getCompanyUsers();
      if (Array.isArray(companyUsers) && companyUsers.length > 0) {
        companyUsers.forEach((u) => {
          options.push({
            id: u.id,
            name: u.name,
            subtitle: `${u.role} • ${u.email}`,
            email: u.email,
            phone: u.phone,
            role: u.role,
            isBroadcast: false,
            type: "gerant",
          });
        });
      }

      // Also check gestimmo_gerants
      try {
        const storedGerants = localStorage.getItem("gestimmo_gerants");
        if (storedGerants) {
          const gerants = JSON.parse(storedGerants);
          if (Array.isArray(gerants)) {
            gerants.forEach((g: any) => {
              if (!options.some((o) => o.name.toLowerCase() === g.name?.toLowerCase())) {
                options.push({
                  id: g.id || `gerant-${g.name}`,
                  name: g.name,
                  subtitle: `${g.role || "Gérante de biens"} • ${g.email || ""}`,
                  email: g.email,
                  phone: g.phone,
                  role: g.role || "Gestionnaire",
                  isBroadcast: false,
                  type: "gerant",
                });
              }
            });
          }
        }
      } catch (e) {}
    } else if (recipientType === "proprietaire") {
      options.push({
        id: "all_owners",
        name: "🏢 Tous les propriétaires",
        subtitle: "Diffusion globale à l'ensemble des bailleurs",
        type: "proprietaire",
        isBroadcast: true,
      });

      try {
        const storedOwners = localStorage.getItem("gestimmo_proprietaires");
        const list = storedOwners ? JSON.parse(storedOwners) : [];
        if (Array.isArray(list) && list.length > 0) {
          list.forEach((o: any) => {
            const isCompany = 
              o.type === "Entreprise" || 
              o.ownerType === "Entreprise" || 
              /sci|invest|sarl|sas|groupe|societe|société|holding/i.test(o.name || "");
            const ownerTypeLabel = isCompany ? "Entreprise" : "Particulier";

            options.push({
              id: o.id || `owner-${o.name}`,
              name: o.name,
              subtitle: `${ownerTypeLabel} • ${o.email || o.phone || "Bailleur partenaire"}`,
              email: o.email,
              phone: o.phone,
              ownerType: ownerTypeLabel,
              isBroadcast: false,
              type: "proprietaire",
            });
          });
        } else {
          options.push(
            { id: "PR-001", name: "Kouadio Invest", subtitle: "Entreprise • contact@kouadio.ci", ownerType: "Entreprise", isBroadcast: false, type: "proprietaire" },
            { id: "PR-002", name: "M. Bamba Seydou", subtitle: "Particulier • seydou.bamba@email.com", ownerType: "Particulier", isBroadcast: false, type: "proprietaire" }
          );
        }
      } catch (e) {}
    }

    setAvailableProperties(Array.from(propsSet).sort());
    setRecipientsList(options);

    // Initial default selection
    if (options.length > 1) {
      const match = options.find((o) => o.id === defaultRecipientId || o.name === defaultRecipientName);
      if (match) {
        setSelectedRecipientId(match.id);
      } else {
        setSelectedRecipientId(options[1].id); // First individual recipient
      }
    } else if (options.length > 0) {
      setSelectedRecipientId(options[0].id);
    }
  }, [recipientType, defaultRecipientId, defaultRecipientName]);

  // Extract roles for team filter
  const availableRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    recipientsList.forEach((r) => {
      if (r.role) rolesSet.add(r.role);
    });
    if (rolesSet.size === 0) {
      return ["Administrateur", "Gestionnaire", "Comptable", "Agent de terrain"];
    }
    return Array.from(rolesSet);
  }, [recipientsList]);

  // Filter recipients based on active filters
  const filteredRecipients = useMemo(() => {
    return recipientsList.filter((rec) => {
      // 1. Scope filter (all, individual, broadcast)
      if (scopeFilter === "individual" && rec.isBroadcast) return false;
      if (scopeFilter === "broadcast" && !rec.isBroadcast) return false;

      // 2. Type-specific filters
      if (recipientType === "locataire" && !rec.isBroadcast) {
        if (propertyFilter !== "all") {
          const propName = (rec.property || "").toLowerCase();
          const targetProp = propertyFilter.toLowerCase();
          const sub = (rec.subtitle || "").toLowerCase();
          if (!propName.includes(targetProp) && !sub.includes(targetProp)) {
            return false;
          }
        }
      } else if ((recipientType === "gerant" || recipientType === "equipe") && !rec.isBroadcast) {
        if (roleFilter !== "all") {
          const recRole = (rec.role || rec.subtitle || "").toLowerCase();
          if (!recRole.includes(roleFilter.toLowerCase())) {
            return false;
          }
        }
      } else if (recipientType === "proprietaire" && !rec.isBroadcast) {
        if (ownerTypeFilter !== "all") {
          if (ownerTypeFilter === "entreprise" && rec.ownerType !== "Entreprise") return false;
          if (ownerTypeFilter === "particulier" && rec.ownerType !== "Particulier") return false;
        }
      }

      // 3. Search query term
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchesName = (rec.name || "").toLowerCase().includes(query);
        const matchesSub = (rec.subtitle || "").toLowerCase().includes(query);
        const matchesUnit = (rec.unit || "").toLowerCase().includes(query);
        const matchesProperty = (rec.property || "").toLowerCase().includes(query);
        const matchesEmail = (rec.email || "").toLowerCase().includes(query);
        const matchesPhone = (rec.phone || "").replace(/\s+/g, "").includes(query.replace(/\s+/g, ""));
        const matchesRole = (rec.role || "").toLowerCase().includes(query);

        if (!matchesName && !matchesSub && !matchesUnit && !matchesProperty && !matchesEmail && !matchesPhone && !matchesRole) {
          return false;
        }
      }

      return true;
    });
  }, [recipientsList, searchTerm, propertyFilter, scopeFilter, roleFilter, ownerTypeFilter, recipientType]);

  // Keep selectedRecipientId valid when filtered results change
  useEffect(() => {
    if (filteredRecipients.length > 0) {
      const exists = filteredRecipients.some((r) => r.id === selectedRecipientId);
      if (!exists) {
        const firstIndiv = filteredRecipients.find((r) => !r.isBroadcast);
        setSelectedRecipientId(firstIndiv ? firstIndiv.id : filteredRecipients[0].id);
      }
    }
  }, [filteredRecipients, selectedRecipientId]);

  const handleSelectRecipientType = (type: MessageRecipientType) => {
    setRecipientType(type);
    setSearchTerm("");
    setPropertyFilter("all");
    setScopeFilter("all");
    setRoleFilter("all");
    setOwnerTypeFilter("all");
  };

  const isAnyFilterActive = 
    searchTerm.trim() !== "" || 
    propertyFilter !== "all" || 
    scopeFilter !== "all" || 
    roleFilter !== "all" || 
    ownerTypeFilter !== "all";

  const handleResetFilters = () => {
    setSearchTerm("");
    setPropertyFilter("all");
    setScopeFilter("all");
    setRoleFilter("all");
    setOwnerTypeFilter("all");
  };

  const broadcastOptions = filteredRecipients.filter((r) => r.isBroadcast);
  const individualOptions = filteredRecipients.filter((r) => !r.isBroadcast);
  const selectedRecipient = recipientsList.find((r) => r.id === selectedRecipientId);

  if (!isOpen) return null;

  // Preset subject suggestions based on target
  const subjectSuggestions = 
    recipientType === "locataire" ? [
      "Rappel échéance de loyer",
      "Information travaux & intervention",
      "Visite technique de contrôle",
      "Transmission de document ou quittance",
      "Préavis de départ & état des lieux"
    ] : recipientType === "gerant" ? [
      "Point sur les encaissements de la semaine",
      "Validation de quittances & décharges",
      "Coordination état des lieux",
      "Intervention technique prioritaire"
    ] : [
      "Relevé de gérance mensuel disponible",
      "Notification de virement de reversement",
      "Validation devis travaux de rénovation",
      "Point de gestion de votre patrimoine"
    ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) return;

    setIsSubmitting(true);

    const selected = recipientsList.find((r) => r.id === selectedRecipientId);
    const recipientName = selected ? selected.name : "Destinataire";

    const sent = sendMessage({
      senderName,
      senderRole,
      recipientType,
      recipientId: selectedRecipientId,
      recipientName,
      recipientEmail: selected?.email,
      recipientPhone: selected?.phone,
      recipientUnit: selected?.unit,
      subject: subject.trim(),
      content: content.trim(),
      priority,
    });

    setIsSubmitting(false);
    onMessageSent?.(sent);
    onClose();

    // Reset fields
    setSubject("");
    setContent("");
    setPriority("normal");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl border border-app-border shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="p-5 border-b border-app-border flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Envoyer un message</h2>
              <p className="text-xs text-gray-500">
                Communication directe vers l&apos;espace d&apos;un locataire, gérant ou propriétaire
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status lifecycle hint */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Cycle de suivi des statuts :</span> Le message sera initialement enregistré au statut{" "}
              <Badge variant="warning" dot className="mx-1 py-0 px-2 font-semibold">Envoyé</Badge>.
              Dès que le destinataire se connecte à son espace personnel et ouvre le message, son statut passera automatiquement à{" "}
              <Badge variant="success" dot className="mx-1 py-0 px-2 font-semibold">Lu</Badge>.
            </div>
          </div>

          {/* 1. Recipient Category Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-2 tracking-wider">
              1. Type d&apos;espace destinataire *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectRecipientType("locataire")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  recipientType === "locataire"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-gray-700 border-app-border hover:bg-gray-50"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Espace Locataire</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRecipientType("gerant")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  recipientType === "gerant"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-gray-700 border-app-border hover:bg-gray-50"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Gérant / Équipe</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRecipientType("proprietaire")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  recipientType === "proprietaire"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-gray-700 border-app-border hover:bg-gray-50"
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Espace Propriétaire</span>
              </button>
            </div>
          </div>

          {/* 2. Target Recipient Selection with Refinement Filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                <span>2. Destinataire précis *</span>
                <span className="text-[11px] font-normal text-gray-400">
                  ({filteredRecipients.length} sur {recipientsList.length})
                </span>
              </label>

              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Réinitialiser les filtres</span>
                </button>
              )}
            </div>

            {/* Filters Box */}
            <div className="bg-gray-50/90 p-3.5 rounded-xl border border-app-border mb-2.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold text-gray-700">Filtres de recherche rapide :</span>
                </div>
                {isAnyFilterActive && (
                  <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                    Filtre actif
                  </span>
                )}
              </div>

              {/* Text Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    recipientType === "locataire"
                      ? "Rechercher par nom, logement (ex: M3, A-101), immeuble, tél, email..."
                      : recipientType === "gerant"
                      ? "Rechercher par nom, rôle, email, téléphone..."
                      : "Rechercher un propriétaire par nom, contact..."
                  }
                  className="w-full pl-9 pr-8 py-2 bg-white border border-app-border rounded-lg text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100"
                    title="Effacer la recherche"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Contextual dropdown filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recipientType === "locataire" && (
                  <>
                    {/* Filter by Property/Building */}
                    <div>
                      <select
                        value={propertyFilter}
                        onChange={(e) => setPropertyFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-app-border rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all truncate"
                      >
                        <option value="all">🏢 Tous les biens / immeubles</option>
                        {availableProperties.map((prop) => (
                          <option key={prop} value={prop}>
                            🏢 {prop}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter by Broadcast / Scope */}
                    <div>
                      <select
                        value={scopeFilter}
                        onChange={(e) => setScopeFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-app-border rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      >
                        <option value="all">👥 Tous (individuels & global)</option>
                        <option value="individual">👤 Locataires individuels uniquement</option>
                        <option value="broadcast">📢 Diffusion générale uniquement</option>
                      </select>
                    </div>
                  </>
                )}

                {(recipientType === "gerant" || recipientType === "equipe") && (
                  <>
                    {/* Filter by Role */}
                    <div>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-app-border rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      >
                        <option value="all">🛡️ Tous les rôles</option>
                        {availableRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter by Scope */}
                    <div>
                      <select
                        value={scopeFilter}
                        onChange={(e) => setScopeFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-app-border rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      >
                        <option value="all">👥 Tous (collaborateurs & équipe)</option>
                        <option value="individual">👤 Collaborateurs individuels</option>
                        <option value="broadcast">👥 Toute l&apos;équipe uniquement</option>
                      </select>
                    </div>
                  </>
                )}

                {recipientType === "proprietaire" && (
                  <>
                    {/* Filter by Owner Type */}
                    <div>
                      <select
                        value={ownerTypeFilter}
                        onChange={(e) => setOwnerTypeFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-app-border rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      >
                        <option value="all">🏢 Tous les profils bailleurs</option>
                        <option value="particulier">👤 Bailleurs particuliers</option>
                        <option value="entreprise">🏢 Sociétés & Entreprises (SCI...)</option>
                      </select>
                    </div>

                    {/* Filter by Scope */}
                    <div>
                      <select
                        value={scopeFilter}
                        onChange={(e) => setScopeFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-app-border rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      >
                        <option value="all">👥 Tous (individuels & global)</option>
                        <option value="individual">👤 Bailleurs individuels</option>
                        <option value="broadcast">🏢 Tous les propriétaires (global)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Quick direct clickable chips when searching */}
              {searchTerm.trim() !== "" && individualOptions.length > 0 && individualOptions.length <= 5 && (
                <div className="pt-1 border-t border-app-border/60">
                  <span className="text-[11px] text-gray-500 font-medium mr-1.5">Accès direct :</span>
                  <div className="inline-flex flex-wrap gap-1.5 mt-1">
                    {individualOptions.map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setSelectedRecipientId(rec.id)}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                          selectedRecipientId === rec.id
                            ? "bg-primary text-white border-primary font-medium shadow-2xs"
                            : "bg-white text-gray-700 border-app-border hover:border-primary/50 hover:bg-gray-50"
                        }`}
                      >
                        {rec.name} {rec.unit ? `(${rec.unit})` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filtered Recipient Dropdown */}
            {filteredRecipients.length > 0 ? (
              <select
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-app-border rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                required
              >
                {broadcastOptions.length > 0 && (
                  <optgroup label="📢 Diffusion générale">
                    {broadcastOptions.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.name} — {rec.subtitle || ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {individualOptions.length > 0 && (
                  <optgroup label="👤 Destinataires individuels">
                    {individualOptions.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.name} {rec.subtitle ? `(${rec.subtitle})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            ) : (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Aucun destinataire ne correspond à vos critères de recherche.</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-primary font-semibold hover:underline shrink-0 ml-2"
                >
                  Effacer les filtres
                </button>
              </div>
            )}

            {/* Selected Recipient Confirmation Preview Card */}
            {selectedRecipient && (
              <div className="mt-2.5 p-3 bg-primary-50/30 border border-primary/20 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {selectedRecipient.isBroadcast ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      selectedRecipient.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 flex items-center gap-2 truncate">
                      <span className="truncate">{selectedRecipient.name}</span>
                      {selectedRecipient.isBroadcast ? (
                        <Badge variant="warning" dot className="text-[10px] py-0 px-1.5 font-medium shrink-0">
                          Diffusion générale
                        </Badge>
                      ) : (
                        <Badge variant="info" className="text-[10px] py-0 px-1.5 font-medium shrink-0">
                          Destinataire unique
                        </Badge>
                      )}
                    </div>
                    <div className="text-gray-500 text-[11px] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {selectedRecipient.unit && (
                        <span>
                          🚪 Logement : <strong className="text-gray-700">{selectedRecipient.unit}</strong>
                        </span>
                      )}
                      {selectedRecipient.property && (
                        <span>
                          🏢 Immeuble : <strong className="text-gray-700">{selectedRecipient.property}</strong>
                        </span>
                      )}
                      {selectedRecipient.role && (
                        <span>
                          🛡️ Rôle : <strong className="text-gray-700">{selectedRecipient.role}</strong>
                        </span>
                      )}
                      {selectedRecipient.phone && <span>📞 {selectedRecipient.phone}</span>}
                      {selectedRecipient.email && <span>✉️ {selectedRecipient.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-primary font-medium shrink-0">
                  <Check className="w-3.5 h-3.5" />
                  <span>Sélectionné</span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Subject and Quick Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
                3. Objet du message *
              </label>
              <span className="text-[11px] text-gray-400">Suggestions rapides :</span>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {subjectSuggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSubject(sug)}
                  className="text-[11px] px-2.5 py-1 bg-gray-100 hover:bg-primary/10 hover:text-primary rounded-lg text-gray-600 transition-colors font-medium border border-gray-200/60"
                >
                  {sug}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Information importante concernant votre contrat..."
              className="w-full px-3.5 py-2.5 bg-white border border-app-border rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              required
            />
          </div>

          {/* 4. Priority */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5 tracking-wider">
              4. Degré d&apos;importance
            </label>
            <div className="flex items-center gap-2">
              {(["normal", "important", "urgent"] as MessagePriority[]).map((p) => {
                const isSelected = priority === p;
                const label = p === "normal" ? "Normale" : p === "important" ? "Importante" : "Urgente";
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all capitalize ${
                      isSelected
                        ? p === "urgent"
                          ? "bg-red-500 text-white border-red-500 shadow-xs"
                          : p === "important"
                          ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                          : "bg-primary text-white border-primary shadow-xs"
                        : "bg-white text-gray-600 border-app-border hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Message Content */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5 tracking-wider">
              5. Contenu du message *
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Rédigez ici le message qui sera immédiatement notifié et affiché dans l'espace personnel du destinataire..."
              className="w-full px-3.5 py-2.5 bg-white border border-app-border rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              required
            />
          </div>

          {/* Sender Preview */}
          <div className="bg-gray-50 p-3 rounded-xl border border-app-border flex items-center justify-between text-xs text-gray-500">
            <span>Expéditeur identifié : <strong className="text-gray-800">{senderName}</strong> ({senderRole})</span>
            <span className="text-gray-400">Date : À l&apos;envoi instantané</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-app-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-white border border-app-border text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !content.trim() || filteredRecipients.length === 0}
              className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Envoi en cours..." : "Envoyer le message"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
