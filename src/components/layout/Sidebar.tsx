"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building,
  Home,
  Users,
  FileText,
  CreditCard,
  UserSquare,
  ArrowRightLeft,
  DoorOpen,
  UserCog,
  BarChart3,
  Bell,
  Settings,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";

const allNavItems = [
  { name: "Dashboard", href: "/app", icon: LayoutDashboard, moduleKey: null, gerantName: "Espace Gérant" },
  { name: "Appartements", href: "/app/logements", icon: Building, moduleKey: "biens" as const, gerantName: "Mes Appartements" },
  { name: "Biens", href: "/app/biens", icon: Home, moduleKey: "biens" as const, adminOnly: true },
  { name: "Locataires", href: "/app/locataires", icon: Users, moduleKey: "locataires" as const, gerantName: "Mes Locataires" },
  { name: "Baux/Contrats", href: "/app/baux", icon: FileText, moduleKey: "baux" as const, gerantName: "Mes Baux/Contrats" },
  { name: "Paiements", href: "/app/paiements", icon: CreditCard, moduleKey: "paiements" as const, gerantName: "Reçus & Paiements" },
  { name: "Propriétaires", href: "/app/proprietaires", icon: UserSquare, moduleKey: "biens" as const, adminOnly: true },
  { name: "Reversements & relevés", href: "/app/reversements", icon: ArrowRightLeft, moduleKey: "paiements" as const, adminOnly: true },
  { name: "Résiliations", href: "/app/resiliations", icon: DoorOpen, moduleKey: "baux" as const, adminOnly: true },
  { name: "Gérants", href: "/app/gerants", icon: UserCog, moduleKey: "parametres" as const, adminOnly: true },
  { name: "Rapports", href: "/app/rapports", icon: BarChart3, moduleKey: "paiements" as const, adminOnly: true },
  { name: "Notifications", href: "/app/notifications", icon: Bell, moduleKey: null },
  { name: "Paramètres", href: "/app/parametres", icon: Settings, moduleKey: "parametres" as const, adminOnly: true },
];

import { clearPortalSession } from "@/lib/authSession";
import { getStoredCompanyInfo } from "@/lib/companyInfo";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, can, isGerant } = usePermissions();

  const handleLogout = () => {
    clearPortalSession("ADMIN");
    window.location.href = "/connexion";
  };

  const userRole = currentUser?.role || (isGerant ? "Gérant" : "Administrateur");
  const userName = currentUser?.name || (isGerant ? "Sarah Kone" : "Kouassi Jean-Philippe");
  const userInitials = userName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "AD";

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; logo: string } | null>(null);

  useEffect(() => {
    const updateCount = () => {
      try {
        const raw = localStorage.getItem("gestimmo_notifications");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            setUnreadNotifCount(list.filter((n: any) => !n.read).length);
          }
        } else {
          setUnreadNotifCount(2); // default unread count
        }
      } catch (e) {}
    };

    const updateCompany = () => {
      try {
        const info = getStoredCompanyInfo();
        setCompanyInfo(info);
      } catch (e) {}
    };

    updateCount();
    updateCompany();

    window.addEventListener("storage", updateCount);
    window.addEventListener("storage", updateCompany);
    window.addEventListener("gestimmo_company_updated", updateCompany as any);
    window.addEventListener("gestimmo_messages_updated", updateCount);
    window.addEventListener("gestimmo_notifications_updated", updateCount);

    return () => {
      window.removeEventListener("storage", updateCount);
      window.removeEventListener("storage", updateCompany);
      window.removeEventListener("gestimmo_company_updated", updateCompany as any);
      window.removeEventListener("gestimmo_messages_updated", updateCount);
      window.removeEventListener("gestimmo_notifications_updated", updateCount);
    };
  }, []);

  // Filter nav items based on user permissions & gerant status
  const navItems = allNavItems
    .filter((item) => {
      if (isGerant && item.adminOnly) return false;
      if (!item.moduleKey) return true;
      return can(item.moduleKey, "view");
    })
    .map((item) => ({
      ...item,
      name: isGerant && item.gerantName ? item.gerantName : item.name,
    }));

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-sm border border-app-border print:hidden"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-app-border transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:flex md:flex-col print:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 flex items-center space-x-3">
          {companyInfo?.logo ? (
            <img src={companyInfo.logo} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white border border-gray-100" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Home className="text-white h-5 w-5" />
            </div>
          )}
          <span className="text-xl font-bold text-gray-900 truncate" title={companyInfo?.name || "GESTIMMO"}>
            {companyInfo?.name || "GESTIMMO"}
          </span>
        </div>

        {/* Use overflow-y-auto and styled scrollbar for a long menu */}
        <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/app");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5",
                    isActive ? "text-primary" : "text-gray-400"
                  )}
                  aria-hidden="true"
                />
                <span className="flex-1">{item.name}</span>
                {item.name === "Notifications" && unreadNotifCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                    {unreadNotifCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile & logout footer */}
        <div className="p-4 border-t border-app-border mt-auto space-y-2">
          <div className="bg-gray-50 p-3 rounded-xl border border-app-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-900 truncate" title={userName}>{userName}</p>
              <p className="text-[11px] text-gray-500 truncate">{userRole}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
