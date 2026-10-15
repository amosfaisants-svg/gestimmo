import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 text-center">
      <h1 className="text-6xl font-extrabold text-primary mb-2">404</h1>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Page introuvable</h2>
      <p className="text-gray-600 mb-6 max-w-md">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link
        href="/app"
        className="bg-primary text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:bg-primary/90 transition-colors"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
