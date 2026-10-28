"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, FileText, LogOut, MessageSquare, Clock } from "lucide-react";

import { getPortalSession, clearPortalSession } from "@/lib/authSession";
import { getUnreadCountForUser } from "@/lib/messagesService";
import { isPendingRentsVisibleForOwner } from "@/lib/portalSettings";

export default function SidebarProprietaire() {
  const pathname = usePathname();
  const [currentOwner, setCurrentOwner] = useState<any>(null);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [canViewPendingRents, setCanViewPendingRents] = useState(true);
  const [pendingRentsCount, setPendingRentsCount] = useState(0);

  const updateUnread = (owner: any) => {
    if (!owner) return;
    try {
      const count = getUnreadCountForUser("PROPRIETAIRE", owner);
      setUnreadMsgCount(count);
    } catch (e) {}
  };

  const updatePendingCount = (owner: any) => {
    if (!owner) return;
    try {
      const ownerName = (owner.name || owner.full_name || "").trim().toUpperCase();
      const ownerId = (owner.id || "").trim();

      const storedBiens = localStorage.getItem("gestimmo_biens");
      const biens: any[] = storedBiens ? JSON.parse(storedBiens) : [];
      const myBiens = biens.filter(
        (b: any) =>
          (b.ownerId && ownerId && String(b.ownerId) === String(ownerId)) ||
          (b.owner && ownerName && b.owner.trim().toUpperCase() === ownerName)
      );
      const myBiensIds = myBiens.map((b: any) => String(b.id));
      const myBiensNames = myBiens.map((b: any) => (b.name || "").trim().toUpperCase());

      const storedLogements = localStorage.getItem("gestimmo_logements");
      const logements: any[] = storedLogements ? JSON.parse(storedLogements) : [];
      const myLogements = logements.filter(
        (l: any) =>
          (l.ownerId && ownerId && String(l.ownerId) === String(ownerId)) ||
          (l.owner && ownerName && l.owner.trim().toUpperCase() === ownerName) ||
          (l.propertyId && myBiensIds.includes(String(l.propertyId))) ||
          (l.property && myBiensNames.includes((l.property || "").trim().toUpperCase()))
      );
      const myLogementsIds = myLogements.map((l: any) => String(l.id).toLowerCase());
      const myLogementsNames = myLogements
        .map((l: any) => (l.unit || l.name || l.unit_number || "").trim().toLowerCase())
        .filter(Boolean);

      const storedPaiements = localStorage.getItem("gestimmo_paiements");
      const paiements: any[] = storedPaiements ? JSON.parse(storedPaiements) : [];
      const myPaiements = paiements.filter((p: any) => {
        const isPaid = p.status === "VALIDÉ" || p.status === "PAYÉ";
        if (!isPaid) return false;
        const pOwnerId = String(p.ownerId || p.owner_id || "").trim();
        const pOwner = String(p.owner || "").trim().toUpperCase();
        if (pOwnerId && ownerId && pOwnerId === ownerId) return true;
        if (pOwner && ownerName && pOwner === ownerName) return true;
        const pUnit = String(p.unitId || p.unit_id || p.unit || "").trim().toLowerCase();
        if (pUnit && (myLogementsIds.includes(pUnit) || myLogementsNames.includes(pUnit))) return true;
        const pProp = String(p.propertyId || p.property || p.bien || "").trim().toUpperCase();
        if (pProp && (myBiensIds.includes(pProp) || myBiensNames.includes(pProp))) return true;
        return false;
      });

      const storedReversements = localStorage.getItem("gestimmo_reversements");
      const reversements: any[] = storedReversements ? JSON.parse(storedReversements) : [];
      const myRev = reversements.filter(
        (r: any) =>
          ((r.ownerId && ownerId && String(r.ownerId) === String(ownerId)) ||
            (r.owner && ownerName && r.owner.trim().toUpperCase() === ownerName)) &&
          (r.status === "EFFECTUÉ" || r.status === "EFFECTUE")
      );

      // Group payments by period
      const paymentsByPeriod: Record<string, any[]> = {};
      myPaiements.forEach((p: any) => {
        const periodKey = (p.period || p.period_month || "Inconnue").trim().toLowerCase();
        if (!paymentsByPeriod[periodKey]) paymentsByPeriod[periodKey] = [];
        paymentsByPeriod[periodKey].push(p);
      });

      let pendingTotalCount = 0;
      Object.keys(paymentsByPeriod).forEach((per) => {
        const pList = paymentsByPeriod[per];
        // Sort chronologically
        pList.sort((a, b) => {
          const tA = new Date(a.payment_date || a.date || a.created_at || 0).getTime();
          const tB = new Date(b.payment_date || b.date || b.created_at || 0).getTime();
          return tA - tB;
        });

        // Total reversed for this period
        const periodRevTotal = myRev
          .filter((r) => (r.period || r.period_month || "").trim().toLowerCase() === per)
          .reduce((sum, r) => sum + (Number(r.collected) || Number(r.amount) || 0), 0);

        let coveredSum = 0;
        pList.forEach((p) => {
          const amt = Number(p.amount) || 0;
          if (coveredSum + amt <= periodRevTotal) {
            coveredSum += amt;
          } else {
            pendingTotalCount += 1;
          }
        });
      });

      setPendingRentsCount(pendingTotalCount);
    } catch (e) {}
  };

  useEffect(() => {
    let owner = getPortalSession("PROPRIETAIRE");
    if (!owner) {
      const storedUser = localStorage.getItem("gestimmo_current_user");
      if (storedUser) {
        try { owner = JSON.parse(storedUser); } catch (e) {}
      }
    }

    const storedOwners = localStorage.getItem("gestimmo_proprietaires");
    if (storedOwners) {
      try {
        const list = JSON.parse(storedOwners);
        const found = list.find((o: any) => (owner?.id && o.id === owner.id) || (owner?.name && o.name === owner.name));
        if (found) owner = found;
      } catch {}
    }

    setCurrentOwner(owner);
    updateUnread(owner);
    setCanViewPendingRents(isPendingRentsVisibleForOwner(owner));
    updatePendingCount(owner);

    const handleUpdate = () => {
      let o = getPortalSession("PROPRIETAIRE");
      const sOwners = localStorage.getItem("gestimmo_proprietaires");
      if (sOwners && o) {
        try {
          const list = JSON.parse(sOwners);
          const found = list.find((x: any) => (o.id && x.id === o.id) || (o.name && x.name === o.name));
          if (found) o = found;
        } catch {}
      }
      setCurrentOwner(o);
      updateUnread(o);
      setCanViewPendingRents(isPendingRentsVisibleForOwner(o));
      updatePendingCount(o);
    };

    window.addEventListener("gestimmo_messages_updated", handleUpdate);
    window.addEventListener("gestimmo_portal_settings_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("gestimmo_messages_updated", handleUpdate);
      window.removeEventListener("gestimmo_portal_settings_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const ownerName = currentOwner?.name || currentOwner?.full_name || "Kouadio Invest";
  const initials = ownerName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || "PR";
  const ownerType = currentOwner?.type === "entreprise" ? "Entreprise" : "Particulier";

  const handleLogout = () => {
    clearPortalSession("PROPRIETAIRE");
    window.location.href = "/connexion";
  };

  // Build navigation items dynamically
  const navItems = [
    { name: "Tableau de bord", href: "/proprietaire", icon: Home },
    { name: "Mes biens", href: "/proprietaire/biens", icon: Building2 },
    { name: "Mes relevés", href: "/proprietaire/releves", icon: FileText },
  ];

  if (canViewPendingRents) {
    navItems.push({
      name: "Loyers en attente",
      href: "/proprietaire/loyers-en-attente",
      icon: Clock,
      badgeCount: pendingRentsCount,
    } as any);
  }

  navItems.push({
    name: "Messages",
    href: "/proprietaire/messages",
    icon: MessageSquare,
    isMessageTab: true,
  } as any);

  return (
    <div className="w-64 bg-white border-r border-app-border flex flex-col min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary tracking-tight">GESTIMMO</h1>
        <p className="text-xs text-gray-500 mt-1 font-medium">Espace Propriétaire</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item: any) => {
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

              {/* Message Badge */}
              {item.isMessageTab && unreadMsgCount > 0 && (
                <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-xs">
                  {unreadMsgCount}
                </span>
              )}

              {/* Pending Rents Badge */}
              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-primary border border-blue-200">
                  {item.badgeCount}
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
