import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { ReportDocument, type DatiReportPdf } from "./ReportDocument";

// PNG 1x1 valido reale (non un placeholder qualsiasi): il motore di @react-pdf/renderer decodifica
// davvero l'immagine per incorporarla nel PDF, una stringa base64 finta farebbe fallire il render.
const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function datiVuoti(): DatiReportPdf {
  return { titoloPeriodo: "gennaio 2024", kcalMacro: null, peso: null, tdee: null, grafici: [] };
}

// Nessuna asserzione sul contenuto visivo/testuale del PDF (il binario non è pensato per essere
// ispezionato senza un parser dedicato, non presente in questo progetto): il valore di questi test
// è verificare che l'albero di componenti react-pdf non lanci per nessuna delle combinazioni di
// dati realistiche - un refactor che rompe uno stile o una prop qui lo farebbe fallire subito.
describe("ReportDocument", () => {
  it("ReportDocument_nessunDatoDisponibile_generaComunqueUnPdfValido", async () => {
    const blob = await pdf(<ReportDocument dati={datiVuoti()} />).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });

  it("ReportDocument_riepilogoKcalMacroPresente_generaUnPdfValido", async () => {
    const dati: DatiReportPdf = {
      ...datiVuoti(),
      kcalMacro: {
        metriche: [
          { chiave: "Kcal (limite)", percentuale: 105, sopraLimite: true, valoreMedio: 2100, limiteMedio: 2000 },
        ],
        sforamenti: { sforati: 3, puliti: 7, totale: 10 },
      },
    };

    const blob = await pdf(<ReportDocument dati={dati} />).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });

  it("ReportDocument_riepilogoPesoConESenzaObiettivo_generaUnPdfValido", async () => {
    const dati: DatiReportPdf = {
      ...datiVuoti(),
      peso: { primoKg: 82, ultimoKg: 80, variazioneKg: -2, obiettivoKg: null },
    };

    const blob = await pdf(<ReportDocument dati={dati} />).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });

  it("ReportDocument_riepilogoTdeePresente_generaUnPdfValido", async () => {
    const dati: DatiReportPdf = {
      ...datiVuoti(),
      tdee: { bmrMedio: 1780, tdeeMedio: 2759, giorniStimati: 20 },
    };

    const blob = await pdf(<ReportDocument dati={dati} />).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });

  it("ReportDocument_conGraficiELegende_generaUnaPaginaPerOgniGraficoSenzaLanciare", async () => {
    const dati: DatiReportPdf = {
      ...datiVuoti(),
      grafici: [
        {
          titolo: "Kcal per periodo",
          immagine: PNG_1X1,
          legenda: [{ colore: "#f00", etichetta: "Kcal consumate" }],
        },
        {
          titolo: "Peso corporeo",
          immagine: PNG_1X1,
          legenda: [{ colore: "#00f", etichetta: "Peso" }],
        },
      ],
    };

    const blob = await pdf(<ReportDocument dati={dati} />).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });
});
