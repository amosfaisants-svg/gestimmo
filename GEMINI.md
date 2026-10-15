# 🏢 GESTIMMO - Documentation & Référentiel du Projet

Ce fichier `GEMINI.md` sert de **source de vérité globale** pour les intelligences artificielles et les développeurs travaillant sur le projet **GESTIMMO**. Il synthétise l'architecture, les fonctionnalités implémentées, la structure des fichiers, les choix techniques/visuels et fournit les directives à respecter lors de toute évolution de la plateforme.

---

## 📌 1. Présentation Générale de l'Application

**GESTIMMO** (Gestion Immobilière Pro) est un SaaS complet de gestion immobilière conçu spécifiquement pour le marché d'Afrique de l'Ouest (avec gestion native de la devise **FCFA**). 

La plateforme offre **3 espaces indépendants et étanches** basés sur les rôles utilisateur :

1. **Espace Administration / Agence (`/app/*`)** : Destiné aux agences immobilières, administrateurs, gestionnaires de biens, comptables et agents de terrain pour piloter la totalité du parc immobilier.
2. **Espace Locataire (`/locataire/*`)** : Portail self-service pour les locataires (consultation des baux, règlement des loyers, téléchargement des quittances, déclaration d'incidents).
3. **Espace Propriétaire (`/proprietaire/*`)** : Portail bailleur pour suivre le rendement des biens, l'état d'occupation, les reversements d'agence et consulter les relevés de gérance mensuels.

---

## 🛠️ 2. Stack Technique & Dépendances

- **Framework principal** : [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript 5)
- **Styling & Design System** : [Tailwind CSS 3](https://tailwindcss.com/) avec palette de couleurs sur mesure (`primary`, `app-border`, etc.)
- **Icônes** : [Lucide React](https://lucide.dev/) (`lucide-react`)
- **Composants & Utilitaires UI** : `clsx`, `tailwind-merge`, `class-variance-authority` (CVA)
- **Génération & Édition PDF** : `pdf-lib` et `html2pdf.js` (génération de quittances, contrats et reçus)
- **Persistance des données & Backend Full-Stack** : 
  - **Supabase (PostgreSQL + RLS + SDK JS)** (`src/lib/supabase.ts` & `src/lib/dataService.ts`) : Backend temps réel avec 11 tables relationnelles (`companies`, `profiles`, `owners`, `properties`, `units`, `tenants`, `leases`, `payments`, `payouts`, `lease_notices`, `incidents`).
  - **IndexedDB** (`src/lib/storage.ts`) : Stockage lourd pour les modèles PDF dynamiques (contrats de bail, règlements).
  - **LocalStorage / Fallback Engine** : Gestion dynamique des sessions locales et repli hors-ligne.

---

## 🚀 3. Fonctionnalités Implémentées par Module

### 👥 A. Authentification & Droits d'Accès Granulaires
- **Matrice de Permissions Rôles** (`src/lib/companyCredentials.ts`) : 
  - *Administrateur* (accès complet).
  - *Gestionnaire* (gestion biens, baux, locataires).
  - *Comptable* (accès restreint aux paiements, rapports et reversements).
  - *Agent de terrain* (dédiés aux états des lieux et à la gestion des incidents).
- **Génération automatique d'accès** : Possibilité de créer et fournir des accès sécurisés pour locataires, propriétaires et membres d'équipe.

### 🏠 B. Patrimoine & Logements (`/app/biens` & `/app/logements`)
- **Biens / Immeubles** : Gestion multi-unités ou villas individuelles, affectation aux propriétaires, taux d'occupation en temps réel.
- **Logements / Unités** : Typologie (Appartement, Villa, Studio, Magasin), loyers hors charges, charges mensuelles, statuts (Occupé, Vacant, En maintenance).

### 👥 C. Bailleurs & Locataires (`/app/proprietaires` & `/app/locataires`)
- **Fiches Propriétaires** : Coordonnées, taux de commission de gérance (ex: 8%), historique des versements et biens associés.
- **Fiches Locataires** : Dossier locatif, pièces d'identité, garanties, baux associés et historique des paiements.

### 📝 D. Baux & Contrats (`/app/baux`)
- **Création & Signature de Bail** : Date d'entrée, durée, dépôt de garantie, clauses spécifiques.
- **Révision Triennale des Loyers** (`src/lib/leaseRenewal.ts`) : Calcul automatique des indexations et révisions de loyers.
- **Éditeur de Modèles PDF** (`src/components/ui/PdfContractEditor.tsx`) : Personnalisation visuelle et insertion de balises dynamiques (`{nom_locataire}`, `{loyer}`, `{bien}`, etc.).

### 💳 E. Encaissements & Quittances (`/app/paiements`)
- **Saisie des Loyer & Charges** : Prise en charge des modes de paiement (Espèces, Chèque, Virement, Mobile Money).
- **Statuts d'Encaissement** : Badges dynamiques (*Payé*, *Impayé*, *En retard*, *Payé d'avance*, *En attente*).
- **Quittances PDF Instantanées** : Génération et téléchargement de quittances certifiées.

### 💸 F. Reversements Bailleurs (`/app/reversements`)
- **Calcul des Montants Net** : Déduction automatique de la commission d'agence et des frais de réparation sur les loyers collectés.
- **Reçus de Reversement** : Historique complet des décharge de reversement par propriétaire.

### 🔧 G. Maintenance & Incidents (`/locataire/incidents`)
- Signalement par les locataires avec priorité (Faible, Moyenne, Urgente).
- Suivi du cycle de vie des travaux (*Signalé*, *En cours*, *Résolu*).

### 📊 H. Business Intelligence & Rapports (`/app/rapports`)
- Graphiques et indicateurs financiers (Taux d'encaissement, loyers perçus vs loyers dus, commissions agence, taux de vacance).

---

## 📂 4. Structure Complète du Projet

```
GESTIMMO/
├── AGENTS.md                          # Directives graphiques et règles de composants UI
├── GEMINI.md                          # Le présent fichier (Référentiel IA du projet)
├── package.json                       # Dépendances & scripts npm
├── tailwind.config.ts                 # Configuration du thème Tailwind CSS
├── tsconfig.json                      # Aliases TypeScript (@/* -> ./src/*)
└── src/
    ├── app/                           # Architecture App Router Next.js
    │   ├── page.tsx                   # Landing Page / Vitrine SaaS
    │   ├── connexion/                 # Page de connexion unifiée
    │   ├── inscription/               # Formulaire d'inscription agence
    │   ├── tarifs/                    # Offres d'abonnement SaaS
    │   ├── mot-de-passe-oublie/       # Récupération de mot de passe
    │   ├── activer-compte/            # Activation des invitations
    │   │
    │   ├── app/                       # PORTAIL ADMIN / AGENCE
    │   │   ├── page.tsx               # Tableaux de bord principaux & KPIs
    │   │   ├── baux/                  # Liste & détail d'un bail (`[id]`)
    │   │   ├── biens/                 # Liste & détail d'un immeuble/bien (`[id]`)
    │   │   ├── gerants/               # Équipe, rôles & permissions (`[id]`)
    │   │   ├── locataires/            # Répertoire locataires & dossier (`[id]`)
    │   │   ├── logements/             # Unités locatives (`[id]`)
    │   │   ├── notifications/         # Centre d'alertes & relances
    │   │   ├── paiements/             # Encaissements & Quittances (`[id]`)
    │   │   ├── parametres/            # Config agence & modèles PDF
    │   │   ├── proprietaires/         # Bailleurs (`[id]`, `nouveau`)
    │   │   ├── rapports/              # Bilans financiers & analytique
    │   │   ├── resiliations/          # Clôtures de bail & résiliations
    │   │   └── reversements/          # Décharges & reversements bailleurs
    │   │
    │   ├── locataire/                 # PORTAIL LOCATAIRE
    │   │   ├── page.tsx               # Vue d'ensemble du locataire
    │   │   ├── baux/                  # Consultation des contrats
    │   │   ├── incidents/             # Déclaration & suivi de pannes
    │   │   └── quittances/            # Téléchargement des quittances
    │   │
    │   └── proprietaire/              # PORTAIL PROPRIÉTAIRE
    │       ├── page.tsx               # Vue d'ensemble du patrimoine bailleur
    │       ├── biens/                 # Liste de ses biens immobiliers
    │       └── releves/               # Relevés de gérance mensuels
    │
    ├── components/
    │   ├── layout/                    # Sidebars contextuelles (Sidebar.tsx, SidebarLocataire.tsx, SidebarProprietaire.tsx)
    │   ├── providers/                 # Providers de contexte React (Auth, Theme)
    │   └── ui/                        # Composants UI Atomiques
    │       ├── Badge.tsx              # Pastille de statut standardisée
    │       ├── AccessDeniedCard.tsx   # Écran de restriction de droits d'accès
    │       └── PdfContractEditor.tsx   # Éditeur visuel & balises dynamiques pour contrat
    │
    └── lib/                           # Moteurs de données & utilitaires métier
        ├── utils.ts                   # Helper formatFCFA, cn (tailwind-merge)
        ├── storage.ts                 # Interaction IndexedDB pour les fichiers & PDF
        ├── pdfGenerator.ts            # Moteur de rendu PDF dynamique
        ├── leaseRenewal.ts            # Logique d'indexation & révision des baux
        ├── companyCredentials.ts      # Auth & droits des collaborateurs agence
        ├── tenantCredentials.ts       # Auth & accès du portail locataire
        └── ownerCredentials.ts        # Auth & accès du portail propriétaire
```

---

## 🎨 5. Décisions de Design & Conventions UI

Pour maintenir une cohérence parfaite sur l'ensemble des pages, **toutes les modifications graphiques doivent strictly respecter les règles suivantes** (voir aussi [AGENTS.md](file:///c:/Users/NGBONTTI/.gemini/GESTIMMO/AGENTS.md)) :

1. **Formatage Monétaire Obligatoire** :
   - Tout montant doit être formaté via `formatFCFA(valeur)` de [`src/lib/utils.ts`](file:///c:/Users/NGBONTTI/.gemini/GESTIMMO/src/lib/utils.ts).
   - Ne jamais écrire d'unités monétaires en brut (`€`, `$`, `FCFA`). Le format standard est : `150 000 F CFA`.

2. **Conteneurs & Cartes Standardisés** :
   - Utiliser la classe Tailwind : `bg-white p-6 rounded-2xl border border-app-border shadow-sm`.
   - Titres des cartes : `text-lg font-semibold text-gray-900 mb-4`.

3. **Badges de Statut** :
   - Ne pas recréer de styles pour les statuts. Utiliser systématiquement `<Badge variant="..." dot>` ([Badge.tsx](file:///c:/Users/NGBONTTI/.gemini/GESTIMMO/src/components/ui/Badge.tsx)).
   - Variantes disponibles : `success` (Payé), `danger` (Impayé), `alert` (En retard), `warning` (En attente), `info` (Payé d'avance), `default`.

4. **Structure des Data Tables** :
   - Conteneur : `bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col`.
   - En-tête (`thead`) : `bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border`.
   - Lignes (`tbody tr`) : `hover:bg-gray-50/50 transition-colors group`.

---

## 🤖 6. Directives pour l'Agent IA (Mode Modèle / Pair Programming)

En tant qu'assistant IA travaillant sur cette base de code, tu dois suivre ces consignes à chaque intervention :

1. **Relire `GEMINI.md` et `AGENTS.md`** avant d'entamer une refactorisation majeure ou la création d'un nouveau module.
2. **Préserver le typage TypeScript** : Tout nouveau modèle de donnée doit être typé et exporté dans le dossier `src/lib/` approprié.
3. **Respecter l'architecture multi-portail** : Veiller à ce que les routes `/app/`, `/locataire/` et `/proprietaire/` restent indépendantes et utilisent leur propre layout/sidebar.
4. **Vérifier les permissions** : Lors du développement de nouvelles fonctionnalités d'administration, s'assurer que le rôle de l'utilisateur dispose du droit requis (`UserPermissionRights`).
5. **Vérification automatique** : Après chaque modification importante, vérifier le build avec `npm run build` ou `next lint` pour garantir zéro erreur de compilation.
