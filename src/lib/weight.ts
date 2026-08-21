import { format, subDays, addDays, startOfWeek, differenceInCalendarDays } from "date-fns";
import { getDb } from "./db";

// Finestra e soglia minima condivise da PesoPanel (proiezione verso l'obiettivo) e dall'analisi di
// correlazione peso↔sforamenti: stesso identico ritmo, un solo posto dove calcolarlo.
export const GIORNI_FINESTRA_RITMO_PESO = 30;
export const GIORNI_MINIMI_RITMO_PESO = 7;

export interface VocePeso {
  data: string;
  pesoKg: number;
}

interface RigaPeso {
  log_date: string;
  weight_kg: number;
}

function mappaVocePeso(r: RigaPeso): VocePeso {
  return { data: r.log_date, pesoKg: r.weight_kg };
}

// Upsert: una sola misurazione per giorno (vedi commento in 0004_weight.sql) - pesarsi di nuovo lo
// stesso giorno corregge la lettura precedente, non ne aggiunge una seconda.
export async function registraPeso(data: string, pesoKg: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO weight_log (log_date, weight_kg) VALUES ($1, $2)
     ON CONFLICT(log_date) DO UPDATE SET weight_kg = excluded.weight_kg`,
    [data, pesoKg],
  );
}

export async function eliminaPeso(data: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM weight_log WHERE log_date = $1`, [data]);
}

export async function elencaPesoCompleto(): Promise<VocePeso[]> {
  const db = await getDb();
  const righe = await db.select<RigaPeso[]>(`SELECT log_date, weight_kg FROM weight_log ORDER BY log_date`);
  return righe.map(mappaVocePeso);
}

export async function leggiObiettivoPeso(): Promise<number | null> {
  const db = await getDb();
  const righe = await db.select<{ target_kg: number | null }[]>(
    `SELECT target_kg FROM weight_goal WHERE id = 1`,
  );
  return righe.length === 0 ? null : righe[0]!.target_kg;
}

// Un solo obiettivo alla volta (il nuovo sovrascrive weight_goal), ma OGNI impostazione viene anche
// accodata a weight_goal_history - append-only, mai aggiornata né cancellata - per poter mostrare
// nei grafici come l'obiettivo è cambiato nel tempo. Rimuovere l'obiettivo (targetKg = null) non
// genera una voce di storico: non c'è un "target" da registrare in quel caso.
export async function salvaObiettivoPeso(targetKg: number | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO weight_goal (id, target_kg) VALUES (1, $1)
     ON CONFLICT(id) DO UPDATE SET target_kg = excluded.target_kg, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    [targetKg],
  );
  if (targetKg !== null) {
    await db.execute(`INSERT INTO weight_goal_history (target_kg) VALUES ($1)`, [targetKg]);
  }
}

export interface PuntoStoricoObiettivoPeso {
  targetKg: number;
  registratoIl: string;
}

export async function elencaStoricoObiettivoPeso(): Promise<PuntoStoricoObiettivoPeso[]> {
  const db = await getDb();
  const righe = await db.select<{ target_kg: number; recorded_at: string }[]>(
    `SELECT target_kg, recorded_at FROM weight_goal_history ORDER BY recorded_at`,
  );
  return righe.map((r) => ({ targetKg: r.target_kg, registratoIl: r.recorded_at }));
}

// Il margine di tolleranza è configurabile dall'utente (vedi lib/settings.ts, non più una
// costante fissa qui) - ogni funzione sotto lo riceve esplicitamente come parametro invece di
// leggerlo da un default, così non può restare silenziosamente disallineato da quello impostato.

// Confronto diretto, niente ritmo o direzione coinvolti - stessa logica di calcolaSforamenti in
// dailyGoal.ts per i limiti di kcal/macro (valore consumato > limite ⇒ sforato): "sei
// nell'obiettivo" è un fatto indipendente da "quanto in fretta ci stai arrivando".
export function nelObiettivoPeso(pesoKg: number, obiettivoKg: number, margineKg: number): boolean {
  return pesoKg <= obiettivoKg + margineKg;
}

export interface StatoSforamentoPeso {
  serieConsecutiva: number;
  giorniSforatiNelMese: number;
}

// Speculare a calcolaStatoSforamenti in dailyGoal.ts, ma per il peso invece del diario alimentare.
// Serie consecutiva: giorni di fila, a ritroso da "oggi", senza pesata registrata O con una pesata
// sopra l'obiettivo (un giorno senza dato interrompe la serie, non viene ignorato - stessa regola
// del kcal/macro). Giorni nel mese: quante pesate del mese corrente risultano sopra l'obiettivo.
export function calcolaStatoSforamentoPeso(
  peso: VocePeso[],
  obiettivoKg: number | null,
  oggi: string,
  margineKg: number,
): StatoSforamentoPeso {
  if (obiettivoKg === null) return { serieConsecutiva: 0, giorniSforatiNelMese: 0 };
  const pesoPerData = new Map(peso.map((v) => [v.data, v.pesoKg]));

  let serieConsecutiva = 0;
  let cursore = oggi;
  while (true) {
    const p = pesoPerData.get(cursore);
    if (p === undefined || nelObiettivoPeso(p, obiettivoKg, margineKg)) break;
    serieConsecutiva++;
    cursore = format(subDays(new Date(cursore), 1), "yyyy-MM-dd");
  }

  const meseCorrente = oggi.slice(0, 7);
  let giorniSforatiNelMese = 0;
  for (const [data, p] of pesoPerData) {
    if (data.slice(0, 7) === meseCorrente && !nelObiettivoPeso(p, obiettivoKg, margineKg)) giorniSforatiNelMese++;
  }

  return { serieConsecutiva, giorniSforatiNelMese };
}

export interface DettaglioMisurazioneSforataPeso {
  data: string;
  pesoKg: number;
  obiettivoKg: number;
}

// Speculare a dettaglioGiorniSforati in dailyGoal.ts: ripercorre la stessa serie/lo stesso mese
// riassunti da calcolaStatoSforamentoPeso, dal più recente al meno recente.
export function dettaglioMisurazioniSforatePeso(
  peso: VocePeso[],
  obiettivoKg: number | null,
  oggi: string,
  periodo: "serie" | "mese",
  margineKg: number,
): DettaglioMisurazioneSforataPeso[] {
  if (obiettivoKg === null) return [];
  const pesoPerData = new Map(peso.map((v) => [v.data, v.pesoKg]));

  if (periodo === "serie") {
    const dettagli: DettaglioMisurazioneSforataPeso[] = [];
    let cursore = oggi;
    while (true) {
      const p = pesoPerData.get(cursore);
      if (p === undefined || nelObiettivoPeso(p, obiettivoKg, margineKg)) break;
      dettagli.push({ data: cursore, pesoKg: p, obiettivoKg });
      cursore = format(subDays(new Date(cursore), 1), "yyyy-MM-dd");
    }
    return dettagli;
  }

  const meseCorrente = oggi.slice(0, 7);
  const dettagli: DettaglioMisurazioneSforataPeso[] = [];
  for (const [data, p] of pesoPerData) {
    if (data.slice(0, 7) === meseCorrente && !nelObiettivoPeso(p, obiettivoKg, margineKg)) {
      dettagli.push({ data, pesoKg: p, obiettivoKg });
    }
  }
  return dettagli.sort((a, b) => (a.data < b.data ? 1 : -1));
}

export interface StatoPositivoPeso {
  serieConsecutivaPulita: number;
  settimanaPulita: boolean;
  giorniPulitiNelMese: number;
}

// Speculare a calcolaStatoPositivo in dailyGoal.ts, ma per il peso: un giorno è "pulito" solo se ha
// una pesata registrata E un obiettivo impostato E rientra nel margine di tolleranza - un giorno
// senza pesata non conta come pulito (nulla da festeggiare se non è stato nemmeno tracciato).
export function calcolaStatoPositivoPeso(
  peso: VocePeso[],
  obiettivoKg: number | null,
  oggi: string,
  margineKg: number,
): StatoPositivoPeso {
  if (obiettivoKg === null) return { serieConsecutivaPulita: 0, settimanaPulita: false, giorniPulitiNelMese: 0 };
  const pesoPerData = new Map(peso.map((v) => [v.data, v.pesoKg]));

  let serieConsecutivaPulita = 0;
  let cursore = oggi;
  while (true) {
    const p = pesoPerData.get(cursore);
    if (p === undefined || !nelObiettivoPeso(p, obiettivoKg, margineKg)) break;
    serieConsecutivaPulita++;
    cursore = format(subDays(new Date(cursore), 1), "yyyy-MM-dd");
  }

  let settimanaPulita = true;
  let giornoSettimana = format(startOfWeek(new Date(oggi), { weekStartsOn: 1 }), "yyyy-MM-dd");
  while (giornoSettimana <= oggi) {
    const p = pesoPerData.get(giornoSettimana);
    if (p === undefined || !nelObiettivoPeso(p, obiettivoKg, margineKg)) {
      settimanaPulita = false;
      break;
    }
    giornoSettimana = format(addDays(new Date(giornoSettimana), 1), "yyyy-MM-dd");
  }

  const meseCorrente = oggi.slice(0, 7);
  let giorniPulitiNelMese = 0;
  for (const [data, p] of pesoPerData) {
    if (data.slice(0, 7) === meseCorrente && nelObiettivoPeso(p, obiettivoKg, margineKg)) giorniPulitiNelMese++;
  }

  return { serieConsecutivaPulita, settimanaPulita, giorniPulitiNelMese };
}

// Ritmo di variazione OSSERVATO (primo/ultimo peso nella finestra, poi ×7 per settimana) - non un
// calcolo da deficit calorico, per lo stesso motivo già documentato in PesoPanel.tsx: riflette
// quello che è VERAMENTE successo, non un modello. Sotto GIORNI_MINIMI_RITMO_PESO giorni tra le due
// pesate il ritmo diventa statisticamente inaffidabile (due pesate a un giorno di distanza
// amplificate ×7 danno un numero assurdo), quindi torna null invece di un dato fuorviante.
export function calcolaRitmoKgSettimana(voci: VocePeso[], finestraGiorni = GIORNI_FINESTRA_RITMO_PESO): number | null {
  if (voci.length < 2) return null;
  const recenti = voci.slice(-finestraGiorni);
  const primo = recenti[0]!;
  const ultimo = recenti[recenti.length - 1]!;
  const giorniTrascorsi = differenceInCalendarDays(new Date(ultimo.data), new Date(primo.data));
  if (giorniTrascorsi < GIORNI_MINIMI_RITMO_PESO) return null;
  const kgPerGiorno = (ultimo.pesoKg - primo.pesoKg) / giorniTrascorsi;
  return kgPerGiorno * 7;
}
