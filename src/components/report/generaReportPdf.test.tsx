import { beforeEach, describe, expect, it, vi } from "vitest";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { generaReportPdf, type DatiFonteReport } from "./generaReportPdf";
import { catturaGraficoComePng } from "../../lib/captureChart";
import type { Alimento, GiornoStorico } from "../../lib/schema";
import type { VocePeso } from "../../lib/weight";

// pdf(<ReportDocument/>) crea solo l'elemento React (mai renderizzato: il mock intercetta "pdf"
// prima che qualcosa lo consumi), quindi non serve mockare i primitivi di @react-pdf/renderer usati
// dentro ReportDocument.tsx - stesso discorso per i grafici passati a catturaGraficoComePng, mockata
// qui sotto: nessun vero SVG/canvas viene mai toccato (jsdom non supporta canvas 2d).
vi.mock("@react-pdf/renderer", async (importaOriginale) => {
  // ReportDocument.tsx chiama StyleSheet.create(...) a livello di modulo (non dentro il componente):
  // gira comunque all'import, anche se <ReportDocument/> non viene mai davvero renderizzato - serve
  // preservare gli altri export reali, non solo "pdf".
  const originale = await importaOriginale<typeof import("@react-pdf/renderer")>();
  return {
    ...originale,
    pdf: vi.fn(() => ({ toBlob: vi.fn().mockResolvedValue(new Blob(["pdf"])) })),
  };
});
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeFile: vi.fn() }));
vi.mock("../../lib/captureChart", () => ({ catturaGraficoComePng: vi.fn().mockResolvedValue("data:image/png;base64,xxx") }));

function creaGiorno(data: string, kcal: number): GiornoStorico {
  const alimento: Alimento = { nome: "Cibo", quantita: 100, unita: "g", kcal, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 };
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [alimento] }] };
}

function fonteVuota(): DatiFonteReport {
  return {
    giorni: [],
    storicoObiettivi: [],
    peso: [],
    storicoObiettivoPeso: [],
    obiettivoPesoKg: null,
    storicoProfilo: [],
    storicoFitness: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(catturaGraficoComePng).mockResolvedValue("data:image/png;base64,xxx");
});

describe("generaReportPdf", () => {
  it("generaReportPdf_utenteAnnullaLaFinestraDiSalvataggio_ritornaFalseSenzaScrivereIlFile", async () => {
    vi.mocked(save).mockResolvedValue(null);

    const salvato = await generaReportPdf(fonteVuota(), { dataDa: null, dataA: null });

    expect(salvato).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("generaReportPdf_percorsoScelto_scriveIBytesDelPdfEritornaTrue", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/report.pdf");

    const salvato = await generaReportPdf(fonteVuota(), { dataDa: null, dataA: null });

    expect(salvato).toBe(true);
    expect(writeFile).toHaveBeenCalledWith("/tmp/report.pdf", expect.any(Uint8Array));
  });

  it("generaReportPdf_nessunGiornoNelPeriodo_nonCatturaIGraficiDelDiario", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/report.pdf");
    const fonte = { ...fonteVuota(), peso: [{ data: "2024-01-01", pesoKg: 80 }] as VocePeso[] };

    await generaReportPdf(fonte, { dataDa: null, dataA: null });

    // Con giorni vuoti viene catturato al massimo il grafico peso (niente kcal/macro/fibre-sale).
    expect(vi.mocked(catturaGraficoComePng).mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("generaReportPdf_giorniNelPeriodo_catturaIGraficiKcalMacroEFibreSale", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/report.pdf");
    const fonte = { ...fonteVuota(), giorni: [creaGiorno("2024-01-01", 2000)] };

    await generaReportPdf(fonte, { dataDa: null, dataA: null });

    expect(vi.mocked(catturaGraficoComePng)).toHaveBeenCalledTimes(3);
  });

  it("generaReportPdf_nessunaPesataNelPeriodo_nonCatturaIGraficiPesoETdee", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/report.pdf");
    const fonte = { ...fonteVuota(), giorni: [creaGiorno("2024-01-01", 2000)] };

    await generaReportPdf(fonte, { dataDa: null, dataA: null });

    // I 3 grafici del diario (kcal/macro/fibre-sale) sì, peso/TDEE no: restano 3, non 4 o 5.
    expect(vi.mocked(catturaGraficoComePng)).toHaveBeenCalledTimes(3);
  });

  it("generaReportPdf_tuttoIlPeriodo_ilNomeDelFileProposto_diceTutto", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/report.pdf");

    await generaReportPdf(fonteVuota(), { dataDa: null, dataA: null });

    expect(vi.mocked(save)).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: expect.stringContaining("tutto") }),
    );
  });

  it("generaReportPdf_periodoDiUnAnnoIntero_ilNomeDelFileProposto_usaSoloLAnno", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/report.pdf");

    await generaReportPdf(fonteVuota(), { dataDa: "2024-01-01", dataA: "2024-12-31" });

    expect(vi.mocked(save)).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: expect.stringContaining("nutribum-report-2024.pdf") }),
    );
  });

  it("generaReportPdf_periodoDiUnSingoloMese_ilNomeDelFileProposto_usaMeseEAnno", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/report.pdf");

    await generaReportPdf(fonteVuota(), { dataDa: "2024-03-01", dataA: "2024-03-31" });

    expect(vi.mocked(save)).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: expect.stringContaining("marzo2024") }),
    );
  });
});
