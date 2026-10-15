/**
 * Utilitaire de traitement et compression d'images pour les incidents et documents GESTIMMO.
 * Permet d'optimiser les photos (ex: prises sur mobile de 5-10MB) en images nettes de ~150-250KB,
 * parfaitement compatibles avec Supabase (JSONB) et le stockage local/IndexedDB sans saturer de quota.
 */

export interface ProcessedIncidentFile {
  name: string;
  size: string;
  type: string;
  dataUrl: string;
  url?: string;
}

export const compressImageFile = async (
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.8
): Promise<ProcessedIncidentFile> => {
  return new Promise((resolve, reject) => {
    // Si ce n'est pas une image (ex: vidéo mp4, doc pdf), lire en direct
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) || "";
        resolve({
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          type: file.type || "application/octet-stream",
          dataUrl,
        });
      };
      reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          // Fallback en cas d'absence de contexte 2D
          resolve({
            name: file.name,
            size: (file.size / 1024).toFixed(0) + " KB",
            type: file.type,
            dataUrl: rawDataUrl,
          });
          return;
        }

        // Rendu lissé de haute qualité
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Compression JPEG optimale
        const outputType = file.type === "image/png" && file.size < 1024 * 1024 ? "image/png" : "image/jpeg";
        const compressedDataUrl = canvas.toDataURL(outputType, quality);

        // Estimation de la taille compressée
        const approximateBytes = Math.round((compressedDataUrl.length * 3) / 4);
        const formattedSize =
          approximateBytes > 1024 * 1024
            ? (approximateBytes / (1024 * 1024)).toFixed(2) + " MB"
            : (approximateBytes / 1024).toFixed(0) + " KB";

        resolve({
          name: file.name,
          size: formattedSize,
          type: outputType,
          dataUrl: compressedDataUrl,
        });
      };

      img.onerror = () => {
        // En cas d'erreur de décodage image, renvoyer la dataUrl brute
        resolve({
          name: file.name,
          size: (file.size / 1024).toFixed(0) + " KB",
          type: file.type,
          dataUrl: rawDataUrl,
        });
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => reject(new Error("Erreur de lecture du fichier image"));
    reader.readAsDataURL(file);
  });
};

/**
 * Détermine de façon robuste si un fichier joint est une image
 */
export const isImageFile = (file: any): boolean => {
  if (!file) return false;
  if (typeof file === "string") {
    return file.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(file);
  }
  const type = file.type || "";
  const name = file.name || "";
  const src = file.dataUrl || file.url || file.src || "";
  return (
    type.startsWith("image/") ||
    src.startsWith("data:image/") ||
    /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(name) ||
    /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(src)
  );
};

/**
 * Récupère l'URL d'affichage optimale pour un fichier joint
 */
export const getFileSource = (file: any): string => {
  if (!file) return "";
  if (typeof file === "string") return file;
  return file.dataUrl || file.url || file.src || "";
};
