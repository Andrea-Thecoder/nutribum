import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "./profile";
import type { VocePeso } from "./weight";

export type Sesso = "M" | "F";

export interface ProfiloTDEE {
  etaAnni: number;
  sesso: Sesso;
  altezzaCm: number;
}

export interface RisultatoTDEE {
  bmr: number;
  tdee: number;
}

// Mifflin-St Jeor: lo standard clinico attuale per stimare il BMR (calorie a riposo) da
// peso/altezza/età/sesso — più accurato della vecchia formula di Harris-Benedict. Il TDEE è il BMR
// scalato per il moltiplicatore del livello di attività (da fitness_level nel DB, non duplicato qui
// — unica fonte di verità): una STIMA delle kcal di mantenimento, non un valore misurato. Il ritmo
// osservato nel grafico del peso resta la fonte più onesta per capire cosa sta VERAMENTE succedendo
// (vedi calcolaProiezione in PesoPanel.tsx) — questo calcolo serve solo a suggerire un punto di
// partenza per il limite kcal, non a sostituire quell'osservazione.
export function calcolaTDEE(profilo: ProfiloTDEE, pesoKg: number, moltiplicatoreAttivita: number): RisultatoTDEE {
  const base = 10 * pesoKg + 6.25 * profilo.altezzaCm - 5 * profilo.etaAnni;
  const bmr = profilo.sesso === "M" ? base + 5 : base - 161;
  const tdee = bmr * moltiplicatoreAttivita;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

// Le tre funzioni sotto cercano l'ultimo valore registrato IL O PRIMA di una data — stessa tecnica
// già usata altrove nell'app (obiettivoEffettivo per i limiti kcal/macro, obiettivoAttivoAlla per
// l'obiettivo di peso): un array storico ordinato per data crescente, si scorre finché non si supera
// il bersaglio. Richiede che i tre array in input siano già ordinati crescenti (le funzioni di
// lib/profile.ts che li restituiscono lo garantiscono).

export function trovaProfiloAttivoAlla(data: string, storico: PuntoStoricoProfilo[]): ProfiloTDEE | null {
  let corrente: ProfiloTDEE | null = null;
  for (const punto of storico) {
    if (punto.registratoIl.slice(0, 10) > data) break;
    corrente = { etaAnni: punto.etaAnni, altezzaCm: punto.altezzaCm, sesso: punto.sesso };
  }
  return corrente;
}

export function trovaMoltiplicatoreAttivoAlla(data: string, storico: PuntoStoricoFitness[]): number | null {
  let corrente: number | null = null;
  for (const punto of storico) {
    if (punto.impostatoIl.slice(0, 10) > data) break;
    corrente = punto.moltiplicatore;
  }
  return corrente;
}

export function trovaPesoAttivoAlla(data: string, peso: VocePeso[]): number | null {
  let corrente: number | null = null;
  for (const v of peso) {
    if (v.data > data) break;
    corrente = v.pesoKg;
  }
  return corrente;
}

// Combina i tre storici per stimare il TDEE che sarebbe risultato in una data qualsiasi, non solo
// oggi — serve sia per sovrapporre una linea "TDEE stimato" storicamente corretta nel grafico
// kcal/giorno, sia per un eventuale grafico di andamento del TDEE nel tempo. Null se manca anche
// solo uno dei tre ingredienti a quella data (es. nessun peso registrato ancora).
export function stimaTDEEAllaData(
  data: string,
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
  peso: VocePeso[],
): RisultatoTDEE | null {
  const profilo = trovaProfiloAttivoAlla(data, storicoProfilo);
  const moltiplicatore = trovaMoltiplicatoreAttivoAlla(data, storicoFitness);
  const pesoKg = trovaPesoAttivoAlla(data, peso);
  if (profilo === null || moltiplicatore === null || pesoKg === null) return null;
  return calcolaTDEE(profilo, pesoKg, moltiplicatore);
}
