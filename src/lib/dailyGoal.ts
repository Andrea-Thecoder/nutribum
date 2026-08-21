import { subDays, addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import type Database from "@tauri-apps/plugin-sql";
import { getDb } from "./db";
import { totaliGiorno, chiavePeriodo, type Totali, type Periodo } from "./aggregate";
import type { GiornoStorico } from "./schema";
import { stimaTDEEAllaData } from "./tdee";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "./profile";
import type { VocePeso } from "./weight";

export interface Goal {
  kcal: number | null;
  // Limite minimo: scendere troppo sotto il proprio fabbisogno è un rischio (denutrizione) quanto
  // sforare in alto - stesso "gruppo" kcal del limite massimo (stessa riga di goal/goal_history,
  // stesso storico), il BMR calcolato ne è il fallback quando non è impostato a mano (vedi tdee.ts).
  kcalMin: number | null;
  proteineG: number | null;
  carboidratiG: number | null;
  grassiG: number | null;
  fibreG: number | null;
  saleG: number | null;
}

interface RigaGoal {
  kcal: number | null;
  kcal_min: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  salt_g: number | null;
}

function mappaGoal(r: RigaGoal): Goal {
  return {
    kcal: r.kcal,
    kcalMin: r.kcal_min,
    proteineG: r.protein_g,
    carboidratiG: r.carbs_g,
    grassiG: r.fat_g,
    fibreG: r.fiber_g,
    saleG: r.salt_g,
  };
}

export async function leggiObiettivo(): Promise<Goal | null> {
  const db = await getDb();
  const righe = await db.select<RigaGoal[]>(
    "SELECT kcal, kcal_min, protein_g, carbs_g, fat_g, fiber_g, salt_g FROM goal WHERE id = 1",
  );
  return righe.length === 0 ? null : mappaGoal(righe[0]!);
}

// I 3 macrogruppi del form (kcal / macro / altro) sono assi nutrizionali indipendenti (es. limite
// carboidrati per chetogenica indipendente dalle kcal totali, limite sale per motivi medici
// indipendente dal resto): ognuno ha un proprio storico di validità, per non far bloccare la
// portata di un gruppo con un salvataggio fatto su un gruppo diverso.
export type Gruppo = "kcal" | "macro" | "altro";

// Ambito di validità di un salvataggio. "daOra" e "sempre" sono aperti verso il futuro (nessuna
// fine): il primo vale dal momento del salvataggio in poi, il secondo su tutta la cronologia del
// gruppo, passata e futura. "settimana"/"mese" sono intervalli chiusi sulla settimana/mese corrente
// al momento del salvataggio (calcolati una volta e fissati, non ricalcolati in seguito).
export type Ambito = "daOra" | "sempre" | "settimana" | "mese";

export interface PuntoStoricoObiettivo extends Goal {
  id: number;
  validoDal: string;
  validoAl: string | null;
  ambito: Ambito;
  registratoIl: string;
  gruppo: Gruppo;
}

interface RigaGoalHistory extends RigaGoal {
  id: number;
  valido_dal: string;
  valido_al: string | null;
  ambito: Ambito;
  recorded_at: string;
  gruppo: Gruppo;
}

export async function elencaStoricoObiettivo(): Promise<PuntoStoricoObiettivo[]> {
  const db = await getDb();
  const righe = await db.select<RigaGoalHistory[]>(
    `SELECT id, valido_dal, valido_al, ambito, kcal, kcal_min, protein_g, carbs_g, fat_g, fiber_g, salt_g, recorded_at, gruppo
     FROM goal_history
     ORDER BY id`,
  );
  return righe.map((r) => ({
    id: r.id,
    validoDal: r.valido_dal,
    validoAl: r.valido_al,
    ambito: r.ambito,
    registratoIl: r.recorded_at,
    gruppo: r.gruppo,
    ...mappaGoal(r),
  }));
}

// Trova l'obiettivo che era effettivamente in vigore in una certa data, risolvendo i 3 macrogruppi
// indipendentemente e poi combinandoli. Tra tutte le voci di un gruppo il cui intervallo
// [validoDal, validoAl] contiene la data richiesta, vince quella salvata più di recente (id più
// alto) - indipendentemente dall'ambito: un "sempre" più recente batte una "questa settimana" più
// vecchia sui giorni in comune, e viceversa se è quest'ultima ad essere più recente.
export function obiettivoEffettivo(storico: PuntoStoricoObiettivo[], data: string): Goal | null {
  function ultimoDelGruppo(gruppo: Gruppo): PuntoStoricoObiettivo | null {
    let migliore: PuntoStoricoObiettivo | null = null;
    for (const punto of storico) {
      if (punto.gruppo !== gruppo) continue;
      if (punto.validoDal.slice(0, 10) > data) continue;
      if (punto.validoAl !== null && punto.validoAl.slice(0, 10) < data) continue;
      if (migliore === null || punto.id > migliore.id) migliore = punto;
    }
    return migliore;
  }

  const puntoKcal = ultimoDelGruppo("kcal");
  const puntoMacro = ultimoDelGruppo("macro");
  const puntoAltro = ultimoDelGruppo("altro");

  if (!puntoKcal && !puntoMacro && !puntoAltro) return null;

  return {
    kcal: puntoKcal?.kcal ?? null,
    kcalMin: puntoKcal?.kcalMin ?? null,
    grassiG: puntoMacro?.grassiG ?? null,
    proteineG: puntoMacro?.proteineG ?? null,
    carboidratiG: puntoMacro?.carboidratiG ?? null,
    saleG: puntoAltro?.saleG ?? null,
    fibreG: puntoAltro?.fibreG ?? null,
  };
}

// Generalizza accumulaRiferimenti (KcalGiornoChart.tsx) a un numero qualsiasi di campi di Goal:
// serve identica per Macronutrienti (proteineG/carboidratiG/grassiG) e Altri nutrienti
// (fibreG/saleG) per sovrapporre le linee limite ai rispettivi grafici a barre per periodo. Somma
// il limite in vigore sui giorni dello stesso bucket (coerente con la barra, che è già una somma sul
// periodo), ignorando i giorni senza quel campo impostato invece di azzerare tutto il bucket.
export function accumulaLimitiPeriodo<K extends keyof Goal>(
  giorni: GiornoStorico[],
  periodo: Periodo,
  storicoObiettivi: PuntoStoricoObiettivo[],
  campi: K[],
): Map<string, Record<K, number | null>> {
  const somme = new Map<string, Record<K, { somma: number; conta: number }>>();
  for (const g of giorni) {
    const obiettivo = obiettivoEffettivo(storicoObiettivi, g.data);
    if (!obiettivo) continue;
    const chiave = chiavePeriodo(g.data, periodo);
    let attuale = somme.get(chiave);
    if (!attuale) {
      attuale = {} as Record<K, { somma: number; conta: number }>;
      for (const c of campi) attuale[c] = { somma: 0, conta: 0 };
      somme.set(chiave, attuale);
    }
    for (const c of campi) {
      const limite = obiettivo[c];
      if (typeof limite === "number") {
        attuale[c].somma += limite;
        attuale[c].conta += 1;
      }
    }
  }
  const risultato = new Map<string, Record<K, number | null>>();
  for (const [chiave, valori] of somme) {
    const riga = {} as Record<K, number | null>;
    for (const c of campi) {
      riga[c] = valori[c].conta > 0 ? valori[c].somma : null;
    }
    risultato.set(chiave, riga);
  }
  return risultato;
}

export interface Sforamento {
  etichetta: string;
  valore: number;
  limite: number;
}

const METRICHE_CONTROLLATE: { chiaveTotali: keyof Totali; chiaveGoal: keyof Goal; etichetta: string }[] = [
  // "(limite)", non solo "Kcal": da quando esiste anche percentualeTDEE (confronto rispetto al TDEE
  // stimato, un riferimento diverso dal limite impostato a mano) le due righe devono restare
  // distinguibili ovunque compaia questa etichetta (pannello Progresso, report PDF).
  { chiaveTotali: "kcal", chiaveGoal: "kcal", etichetta: "Kcal (limite)" },
  { chiaveTotali: "proteine_g", chiaveGoal: "proteineG", etichetta: "Proteine" },
  { chiaveTotali: "carboidrati_g", chiaveGoal: "carboidratiG", etichetta: "Carboidrati" },
  { chiaveTotali: "grassi_g", chiaveGoal: "grassiG", etichetta: "Grassi" },
  { chiaveTotali: "fibre_g", chiaveGoal: "fibreG", etichetta: "Fibre" },
  { chiaveTotali: "sale_g", chiaveGoal: "saleG", etichetta: "Sale" },
];

// Confronta i totali di un giorno con l'obiettivo impostato e ritorna le metriche sforate
// (solo quelle per cui è stato impostato un limite - un limite non impostato non genera avvisi).
export function calcolaSforamenti(totali: Totali, obiettivo: Goal | null): Sforamento[] {
  if (!obiettivo) return [];
  const sforamenti: Sforamento[] = [];
  for (const m of METRICHE_CONTROLLATE) {
    const limite = obiettivo[m.chiaveGoal];
    if (limite === null) continue;
    const valore = totali[m.chiaveTotali];
    if (valore > limite) {
      sforamenti.push({ etichetta: m.etichetta, valore, limite });
    }
  }
  return sforamenti;
}

export interface PercentualeMetrica {
  chiave: string;
  percentuale: number;
  sopraLimite: boolean;
  valoreMedio: number;
  limiteMedio: number;
}

// Media delle percentuali giornaliere sul limite in vigore quel giorno (non il totale del periodo
// diviso un limite scalato): ogni giorno resta indipendente, coerente con l'uso del limite
// storicamente in vigore già fatto altrove - un cambio di limite a metà settimana/mese non
// distorce il calcolo. Un giorno senza limite impostato per una metrica non entra nella media di
// quella metrica; una metrica senza nessun giorno con limite impostato non compare nel risultato.
// valoreMedio/limiteMedio sono la media giornaliera di consumo e limite (su un singolo giorno
// coincidono col valore/limite di quel giorno) - usati per mostrare il dato assoluto nel tooltip
// oltre alla percentuale.
export function percentualiMedie(giorni: GiornoStorico[], storicoObiettivi: PuntoStoricoObiettivo[]): PercentualeMetrica[] {
  const somme = new Map<string, { percentuale: number; valore: number; limite: number; conteggio: number }>();
  for (const g of giorni) {
    const obiettivo = obiettivoEffettivo(storicoObiettivi, g.data);
    if (!obiettivo) continue;
    const totali = totaliGiorno(g);
    for (const m of METRICHE_CONTROLLATE) {
      const limite = obiettivo[m.chiaveGoal];
      if (limite === null || limite <= 0) continue;
      const valore = totali[m.chiaveTotali];
      const percentuale = (valore / limite) * 100;
      const attuale = somme.get(m.etichetta) ?? { percentuale: 0, valore: 0, limite: 0, conteggio: 0 };
      somme.set(m.etichetta, {
        percentuale: attuale.percentuale + percentuale,
        valore: attuale.valore + valore,
        limite: attuale.limite + limite,
        conteggio: attuale.conteggio + 1,
      });
    }
  }
  return METRICHE_CONTROLLATE.flatMap((m) => {
    const dato = somme.get(m.etichetta);
    if (!dato) return [];
    const arrotonda2 = (n: number) => Math.round(n * 100) / 100;
    const media = arrotonda2(dato.percentuale / dato.conteggio);
    return [
      {
        chiave: m.etichetta,
        percentuale: media,
        sopraLimite: media > 100,
        valoreMedio: arrotonda2(dato.valore / dato.conteggio),
        limiteMedio: arrotonda2(dato.limite / dato.conteggio),
      },
    ];
  });
}

// Speculare a percentualiMedie ma per un solo confronto: kcal consumate rispetto al TDEE stimato
// (non al limite impostato a mano - quello resta il "Kcal (limite)" dentro percentualiMedie). Le
// kcal sono l'unica metrica con due riferimenti sensati insieme (limite manuale E TDEE calcolato);
// le altre non hanno un equivalente "stimato" con cui confrontarsi, da qui una funzione a parte
// invece di generalizzare METRICHE_CONTROLLATE per un solo caso. Stessa media di percentuali
// giornaliere (non aggregato/aggregato) di percentualiMedie, per restare confrontabili tra loro.
export function percentualeTDEE(
  giorni: GiornoStorico[],
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
  peso: VocePeso[],
): PercentualeMetrica | null {
  let sommaPercentuale = 0;
  let sommaValore = 0;
  let sommaLimite = 0;
  let conteggio = 0;
  for (const g of giorni) {
    const stima = stimaTDEEAllaData(g.data, storicoProfilo, storicoFitness, peso);
    if (!stima || stima.tdee <= 0) continue;
    const valore = totaliGiorno(g).kcal;
    sommaPercentuale += (valore / stima.tdee) * 100;
    sommaValore += valore;
    sommaLimite += stima.tdee;
    conteggio++;
  }
  if (conteggio === 0) return null;
  const arrotonda2 = (n: number) => Math.round(n * 100) / 100;
  const percentuale = arrotonda2(sommaPercentuale / conteggio);
  return {
    chiave: "Kcal (TDEE)",
    percentuale,
    sopraLimite: percentuale > 100,
    valoreMedio: arrotonda2(sommaValore / conteggio),
    limiteMedio: arrotonda2(sommaLimite / conteggio),
  };
}

export interface StatoSforamenti {
  serieConsecutiva: number;
  giorniSforatiNelMese: number;
}

// Serie consecutiva: giorni di fila, a ritroso da "oggi", sforati in almeno una categoria (un
// giorno senza dati registrati interrompe la serie, non viene ignorato). Giorni nel mese: quanti
// giorni del mese corrente (non necessariamente consecutivi) risultano sforati.
export function calcolaStatoSforamenti(
  giorni: GiornoStorico[],
  storicoObiettivi: PuntoStoricoObiettivo[],
  oggi: string,
): StatoSforamenti {
  const sforatoPerData = new Map<string, boolean>();
  for (const g of giorni) {
    const obiettivo = obiettivoEffettivo(storicoObiettivi, g.data);
    sforatoPerData.set(g.data, calcolaSforamenti(totaliGiorno(g), obiettivo).length > 0);
  }

  let serieConsecutiva = 0;
  let cursore = oggi;
  while (sforatoPerData.get(cursore) === true) {
    serieConsecutiva++;
    cursore = format(subDays(new Date(cursore), 1), "yyyy-MM-dd");
  }

  const meseCorrente = oggi.slice(0, 7); // "yyyy-MM"
  let giorniSforatiNelMese = 0;
  for (const [data, sforato] of sforatoPerData) {
    if (sforato && data.slice(0, 7) === meseCorrente) giorniSforatiNelMese++;
  }

  return { serieConsecutiva, giorniSforatiNelMese };
}

export interface DettaglioGiornoSforato {
  data: string;
  sforamenti: Sforamento[];
}

// Dettaglio giorno per giorno dei periodi riassunti da calcolaStatoSforamenti: "serie" ripercorre la
// stessa serie consecutiva a ritroso da oggi, "mese" ripercorre tutti i giorni sforati del mese
// corrente. Ordine dal più recente al meno recente.
export function dettaglioGiorniSforati(
  giorni: GiornoStorico[],
  storicoObiettivi: PuntoStoricoObiettivo[],
  oggi: string,
  periodo: "serie" | "mese",
): DettaglioGiornoSforato[] {
  const sforamentiPerData = new Map<string, Sforamento[]>();
  for (const g of giorni) {
    const obiettivo = obiettivoEffettivo(storicoObiettivi, g.data);
    sforamentiPerData.set(g.data, calcolaSforamenti(totaliGiorno(g), obiettivo));
  }

  if (periodo === "serie") {
    const dettagli: DettaglioGiornoSforato[] = [];
    let cursore = oggi;
    while ((sforamentiPerData.get(cursore)?.length ?? 0) > 0) {
      dettagli.push({ data: cursore, sforamenti: sforamentiPerData.get(cursore)! });
      cursore = format(subDays(new Date(cursore), 1), "yyyy-MM-dd");
    }
    return dettagli;
  }

  const meseCorrente = oggi.slice(0, 7);
  const dettagli: DettaglioGiornoSforato[] = [];
  for (const [data, sforamenti] of sforamentiPerData) {
    if (sforamenti.length > 0 && data.slice(0, 7) === meseCorrente) {
      dettagli.push({ data, sforamenti });
    }
  }
  return dettagli.sort((a, b) => (a.data < b.data ? 1 : -1));
}

// Limite minimo effettivo di un giorno: manuale se impostato, altrimenti il BMR calcolato quel
// giorno come fallback - stessa gerarchia già usata per il limite massimo con il TDEE (vedi
// classificaGiornoKcal in correlazionePeso.ts). Null se non c'è né un minimo manuale né un BMR
// calcolabile (es. nessun profilo/peso registrato ancora).
export function limiteMinimoEffettivo(
  data: string,
  obiettivo: Goal | null,
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
  peso: VocePeso[],
): number | null {
  if (obiettivo?.kcalMin != null) return obiettivo.kcalMin;
  return stimaTDEEAllaData(data, storicoProfilo, storicoFitness, peso)?.bmr ?? null;
}

// Sotto questa quota del minimo, la carenza non è più "un po' poco" ma un deficit severo (es. un
// minimo di 1400 kcal, consumate 155 - siamo all'11%, non semplicemente "sotto"): una seconda
// soglia solo per distinguere visivamente la gravità, non cambia se il giorno è considerato
// carente o no (quello resta un semplice kcal < minimo, vedi calcolaStatoCarenza).
export const SOGLIA_CARENZA_GRAVE = 0.25;

export function carenzaGrave(kcalConsumate: number, minimo: number | null): boolean {
  return minimo !== null && kcalConsumate < minimo * SOGLIA_CARENZA_GRAVE;
}

export interface StatoCarenza {
  serieConsecutiva: number;
  giorniCarentiNelMese: number;
  // Sottoinsieme dei due valori sopra, solo per i giorni gravi (vedi carenzaGrave/
  // SOGLIA_CARENZA_GRAVE): NON alternativi a serieConsecutiva/giorniCarentiNelMese, un giorno grave
  // è comunque anche "carente" e conta in entrambi i conteggi.
  serieConsecutivaGrave: number;
  giorniCarentiGraviNelMese: number;
}

// Speculare a calcolaStatoSforamenti/StatoSforamenti, ma per il rischio opposto: giorni in cui le
// kcal consumate sono scese sotto il limite minimo effettivo (manuale o BMR di fallback). Un giorno
// senza nessun riferimento disponibile non conta come carente (niente da segnalare se non c'è
// nulla con cui confrontare), esattamente come un limite massimo non impostato non genera
// sforamento.
export function calcolaStatoCarenza(
  giorni: GiornoStorico[],
  storicoObiettivi: PuntoStoricoObiettivo[],
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
  peso: VocePeso[],
  oggi: string,
): StatoCarenza {
  const carenteData = new Map<string, boolean>();
  const carenteGraveData = new Map<string, boolean>();
  for (const g of giorni) {
    const obiettivo = obiettivoEffettivo(storicoObiettivi, g.data);
    const minimo = limiteMinimoEffettivo(g.data, obiettivo, storicoProfilo, storicoFitness, peso);
    const kcal = totaliGiorno(g).kcal;
    carenteData.set(g.data, minimo !== null && kcal < minimo);
    carenteGraveData.set(g.data, carenzaGrave(kcal, minimo));
  }

  let serieConsecutiva = 0;
  let serieConsecutivaGrave = 0;
  let cursore = oggi;
  while (carenteData.get(cursore) === true) {
    serieConsecutiva++;
    if (carenteGraveData.get(cursore) === true) serieConsecutivaGrave++;
    cursore = format(subDays(new Date(cursore), 1), "yyyy-MM-dd");
  }

  const meseCorrente = oggi.slice(0, 7);
  let giorniCarentiNelMese = 0;
  let giorniCarentiGraviNelMese = 0;
  for (const [data, carente] of carenteData) {
    if (carente && data.slice(0, 7) === meseCorrente) {
      giorniCarentiNelMese++;
      if (carenteGraveData.get(data) === true) giorniCarentiGraviNelMese++;
    }
  }

  return { serieConsecutiva, giorniCarentiNelMese, serieConsecutivaGrave, giorniCarentiGraviNelMese };
}

export interface DettaglioGiornoCarente {
  data: string;
  kcalConsumate: number;
  kcalMinimo: number;
}

// Dettaglio giorno per giorno dei periodi riassunti da calcolaStatoCarenza - stessa struttura di
// dettaglioGiorniSforati, per "serie"/"mese".
export function dettaglioGiorniCarenti(
  giorni: GiornoStorico[],
  storicoObiettivi: PuntoStoricoObiettivo[],
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
  peso: VocePeso[],
  oggi: string,
  periodo: "serie" | "mese",
): DettaglioGiornoCarente[] {
  const carentiPerData = new Map<string, DettaglioGiornoCarente | null>();
  for (const g of giorni) {
    const obiettivo = obiettivoEffettivo(storicoObiettivi, g.data);
    const minimo = limiteMinimoEffettivo(g.data, obiettivo, storicoProfilo, storicoFitness, peso);
    const kcalConsumate = totaliGiorno(g).kcal;
    carentiPerData.set(
      g.data,
      minimo !== null && kcalConsumate < minimo ? { data: g.data, kcalConsumate, kcalMinimo: minimo } : null,
    );
  }

  if (periodo === "serie") {
    const dettagli: DettaglioGiornoCarente[] = [];
    let cursore = oggi;
    while (carentiPerData.get(cursore)) {
      dettagli.push(carentiPerData.get(cursore)!);
      cursore = format(subDays(new Date(cursore), 1), "yyyy-MM-dd");
    }
    return dettagli;
  }

  const meseCorrente = oggi.slice(0, 7);
  const dettagli: DettaglioGiornoCarente[] = [];
  for (const [data, dettaglio] of carentiPerData) {
    if (dettaglio && data.slice(0, 7) === meseCorrente) dettagli.push(dettaglio);
  }
  return dettagli.sort((a, b) => (a.data < b.data ? 1 : -1));
}

export interface StatoPositivo {
  serieConsecutivaPulita: number;
  settimanaPulita: boolean;
  giorniPulitiNelMese: number;
}

// Speculare a calcolaStatoSforamenti, ma per i traguardi positivi. Un giorno è "pulito" solo se ha
// dati registrati, ha un obiettivo effettivo impostato, non lo sfora in alto E non è sotto il
// limite minimo - un giorno senza dati (o senza nessun limite impostato) non conta come pulito, non
// c'è nulla da festeggiare se non è stato nemmeno tracciato o non era impostato alcun limite. Il
// controllo sul minimo è lo stesso rischio opposto già usato in calcolaStatoCarenza: sforamento e
// carenza sono controlli indipendenti, un giorno può non superare nessun massimo (kcal bassissime)
// ma essere comunque un problema nutrizionale - "pulito" richiede l'assenza di ENTRAMBI i rischi,
// non solo del primo. Serie consecutiva: a ritroso da "oggi", come nella versione negativa.
// Settimana pulita: dal lunedì della settimana corrente a oggi (non oltre oggi, stessa logica
// "presente e passato" della serie). Giorni nel mese: come la versione negativa, include anche i
// giorni futuri dello stesso mese corrente.
export function calcolaStatoPositivo(
  giorni: GiornoStorico[],
  storicoObiettivi: PuntoStoricoObiettivo[],
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
  peso: VocePeso[],
  oggi: string,
): StatoPositivo {
  const pulitoPerData = new Map<string, boolean>();
  for (const g of giorni) {
    const obiettivo = obiettivoEffettivo(storicoObiettivi, g.data);
    const totali = totaliGiorno(g);
    const minimo = limiteMinimoEffettivo(g.data, obiettivo, storicoProfilo, storicoFitness, peso);
    const sottoMinimo = minimo !== null && totali.kcal < minimo;
    pulitoPerData.set(
      g.data,
      obiettivo !== null && !sottoMinimo && calcolaSforamenti(totali, obiettivo).length === 0,
    );
  }

  let serieConsecutivaPulita = 0;
  let cursore = oggi;
  while (pulitoPerData.get(cursore) === true) {
    serieConsecutivaPulita++;
    cursore = format(subDays(new Date(cursore), 1), "yyyy-MM-dd");
  }

  let settimanaPulita = true;
  let giornoSettimana = format(startOfWeek(new Date(oggi), { weekStartsOn: 1 }), "yyyy-MM-dd");
  while (giornoSettimana <= oggi) {
    if (pulitoPerData.get(giornoSettimana) !== true) {
      settimanaPulita = false;
      break;
    }
    giornoSettimana = format(addDays(new Date(giornoSettimana), 1), "yyyy-MM-dd");
  }

  const meseCorrente = oggi.slice(0, 7);
  let giorniPulitiNelMese = 0;
  for (const [data, pulito] of pulitoPerData) {
    if (pulito && data.slice(0, 7) === meseCorrente) giorniPulitiNelMese++;
  }

  return { serieConsecutivaPulita, settimanaPulita, giorniPulitiNelMese };
}

const INIZIO_DEI_TEMPI = "1970-01-01T00:00:00.000Z";

// Calcola l'intervallo [validoDal, validoAl] per l'ambito scelto, ancorato a "ora": "settimana"/"mese"
// fissano la settimana (lunedì-domenica) o il mese corrente al momento del salvataggio - non si
// spostano più se il salvataggio avviene in un secondo momento.
function intervalloPerAmbito(ambito: Ambito): { validoDal: string; validoAl: string | null } {
  const ora = new Date();
  switch (ambito) {
    case "daOra":
      return { validoDal: ora.toISOString(), validoAl: null };
    case "sempre":
      return { validoDal: INIZIO_DEI_TEMPI, validoAl: null };
    case "settimana":
      return {
        validoDal: format(startOfWeek(ora, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        validoAl: format(endOfWeek(ora, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    case "mese":
      return {
        validoDal: format(startOfMonth(ora), "yyyy-MM-dd"),
        validoAl: format(endOfMonth(ora), "yyyy-MM-dd"),
      };
  }
}

// Ogni salvataggio registra uno snapshot completo dell'obiettivo aggiornato in goal_history, per
// mostrare l'andamento nel tempo e calcolare il limite in vigore in un dato giorno. `recorded_at`
// tiene traccia di quando il salvataggio è stato davvero fatto (sempre "ora"), indipendentemente
// dall'intervallo di validità scelto - utile per lo storico/grafico.
async function registraStoricoObiettivo(db: Database, ambito: Ambito, gruppo: Gruppo): Promise<void> {
  const { validoDal, validoAl } = intervalloPerAmbito(ambito);
  await db.execute(
    `INSERT INTO goal_history (valido_dal, valido_al, ambito, kcal, kcal_min, protein_g, carbs_g, fat_g, fiber_g, salt_g, recorded_at, gruppo)
     SELECT $1, $2, $3, kcal, kcal_min, protein_g, carbs_g, fat_g, fiber_g, salt_g, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), $4 FROM goal WHERE id = 1`,
    [validoDal, validoAl, ambito, gruppo],
  );
}

export async function salvaObiettivoKcal(
  kcal: number | null,
  kcalMin: number | null,
  ambito: Ambito = "daOra",
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO goal (id, kcal, kcal_min) VALUES (1, $1, $2)
     ON CONFLICT(id) DO UPDATE SET kcal = excluded.kcal, kcal_min = excluded.kcal_min, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    [kcal, kcalMin],
  );
  await registraStoricoObiettivo(db, ambito, "kcal");
}

export interface ObiettivoMacroInput {
  grassiG: number | null;
  proteineG: number | null;
  carboidratiG: number | null;
}

export async function salvaObiettivoMacro(input: ObiettivoMacroInput, ambito: Ambito = "daOra"): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO goal (id, fat_g, protein_g, carbs_g) VALUES (1, $1, $2, $3)
     ON CONFLICT(id) DO UPDATE SET fat_g = excluded.fat_g, protein_g = excluded.protein_g,
                                    carbs_g = excluded.carbs_g, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    [input.grassiG, input.proteineG, input.carboidratiG],
  );
  await registraStoricoObiettivo(db, ambito, "macro");
}

export interface ObiettivoAltroInput {
  saleG: number | null;
  fibreG: number | null;
}

export async function salvaObiettivoAltro(input: ObiettivoAltroInput, ambito: Ambito = "daOra"): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO goal (id, salt_g, fiber_g) VALUES (1, $1, $2)
     ON CONFLICT(id) DO UPDATE SET salt_g = excluded.salt_g, fiber_g = excluded.fiber_g,
                                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    [input.saleG, input.fibreG],
  );
  await registraStoricoObiettivo(db, ambito, "altro");
}
