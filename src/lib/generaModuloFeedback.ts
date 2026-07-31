import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Placeholder finché non viene fornito l'indirizzo reale. È ben visibile per non passare
// inosservato e finire dimenticato in un PDF già distribuito.
const EMAIL_INVIO = "INSERISCI-QUI-LA-TUA-EMAIL";

const LARGHEZZA_A4 = 595.28;
const ALTEZZA_A4 = 841.89;
const MARGINE = 50;
const LARGHEZZA_CAMPO = LARGHEZZA_A4 - MARGINE * 2;

// Dimensione fissa dei campi modulo. pdf-lib crea i campi con dimensione automatica (0) quando
// non specificata: alcuni lettori PDF (confermato dall'utente) ingrandiscono il testo digitato
// finché non riempie l'intero campo, illeggibile per box alti come quelli multilinea.
const DIMENSIONE_CAMPO = 11;

const PLACEHOLDER_TIPO_PROBLEMA = "Seleziona un'opzione…";
const OPZIONI_TIPO_PROBLEMA = [
  PLACEHOLDER_TIPO_PROBLEMA,
  "Bug / Malfunzionamento",
  "Dati o calcoli errati",
  "Problema di interfaccia",
  "Prestazioni / Lentezza",
  "Suggerimento",
  "Altro",
];

// Modulo di feedback con campi PDF compilabili (AcroForm, via pdf-lib). A differenza del report
// (lib/report.ts + @react-pdf/renderer), qui serve un PDF che l'utente può aprire e riscrivere in
// un lettore PDF qualsiasi (Adobe Acrobat, Anteprima, ecc.), non un documento statico. @react-pdf/
// renderer non supporta campi modulo, da qui una libreria diversa solo per questo caso.
export async function generaModuloFeedbackPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([LARGHEZZA_A4, ALTEZZA_A4]);
  const form = pdfDoc.getForm();

  const fontNormale = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontGrassetto = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  function testoCentrato(testo: string, y: number, dimensione: number, grassetto = false): void {
    const font = grassetto ? fontGrassetto : fontNormale;
    const larghezzaTesto = font.widthOfTextAtSize(testo, dimensione);
    page.drawText(testo, {
      x: (LARGHEZZA_A4 - larghezzaTesto) / 2,
      y,
      size: dimensione,
      font,
      color: rgb(0, 0, 0),
    });
  }

  function etichetta(testo: string, obbligatorio: boolean, y: number): void {
    page.drawText(obbligatorio ? `${testo} *` : testo, {
      x: MARGINE,
      y,
      size: 11,
      font: fontNormale,
      color: rgb(0.15, 0.15, 0.15),
    });
  }

  function campoTesto(nome: string, y: number, altezza = 20): void {
    const campo = form.createTextField(nome);
    campo.addToPage(page, { x: MARGINE, y: y - altezza, width: LARGHEZZA_CAMPO, height: altezza });
    campo.setFontSize(DIMENSIONE_CAMPO);
  }

  function campoTestoMultilinea(nome: string, ySuperiore: number, altezza: number): void {
    const campo = form.createTextField(nome);
    campo.enableMultiline();
    campo.addToPage(page, {
      x: MARGINE,
      y: ySuperiore - altezza,
      width: LARGHEZZA_CAMPO,
      height: altezza,
    });
    campo.setFontSize(DIMENSIONE_CAMPO);
  }

  function campoSelezione(
    nome: string,
    opzioni: string[],
    valoreDefault: string,
    y: number,
    altezza = 20,
  ): void {
    const campo = form.createDropdown(nome);
    campo.addOptions(opzioni);
    campo.addToPage(page, { x: MARGINE, y: y - altezza, width: LARGHEZZA_CAMPO, height: altezza });
    campo.setFontSize(DIMENSIONE_CAMPO);
    campo.select(valoreDefault);
  }

  // Intestazione
  testoCentrato("NUTRIBUM", ALTEZZA_A4 - 70, 26, true);
  testoCentrato("Modulo per feedback", ALTEZZA_A4 - 95, 13);

  // Campi (obbligatori contrassegnati con *)
  let cursoreY = ALTEZZA_A4 - 140;

  etichetta("Nome dell'utente", false, cursoreY);
  campoTesto("nome_utente", cursoreY - 4);
  cursoreY -= 45;

  etichetta("Data di test", false, cursoreY);
  campoTesto("data_test", cursoreY - 4);
  cursoreY -= 45;

  etichetta("Tipo di problema evidenziato", true, cursoreY);
  campoSelezione("tipo_problema", OPZIONI_TIPO_PROBLEMA, PLACEHOLDER_TIPO_PROBLEMA, cursoreY - 4);
  cursoreY -= 45;

  etichetta("Descrizione del problema", true, cursoreY);
  campoTestoMultilinea("descrizione_problema", cursoreY - 4, 140);
  cursoreY -= 160;

  // Spazio bianco prima del box successivo, come richiesto.
  cursoreY -= 30;

  etichetta("Hai consigli da darmi? Scrivilo qui!", false, cursoreY);
  campoTestoMultilinea("consigli", cursoreY - 4, 110);
  cursoreY -= 130;

  // Indirizzo di invio, in fondo alla pagina.
  testoCentrato(`Invia il modulo compilato a: ${EMAIL_INVIO}`, MARGINE - 10, 10);

  return pdfDoc.save();
}
