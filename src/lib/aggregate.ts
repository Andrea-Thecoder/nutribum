import { format, startOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import type { Alimento, GiornoStorico } from "./schema";

export interface Totali {
  kcal: number;
  proteine_g: number;
  carboidrati_g: number;
  grassi_g: number;
  zuccheri_g: number;
  grassi_saturi_g: number;
  fibre_g: number;
  sale_g: number;
}

const TOTALI_ZERO: Totali = {
  kcal: 0,
  proteine_g: 0,
  carboidrati_g: 0,
  grassi_g: 0,
  zuccheri_g: 0,
  grassi_saturi_g: 0,
  fibre_g: 0,
  sale_g: 0,
};

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}

function arrotondaTotali(t: Totali): Totali {
  return {
    kcal: arrotonda(t.kcal),
    proteine_g: arrotonda(t.proteine_g),
    carboidrati_g: arrotonda(t.carboidrati_g),
    grassi_g: arrotonda(t.grassi_g),
    zuccheri_g: arrotonda(t.zuccheri_g),
    grassi_saturi_g: arrotonda(t.grassi_saturi_g),
    fibre_g: arrotonda(t.fibre_g),
    sale_g: arrotonda(t.sale_g),
  };
}

function sommaTotali(a: Totali, b: Totali): Totali {
  return {
    kcal: a.kcal + b.kcal,
    proteine_g: a.proteine_g + b.proteine_g,
    carboidrati_g: a.carboidrati_g + b.carboidrati_g,
    grassi_g: a.grassi_g + b.grassi_g,
    zuccheri_g: a.zuccheri_g + b.zuccheri_g,
    grassi_saturi_g: a.grassi_saturi_g + b.grassi_saturi_g,
    fibre_g: a.fibre_g + b.fibre_g,
    sale_g: a.sale_g + b.sale_g,
  };
}

function totaliAlimento(a: Alimento): Totali {
  return {
    kcal: a.kcal,
    proteine_g: a.proteine_g,
    carboidrati_g: a.carboidrati_g,
    grassi_g: a.grassi_g,
    zuccheri_g: a.zuccheri_g ?? 0,
    grassi_saturi_g: a.grassi_saturi_g ?? 0,
    fibre_g: a.fibre_g ?? 0,
    sale_g: a.sale_g ?? 0,
  };
}

function sommaAlimenti(alimenti: Alimento[]): Totali {
  const somma = alimenti.reduce((acc, a) => sommaTotali(acc, totaliAlimento(a)), TOTALI_ZERO);
  return arrotondaTotali(somma);
}

export function totaliGiorno(giorno: GiornoStorico): Totali {
  return sommaAlimenti(giorno.pasti.flatMap((p) => p.alimenti));
}

export function totaliPerAlimento(giorni: GiornoStorico[]): Map<string, Totali> {
  const mappa = new Map<string, Totali>();
  for (const giorno of giorni) {
    for (const pasto of giorno.pasti) {
      for (const alimento of pasto.alimenti) {
        const attuale = mappa.get(alimento.nome) ?? TOTALI_ZERO;
        mappa.set(alimento.nome, arrotondaTotali(sommaTotali(attuale, totaliAlimento(alimento))));
      }
    }
  }
  return mappa;
}

export function conteggioAlimenti(giorni: GiornoStorico[]): Map<string, number> {
  const mappa = new Map<string, number>();
  for (const giorno of giorni) {
    for (const pasto of giorno.pasti) {
      for (const alimento of pasto.alimenti) {
        mappa.set(alimento.nome, (mappa.get(alimento.nome) ?? 0) + 1);
      }
    }
  }
  return mappa;
}

export type Periodo = "giorno" | "settimana" | "mese" | "anno";

// Nuovo oggetto ad ogni richiesta di focus (vedi handleApriGiornoOvunque in App.tsx): la sola
// identità diversa, non il valore di "data", è ciò che fa scattare l'useEffect nei grafici che
// reagiscono al focus anche se si riclicca due volte di fila lo stesso giorno.
export interface FocusGiorno {
  data: string;
}

export interface PuntoPeriodo extends Totali {
  chiave: string;
}

export function chiavePeriodo(dataStr: string, periodo: Periodo): string {
  const d = new Date(dataStr);
  if (periodo === "anno") return format(d, "yyyy");
  if (periodo === "mese") return format(d, "yyyy-MM");
  if (periodo === "settimana") return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return dataStr;
}

// Protetta con un fallback (non un throw): un formato data imprevisto in "chiave" non deve
// spaccare l'intero albero React (senza ErrorBoundary in questa app, un errore qui durante il
// render manda in schermata bianca tutto, non solo il pannello coinvolto) — meglio mostrare
// l'etichetta grezza che un'app inutilizzabile.
export function etichettaPeriodo(chiave: string, periodo: Periodo): string {
  try {
    if (periodo === "anno") return chiave;
    if (periodo === "mese") {
      const d = new Date(`${chiave}-01`);
      const testo = format(d, "MMMM yyyy", { locale: it });
      return testo.charAt(0).toUpperCase() + testo.slice(1);
    }
    if (periodo === "settimana") {
      const d = new Date(chiave);
      return `Settimana del ${format(d, "d MMM", { locale: it })}`;
    }
    return format(new Date(chiave), "d MMM yyyy", { locale: it });
  } catch {
    return chiave;
  }
}

/** Granularità più fine da usare quando si filtra su un'istanza specifica di `periodo`. */
export function periodoFine(periodo: Periodo): Periodo {
  if (periodo === "anno") return "mese";
  if (periodo === "giorno") return "giorno";
  return "giorno";
}

export interface IstanzaPeriodo {
  chiave: string;
  etichetta: string;
}

// Tipizzate su "{ data: string }" invece che su GiornoStorico specificamente: così lo stesso
// SelettoreIstanza/SelettorePeriodo usati per il diario alimentare funzionano anche su altre serie
// datate (es. VocePeso[] in PesoPanel), senza duplicare la logica di filtro per periodo.
export function elencoIstanze(righe: { data: string }[], periodo: Periodo): IstanzaPeriodo[] {
  const chiavi = new Set(righe.map((r) => chiavePeriodo(r.data, periodo)));
  return [...chiavi]
    .sort((a, b) => b.localeCompare(a))
    .map((chiave) => ({ chiave, etichetta: etichettaPeriodo(chiave, periodo) }));
}

export const TUTTO_IL_PERIODO = "tutto";

export function filtraIstanza<T extends { data: string }>(
  righe: T[],
  periodo: Periodo,
  istanza: string,
): T[] {
  if (istanza === TUTTO_IL_PERIODO) return righe;
  return righe.filter((r) => chiavePeriodo(r.data, periodo) === istanza);
}

export function raggruppaPerPeriodo(giorni: GiornoStorico[], periodo: Periodo): PuntoPeriodo[] {
  const gruppi = new Map<string, Totali>();
  for (const giorno of giorni) {
    const chiave = chiavePeriodo(giorno.data, periodo);
    const attuale = gruppi.get(chiave) ?? TOTALI_ZERO;
    gruppi.set(chiave, arrotondaTotali(sommaTotali(attuale, totaliGiorno(giorno))));
  }
  return [...gruppi.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chiave, totali]) => ({ chiave, ...totali }));
}

