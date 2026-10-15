# GESTIMMO Design System & UI Rules

Ce document définit les règles de design et les conventions d'interface utilisateur pour le projet GESTIMMO. Ces règles doivent être strictement suivies lors de la création de nouveaux composants et de nouvelles pages afin d'assurer une cohérence visuelle parfaite avec le Dashboard principal (Vue Admin Entreprise).

## 1. Stack Technique
- **Framework** : Next.js 14 (App Router)
- **Styling** : Tailwind CSS
- **Icônes** : `lucide-react` (toujours utiliser ces icônes, taille standard `h-4 w-4` ou `h-5 w-5`)
- **Composants UI partagés** : Utiliser en priorité les composants dans `src/components/ui/` (ex: `Badge.tsx`).

## 2. Conteneurs et Layouts (Cartes et Blocs)
Tous les modules de données, formulaires ou widgets doivent être encapsulés dans un bloc standardisé :
- **Classes standards de bloc** : `bg-white p-6 rounded-2xl border border-app-border shadow-sm`
- **Variante survol (optionnel, pour les cartes cliquables)** : `hover:shadow-md transition-shadow group`
- **Titres de blocs** : `text-lg font-semibold text-gray-900 mb-4`
- **Espacement vertical entre les blocs** : `space-y-6` ou `gap-6` dans une grid.

## 3. Typographie et Couleurs
- **Texte principal (Titres, valeurs clés)** : `text-gray-900`
- **Texte secondaire (Sous-titres, labels, descriptions)** : `text-gray-500` ou `text-gray-400`
- **Montants (Devise)** : Toujours formatter avec la fonction `formatFCFA` (sans centimes, avec le suffixe "F CFA"). Ne jamais hardcoder de sigles monétaires.
- **Couleur Primaire** : Utiliser la classe `primary` (définie dans Tailwind). Ex: `bg-primary`, `text-primary`.

## 4. Boutons et Actions
- **Bouton Primaire (Appel à l'action principal)** : 
  `bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm`
- **Bouton Secondaire / Outline** :
  `bg-white border border-app-border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors`
- **Petits boutons d'action (ex: dans un tableau)** :
  `text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary hover:text-white transition-colors`

## 5. Badges de Statut
Toujours utiliser le composant `<Badge>` (`src/components/ui/Badge.tsx`). Ne jamais réinventer les pastilles de couleur.
- **Prop `variant`** : `success` (Payé), `danger` (Impayé), `alert` (En retard), `warning` (En attente), `info` (Payé d'avance), `default`.
- **Prop `dot`** : `true` pour inclure la petite pastille colorée à l'intérieur du badge.

## 6. Tableaux (Data Tables)
Les tableaux complets doivent respecter la structure suivante :
- **Conteneur** : `bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col`
- **En-tête du tableau (Titre + Filtres/Recherche)** : Dans une `div` avec `p-6 border-b border-app-border`.
- **En-tête de colonnes (`thead`)** : `bg-primary-50/30 text-xs text-gray-500 uppercase tracking-wider border-b border-app-border` avec des `th` en `px-6 py-4 font-medium`.
- **Lignes de données (`tbody tr`)** : `hover:bg-gray-50/50 transition-colors group` avec `divide-y divide-app-border` sur le `tbody`.
- **Cellules (`td`)** : `px-6 py-4 whitespace-nowrap text-sm text-gray-600` (ou `text-gray-900` pour l'information principale).
- **Centrage** : Centrer le texte des colonnes internes (`text-center`) mais garder la première colonne et les actions alignées à gauche/droite.

## 7. Responsive Design
- Utiliser l'approche mobile-first de Tailwind.
- Les grilles complexes doivent passer de `grid-cols-1` (mobile) à `md:grid-cols-2` ou `xl:grid-cols-X` selon l'espace requis.
- Gérer intelligemment l'overflow pour les textes longs (utiliser `truncate` et des attributs `title` quand l'espace est réduit, ou ajuster la taille de police `text-base xl:text-lg`).
