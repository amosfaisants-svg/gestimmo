"use client";

export type MessageRecipientType = 'locataire' | 'gerant' | 'proprietaire' | 'equipe';
export type MessagePriority = 'normal' | 'important' | 'urgent';
export type MessageStatus = 'envoyé' | 'lu';

export interface UserMessage {
  id: string;
  senderId?: string;
  senderName: string;
  senderRole?: string;
  recipientType: MessageRecipientType;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientUnit?: string;
  subject: string;
  content: string;
  priority: MessagePriority;
  status: MessageStatus; // 'envoyé' or 'lu'
  sentAt: string;
  sentDateFormatted: string;
  readAt?: string | null;
  readDateFormatted?: string | null;
  readBy?: string | null;
  category?: string;
}

const STORAGE_KEY = "gestimmo_messages";

export const formatMessageDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} à ${hours}:${minutes}`;
};

const initialDefaultMessages: UserMessage[] = [
  {
    id: "msg-kore-retard-01",
    senderName: "Direction GESTIMMO",
    senderRole: "Service Gestion Locative",
    recipientType: "locataire",
    recipientId: "7be6d1fd-564b-4752-a149-4f3ccece69f2",
    recipientName: "KORE MOÏSE",
    recipientEmail: "",
    recipientPhone: "0798346597",
    recipientUnit: "Appartement A11",
    subject: "Avis d'impayé : Retard de loyer de 6 mois (960 000 F CFA)",
    content: "Bonjour M. KORE MOÏSE,\n\nSauf erreur ou omission de notre part, nous constatons qu'aucun règlement de loyer n'a été enregistré pour votre logement (Appartement A11 - Résidence A LIMMEUBLE) depuis votre dernier paiement correspondant au mois d'Avril 2026.\n\nAu vu de la période d'échéance en cours correspondant à la date d'aujourd'hui (Octobre 2026), votre dossier présente un retard de paiement caractérisé :\n• Retard en mois : 6 mois d'arriérés (Mai 2026, Juin 2026, Juillet 2026, Août 2026, Septembre 2026 et Octobre 2026)\n• Retard en jours : 176 jours de retard cumulés (depuis l'échéance du 5 mai 2026)\n• Montant total impayé : 960 000 F CFA (soit 6 mois × 160 000 F CFA)\n\nNous vous prions de bien vouloir régulariser votre situation sans délai via votre espace locataire en ligne ou en contactant notre service gestion au 01 02 03 04 05.\n\nDirection GESTIMMO",
    priority: "urgent",
    status: "envoyé",
    sentAt: new Date().toISOString(),
    sentDateFormatted: "Aujourd'hui à 10:00",
    readAt: null,
    readDateFormatted: null,
  },
  {
    id: "msg-101",
    senderName: "Kouassi Jean-Philippe",
    senderRole: "Administrateur",
    recipientType: "locataire",
    recipientId: "LOC-101",
    recipientName: "Cora Richards",
    recipientEmail: "cora.richards@email.com",
    recipientUnit: "A-101",
    subject: "Rappel : État des lieux de sortie et remise des clés",
    content: "Bonjour Mme Richards, suite à votre préavis de départ, nous vous confirmons que l'état des lieux de sortie est programmé pour la fin du mois. Merci de vous assurer que le logement A-101 est entièrement vidé et nettoyé avant notre passage.",
    priority: "important",
    status: "envoyé",
    sentAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    sentDateFormatted: "Aujourd'hui à 09:30",
    readAt: null,
    readDateFormatted: null,
  },
  {
    id: "msg-102",
    senderName: "Kouassi Jean-Philippe",
    senderRole: "Administrateur",
    recipientType: "gerant",
    recipientId: "USR-002",
    recipientName: "Konan Patricia",
    recipientEmail: "patricia.konan@immogestion-pro.ci",
    subject: "Validation des quittances de loyer de la semaine",
    content: "Bonjour Patricia, pourrais-tu vérifier et valider la série de quittances émises hier pour les locataires de la Résidence Riviera ? Armand a déjà pointé les virements bancaires correspondants.",
    priority: "normal",
    status: "lu",
    sentAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    sentDateFormatted: "Hier à 14:15",
    readAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    readDateFormatted: "Hier à 20:10",
    readBy: "Konan Patricia",
  },
  {
    id: "msg-103",
    senderName: "Agence GESTIMMO",
    senderRole: "Service Comptabilité",
    recipientType: "proprietaire",
    recipientId: "PR-001",
    recipientName: "Kouadio Invest",
    subject: "Mise à disposition de votre relevé de gérance trimestriel",
    content: "Cher Bailleur, votre relevé de gérance pour le trimestre écoulé est disponible dans votre espace dédié. Le reversement des loyers nets perçus a été validé.",
    priority: "important",
    status: "lu",
    sentAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    sentDateFormatted: "Il y a 2 jours",
    readAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    readDateFormatted: "Il y a 1 jour à 18:00",
    readBy: "Kouadio Invest",
  },
  {
    id: "msg-104",
    senderName: "Agence GESTIMMO",
    senderRole: "Gestion locative",
    recipientType: "locataire",
    recipientId: "LOC-204",
    recipientName: "Alistair Dunlap",
    recipientUnit: "B-204",
    subject: "Alerte : Régularisation d'impayé de loyer",
    content: "Bonjour M. Dunlap, nous constatons un retard sur le paiement de votre loyer pour l'appartement B-204. Nous vous prions de régulariser la situation dans les meilleurs délais ou de contacter notre service gestion.",
    priority: "urgent",
    status: "envoyé",
    sentAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    sentDateFormatted: "Aujourd'hui à 11:00",
    readAt: null,
    readDateFormatted: null,
  }
];

import { getActiveCompanyId, DEFAULT_MAIN_COMPANY_ID } from "./authSession";

export function getStoredMessages(): UserMessage[] {
  if (typeof window === "undefined") return [];

  const isMainCompany = getActiveCompanyId() === DEFAULT_MAIN_COMPANY_ID;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = isMainCompany ? initialDefaultMessages : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (isMainCompany) {
        const hasKoreMsg = parsed.some((m: any) => m.id === "msg-kore-retard-01" || (m.recipientName && m.recipientName.toUpperCase().includes("KORE")));
        if (!hasKoreMsg) {
          const koreMsg = initialDefaultMessages.find((m) => m.id === "msg-kore-retard-01");
          if (koreMsg) {
            parsed.unshift(koreMsg);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
        }
      }
      return parsed;
    }
    return isMainCompany ? initialDefaultMessages : [];
  } catch (e) {
    console.error("Error reading stored messages:", e);
    return [];
  }
}

export function saveStoredMessages(messages: UserMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    window.dispatchEvent(new Event("gestimmo_messages_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Error saving stored messages:", e);
  }
}

export function sendMessage(data: {
  senderId?: string;
  senderName: string;
  senderRole?: string;
  recipientType: MessageRecipientType;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientUnit?: string;
  subject: string;
  content: string;
  priority?: MessagePriority;
  category?: string;
}): UserMessage {
  const currentMessages = getStoredMessages();
  const now = new Date();

  const newMessage: UserMessage = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    senderId: data.senderId || "admin",
    senderName: data.senderName || "Administration GESTIMMO",
    senderRole: data.senderRole || "Agence",
    recipientType: data.recipientType,
    recipientId: data.recipientId,
    recipientName: data.recipientName,
    recipientEmail: data.recipientEmail,
    recipientPhone: data.recipientPhone,
    recipientUnit: data.recipientUnit,
    subject: data.subject.trim(),
    content: data.content.trim(),
    priority: data.priority || "normal",
    status: "envoyé", // Initial status is strictly "envoyé"
    sentAt: now.toISOString(),
    sentDateFormatted: formatMessageDate(now),
    readAt: null,
    readDateFormatted: null,
    readBy: null,
    category: data.category || "général",
  };

  const updated = [newMessage, ...currentMessages];
  saveStoredMessages(updated);

  // Sync to gestimmo_notifications for cross-module integration
  try {
    const rawNotifs = localStorage.getItem("gestimmo_notifications");
    const notifs = rawNotifs ? JSON.parse(rawNotifs) : [];
    if (Array.isArray(notifs)) {
      notifs.unshift({
        id: `auto-msg-${newMessage.id}`,
        type: newMessage.priority === "urgent" ? "ALERT" : newMessage.priority === "important" ? "WARNING" : "INFO",
        title: `Message envoyé à ${newMessage.recipientName} : ${newMessage.subject}`,
        message: newMessage.content.slice(0, 140) + (newMessage.content.length > 140 ? "..." : ""),
        date: "À l'instant",
        read: false,
        link: "/app/notifications",
        category: "general",
      });
      localStorage.setItem("gestimmo_notifications", JSON.stringify(notifs));
      window.dispatchEvent(new Event("gestimmo_notifications_updated"));
    }
  } catch (e) {
    console.error("Error creating notification mirror:", e);
  }

  return newMessage;
}

export function markMessageAsRead(id: string, readByUserName?: string): UserMessage | null {
  const currentMessages = getStoredMessages();
  let found: UserMessage | null = null;
  const now = new Date();

  const updated = currentMessages.map((msg) => {
    if (msg.id === id) {
      if (msg.status !== "lu") {
        found = {
          ...msg,
          status: "lu",
          readAt: now.toISOString(),
          readDateFormatted: formatMessageDate(now),
          readBy: readByUserName || msg.recipientName || "Destinataire",
        };
        return found;
      }
      found = msg;
    }
    return msg;
  });

  if (found) {
    saveStoredMessages(updated);
  }
  return found;
}

export function deleteMessage(id: string): void {
  const currentMessages = getStoredMessages();
  const updated = currentMessages.filter((m) => m.id !== id);
  saveStoredMessages(updated);
}

/**
 * Filter messages for a given user and portal type.
 */
export function getMessagesForUser(portal: 'LOCATAIRE' | 'PROPRIETAIRE' | 'ADMIN', user: any): UserMessage[] {
  const messages = getStoredMessages();
  if (!user) return [];

  const userName = (user.name || user.tenantName || user.ownerName || "").trim().toLowerCase();
  const userId = (user.id || user.tenantId || user.login || "").trim().toLowerCase();

  return messages.filter((msg) => {
    if (portal === 'LOCATAIRE') {
      if (msg.recipientType !== 'locataire') return false;
      if (msg.recipientId === 'all_tenants' || msg.recipientId === 'all') return true;
      if (userId && msg.recipientId && msg.recipientId.toLowerCase() === userId) return true;
      if (userName && msg.recipientName && msg.recipientName.trim().toLowerCase() === userName) return true;
      return false;
    }

    if (portal === 'PROPRIETAIRE') {
      if (msg.recipientType !== 'proprietaire') return false;
      if (msg.recipientId === 'all_owners' || msg.recipientId === 'all') return true;
      if (userId && msg.recipientId && msg.recipientId.toLowerCase() === userId) return true;
      if (userName && msg.recipientName && msg.recipientName.trim().toLowerCase() === userName) return true;
      return false;
    }

    if (portal === 'ADMIN') {
      // In admin portal, gérants/team members can see messages addressed to them, or to all team
      if (msg.recipientType === 'gerant' || msg.recipientType === 'equipe') {
        if (msg.recipientId === 'all_team' || msg.recipientId === 'all_gerants') return true;
        if (userId && msg.recipientId && msg.recipientId.toLowerCase() === userId) return true;
        if (userName && msg.recipientName && msg.recipientName.trim().toLowerCase() === userName) return true;
      }
      return true; // Admin has visibility
    }

    return false;
  });
}

export function getUnreadCountForUser(portal: 'LOCATAIRE' | 'PROPRIETAIRE' | 'ADMIN', user: any): number {
  const userMessages = getMessagesForUser(portal, user);
  return userMessages.filter((m) => m.status === 'envoyé').length;
}
