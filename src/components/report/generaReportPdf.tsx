import { pdf } from "@react-pdf/renderer";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { GiornoStorico } from "../../lib/schema";
import type { PuntoStoricoObiettivo } from "../../lib/dailyGoal";
import type { VocePeso, PuntoStoricoObiettivoPeso } from "../../lib/weight";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "../../lib/profile";
import {
  filtraPerPeriodo,
  periodoGraficoPerRange,
  riepilogoKcalMacro,
  riepilogoPeso,
  riepilogoTDEE,
  datiGraficoKcal,
  datiGraficoMacro,
  datiGraficoFibreSale,
  datiGraficoPeso,
  datiGraficoTDEE,
  type PeriodoReport,
} from "../../lib/report";
import { catturaGraficoComePng } from "../../lib/captureChart";
import {
  GraficoKcalReport,
  GraficoMacroReport,
  GraficoFibreSaleReport,
  GraficoPesoReport,
  GraficoTDEEReport,
  LEGENDA_KCAL,
  LEGENDA_MACRO,
  LEGENDA_FIBRE_SALE,
  LEGENDA_PESO,
  LEGENDA_TDEE,
} from "./GraficiReport";
import { ReportDocument, type DatiReportPdf } from "./ReportDocument";

const LARGHEZZA_GRAFICO_PX = 800;
const ALTEZZA_GRAFICO_PX = 400;

export interface DatiFonteReport {
  giorni: GiornoStorico[];
  storicoObiettivi: PuntoStoricoObiettivo[];
  peso: VocePeso[];
  storicoObiettivoPeso: PuntoStoricoObiettivoPeso[];
  obiettivoPesoKg: number | null;
  storicoProfilo: PuntoStoricoProfilo[];
  storicoFitness: PuntoStoricoFitness[];
}

function primaMaiuscola(testo: string): string {
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

function titoloPeriodo(periodo: PeriodoReport): string {
  if (periodo.dataDa === null && periodo.dataA === null) return "tutto il periodo";
  const daTesto = periodo.dataDa ? format(new Date(periodo.dataDa), "MMMM yyyy", { locale: it }) : "l'inizio";
  const aTesto = periodo.dataA ? format(new Date(periodo.dataA), "MMMM yyyy", { locale: it }) : "oggi";
  return `da ${daTesto} a ${aTesto}`;
}

// "gennaio2026", non "gennaio 2026": un nome file non deve avere spazi da dover sfuggire - e senza
// accenti, non tutti i filesystem/OS li normalizzano allo stesso modo.
function rimuoviAccenti(testo: string): string {
  return testo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function slugMese(data: string): string {
  return rimuoviAccenti(format(new Date(data), "MMMMyyyy", { locale: it }).toLowerCase());
}

// "gennaio2026" per un singolo mese, "2026" per un anno intero (gennaio-dicembre dello stesso
// anno), "tutto" per "Tutto il periodo", altrimenti "<meseDa>-<meseA>" per un range qualsiasi.
function slugPeriodo(periodo: PeriodoReport): string {
  if (periodo.dataDa === null || periodo.dataA === null) return "tutto";
  const { dataDa, dataA } = periodo;
  if (dataDa.slice(0, 7) === dataA.slice(0, 7)) return slugMese(dataDa);
  const stessoAnno = dataDa.slice(0, 4) === dataA.slice(0, 4);
  const coprAnnoIntero = dataDa.slice(5) === "01-01" && dataA.slice(5) === "12-31";
  if (stessoAnno && coprAnnoIntero) return dataDa.slice(0, 4);
  return `${slugMese(dataDa)}-${slugMese(dataA)}`;
}

// Ritorna false se l'utente ha annullato il dialog di salvataggio (non un errore, non serve
// segnalarlo) - l'unico segnale che il chiamante deve distinguere per decidere se mostrare un esito.
export async function generaReportPdf(fonte: DatiFonteReport, periodo: PeriodoReport): Promise<boolean> {
  const giorniRange = filtraPerPeriodo(fonte.giorni, periodo);
  const pesoRange = filtraPerPeriodo(fonte.peso, periodo);
  const periodoGrafico = periodoGraficoPerRange(periodo);

  const kcalMacro = riepilogoKcalMacro(giorniRange, fonte.storicoObiettivi);
  const peso = riepilogoPeso(pesoRange, fonte.obiettivoPesoKg);
  const tdee = riepilogoTDEE(pesoRange, fonte.storicoProfilo, fonte.storicoFitness, fonte.peso);

  const grafici: DatiReportPdf["grafici"] = [];

  if (giorniRange.length > 0) {
    const datiKcal = datiGraficoKcal(
      giorniRange,
      periodoGrafico,
      fonte.storicoObiettivi,
      fonte.storicoProfilo,
      fonte.storicoFitness,
      fonte.peso,
    );
    const pngKcal = await catturaGraficoComePng(
      <GraficoKcalReport dati={datiKcal} />,
      LARGHEZZA_GRAFICO_PX,
      ALTEZZA_GRAFICO_PX,
    );
    if (pngKcal) grafici.push({ titolo: "Kcal per periodo", immagine: pngKcal, legenda: LEGENDA_KCAL });

    const datiMacro = datiGraficoMacro(giorniRange, periodoGrafico);
    const pngMacro = await catturaGraficoComePng(
      <GraficoMacroReport dati={datiMacro} />,
      LARGHEZZA_GRAFICO_PX,
      ALTEZZA_GRAFICO_PX,
    );
    if (pngMacro) grafici.push({ titolo: "Macronutrienti per periodo", immagine: pngMacro, legenda: LEGENDA_MACRO });

    const datiFibreSale = datiGraficoFibreSale(giorniRange, periodoGrafico);
    const pngFibreSale = await catturaGraficoComePng(
      <GraficoFibreSaleReport dati={datiFibreSale} />,
      LARGHEZZA_GRAFICO_PX,
      ALTEZZA_GRAFICO_PX,
    );
    if (pngFibreSale) {
      grafici.push({ titolo: "Fibre e sale per periodo", immagine: pngFibreSale, legenda: LEGENDA_FIBRE_SALE });
    }
  }

  if (pesoRange.length > 0) {
    const datiPeso = datiGraficoPeso(pesoRange, fonte.storicoObiettivoPeso);
    const pngPeso = await catturaGraficoComePng(
      <GraficoPesoReport dati={datiPeso} />,
      LARGHEZZA_GRAFICO_PX,
      ALTEZZA_GRAFICO_PX,
    );
    if (pngPeso) grafici.push({ titolo: "Peso corporeo", immagine: pngPeso, legenda: LEGENDA_PESO });

    const datiTdee = datiGraficoTDEE(pesoRange, fonte.storicoProfilo, fonte.storicoFitness, fonte.peso);
    if (datiTdee.length > 0) {
      const pngTdee = await catturaGraficoComePng(
        <GraficoTDEEReport dati={datiTdee} />,
        LARGHEZZA_GRAFICO_PX,
        ALTEZZA_GRAFICO_PX,
      );
      if (pngTdee) grafici.push({ titolo: "Andamento TDEE", immagine: pngTdee, legenda: LEGENDA_TDEE });
    }
  }

  const dati: DatiReportPdf = {
    titoloPeriodo: primaMaiuscola(titoloPeriodo(periodo)),
    kcalMacro,
    peso,
    tdee,
    grafici,
  };

  const blob = await pdf(<ReportDocument dati={dati} />).toBlob();

  const percorso = await save({
    defaultPath: `nutribum-report-${slugPeriodo(periodo)}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!percorso) return false;

  const bytes = new Uint8Array(await blob.arrayBuffer());
  await writeFile(percorso, bytes);
  return true;
}
