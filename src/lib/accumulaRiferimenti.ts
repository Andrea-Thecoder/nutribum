import type { GiornoStorico } from "./schema";
import { chiavePeriodo, type Periodo } from "./aggregate";
import { obiettivoEffettivo, type PuntoStoricoObiettivo } from "./dailyGoal";
import { stimaTDEEAllaData } from "./tdee";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "./profile";
import type { VocePeso } from "./weight";

export interface RiferimentiPeriodo {
  limiteKcal: number | null;
  tdeeStimato: number | null;
  limiteKcalMin: number | null;
  bmrStimato: number | null;
}

// Somma limite/TDEE/minimo/BMR giornalieri sui giorni di ogni bucket (stesso raggruppamento di
// raggruppaPerPeriodo), ignorando i giorni senza un valore calcolabile invece di azzerare tutto il
// bucket: un mese con 2 giorni senza profilo impostato mostra comunque la somma sui restanti 28.
// Un bucket senza nessun giorno valido resta null (connectNulls={false} lo rende un buco in linea).
export function accumulaRiferimenti(
  giorni: GiornoStorico[],
  periodo: Periodo,
  storicoObiettivi: PuntoStoricoObiettivo[],
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
  peso: VocePeso[],
): Map<string, RiferimentiPeriodo> {
  const somme = new Map<
    string,
    { limite: number; limiteConta: number; tdee: number; tdeeConta: number; limiteMin: number; limiteMinConta: number; bmr: number; bmrConta: number }
  >();
  for (const giorno of giorni) {
    const chiave = chiavePeriodo(giorno.data, periodo);
    const attuale =
      somme.get(chiave) ?? { limite: 0, limiteConta: 0, tdee: 0, tdeeConta: 0, limiteMin: 0, limiteMinConta: 0, bmr: 0, bmrConta: 0 };
    const obiettivoGiorno = obiettivoEffettivo(storicoObiettivi, giorno.data);
    const limiteGiorno = obiettivoGiorno?.kcal ?? null;
    const limiteMinGiorno = obiettivoGiorno?.kcalMin ?? null;
    const stimaGiorno = stimaTDEEAllaData(giorno.data, storicoProfilo, storicoFitness, peso);
    const tdeeGiorno = stimaGiorno?.tdee ?? null;
    const bmrGiorno = stimaGiorno?.bmr ?? null;
    if (limiteGiorno !== null) {
      attuale.limite += limiteGiorno;
      attuale.limiteConta += 1;
    }
    if (tdeeGiorno !== null) {
      attuale.tdee += tdeeGiorno;
      attuale.tdeeConta += 1;
    }
    if (limiteMinGiorno !== null) {
      attuale.limiteMin += limiteMinGiorno;
      attuale.limiteMinConta += 1;
    }
    if (bmrGiorno !== null) {
      attuale.bmr += bmrGiorno;
      attuale.bmrConta += 1;
    }
    somme.set(chiave, attuale);
  }
  const risultato = new Map<string, RiferimentiPeriodo>();
  for (const [chiave, v] of somme) {
    risultato.set(chiave, {
      limiteKcal: v.limiteConta > 0 ? v.limite : null,
      tdeeStimato: v.tdeeConta > 0 ? v.tdee : null,
      limiteKcalMin: v.limiteMinConta > 0 ? v.limiteMin : null,
      bmrStimato: v.bmrConta > 0 ? v.bmr : null,
    });
  }
  return risultato;
}
