"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, CreditCard, AlertTriangle, LogOut, MessageSquare, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [isOpen, setIsOpen] = useState(false);
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
    <>
      {/* Barre supérieure mobile */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-app-border px-4 flex items-center justify-between shadow-xs print:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 -ml-1 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-2"
          aria-label="Ouvrir le menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="text-xs font-semibold text-gray-700">Menu</span>
        </button>

        <div className="text-center">
          <span className="text-base font-bold text-primary tracking-tight">GESTIMMO</span>
          <span className="ml-1.5 text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            Locataire
          </span>
        </div>

        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
          {initials}
        </div>
      </div>

      {/* Tiroir / Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-app-border flex flex-col min-h-screen transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static print:hidden",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">GESTIMMO</h1>
            <p className="text-xs text-gray-500 mt-1 font-medium">Espace Locataire</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
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
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
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

      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
