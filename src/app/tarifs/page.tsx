import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function TarifsPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Public Navbar (Simplified for this page) */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary tracking-tight">GESTIMMO</Link>
          <div className="flex items-center gap-4">
            <Link href="/connexion" className="text-sm font-medium text-gray-600 hover:text-gray-900">Se connecter</Link>
            <Link href="/inscription" className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm">Essai gratuit</Link>
          </div>
        </div>
      </header>

      <main className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">Des tarifs simples, sans surprise.</h1>
          <p className="mt-4 text-lg text-gray-500">Choisissez le plan adapté à la taille de votre parc immobilier. Démarrez gratuitement, sans carte de crédit.</p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Plan Starter */}
          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm flex flex-col">
            <h3 className="text-xl font-semibold text-gray-900">Starter</h3>
            <p className="text-sm text-gray-500 mt-2">Pour les propriétaires indépendants.</p>
            <div className="my-6">
              <span className="text-4xl font-extrabold text-gray-900">9 900</span>
              <span className="text-gray-500 font-medium"> FCFA/mois</span>
            </div>
            <Link href="/inscription" className="w-full py-3 px-4 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl text-center font-semibold hover:bg-gray-100 transition-colors mb-8">
              Commencer l'essai
            </Link>
            <ul className="space-y-4 flex-1">
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-600">Jusqu'à 15 appartements</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-600">Suivi des loyers</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-600">Génération de quittances</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-600">1 Utilisateur</span></li>
            </ul>
          </div>

          {/* Plan Pro */}
          <div className="bg-gray-900 rounded-3xl border border-gray-800 p-8 shadow-xl flex flex-col relative transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Le plus populaire</div>
            <h3 className="text-xl font-semibold text-white">Professionnel</h3>
            <p className="text-sm text-gray-400 mt-2">Pour les agences et syndics.</p>
            <div className="my-6">
              <span className="text-4xl font-extrabold text-white">24 900</span>
              <span className="text-gray-400 font-medium"> FCFA/mois</span>
            </div>
            <Link href="/inscription" className="w-full py-3 px-4 bg-primary text-white rounded-xl text-center font-semibold hover:bg-primary/90 transition-colors mb-8 shadow-lg shadow-primary/25">
              Démarrer maintenant
            </Link>
            <ul className="space-y-4 flex-1">
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-300">Appartements illimités</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-300">Espaces Locataire & Propriétaire</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-300">Paiement en ligne (Mobile Money)</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-300">Génération automatique des baux</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-300">Jusqu'à 5 Utilisateurs</span></li>
            </ul>
          </div>

          {/* Plan Enterprise */}
          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm flex flex-col">
            <h3 className="text-xl font-semibold text-gray-900">Entreprise</h3>
            <p className="text-sm text-gray-500 mt-2">Pour les grands groupes immobiliers.</p>
            <div className="my-6">
              <span className="text-4xl font-extrabold text-gray-900">Sur devis</span>
            </div>
            <a href="mailto:commercial@gestimmo.ci?subject=Demande%20de%20devis%20offre%20Entreprise%20GESTIMMO" className="w-full py-3 px-4 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl text-center font-semibold hover:bg-gray-100 transition-colors mb-8">
              Contacter les ventes
            </a>
            <ul className="space-y-4 flex-1">
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-600">Tout du plan Pro</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-600">Marque blanche complète</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-600">Utilisateurs illimités</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-600">API et Webhooks</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mr-3" /> <span className="text-sm text-gray-600">Manager de compte dédié</span></li>
            </ul>
          </div>

        </div>
      </main>
    </div>
  );
}
