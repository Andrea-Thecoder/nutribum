import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generaModuloFeedbackPdf } from "./generaModuloFeedback";

describe("generaModuloFeedbackPdf", () => {
  it("generaModuloFeedbackPdf_generato_produceUnPdfValido", async () => {
    const bytes = await generaModuloFeedbackPdf();

    expect(Buffer.from(bytes.slice(0, 5)).toString("ascii")).toBe("%PDF-");
  });

  it("generaModuloFeedbackPdf_ricaricato_contieneTuttiICampiCompilabiliAttesi", async () => {
    const bytes = await generaModuloFeedbackPdf();
    const ricaricato = await PDFDocument.load(bytes);

    const nomiCampi = ricaricato.getForm().getFields().map((c) => c.getName());
    expect(nomiCampi).toEqual(
      expect.arrayContaining(["nome_utente", "data_test", "tipo_problema", "descrizione_problema", "consigli"]),
    );
  });

  it("generaModuloFeedbackPdf_campoTipoProblema_eUnaTendinaConLePzioniPreviste", async () => {
    const bytes = await generaModuloFeedbackPdf();
    const ricaricato = await PDFDocument.load(bytes);

    const campo = ricaricato.getForm().getDropdown("tipo_problema");
    expect(campo.getOptions()).toContain("Bug / Malfunzionamento");
    expect(campo.getSelected()).toEqual(["Seleziona un'opzione…"]);
  });

  it("generaModuloFeedbackPdf_campoDescrizioneProblema_eMultilinea", async () => {
    const bytes = await generaModuloFeedbackPdf();
    const ricaricato = await PDFDocument.load(bytes);

    const campo = ricaricato.getForm().getTextField("descrizione_problema");
    expect(campo.isMultiline()).toBe(true);
  });
});
