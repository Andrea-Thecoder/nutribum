import { addDays, format } from "date-fns";
import type { GiornoStorico, Pasto, Alimento } from "./schema";
import type { VocePeso, PuntoStoricoObiettivoPeso } from "./weight";
import type { PuntoStoricoObiettivo } from "./dailyGoal";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "./profile";
import type { AlimentoCatalogo } from "./food";
import type { RicettaConIngredienti } from "./recipes";

// Dataset finto condiviso da tutte le anteprime "?" dei pannelli (vedi anteprimaPannelli.tsx): MAI
// dati reali dell'utente, solo per far vedere ogni grafico "vivo" con valori plausibili invece che
// vuoto. Data di ancoraggio fissa (non "oggi"): rende il dataset deterministico, così i test non
// dipendono da quando vengono eseguiti e il risultato è sempre lo stesso ad ogni apertura.
const ANCORA = "2026-08-14";
const GIORNI_STORICO = 60;

// Generatore deterministico (non Math.random): stesso seed → stessa sequenza sempre, niente dati
// che cambiano ad ogni apertura della modale o rendono i test non riproducibili.
function pseudoCasuale(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const CATALOGO: Array<Omit<AlimentoCatalogo, "id">> = [
  { nome: "Petto di pollo alla griglia", unita: "g", kcal_100: 165, proteine_100: 31, carboidrati_100: 0, grassi_100: 3.6, zuccheri_100: 0, grassi_saturi_100: 1, fibre_100: 0, sale_100: 0.1, da_etichetta: false },
  { nome: "Riso basmati cotto", unita: "g", kcal_100: 130, proteine_100: 2.7, carboidrati_100: 28, grassi_100: 0.3, zuccheri_100: 0.1, grassi_saturi_100: 0.1, fibre_100: 0.4, sale_100: 0, da_etichetta: false },
  { nome: "Uovo di gallina", unita: "g", kcal_100: 143, proteine_100: 13, carboidrati_100: 1.1, grassi_100: 9.5, zuccheri_100: 1.1, grassi_saturi_100: 3.1, fibre_100: 0, sale_100: 0.3, da_etichetta: false },
  { nome: "Avocado", unita: "g", kcal_100: 160, proteine_100: 2, carboidrati_100: 8.5, grassi_100: 14.7, zuccheri_100: 0.7, grassi_saturi_100: 2.1, fibre_100: 6.7, sale_100: 0, da_etichetta: false },
  { nome: "Farro perlato", unita: "g", kcal_100: 337, proteine_100: 12.7, carboidrati_100: 67.1, grassi_100: 2.5, zuccheri_100: 1.5, grassi_saturi_100: 0.4, fibre_100: 8.5, sale_100: 0, da_etichetta: false },
  { nome: "Mela", unita: "g", kcal_100: 52, proteine_100: 0.3, carboidrati_100: 14, grassi_100: 0.2, zuccheri_100: 10.4, grassi_saturi_100: 0, fibre_100: 2.4, sale_100: 0, da_etichetta: false },
  { nome: "Yogurt greco", unita: "g", kcal_100: 97, proteine_100: 9, carboidrati_100: 3.6, grassi_100: 5, zuccheri_100: 3.6, grassi_saturi_100: 3.2, fibre_100: 0, sale_100: 0.1, da_etichetta: true },
  { nome: "Olio extravergine d'oliva", unita: "ml", kcal_100: 828, proteine_100: 0, carboidrati_100: 0, grassi_100: 92, zuccheri_100: 0, grassi_saturi_100: 13.8, fibre_100: 0, sale_100: 0, da_etichetta: true },
];

export const ALIMENTI_DIMOSTRATIVI: AlimentoCatalogo[] = CATALOGO.map((a, i) => ({ ...a, id: i + 1 }));

function alimentoDiario(catalogoIndex: number, quantita: number): Alimento {
  const a = CATALOGO[catalogoIndex];
  const fattore = quantita / 100;
  return {
    nome: a.nome,
    quantita,
    unita: a.unita,
    kcal: Math.round(a.kcal_100 * fattore),
    proteine_g: Math.round(a.proteine_100 * fattore * 10) / 10,
    carboidrati_g: Math.round(a.carboidrati_100 * fattore * 10) / 10,
    grassi_g: Math.round(a.grassi_100 * fattore * 10) / 10,
    zuccheri_g: a.zuccheri_100 === null ? undefined : Math.round(a.zuccheri_100 * fattore * 10) / 10,
    grassi_saturi_g: a.grassi_saturi_100 === null ? undefined : Math.round(a.grassi_saturi_100 * fattore * 10) / 10,
    fibre_g: a.fibre_100 === null ? undefined : Math.round(a.fibre_100 * fattore * 10) / 10,
    sale_g: a.sale_100 === null ? undefined : Math.round(a.sale_100 * fattore * 10) / 10,
    da_etichetta: a.da_etichetta,
  };
}

// Ogni ~7 giorni uno sforamento netto, ogni ~11 un giorno sotto il minimo, il resto entro i limiti
// con una variazione plausibile - basta a far vedere calendario/grafici "vivi" (colori diversi,
// non una linea piatta) senza dover inseguire un realismo nutrizionale perfetto.
function pastiDelGiorno(indiceGiorno: number): Pasto[] {
  const sforamento = indiceGiorno % 7 === 0;
  const carenza = indiceGiorno % 11 === 0;
  const variazione = pseudoCasuale(indiceGiorno) * 20 - 10; // ±10%

  function conVariazione(base: number): number {
    return Math.max(20, Math.round(base * (1 + variazione / 100)));
  }

  const colazione: Pasto = {
    tipo: "colazione",
    orario: "08:00",
    alimenti: [alimentoDiario(2, conVariazione(carenza ? 40 : 100)), alimentoDiario(6, conVariazione(120))],
  };
  const pranzo: Pasto = {
    tipo: "pranzo",
    orario: "13:00",
    alimenti: [
      alimentoDiario(0, conVariazione(sforamento ? 220 : 150)),
      alimentoDiario(1, conVariazione(150)),
      alimentoDiario(7, conVariazione(10)),
    ],
  };
  const cena: Pasto = {
    tipo: "cena",
    orario: "20:00",
    alimenti: [
      alimentoDiario(4, conVariazione(carenza ? 60 : 120)),
      alimentoDiario(3, conVariazione(sforamento ? 150 : 80)),
    ],
  };
  const spuntino: Pasto = {
    tipo: "spuntino",
    orario: "17:00",
    alimenti: [alimentoDiario(5, conVariazione(150))],
  };
  return sforamento ? [colazione, pranzo, spuntino, cena] : [colazione, pranzo, cena];
}

const GIORNI_GENERATI: GiornoStorico[] = Array.from({ length: GIORNI_STORICO }, (_, i) => {
  const data = format(addDays(new Date(`${ANCORA}T00:00:00`), i - (GIORNI_STORICO - 1)), "yyyy-MM-dd");
  return { schemaVersion: "1.0", data, pasti: pastiDelGiorno(i) };
});

interface TotaliGiornoEsempio {
  kcal: number;
  proteine_g: number;
  carboidrati_g: number;
  grassi_g: number;
  fibre_g: number;
  sale_g: number;
  // Assente = non mostrato (il tag "~" nella scheda Dettaglio Giorno compare solo per
  // da_etichetta === false, mai per undefined) - impostato esplicitamente a false solo sul giorno
  // usato per quella demo, per far vedere anche quel caso.
  da_etichetta?: boolean;
}

// Un solo pasto/alimento riassuntivo coi totali esatti voluti, invece di più voci realistiche: qui
// serve la precisione (un giorno = esattamente UNA condizione di sforamento/carenza), non il
// realismo del pasto - quello lo dà già il dataset generato sopra.
function giornoConTotaliEsatti(data: string, t: TotaliGiornoEsempio): GiornoStorico {
  return {
    schemaVersion: "1.0",
    data,
    pasti: [
      {
        tipo: "pranzo",
        orario: "13:00",
        alimenti: [{ nome: "Pasto di esempio", quantita: 1, unita: "g", ...t }],
      },
    ],
  };
}

// Le 6 combinazioni base della legenda del Calendario (vedi anteprimaPannelli.tsx,
// TourAnteprimaCalendario.tsx): ognuna isola una SOLA condizione, le altre metriche restano ben
// dentro i rispettivi limiti (kcal 2200/1500, proteine 140, carboidrati 220, grassi 70, fibre 25,
// sale 6 - vedi STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO). Date fisse dentro agosto 2026, il mese che
// il Calendario mostra di default (ANCORA = 14 agosto 2026) - visibili senza dover cambiare mese.
// "senzaDati" non genera nessun GiornoStorico (vedi sotto): è il caso in cui l'utente non ha
// registrato nulla quel giorno - la sua data cade apposta dopo l'ultimo giorno generato (14 agosto
// 2026), che nel Calendario di agosto appare quindi già vuota/grigia senza bisogno di aggiungere
// altro al dataset.
export const GIORNI_ESEMPIO_CALENDARIO = {
  senzaDati: "2026-08-20",
  pulito: "2026-08-03",
  kcalSforato: "2026-08-04",
  macroSforato: "2026-08-05",
  altroSforato: "2026-08-06",
  sottoMinimo: "2026-08-07",
  moltoSottoMinimo: "2026-08-08",
} as const;

const GIORNI_ESEMPIO: GiornoStorico[] = [
  giornoConTotaliEsatti(GIORNI_ESEMPIO_CALENDARIO.pulito, {
    kcal: 2000,
    proteine_g: 110,
    carboidrati_g: 200,
    grassi_g: 55,
    fibre_g: 20,
    sale_g: 4,
  }),
  giornoConTotaliEsatti(GIORNI_ESEMPIO_CALENDARIO.kcalSforato, {
    kcal: 2500,
    proteine_g: 100,
    carboidrati_g: 200,
    grassi_g: 60,
    fibre_g: 20,
    sale_g: 4,
    // Anche il caso "valore stimato, non da etichetta" (usato dalla scheda Dettaglio Giorno):
    // questo è l'unico giorno esempio con almeno un alimento così, non serve altrove.
    da_etichetta: false,
  }),
  giornoConTotaliEsatti(GIORNI_ESEMPIO_CALENDARIO.macroSforato, {
    kcal: 1900,
    proteine_g: 180,
    carboidrati_g: 150,
    grassi_g: 50,
    fibre_g: 15,
    sale_g: 3,
  }),
  giornoConTotaliEsatti(GIORNI_ESEMPIO_CALENDARIO.altroSforato, {
    kcal: 1900,
    proteine_g: 100,
    carboidrati_g: 180,
    grassi_g: 50,
    fibre_g: 15,
    sale_g: 8,
  }),
  giornoConTotaliEsatti(GIORNI_ESEMPIO_CALENDARIO.sottoMinimo, {
    kcal: 1200,
    proteine_g: 60,
    carboidrati_g: 100,
    grassi_g: 30,
    fibre_g: 10,
    sale_g: 2,
  }),
  giornoConTotaliEsatti(GIORNI_ESEMPIO_CALENDARIO.moltoSottoMinimo, {
    kcal: 300,
    proteine_g: 20,
    carboidrati_g: 30,
    grassi_g: 10,
    fibre_g: 5,
    sale_g: 1,
  }),
];

const DATE_ESEMPIO = new Set<string>(Object.values(GIORNI_ESEMPIO_CALENDARIO));

export const GIORNI_DIMOSTRATIVI: GiornoStorico[] = [
  ...GIORNI_GENERATI.filter((g) => !DATE_ESEMPIO.has(g.data)),
  ...GIORNI_ESEMPIO,
].sort((a, b) => a.data.localeCompare(b.data));

// Trend in calo lento (82 → 78kg), una misurazione ogni 2-3 giorni - più realistico di una al
// giorno, coerente con come si usa davvero un diario del peso.
export const PESO_DIMOSTRATIVO: VocePeso[] = Array.from({ length: 30 }, (_, i) => {
  const giorniFa = (29 - i) * 2;
  const data = format(addDays(new Date(`${ANCORA}T00:00:00`), -giorniFa), "yyyy-MM-dd");
  const pesoKg = Math.round((82 - i * 0.13 + (pseudoCasuale(i) * 0.6 - 0.3)) * 10) / 10;
  return { data, pesoKg };
});

export const OBIETTIVO_PESO_DIMOSTRATIVO_KG = 75;

export const STORICO_OBIETTIVO_PESO_DIMOSTRATIVO: PuntoStoricoObiettivoPeso[] = [
  { targetKg: 78, registratoIl: format(addDays(new Date(`${ANCORA}T00:00:00`), -55), "yyyy-MM-dd'T'HH:mm:ss'Z'") },
  { targetKg: 75, registratoIl: format(addDays(new Date(`${ANCORA}T00:00:00`), -20), "yyyy-MM-dd'T'HH:mm:ss'Z'") },
];

const INIZIO_STORICO = format(addDays(new Date(`${ANCORA}T00:00:00`), -(GIORNI_STORICO - 1)), "yyyy-MM-dd");

export const STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO: PuntoStoricoObiettivo[] = [
  {
    id: 1,
    kcal: 2200,
    kcalMin: 1500,
    proteineG: null,
    carboidratiG: null,
    grassiG: null,
    fibreG: null,
    saleG: null,
    validoDal: INIZIO_STORICO,
    validoAl: null,
    ambito: "sempre",
    registratoIl: INIZIO_STORICO,
    gruppo: "kcal",
  },
  {
    id: 2,
    kcal: null,
    kcalMin: null,
    proteineG: 140,
    carboidratiG: 220,
    grassiG: 70,
    fibreG: null,
    saleG: null,
    validoDal: INIZIO_STORICO,
    validoAl: null,
    ambito: "sempre",
    registratoIl: INIZIO_STORICO,
    gruppo: "macro",
  },
  {
    id: 3,
    kcal: null,
    kcalMin: null,
    proteineG: null,
    carboidratiG: null,
    grassiG: null,
    fibreG: 25,
    saleG: 6,
    validoDal: INIZIO_STORICO,
    validoAl: null,
    ambito: "sempre",
    registratoIl: INIZIO_STORICO,
    gruppo: "altro",
  },
];

export const STORICO_PROFILO_DIMOSTRATIVO: PuntoStoricoProfilo[] = [
  { etaAnni: 32, altezzaCm: 178, sesso: "M", registratoIl: INIZIO_STORICO },
];

export const STORICO_FITNESS_DIMOSTRATIVO: PuntoStoricoFitness[] = [
  { livello: "moderate", moltiplicatore: 1.55, impostatoIl: INIZIO_STORICO },
];

export const RICETTE_DIMOSTRATIVE: RicettaConIngredienti[] = [
  {
    id: 1,
    nome: "Pollo, riso e avocado",
    ingredienti: [
      { alimentoId: 1, nomeAlimento: "Petto di pollo alla griglia", unita: "g", quantita: 150 },
      { alimentoId: 2, nomeAlimento: "Riso basmati cotto", unita: "g", quantita: 150 },
      { alimentoId: 4, nomeAlimento: "Avocado", unita: "g", quantita: 80 },
    ],
  },
  {
    id: 2,
    nome: "Colazione proteica",
    ingredienti: [
      { alimentoId: 3, nomeAlimento: "Uovo di gallina", unita: "g", quantita: 100 },
      { alimentoId: 7, nomeAlimento: "Yogurt greco", unita: "g", quantita: 150 },
    ],
  },
];
