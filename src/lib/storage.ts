import { generateDefaultContratBail, generateDefaultReglementInterieur } from "@/lib/pdfGenerator";

export interface CustomDocumentTemplate {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileKey: string;
  dateAdded: string;
}

export interface OwnerTemplatesConfig {
  contratFileName?: string;
  contratFileKey?: string;
  reglementFileName?: string;
  reglementFileKey?: string;
  customTemplates?: CustomDocumentTemplate[];
}

export const savePdfTemplate = async (base64: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("GestimmoDB", 1);
    request.onupgradeneeded = (e: any) => {
      if (!e.target.result.objectStoreNames.contains("files")) {
        e.target.result.createObjectStore("files");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(base64, "gestimmo_modele_contrat");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getPdfTemplate = async (): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("GestimmoDB", 1);
    request.onupgradeneeded = (e: any) => {
      if (!e.target.result.objectStoreNames.contains("files")) {
        e.target.result.createObjectStore("files");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("files")) {
        resolve(null);
        return;
      }
      const tx = db.transaction("files", "readonly");
      const getReq = tx.objectStore("files").get("gestimmo_modele_contrat");
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveReglementTemplate = async (base64: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("GestimmoDB", 1);
    request.onupgradeneeded = (e: any) => {
      if (!e.target.result.objectStoreNames.contains("files")) {
        e.target.result.createObjectStore("files");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(base64, "gestimmo_modele_reglement");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getReglementTemplate = async (): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("GestimmoDB", 1);
    request.onupgradeneeded = (e: any) => {
      if (!e.target.result.objectStoreNames.contains("files")) {
        e.target.result.createObjectStore("files");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("files")) {
        resolve(null);
        return;
      }
      const tx = db.transaction("files", "readonly");
      const getReq = tx.objectStore("files").get("gestimmo_modele_reglement");
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveGenericTemplate = async (key: string, base64: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("GestimmoDB", 1);
    request.onupgradeneeded = (e: any) => {
      if (!e.target.result.objectStoreNames.contains("files")) {
        e.target.result.createObjectStore("files");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(base64, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getGenericTemplate = async (key: string): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("GestimmoDB", 1);
    request.onupgradeneeded = (e: any) => {
      if (!e.target.result.objectStoreNames.contains("files")) {
        e.target.result.createObjectStore("files");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("files")) {
        resolve(null);
        return;
      }
      const tx = db.transaction("files", "readonly");
      const getReq = tx.objectStore("files").get(key);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteGenericTemplate = async (key: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("GestimmoDB", 1);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("files")) {
        resolve();
        return;
      }
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getAllStoredFiles = async (): Promise<Record<string, string>> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve({});
      return;
    }
    const request = indexedDB.open("GestimmoDB", 1);
    request.onupgradeneeded = (e: any) => {
      if (!e.target.result.objectStoreNames.contains("files")) {
        e.target.result.createObjectStore("files");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("files")) {
        resolve({});
        return;
      }
      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const filesMap: Record<string, string> = {};
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (ev: any) => {
        const cursor = ev.target.result;
        if (cursor) {
          filesMap[String(cursor.key)] = String(cursor.value);
          cursor.continue();
        } else {
          resolve(filesMap);
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const restoreStoredFiles = async (filesMap: Record<string, string>): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB || !filesMap) {
      resolve();
      return;
    }
    const request = indexedDB.open("GestimmoDB", 1);
    request.onupgradeneeded = (e: any) => {
      if (!e.target.result.objectStoreNames.contains("files")) {
        e.target.result.createObjectStore("files");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      Object.entries(filesMap).forEach(([key, val]) => {
        store.put(val, key);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getOrGenerateContratTemplate = async (ownerName?: string, fileKey?: string): Promise<string> => {
  let base64: string | null = null;
  if (fileKey) {
    try {
      base64 = await getGenericTemplate(fileKey);
    } catch {}
  }
  if (!base64) {
    try {
      base64 = await getPdfTemplate();
    } catch {}
  }
  if (!base64 && typeof window !== "undefined") {
    try {
      base64 = localStorage.getItem("gestimmo_modele_contrat");
    } catch {}
  }
  if (!base64) {
    base64 = await generateDefaultContratBail({ ownerName });
  }
  return base64;
};

export const getOrGenerateReglementTemplate = async (ownerName?: string, fileKey?: string): Promise<string> => {
  let base64: string | null = null;
  if (fileKey) {
    try {
      base64 = await getGenericTemplate(fileKey);
    } catch {}
  }
  if (!base64) {
    try {
      base64 = await getReglementTemplate();
    } catch {}
  }
  if (!base64 && typeof window !== "undefined") {
    try {
      base64 = localStorage.getItem("gestimmo_modele_reglement");
    } catch {}
  }
  if (!base64) {
    base64 = await generateDefaultReglementInterieur({ ownerName });
  }
  return base64;
};

