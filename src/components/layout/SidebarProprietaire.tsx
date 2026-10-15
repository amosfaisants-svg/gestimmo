"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Building2, FileText, LogOut, MessageSquare } from "lucide-react";

import { getPortalSession, clearPortalSession } from "@/lib/authSession";
import { getUnreadCountForUser } from "@/lib/messagesService";

const navItems = [
  { name: "Tableau de bord", href: "/proprietaire", icon: Home },
  { name: "Mes biens", href: "/proprietaire/biens", icon: Building2 },
  { name: "Mes relevés", href: "/proprietaire/releves", icon: FileText },
  { name: "Messages", href: "/proprietaire/messages", icon: MessageSquare, isMessageTab: true },
];

export default function SidebarProprietaire() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentOwner, setCurrentOwner] = useState<any>(null);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const updateUnread = (owner: any) => {
    if (!owner) return;
    try {
      const count = getUnreadCountForUser("PROPRIETAIRE", owner);
      setUnreadMsgCount(count);
    } catch (e) {}
  };

  useEffect(() => {
    const owner = getPortalSession("PROPRIETAIRE");
    if (owner) {
      setCurrentOwner(owner);
      updateUnread(owner);
    }

    const handleMessagesUpdate = () => {
      const o = getPortalSession("PROPRIETAIRE") || currentOwner;
      updateUnread(o);
    };

    window.addEventListener("gestimmo_messages_updated", handleMessagesUpdate);
    window.addEventListener("storage", handleMessagesUpdate);

    return () => {
      window.removeEventListener("gestimmo_messages_updated", handleMessagesUpdate);
      window.removeEventListener("storage", handleMessagesUpdate);
    };
  }, []);

  const ownerName = currentOwner?.name || "Kouadio Invest";
  const initials = ownerName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || "PR";
  const ownerType = currentOwner?.type === "entreprise" ? "Entreprise" : "Particulier";

  const handleLogout = () => {
    clearPortalSession("PROPRIETAIRE");
    window.location.href = "/connexion";
  };

  return (
    <div className="w-64 bg-white border-r border-app-border flex flex-col min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary tracking-tight">GESTIMMO</h1>
        <p className="text-xs text-gray-500 mt-1 font-medium">Espace Propriétaire</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-primary-50/50 text-primary"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center">
                <Icon
                  className={`w-5 h-5 mr-3 transition-colors ${
                    isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-600"
                  }`}
                />
                {item.name}
              </div>
              {item.isMessageTab && unreadMsgCount > 0 && (
                <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-xs">
                  {unreadMsgCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-app-border">
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary font-bold text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{ownerName}</p>
            <p className="text-xs text-gray-500 truncate">{ownerType}</p>
          </div>
        </div>
        <button 
          type="button"
          onClick={handleLogout}
          className="w-full mt-2 flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" /> Déconnexion
        </button>
      </div>
    </div>
  );
}
