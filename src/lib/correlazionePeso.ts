import { format, addDays } from "date-fns";
import type { GiornoStorico } from "./schema";
import { totaliGiorno } from "./aggregate";
import { obiettivoEffettivo, type PuntoStoricoObiettivo } from "./dailyGoal";
import { stimaTDEEAllaData } from "./tdee";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "./profile";
import { calcolaRitmoKgSettimana, type VocePeso } from "./weight";

// Finestra di 4 giorni, non 3: la ritenzione idrica/glicogeno da uno sforamento si esaurisce in
// 2-4 giorni secondo le fonti consultate - guardare al limite superiore evita di misurare ancora
// acqua residua e gonfiare il numero, più onesto anche se costa qualche campione in meno.
const FINESTRA_GIORNI_CORRELAZIONE = 4;

// Sotto questo numero di giorni un gruppo (sforati o puliti) è troppo piccolo per una media
// affidabile - stesso principio di GIORNI_MINIMI_RITMO_PESO in lib/weight.ts.
const SOGLIA_MINIMA_CAMPIONI = 5;

export type ClassificazioneKcal = "sforato" | "pulito";

// Solo kcal, non gli altri macronutrienti: è il bilancio energetico a determinare la direzione del
// peso, i macro incidono su composizione corporea e ritenzione idrica (il rumore a breve termine),
// non sul trend che questa analisi vuole isolare.
//
// Gerarchia: il limite impostato a mano è primario - è il bersaglio comportamentale che l'utente sta
// attivamente cercando di rispettare (e quando vuole seguire il TDEE, il checkbox "usa TDEE
// calcolato" nel modale limite kcal lo copia già dentro il limite). Il TDEE qui è solo un fallback
// per i giorni senza nessun limite manuale impostato - coerente con come "sforato" è già definito
// ovunque nel resto dell'app (banner NavBar, Progresso Obiettivi Nutrizionali).
export function classificaGiornoKcal(
  giorno: GiornoStorico,
  storicoObiettivi: PuntoStoricoObiettivo[],
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
  pesoCompleto: VocePeso[],
): ClassificazioneKcal | null {
  const kcalConsumate = totaliGiorno(giorno).kcal;
  const limiteManuale = obiettivoEffettivo(storicoObiettivi, giorno.data)?.kcal ?? null;
  if (limiteManuale !== null) {
    return kcalConsumate > limiteManuale ? "sforato" : "pulito";
  }
  const stima = stimaTDEEAllaData(giorno.data, storicoProfilo, storicoFitness, pesoCompleto);
  if (stima !== null) {
    return kcalConsumate > stima.tdee ? "sforato" : "pulito";
  }
  return null;
}

export interface PuntoCorrelazione {
  data: string;
  classificazione: ClassificazioneKcal;
  pesoBaseKg: number;
  pesoDopoKg: number;
  deltaGrezzoKg: number;
  deltaCorrettoKg: number;
}

export interface RisultatoCorrelazione {
  punti: PuntoCorrelazione[];
  mediaSforatiKg: number | null;
  mediaPulitiKg: number | null;
  differenzaKg: number | null;
  nSforati: number;
  nPuliti: number;
  finestraGiorni: number;
  sogliaMinimaCampioni: number;
}

function arrotonda2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Per ogni giorno classificabile (sforato o pulito, kcal-only, vedi classificaGiornoKcal) con una
// pesata reale sia quel giorno che FINESTRA_GIORNI_CORRELAZIONE giorni dopo, calcola quanto è
// cambiato il peso - grezzo e corretto sottraendo il ritmo di variazione di base (calcolaRitmoKgSettimana,
// la stessa funzione della proiezione in PesoPanel): senza questa correzione, chi è già in un trend di
// perdita/aumento costante vedrebbe quel trend confuso con l'effetto dello sforamento - il numero
// corretto isola invece lo scostamento dal normale. Niente interpolazione tra pesate: solo dati
// realmente misurati, stessa filosofia già usata per la proiezione del peso in questa app.
export function analizzaCorrelazionePeso(
  giorni: GiornoStorico[],
  peso: VocePeso[],
  storicoObiettivi: PuntoStoricoObiettivo[],
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
): RisultatoCorrelazione {
  const pesoPerData = new Map(peso.map((v) => [v.data, v.pesoKg]));
  const ritmoKgSettimana = calcolaRitmoKgSettimana(peso);
  const attesoNellaFinestra = ritmoKgSettimana !== null ? (ritmoKgSettimana / 7) * FINESTRA_GIORNI_CORRELAZIONE : 0;

  const punti: PuntoCorrelazione[] = [];
  for (const g of giorni) {
    const classificazione = classificaGiornoKcal(g, storicoObiettivi, storicoProfilo, storicoFitness, peso);
    if (classificazione === null) continue;
    const pesoBaseKg = pesoPerData.get(g.data);
    if (pesoBaseKg === undefined) continue;
    const dataDopo = format(addDays(new Date(g.data), FINESTRA_GIORNI_CORRELAZIONE), "yyyy-MM-dd");
    const pesoDopoKg = pesoPerData.get(dataDopo);
    if (pesoDopoKg === undefined) continue;
    const deltaGrezzoKg = pesoDopoKg - pesoBaseKg;
    const deltaCorrettoKg = deltaGrezzoKg - attesoNellaFinestra;
    punti.push({
      data: g.data,
      classificazione,
      pesoBaseKg,
      pesoDopoKg,
      deltaGrezzoKg: arrotonda2(deltaGrezzoKg),
      deltaCorrettoKg: arrotonda2(deltaCorrettoKg),
    });
  }

  const sforati = punti.filter((p) => p.classificazione === "sforato");
  const puliti = punti.filter((p) => p.classificazione === "pulito");
  const media = (arr: PuntoCorrelazione[]) => arr.reduce((s, p) => s + p.deltaCorrettoKg, 0) / arr.length;

  const mediaSforatiKg = sforati.length >= SOGLIA_MINIMA_CAMPIONI ? arrotonda2(media(sforati)) : null;
  const mediaPulitiKg = puliti.length >= SOGLIA_MINIMA_CAMPIONI ? arrotonda2(media(puliti)) : null;
  const differenzaKg =
    mediaSforatiKg !== null && mediaPulitiKg !== null ? arrotonda2(mediaSforatiKg - mediaPulitiKg) : null;

  return {
    punti: punti.sort((a, b) => b.data.localeCompare(a.data)),
    mediaSforatiKg,
    mediaPulitiKg,
    differenzaKg,
    nSforati: sforati.length,
    nPuliti: puliti.length,
    finestraGiorni: FINESTRA_GIORNI_CORRELAZIONE,
    sogliaMinimaCampioni: SOGLIA_MINIMA_CAMPIONI,
  };
}
