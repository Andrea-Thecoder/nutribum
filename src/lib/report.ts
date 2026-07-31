import { totaliGiorno, raggruppaPerPeriodo, type Periodo } from "./aggregate";
import type { GiornoStorico } from "./schema";
import {
  obiettivoEffettivo,
  calcolaSforamenti,
  percentualiMedie,
  type PuntoStoricoObiettivo,
  type PercentualeMetrica,
} from "./dailyGoal";
import type { VocePeso, PuntoStoricoObiettivoPeso } from "./weight";
import { stimaTDEEAllaData, type RisultatoTDEE } from "./tdee";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "./profile";
import { accumulaRiferimenti } from "../components/panels/KcalGiornoChart";

// null in dataDa/dataA significa "senza limite in quella direzione" (l'opzione "Tutto il periodo"
// del modale non impone né un inizio né una fine, non serve incrociarlo col primo/ultimo dato reale).
export interface PeriodoReport {
  dataDa: string | null;
  dataA: string | null;
}

export function filtraPerPeriodo<T extends { data: string }>(righe: T[], periodo: PeriodoReport): T[] {
  return righe.filter((r) => {
    if (periodo.dataDa !== null && r.data < periodo.dataDa) return false;
    if (periodo.dataA !== null && r.data > periodo.dataA) return false;
    return true;
  });
}

// Giornaliero solo se il range sta tutto in un unico mese (stesso criterio già usato altrove per
// decidere quando un grafico giornaliero resta leggibile) - su un range più ampio o "Tutto" i punti
// sarebbero troppi e il grafico illeggibile, quindi si aggrega per mese.
export function periodoGraficoPerRange(periodo: PeriodoReport): Periodo {
  if (periodo.dataDa !== null && periodo.dataA !== null && periodo.dataDa.slice(0, 7) === periodo.dataA.slice(0, 7)) {
    return "giorno";
  }
  return "mese";
}

export interface RiepilogoSforamenti {
  sforati: number;
  puliti: number;
  totale: number;
}

// Conteggio semplice sul range scelto (non una serie consecutiva o un mese fisso come in NavBar):
// qui interessa solo "quanti giorni sono andati bene/male in questo periodo", non un trigger di avviso.
export function riepilogoSforamenti(
  giorni: GiornoStorico[],
  storicoObiettivi: PuntoStoricoObiettivo[],
): RiepilogoSforamenti {
  let sforati = 0;
  let puliti = 0;
  for (const g of giorni) {
    const obiettivo = obiettivoEffettivo(storicoObiettivi, g.data);
    if (!obiettivo) continue;
    const ha = calcolaSforamenti(totaliGiorno(g), obiettivo).length > 0;
    if (ha) sforati++;
    else puliti++;
  }
  return { sforati, puliti, totale: sforati + puliti };
}

export interface RiepilogoKcalMacro {
  metriche: PercentualeMetrica[];
  sforamenti: RiepilogoSforamenti;
}

export function riepilogoKcalMacro(
  giorni: GiornoStorico[],
  storicoObiettivi: PuntoStoricoObiettivo[],
): RiepilogoKcalMacro | null {
  if (giorni.length === 0) return null;
  const metriche = percentualiMedie(giorni, storicoObiettivi);
  if (metriche.length === 0) return null;
  return { metriche, sforamenti: riepilogoSforamenti(giorni, storicoObiettivi) };
}

export interface RiepilogoPeso {
  primoKg: number;
  ultimoKg: number;
  variazioneKg: number;
  obiettivoKg: number | null;
}

export function riepilogoPeso(pesoRange: VocePeso[], obiettivoPesoKg: number | null): RiepilogoPeso | null {
  if (pesoRange.length === 0) return null;
  const primo = pesoRange[0];
  const ultimo = pesoRange[pesoRange.length - 1];
  return {
    primoKg: primo.pesoKg,
    ultimoKg: ultimo.pesoKg,
    variazioneKg: ultimo.pesoKg - primo.pesoKg,
    obiettivoKg: obiettivoPesoKg,
  };
}

export interface RiepilogoTDEE {
  tdeeMedio: number;
  bmrMedio: number;
  giorniStimati: number;
}

// pesoCompleto (non filtrato al range) serve a trovaPesoAttivoAlla/trovaProfiloAttivoAlla dentro
// stimaTDEEAllaData: la verità puntuale su "cosa sapevamo a quella data" va cercata nello storico
// intero, non solo nelle date che capitano dentro il periodo del report - coerente con
// AndamentoTDEEChart, che fa la stessa cosa per lo stesso motivo.
export function riepilogoTDEE(
  pesoRange: VocePeso[],
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
  pesoCompleto: VocePeso[],
): RiepilogoTDEE | null {
  const stime = pesoRange
    .map((v) => stimaTDEEAllaData(v.data, storicoProfilo, storicoFitness, pesoCompleto))
    .filter((r): r is RisultatoTDEE => r !== null);
  if (stime.length === 0) return null;
  const tdeeMedio = Math.round(stime.reduce((s, r) => s + r.tdee, 0) / stime.length);
  const bmrMedio = Math.round(stime.reduce((s, r) => s + r.bmr, 0) / stime.length);
  return { tdeeMedio, bmrMedio, giorniStimati: stime.length };
}

export interface PuntoKcalReport {
  chiave: string;
  kcal: number;
  limiteKcal: number | null;
  tdeeStimato: number | null;
  limiteKcalMin: number | null;
  bmrStimato: number | null;
}

export function datiGraficoKcal(
  giorniRange: GiornoStorico[],
  periodoGrafico: Periodo,
  storicoObiettivi: PuntoStoricoObiettivo[],
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
  pesoCompleto: VocePeso[],
): PuntoKcalReport[] {
  const base = raggruppaPerPeriodo(giorniRange, periodoGrafico);
  const riferimenti = accumulaRiferimenti(
    giorniRange,
    periodoGrafico,
    storicoObiettivi,
    storicoProfilo,
    storicoFitness,
    pesoCompleto,
  );
  return base.map((d) => ({
    chiave: d.chiave,
    kcal: d.kcal,
    ...(riferimenti.get(d.chiave) ?? {
      limiteKcal: null,
      tdeeStimato: null,
      limiteKcalMin: null,
      bmrStimato: null,
    }),
  }));
}

export interface PuntoMacroReport {
  chiave: string;
  proteine_g: number;
  carboidrati_g: number;
  grassi_g: number;
}

export function datiGraficoMacro(giorniRange: GiornoStorico[], periodoGrafico: Periodo): PuntoMacroReport[] {
  return raggruppaPerPeriodo(giorniRange, periodoGrafico).map((d) => ({
    chiave: d.chiave,
    proteine_g: d.proteine_g,
    carboidrati_g: d.carboidrati_g,
    grassi_g: d.grassi_g,
  }));
}

export interface PuntoFibreSaleReport {
  chiave: string;
  fibre_g: number;
  sale_g: number;
}

export function datiGraficoFibreSale(giorniRange: GiornoStorico[], periodoGrafico: Periodo): PuntoFibreSaleReport[] {
  return raggruppaPerPeriodo(giorniRange, periodoGrafico).map((d) => ({
    chiave: d.chiave,
    fibre_g: d.fibre_g,
    sale_g: d.sale_g,
  }));
}

export interface PuntoPesoReport {
  chiave: string;
  peso: number;
  obiettivoStorico: number | null;
}

// Stesso pattern "ultimo valore registrato il o prima di una data" già usato in PesoPanel per il
// grafico interattivo - qui ridefinito perché quella versione non è esportata da PesoPanel.tsx.
function obiettivoPesoAttivoAlla(data: string, storico: PuntoStoricoObiettivoPeso[]): number | null {
  let corrente: number | null = null;
  for (const punto of storico) {
    if (punto.registratoIl.slice(0, 10) <= data) corrente = punto.targetKg;
    else break;
  }
  return corrente;
}

export function datiGraficoPeso(
  pesoRange: VocePeso[],
  storicoObiettivoPeso: PuntoStoricoObiettivoPeso[],
): PuntoPesoReport[] {
  return pesoRange.map((v) => ({
    chiave: v.data,
    peso: v.pesoKg,
    obiettivoStorico: obiettivoPesoAttivoAlla(v.data, storicoObiettivoPeso),
  }));
}

export interface PuntoTDEEReport {
  chiave: string;
  bmr: number;
  tdee: number;
}

export function datiGraficoTDEE(
  pesoRange: VocePeso[],
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
  pesoCompleto: VocePeso[],
): PuntoTDEEReport[] {
  return pesoRange
    .map((v) => {
      const r = stimaTDEEAllaData(v.data, storicoProfilo, storicoFitness, pesoCompleto);
      return r ? { chiave: v.data, bmr: r.bmr, tdee: r.tdee } : null;
    })
    .filter((d): d is PuntoTDEEReport => d !== null);
}
