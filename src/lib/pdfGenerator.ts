import { PDFDocument, rgb } from 'pdf-lib';

export async function generateContratBail(
  base64Pdf: string, 
  tenantData: any, 
  customFields: any, 
  cniRectoBase64: string | null, 
  cniVersoBase64: string | null
) {
  // 1. Charger le modèle PDF
  const existingPdfBytes = Uint8Array.from(atob(base64Pdf.split(',')[1] || base64Pdf), c => c.charCodeAt(0));
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // 2. Récupérer la première page (où se trouvent généralement les pointillés)
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  // NOTE: Ces coordonnées (x, y) sont fixées (hardcodées) comme demandé.
  // Elles devront être ajustées en fonction du modèle PDF réel.
  // Dans pdf-lib, l'origine (0,0) est en bas à gauche.
  
  const textSize = 11;
  const textColor = rgb(0, 0, 0); // Noir

  // Exemple d'insertion de texte sur des pointillés imaginaires
  // Vous devrez ajuster ces valeurs x, y en mesurant votre PDF.
  if (tenantData.name) {
    firstPage.drawText(tenantData.name, { x: 150, y: 700, size: textSize, color: textColor });
  }
  if (tenantData.cni) {
    firstPage.drawText(tenantData.cni, { x: 150, y: 680, size: textSize, color: textColor });
  }
  if (customFields.dateDebut) {
    firstPage.drawText(customFields.dateDebut, { x: 150, y: 660, size: textSize, color: textColor });
  }
  if (customFields.montantLoyer) {
    firstPage.drawText(customFields.montantLoyer, { x: 150, y: 640, size: textSize, color: textColor });
  }
  if (customFields.caution) {
    firstPage.drawText(customFields.caution, { x: 150, y: 620, size: textSize, color: textColor });
  }
  if (customFields.montantAvance) {
    firstPage.drawText(customFields.montantAvance, { x: 150, y: 600, size: textSize, color: textColor });
  }

  // 3. Ajouter la page 2 : LE BAILLEUR
  const bailleurPage = pdfDoc.addPage();
  const { width: bWidth, height: bHeight } = bailleurPage.getSize();
  bailleurPage.drawText("LE BAILLEUR", { x: bWidth / 2 - 80, y: bHeight - 100, size: 24, color: textColor });
  bailleurPage.drawText("Bailleur :", { x: 50, y: bHeight - 200, size: 20, color: textColor });
  if (customFields.ownerName) {
    bailleurPage.drawText(customFields.ownerName, { x: 150, y: bHeight - 200, size: 20, color: textColor });
  }
  for (let i = 0; i < 4; i++) {
    bailleurPage.drawLine({
      start: { x: 150, y: bHeight - 205 - (i * 40) },
      end: { x: bWidth - 50, y: bHeight - 205 - (i * 40) },
      thickness: 1,
      color: textColor,
    });
  }

  // 4. Ajouter la page 3 : LE LOCATAIRE
  const locatairePage = pdfDoc.addPage();
  const { width: lWidth, height: lHeight } = locatairePage.getSize();
  locatairePage.drawText("LE LOCATAIRE", { x: lWidth / 2 - 90, y: lHeight - 100, size: 24, color: textColor });
  locatairePage.drawText("Locataire :", { x: 50, y: lHeight - 200, size: 20, color: textColor });
  if (tenantData.name) {
    locatairePage.drawText(tenantData.name, { x: 160, y: lHeight - 200, size: 20, color: textColor });
  }
  for (let i = 0; i < 4; i++) {
    locatairePage.drawLine({
      start: { x: 160, y: lHeight - 205 - (i * 40) },
      end: { x: lWidth - 50, y: lHeight - 205 - (i * 40) },
      thickness: 1,
      color: textColor,
    });
  }

  // 5. Ajouter une nouvelle page pour la CNI
  if (cniRectoBase64 || cniVersoBase64) {
    const newPage = pdfDoc.addPage();
    const { width, height } = newPage.getSize();
    
    newPage.drawText("Pièce d'identité du locataire", {
      x: 50,
      y: height - 50,
      size: 16,
      color: textColor,
    });

    // Fonction utilitaire pour intégrer une image
    const embedAndDrawImage = async (base64Img: string, yPos: number) => {
      let image;
      const isPng = base64Img.startsWith('data:image/png');
      const imgBytes = Uint8Array.from(atob(base64Img.split(',')[1]), c => c.charCodeAt(0));
      
      if (isPng) {
        image = await pdfDoc.embedPng(imgBytes);
      } else {
        image = await pdfDoc.embedJpg(imgBytes);
      }

      // Redimensionner l'image pour qu'elle tienne sur la page
      const maxWidth = width - 100;
      const scaledDims = image.scaleToFit(maxWidth, height / 2.5);

      newPage.drawImage(image, {
        x: width / 2 - scaledDims.width / 2,
        y: yPos - scaledDims.height,
        width: scaledDims.width,
        height: scaledDims.height,
      });
    };

    if (cniRectoBase64) {
      newPage.drawText("Recto :", { x: 50, y: height - 100, size: 12 });
      await embedAndDrawImage(cniRectoBase64, height - 120);
    }

    if (cniVersoBase64) {
      newPage.drawText("Verso :", { x: 50, y: height / 2, size: 12 });
      await embedAndDrawImage(cniVersoBase64, height / 2 - 20);
    }
  }

  // 6. Sauvegarder et générer le fichier
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
