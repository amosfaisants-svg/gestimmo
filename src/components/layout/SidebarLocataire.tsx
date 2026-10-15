"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, CreditCard, AlertTriangle, LogOut, MessageSquare } from "lucide-react";

import { getPortalSession, clearPortalSession } from "@/lib/authSession";
import { getUnreadCountForUser } from "@/lib/messagesService";

const navItems = [
  { name: "Tableau de bord", href: "/locataire", icon: Home },
  { name: "Mon contrat", href: "/locataire/baux", icon: FileText },
  { name: "Mes quittances", href: "/locataire/quittances", icon: CreditCard },
  { name: "Signaler un incident", href: "/locataire/incidents", icon: AlertTriangle },
  { name: "Messages", href: "/locataire/messages", icon: MessageSquare, isMessageTab: true },
];

export default function SidebarLocataire() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const updateUnread = (user: any) => {
    if (!user) return;
    try {
      const count = getUnreadCountForUser("LOCATAIRE", user);
      setUnreadMsgCount(count);
    } catch (e) {}
  };

  useEffect(() => {
    const user = getPortalSession("LOCATAIRE");
    if (user) {
      setCurrentUser(user);
      updateUnread(user);
    }

    const handleMessagesUpdate = () => {
      const u = getPortalSession("LOCATAIRE") || currentUser;
      updateUnread(u);
    };

    window.addEventListener("gestimmo_messages_updated", handleMessagesUpdate);
    window.addEventListener("storage", handleMessagesUpdate);

    return () => {
      window.removeEventListener("gestimmo_messages_updated", handleMessagesUpdate);
      window.removeEventListener("storage", handleMessagesUpdate);
    };
  }, []);

  const tenantName = currentUser?.name || "John Doe";
  const initials = tenantName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || "LC";

  const handleLogout = () => {
    clearPortalSession("LOCATAIRE");
    window.location.href = "/connexion";
  };

  return (
    <div className="w-64 bg-white border-r border-app-border flex flex-col min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary tracking-tight">GESTIMMO</h1>
        <p className="text-xs text-gray-500 mt-1 font-medium">Espace Locataire</p>
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
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{tenantName}</p>
            <p className="text-xs text-gray-500 truncate">{currentUser?.login || "Locataire"}</p>
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
