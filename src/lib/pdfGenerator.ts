import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa !== 'undefined') {
    return 'data:application/pdf;base64,' + btoa(binary);
  }
  return 'data:application/pdf;base64,' + Buffer.from(bytes).toString('base64');
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generateDefaultContratBail(options?: { ownerName?: string; companyName?: string }): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const primary = rgb(0.08, 0.28, 0.55);
  const dark = rgb(0.12, 0.14, 0.17);
  const gray = rgb(0.42, 0.46, 0.52);
  const borderCol = rgb(0.82, 0.86, 0.9);

  const owner = options?.ownerName || "M. / Mme le Bailleur";
  const agency = options?.companyName || "GESTIMMO PRO SARL";

  // PAGE 1
  const page1 = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page1.getSize();

  // Header Box
  page1.drawRectangle({
    x: 40,
    y: height - 100,
    width: width - 80,
    height: 60,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: borderCol,
    borderWidth: 1,
  });

  page1.drawText("REPUBLIQUE DE COTE D'IVOIRE", {
    x: 55,
    y: height - 60,
    size: 10,
    font: fontBold,
    color: primary,
  });
  page1.drawText("Union - Discipline - Travail", {
    x: 55,
    y: height - 74,
    size: 8,
    font: fontOblique,
    color: gray,
  });
  page1.drawText(agency.toUpperCase(), {
    x: width - 260,
    y: height - 60,
    size: 9.5,
    font: fontBold,
    color: dark,
  });
  page1.drawText("Gestion Immobilière & Administration de Biens", {
    x: width - 260,
    y: height - 74,
    size: 8,
    font: fontRegular,
    color: gray,
  });

  // Title
  page1.drawText("CONTRAT DE BAIL A USAGE D'HABITATION", {
    x: 50,
    y: height - 125,
    size: 15,
    font: fontBold,
    color: primary,
  });
  page1.drawText("Conforme a la Loi N° 2019-576 du 26 juin 2019 portant Code du bail d'habitation", {
    x: 50,
    y: height - 140,
    size: 8.5,
    font: fontOblique,
    color: gray,
  });

  // Separator
  page1.drawLine({
    start: { x: 50, y: height - 150 },
    end: { x: width - 50, y: height - 150 },
    thickness: 1,
    color: primary,
  });

  let curY = height - 170;

  function drawSection1(num: string, title: string, lines: string[]) {
    page1.drawText(`ARTICLE ${num} - ${title}`, {
      x: 50,
      y: curY,
      size: 10.5,
      font: fontBold,
      color: primary,
    });
    curY -= 14;

    for (const l of lines) {
      const wrapped = wrapText(l, 90);
      for (const w of wrapped) {
        page1.drawText(w, {
          x: 55,
          y: curY,
          size: 8.5,
          font: fontRegular,
          color: dark,
        });
        curY -= 11.5;
      }
    }
    curY -= 6;
  }

  drawSection1("1", "DESIGNATION DES PARTIES", [
    `LE BAILLEUR : ${owner}, represente par son mandataire legal dument mandate.`,
    `L'AGENCE MANDATAIRE : ${agency}, agissant en qualite de gestionnaire de biens immobiliers.`,
    "LE PRENEUR (LOCATAIRE) : Toute personne physique ou morale engagee pour la location du logement."
  ]);

  drawSection1("2", "OBJET DU CONTRAT ET DESIGNATION DES LIEUX", [
    "Le Bailleur donne a bail a usage exclusif d'habitation au Preneur qui accepte les locaux ci-apres designes :",
    "Logement : Appartement / Villa dote d'installations electriques et de plomberie conformes.",
    "Destination : Les lieux loues sont exclusivement destines a l'usage d'habitation bourgeoise paisible."
  ]);

  drawSection1("3", "DUREE DU CONTRAT ET PRISE D'EFFET", [
    "Le present bail est consenti pour une duree ferme d'un (01) an renouvelable par tacite reconduction.",
    "Chaque partie conserve la faculte de resilier le contrat a l'echeance moyennant un preavis legal ecrit.",
    "Le conge doit etre notifie par ecrit avec un preavis minimum de trois (03) mois conformement a la loi."
  ]);

  drawSection1("4", "CONDITIONS FINANCIERES & PAIEMENT DES LOYERS", [
    "Loyer mensuel : Le montant convenu est payable d'avance et sans delai au plus tard le 05 de chaque mois.",
    "Charges locatives : Reglement des charges communes d'entretien et abonnements privatifs au reel ou au forfait.",
    "Revision triennale : Conformement a la legislation en vigueur, les loyers ne peuvent etre revises qu'a l'echeance triennale."
  ]);

  // Footer Page 1
  page1.drawText("Contrat de Bail d'Habitation Standard GESTIMMO - Page 1 / 2", {
    x: width / 2 - 120,
    y: 25,
    size: 7.5,
    font: fontRegular,
    color: gray,
  });

  // PAGE 2
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  let curY2 = height - 50;

  function drawSection2(num: string, title: string, lines: string[]) {
    page2.drawText(`ARTICLE ${num} - ${title}`, {
      x: 50,
      y: curY2,
      size: 10.5,
      font: fontBold,
      color: primary,
    });
    curY2 -= 14;

    for (const l of lines) {
      const wrapped = wrapText(l, 90);
      for (const w of wrapped) {
        page2.drawText(w, {
          x: 55,
          y: curY2,
          size: 8.5,
          font: fontRegular,
          color: dark,
        });
        curY2 -= 11.5;
      }
    }
    curY2 -= 6;
  }

  drawSection2("5", "DEPOT DE GARANTIE ET AVANCE (LOI 2019-576)", [
    "En vertu de l'article 39 de la Loi N° 2019-576 du 26 juin 2019 :",
    "- Le depot de garantie est strictement plafonne a deux (02) mois de loyer hors charges.",
    "- L'avance sur loyer est egalement plafonnee a deux (02) mois de loyer hors charges.",
    "Le depot sera restitue dans un delai maximal d'un (01) mois apres remise des cles et deduction des frais eventuels."
  ]);

  drawSection2("6", "OBLIGATIONS DU PRENEUR", [
    "- User paisiblement des locaux loues sans causer de troubles au voisinage ni aux parties communes.",
    "- Maintenir les lieux en parfait etat d'entretien et de proprete locative conformement a l'etat des lieux.",
    "- Souscrire une police d'assurance couvrant les risques locatifs (incendie, explosion, degats des eaux).",
    "- Ne proceder a aucune modification de structure ni transformation sans accord prealable ecrit du Bailleur.",
    "- Interdiction expresse de sous-louer ou de ceder le bail sans consentement ecrit formel du Bailleur."
  ]);

  drawSection2("7", "OBLIGATIONS DU BAILLEUR", [
    "- Delivrer au preneur le logement en bon etat d'usage et de reparation avec equipements conformes.",
    "- Assurer au Preneur la jouissance paisible des lieux pendant toute la duree du contrat de location.",
    "- Executer les grosses reparations necessaires au maintien de la structure et du clos/couvert de l'immeuble."
  ]);

  drawSection2("8", "ETAT DES LIEUX ET CLAUSE RESOLUTOIRE", [
    "Un etat des lieux d'entree et de sortie contradictoire est dresse lors de la remise et de la restitution des cles.",
    "A defaut de paiement d'un seul terme a son echeance ou de non-respect d'une clause essentielle, le present contrat sera resilie de plein droit quinze (15) jours apres mise en demeure restee sans effet."
  ]);

  // Signatures block
  curY2 -= 15;
  page2.drawRectangle({
    x: 50,
    y: curY2 - 100,
    width: width - 100,
    height: 100,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: borderCol,
    borderWidth: 1,
  });

  page2.drawText("Fait a Abidjan, en deux exemplaires originaux.", {
    x: 65,
    y: curY2 - 20,
    size: 9,
    font: fontOblique,
    color: gray,
  });

  page2.drawText("Pour Le Bailleur / L'Agence Mandataire :", {
    x: 65,
    y: curY2 - 40,
    size: 9,
    font: fontBold,
    color: dark,
  });
  page2.drawText("(Signature et Cachet)", {
    x: 65,
    y: curY2 - 52,
    size: 7.5,
    font: fontOblique,
    color: gray,
  });

  page2.drawText("Pour Le Preneur (Locataire) :", {
    x: width - 240,
    y: curY2 - 40,
    size: 9,
    font: fontBold,
    color: dark,
  });
  page2.drawText("(Mention 'Lu et approuve' + Signature)", {
    x: width - 240,
    y: curY2 - 52,
    size: 7.5,
    font: fontOblique,
    color: gray,
  });

  // Footer Page 2
  page2.drawText("Contrat de Bail d'Habitation Standard GESTIMMO - Page 2 / 2", {
    x: width / 2 - 120,
    y: 25,
    size: 7.5,
    font: fontRegular,
    color: gray,
  });

  const bytes = await pdfDoc.save();
  return uint8ArrayToBase64(bytes);
}

export async function generateDefaultReglementInterieur(options?: { propertyName?: string; ownerName?: string; companyName?: string }): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const primary = rgb(0.08, 0.28, 0.55);
  const dark = rgb(0.12, 0.14, 0.17);
  const gray = rgb(0.42, 0.46, 0.52);
  const borderCol = rgb(0.82, 0.86, 0.9);

  const agency = options?.companyName || "GESTIMMO PRO SARL";
  const property = options?.propertyName || "Immeuble & Parties Communes";

  // PAGE 1
  const page1 = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page1.getSize();

  // Header Box
  page1.drawRectangle({
    x: 40,
    y: height - 100,
    width: width - 80,
    height: 60,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: borderCol,
    borderWidth: 1,
  });

  page1.drawText(agency.toUpperCase(), {
    x: 55,
    y: height - 60,
    size: 10,
    font: fontBold,
    color: primary,
  });
  page1.drawText("Administration & Syndic de Copropriete", {
    x: 55,
    y: height - 74,
    size: 8,
    font: fontOblique,
    color: gray,
  });
  page1.drawText("DOCUMENT OFFICIEL ANNEXE", {
    x: width - 220,
    y: height - 60,
    size: 9.5,
    font: fontBold,
    color: dark,
  });
  page1.drawText("Reglementation d'immeuble", {
    x: width - 220,
    y: height - 74,
    size: 8,
    font: fontRegular,
    color: gray,
  });

  // Title
  page1.drawText("REGLEMENT INTERIEUR DE L'IMMEUBLE", {
    x: 50,
    y: height - 125,
    size: 15,
    font: fontBold,
    color: primary,
  });
  page1.drawText(`Application a : ${property} - Respect des regles de vie collective`, {
    x: 50,
    y: height - 140,
    size: 8.5,
    font: fontOblique,
    color: gray,
  });

  // Separator
  page1.drawLine({
    start: { x: 50, y: height - 150 },
    end: { x: width - 50, y: height - 150 },
    thickness: 1,
    color: primary,
  });

  let curY = height - 170;

  function drawSection1(num: string, title: string, lines: string[]) {
    page1.drawText(`ARTICLE ${num} - ${title}`, {
      x: 50,
      y: curY,
      size: 10.5,
      font: fontBold,
      color: primary,
    });
    curY -= 14;

    for (const l of lines) {
      const wrapped = wrapText(l, 90);
      for (const w of wrapped) {
        page1.drawText(w, {
          x: 55,
          y: curY,
          size: 8.5,
          font: fontRegular,
          color: dark,
        });
        curY -= 11.5;
      }
    }
    curY -= 6;
  }

  drawSection1("1", "DESTINATION DES LIEUX ET RESPECT DE LA TRANQUILLITE", [
    "Les locaux loues sont destines a l'usage exclusif d'habitation. L'exercice d'une activite commerciale ou artisanale est proscrit.",
    "Chaque occupant doit respecter la tranquillite de l'immeuble. Tout tapage, bruit excessif, musique assourdissante de jour comme de nuit est strictement interdit.",
    "Une vigilance accrue est exigee entre 22h00 et 06h00 du matin afin de preserver le repos d'autrui."
  ]);

  drawSection1("2", "PARTIES COMMUNES ET CIRCULATION", [
    "Les halls d'entree, escaliers, couloirs, paliers et cours sont des espaces collectifs qui doivent rester degages en permanence.",
    "Il est rigoureusement interdit d'y entreposer des objets personnels (bicyclettes, poussettes, meubles, cartons ou poubelles).",
    "Les portes et portails d'acces a l'immeuble doivent demeurer constamment fermes a clef afin d'assurer la securite de tous."
  ]);

  drawSection1("3", "HYGIENE, SALUBRITE ET GESTION DES DECHETS", [
    "Les ordures menageres doivent imperativement etre enfermees dans des sacs plastiques etanches avant depot dans les bacs collectifs.",
    "Il est strictement defendu de jeter par les fenetres ou balcons des megots, eaux usees ou dechets quelconques.",
    "L'etendage du linge aux balcons et fenetres visibles depuis la voie publique est interdit ou soumis aux consignes d'esthetique."
  ]);

  // Footer Page 1
  page1.drawText("Reglement Interieur de l'Immeuble GESTIMMO - Page 1 / 2", {
    x: width / 2 - 120,
    y: 25,
    size: 7.5,
    font: fontRegular,
    color: gray,
  });

  // PAGE 2
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  let curY2 = height - 50;

  function drawSection2(num: string, title: string, lines: string[]) {
    page2.drawText(`ARTICLE ${num} - ${title}`, {
      x: 50,
      y: curY2,
      size: 10.5,
      font: fontBold,
      color: primary,
    });
    curY2 -= 14;

    for (const l of lines) {
      const wrapped = wrapText(l, 90);
      for (const w of wrapped) {
        page2.drawText(w, {
          x: 55,
          y: curY2,
          size: 8.5,
          font: fontRegular,
          color: dark,
        });
        curY2 -= 11.5;
      }
    }
    curY2 -= 6;
  }

  drawSection2("4", "SECURITE ET INSTALLATIONS TECHNIQUES", [
    "Il est interdit d'introduire ou de stocker dans l'immeuble des substances dangereuses, explosives ou inflammables.",
    "Les locataires ne peuvent apporter aucune modification aux canalisations d'eau, compteurs ou colonnes electriques.",
    "En cas d'urgence ou d'entretien obligatoire, les occupants doivent permettre l'acces aux techniciens mandatés par l'Agence."
  ]);

  drawSection2("5", "ANIMAUX DOMESTIQUES ET STATIONNEMENT", [
    "Les animaux de compagnie ne sont toleres que s'ils ne causent aucun dommage, bruit repete ou desagrement aux occupants.",
    "Le stationnement des vehicules doit s'effectuer exclusivement sur les places matérialisées prévues sans gener les acces pompiers.",
    "Il est interdit de laver des vehicules ou d'effectuer des reparations mecaniques polluantes dans la cour commune."
  ]);

  drawSection2("6", "VALEUR CONTRACTUELLE ET SANCTIONS", [
    "Le present reglement interieur constitue une annexe obligatoire du contrat de bail et en partage la valeur contraignante.",
    "Toute violation repetee ou grave du present reglement apres avertissement constitue un motif de resiliation judiciaire du bail."
  ]);

  // Signatures block
  curY2 -= 15;
  page2.drawRectangle({
    x: 50,
    y: curY2 - 100,
    width: width - 100,
    height: 100,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: borderCol,
    borderWidth: 1,
  });

  page2.drawText("Accuse de reception et engagement de respect du reglement :", {
    x: 65,
    y: curY2 - 20,
    size: 9,
    font: fontOblique,
    color: gray,
  });

  page2.drawText("L'Agence Immobiliere / Syndic :", {
    x: 65,
    y: curY2 - 40,
    size: 9,
    font: fontBold,
    color: dark,
  });
  page2.drawText("(Visa et Cachet officiel)", {
    x: 65,
    y: curY2 - 52,
    size: 7.5,
    font: fontOblique,
    color: gray,
  });

  page2.drawText("Le Locataire / Occupant :", {
    x: width - 240,
    y: curY2 - 40,
    size: 9,
    font: fontBold,
    color: dark,
  });
  page2.drawText("(Mention 'Lu et approuve pour execution' + Signature)", {
    x: width - 240,
    y: curY2 - 52,
    size: 7.5,
    font: fontOblique,
    color: gray,
  });

  // Footer Page 2
  page2.drawText("Reglement Interieur de l'Immeuble GESTIMMO - Page 2 / 2", {
    x: width / 2 - 120,
    y: 25,
    size: 7.5,
    font: fontRegular,
    color: gray,
  });

  const bytes = await pdfDoc.save();
  return uint8ArrayToBase64(bytes);
}

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
