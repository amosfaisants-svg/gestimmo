"use client";

import { useState, useEffect, Suspense } from "react";
import { ArrowLeft, Save, User, Building2, CreditCard, Key, Check, Copy, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ensureOwnerCredentials, OwnerCredential } from "@/lib/ownerCredentials";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedCard } from "@/components/ui/AccessDeniedCard";
import { createOwner, updateOwner, fetchOwners } from "@/lib/dataService";

function NouveauProprietaireForm() {
  const { can } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = !!editId;

  const [nom, setNom] = useState("");
  const [randomInt, setRandomInt] = useState("");
  const [typeProprietaire, setTypeProprietaire] = useState<"particulier" | "entreprise">("particulier");
  const [dateNaissance, setDateNaissance] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");
  const [cni, setCni] = useState("");
  const [etablieLe, setEtablieLe] = useState("");
  const [dateCreation, setDateCreation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [commissionRate, setCommissionRate] = useState<number | string>(10);
  const [modeReversement, setModeReversement] = useState("Virement Bancaire");
  const [nomBanque, setNomBanque] = useState("");
  const [rib, setRib] = useState("");

  const [createdCredentials, setCreatedCredentials] = useState<OwnerCredential | null>(null);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isEditing && editId) {
      const loadOwnerData = async () => {
        let owner: any = null;

        const stored = localStorage.getItem("gestimmo_proprietaires");
        if (stored) {
          const owners = JSON.parse(stored);
          owner = owners.find((o: any) => o.id === editId || String(o.id) === String(editId));
        }

        if (!owner) {
          const dbOwners = await fetchOwners();
          const found = dbOwners.find((o: any) => o.id === editId || String(o.id) === String(editId));
          if (found) {
            owner = {
              id: found.id,
              code: found.id_card_number || `PR-${found.id.slice(0, 6)}`,
              type: "particulier",
              name: found.full_name,
              phone: found.phone,
              email: found.email || "",
              adresse: found.address || "",
              commissionRate: (found.commission_rate !== undefined && found.commission_rate !== null) ? Number(found.commission_rate) : 10,
              modeReversement: "Virement Bancaire",
              nomBanque: found.bank_details ? found.bank_details.split(" - ")[0] : "",
              rib: found.bank_details ? found.bank_details.split(" - ")[1] || "" : "",
              cni: found.id_card_number || "",
            };
          }
        }

        if (owner) {
          setNom(owner.name || owner.full_name || "");
          setEmail(owner.email || "");
          setPhone(owner.phone || "");
          setTypeProprietaire(owner.type || "particulier");
          setCommissionRate(
            owner.commissionRate !== undefined && owner.commissionRate !== null
              ? owner.commissionRate
              : (owner.commission_rate !== undefined && owner.commission_rate !== null ? owner.commission_rate : 10)
          );
          setModeReversement(owner.modeReversement || "Virement Bancaire");
          setNomBanque(owner.nomBanque || "");
          setRib(owner.rib || "");
          setDateNaissance(owner.dateNaissance || "");
          setLieuNaissance(owner.lieuNaissance || "");
          setCni(owner.cni || owner.id_card_number || "");
          setEtablieLe(owner.etablieLe || "");
          setDateCreation(owner.dateCreation || "");
          setAdresse(owner.adresse || owner.address || "");

          if (owner.code && owner.code.includes("-")) {
            const parts = owner.code.split("-");
            setRandomInt(parts[parts.length - 1] || "");
          } else {
            setRandomInt(Math.floor(100000 + Math.random() * 900000).toString());
          }
        }
      };
      loadOwnerData();
    } else {
      setRandomInt(Math.floor(100000 + Math.random() * 900000).toString());
    }
  }, [isEditing, editId]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || parts[0] === "") return "";
    return parts.map(p => p[0]?.toUpperCase()).join('').substring(0, 3);
  };

  const generatedCode = nom && randomInt ? `PR-${getInitials(nom)}-${randomInt}` : "";

  const handleSave = async () => {
    if (!nom.trim()) {
      alert("Veuillez renseigner le nom complet / raison sociale du propriétaire.");
      return;
    }

    const stored = localStorage.getItem("gestimmo_proprietaires");
    let owners = stored ? JSON.parse(stored) : [];
    let oldOwnerName: string | null = null;
    const trimmedNewNom = nom.trim().toUpperCase();
    const upperNomBanque = nomBanque.trim().toUpperCase();

    const parsedRate = commissionRate === "" ? 0 : Number(commissionRate);
    const validRate = isNaN(parsedRate) ? 10 : parsedRate;

    const cleanPhone = phone.replace(/\D/g, '');

    // Ensure credentials automatically for owner / entreprise
    const creds = ensureOwnerCredentials(trimmedNewNom, typeProprietaire, email, cleanPhone, generatedCode);

    if (isEditing && editId) {
      const existingOwner = owners.find((o: any) => o.id === editId || String(o.id) === String(editId));
      if (existingOwner) oldOwnerName = existingOwner.name || existingOwner.full_name;

      try {
        await updateOwner(editId, {
          full_name: trimmedNewNom,
          email,
          phone: cleanPhone,
          commission_rate: validRate,
          bank_details: `${upperNomBanque} - ${rib}`,
          address: adresse,
          id_card_number: cni,
        });
      } catch (err) {
        console.warn("Supabase updateOwner error:", err);
      }

      let updatedExisting = false;
      owners = owners.map((o: any) => {
        if (o.id === editId || String(o.id) === String(editId)) {
          updatedExisting = true;
          return {
            ...o,
            name: trimmedNewNom,
            type: typeProprietaire,
            email,
            phone: cleanPhone,
            code: generatedCode || o.code,
            commissionRate: validRate,
            modeReversement,
            nomBanque: upperNomBanque,
            rib,
            login: creds.login,
            password: creds.password,
            dateNaissance,
            lieuNaissance,
            cni,
            etablieLe,
            dateCreation,
            adresse,
          };
        }
        return o;
      });

      if (!updatedExisting) {
        owners.push({
          id: editId,
          code: generatedCode,
          type: typeProprietaire,
          name: trimmedNewNom,
          email,
          phone: cleanPhone,
          commissionRate: validRate,
          modeReversement,
          nomBanque: upperNomBanque,
          rib,
          login: creds.login,
          password: creds.password,
          dateNaissance,
          lieuNaissance,
          cni,
          etablieLe,
          dateCreation,
          adresse,
          propertiesCount: 0,
          totalCollected: 0,
          balance: 0,
        });
      }
    } else {
      const dbCreated = await createOwner({
        full_name: trimmedNewNom,
        email,
        phone: cleanPhone,
        commission_rate: validRate,
        bank_details: `${upperNomBanque} - ${rib}`,
        account_status: 'Actif',
        address: adresse,
        id_card_number: cni,
      });

      const newOwnerId = dbCreated ? dbCreated.id : (creds.id || `O-${Math.floor(100 + Math.random() * 900)}`);

      const newOwner = {
        id: newOwnerId,
        code: generatedCode,
        type: typeProprietaire,
        name: trimmedNewNom,
        email: email,
        phone: cleanPhone,
        commissionRate: validRate,
        modeReversement,
        nomBanque: upperNomBanque,
        rib,
        login: creds.login,
        password: creds.password,
        dateNaissance,
        lieuNaissance,
        cni,
        etablieLe,
        dateCreation,
        adresse,
        propertiesCount: 0,
        totalCollected: 0,
        balance: 0
      };
      owners = [newOwner, ...owners];
    }

    localStorage.setItem("gestimmo_proprietaires", JSON.stringify(owners));

    // Cascade update if owner name changed
    if (oldOwnerName && oldOwnerName !== trimmedNewNom) {
      // 1. Update gestimmo_biens
      const storedBiens = localStorage.getItem("gestimmo_biens");
      if (storedBiens) {
        const allBiens = JSON.parse(storedBiens);
        const updatedBiens = allBiens.map((b: any) =>
          b.owner === oldOwnerName ? { ...b, owner: trimmedNewNom } : b
        );
        localStorage.setItem("gestimmo_biens", JSON.stringify(updatedBiens));
      }

      // 2. Update gestimmo_gerants
      const storedGerants = localStorage.getItem("gestimmo_gerants");
      if (storedGerants) {
        const allGerants = JSON.parse(storedGerants);
        const updatedGerants = allGerants.map((g: any) =>
          g.bénéficiaire === oldOwnerName ? { ...g, bénéficiaire: trimmedNewNom } : g
        );
        localStorage.setItem("gestimmo_gerants", JSON.stringify(updatedGerants));
      }
    }

    setCreatedCredentials(creds);
    if (can("biens", "viewCredentials")) {
      setIsCredentialModalOpen(true);
    } else {
      router.push("/app/proprietaires");
    }
  };

  if (!can("biens", "edit")) {
    return <AccessDeniedCard moduleName="Biens & Propriétaires" />;
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/app/proprietaires">
            <button className="p-2 bg-white border border-app-border rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEditing ? "Modifier le propriétaire" : "Nouveau propriétaire"}</h1>
            <p className="text-sm text-gray-500 mt-1">{isEditing ? "Modifiez les informations de ce propriétaire." : "Ajoutez un nouveau propriétaire et configurez ses paramètres de gestion."}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/proprietaires">
            <button className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Annuler
            </button>
          </Link>
          <button onClick={handleSave} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center shadow-sm">
            <Save className="h-4 w-4 mr-2" /> Enregistrer
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Type de propriétaire */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500" /> Type de propriétaire
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center p-4 border border-app-border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" name="type" className="text-primary focus:ring-primary h-4 w-4" checked={typeProprietaire === 'particulier'} onChange={() => setTypeProprietaire('particulier')} />
              <div className="ml-3">
                <span className="block text-sm font-medium text-gray-900">Particulier</span>
                <span className="block text-xs text-gray-500 mt-0.5">Personne physique</span>
              </div>
            </label>
            <label className="flex items-center p-4 border border-app-border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" name="type" className="text-primary focus:ring-primary h-4 w-4" checked={typeProprietaire === 'entreprise'} onChange={() => setTypeProprietaire('entreprise')} />
              <div className="ml-3">
                <span className="block text-sm font-medium text-gray-900">Entreprise</span>
                <span className="block text-xs text-gray-500 mt-0.5">Personne morale (SCI, SARL, etc.)</span>
              </div>
            </label>
          </div>
        </div>

        {/* Informations générales */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" /> Informations générales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input type="text" className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder={typeProprietaire === 'particulier' ? "Ex: Kouadio Jean" : "Ex: MOUAGNE SA"} value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code Propriétaire</label>
              <input type="text" className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-gray-50 text-gray-500 font-mono focus:outline-none" placeholder="Généré automatiquement" value={generatedCode} readOnly />
            </div>
            {typeProprietaire === "particulier" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                  <input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de naissance</label>
                  <input type="text" value={lieuNaissance} onChange={(e) => setLieuNaissance(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: Abidjan" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro d'identité (CNI, etc.)</label>
                  <input type="text" value={cni} onChange={(e) => setCni(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Numéro de la pièce" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Établie le</label>
                  <input type="date" value={etablieLe} onChange={(e) => setEtablieLe(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de création</label>
                <input type="date" value={dateCreation} onChange={(e) => setDateCreation(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="contact@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
              <input type="tel" inputMode="numeric" className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: 0102030405" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse complète</label>
              <input type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Rue, Quartier, Ville" />
            </div>
          </div>
        </div>

        {/* Paramètres Financiers */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-500" /> Paramètres Financiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taux de commission GESTIMMO (%) *</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8"
                  placeholder="10"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Sera prélevé sur les loyers encaissés.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode de reversement</label>
              <select
                className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                value={modeReversement}
                onChange={(e) => setModeReversement(e.target.value)}
              >
                <option value="Virement Bancaire">Virement Bancaire</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Chèque">Chèque</option>
                <option value="Espèces">Espèces</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la banque</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: SGCI"
                value={nomBanque}
                onChange={(e) => setNomBanque(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RIB / IBAN</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="CI032 01001 00001234567 89"
                value={rib}
                onChange={(e) => setRib(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'affichage des identifiants créés */}
      {isCredentialModalOpen && createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 border border-app-border animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 border-b border-app-border pb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isEditing ? "Identifiants du Propriétaire" : "Propriétaire Enregistré avec Succès !"}
                </h3>
                <p className="text-xs text-gray-500">Compte Espace Propriétaire généré automatiquement</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Bénéficiaire :</span>
                <span className="font-bold text-gray-900">{createdCredentials.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Type de compte :</span>
                <span className="font-semibold text-primary uppercase">{createdCredentials.type || typeProprietaire}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Identifiant / Login :</label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-primary select-all">
                    {createdCredentials.login}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Mot de passe temporaire :</label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-emerald-600 select-all">
                    {createdCredentials.password}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center text-xs text-gray-600 bg-amber-50 text-amber-900 p-3 rounded-xl border border-amber-200">
              <CheckCircle2 className="w-4 h-4 text-amber-600 mr-2 shrink-0" />
              Le propriétaire ({createdCredentials.type === "entreprise" ? "Entreprise" : "Particulier"}) peut désormais se connecter sur l'Espace Propriétaire avec ces accès.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => {
                  const textToCopy = `Bonjour ${createdCredentials.name},\nVoici vos accès pour votre Espace Propriétaire GESTIMMO :\nIdentifiant: ${createdCredentials.login}\nMot de passe: ${createdCredentials.password}`;
                  navigator.clipboard.writeText(textToCopy);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 3000);
                }}
                className="bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
              >
                {isCopied ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : <Copy className="w-4 h-4 mr-2 text-gray-500" />}
                {isCopied ? "Copié !" : "Copier les accès"}
              </button>

              <button 
                onClick={() => {
                  setIsCredentialModalOpen(false);
                  router.push("/app/proprietaires");
                }}
                className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NouveauProprietairePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Chargement...</div>}>
      <NouveauProprietaireForm />
    </Suspense>
  );
}

