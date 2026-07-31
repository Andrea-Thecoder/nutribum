import { getDb } from "./db";

export type Sesso = "M" | "F";

export interface Profilo {
  etaAnni: number;
  altezzaCm: number;
  sesso: Sesso;
}

interface RigaProfilo {
  age_years: number;
  height_cm: number;
  sex: Sesso;
}

function mappaProfilo(r: RigaProfilo): Profilo {
  return { etaAnni: r.age_years, altezzaCm: r.height_cm, sesso: r.sex };
}

export async function leggiProfilo(): Promise<Profilo | null> {
  const db = await getDb();
  const righe = await db.select<RigaProfilo[]>(
    `SELECT age_years, height_cm, sex FROM profile WHERE id = 1`,
  );
  return righe.length === 0 ? null : mappaProfilo(righe[0]);
}

// Niente bmr/peso qui: sono derivati (vedi lib/tdee.ts) e cambiano più spesso dell'anagrafica
// stessa, quindi si calcolano sempre al volo invece di essere persistiti e rischiare di
// disallinearsi. Ogni salvataggio accoda comunque uno snapshot a profile_history - l'età aumenta
// ogni anno, senza storicità un aggiornamento perderebbe il valore precedente.
export async function salvaProfilo(profilo: Profilo): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO profile (id, age_years, height_cm, sex) VALUES (1, $1, $2, $3)
     ON CONFLICT(id) DO UPDATE SET
       age_years = excluded.age_years,
       height_cm = excluded.height_cm,
       sex = excluded.sex,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    [profilo.etaAnni, profilo.altezzaCm, profilo.sesso],
  );
  await db.execute(
    `INSERT INTO profile_history (age_years, height_cm, sex) VALUES ($1, $2, $3)`,
    [profilo.etaAnni, profilo.altezzaCm, profilo.sesso],
  );
}

export interface PuntoStoricoProfilo extends Profilo {
  registratoIl: string;
}

export async function elencaStoricoProfilo(): Promise<PuntoStoricoProfilo[]> {
  const db = await getDb();
  const righe = await db.select<{ age_years: number; height_cm: number; sex: Sesso; recorded_at: string }[]>(
    `SELECT age_years, height_cm, sex, recorded_at FROM profile_history ORDER BY recorded_at`,
  );
  return righe.map((r) => ({ ...mappaProfilo(r), registratoIl: r.recorded_at }));
}

export interface LivelloFitness {
  id: number;
  livello: string; // chiave enum inglese ('sedentary' | 'light' | ...), non per la UI
  moltiplicatore: number;
  etichetta: string; // label_ita - quello che l'app mostra oggi (UI solo italiana)
  descrizione: string; // description_ita
  // _eng già letti dal DB (colonne aggiunte in vista di un'UI inglese futura) anche se non
  // ancora usati da nessuna parte - pronti per quando servirà, senza un'altra migration.
  etichettaEng: string;
  descrizioneEng: string;
}

interface RigaLivelloFitness {
  id: number;
  level: string;
  multiplier: number;
  label_ita: string;
  label_eng: string;
  description_ita: string;
  description_eng: string;
}

function mappaLivelloFitness(r: RigaLivelloFitness): LivelloFitness {
  return {
    id: r.id,
    livello: r.level,
    moltiplicatore: r.multiplier,
    etichetta: r.label_ita,
    descrizione: r.description_ita,
    etichettaEng: r.label_eng,
    descrizioneEng: r.description_eng,
  };
}

// Tabella di lookup a righe fisse (seminate dalla migration): mai scritta dall'app, solo letta.
export async function elencaLivelliFitness(): Promise<LivelloFitness[]> {
  const db = await getDb();
  const righe = await db.select<RigaLivelloFitness[]>(
    `SELECT id, level, multiplier, label_ita, label_eng, description_ita, description_eng
     FROM fitness_level ORDER BY multiplier`,
  );
  return righe.map(mappaLivelloFitness);
}

// L'ultima riga inserita in profile_fitness (join con fitness_level) è quella attiva ora - stessa
// tecnica "ultimo storico prima/uguale a oggi" già usata altrove, semplificata qui perché serve solo
// "quello attivo adesso", non un punto nel passato.
export async function leggiLivelloFitnessAttivo(): Promise<LivelloFitness | null> {
  const db = await getDb();
  const righe = await db.select<RigaLivelloFitness[]>(
    `SELECT fl.id, fl.level, fl.multiplier, fl.label_ita, fl.label_eng, fl.description_ita, fl.description_eng
     FROM profile_fitness pf
     JOIN fitness_level fl ON fl.id = pf.fitness_level_id
     WHERE pf.profile_id = 1
     ORDER BY pf.created_at DESC
     LIMIT 1`,
  );
  return righe.length === 0 ? null : mappaLivelloFitness(righe[0]);
}

// Append-only, come profile_history: il livello di attività può cambiare mantenendo la stessa
// anagrafica (un periodo sedentario, poi uno più attivo...), quindi ha una sua storicità separata.
export async function impostaLivelloFitness(fitnessLevelId: number): Promise<void> {
  const db = await getDb();
  await db.execute(`INSERT INTO profile_fitness (profile_id, fitness_level_id) VALUES (1, $1)`, [
    fitnessLevelId,
  ]);
}

export interface PuntoStoricoFitness {
  livello: string;
  moltiplicatore: number;
  impostatoIl: string;
}

// Storico completo di profile_fitness (join con fitness_level), ordine crescente - usato per
// ricostruire quale livello di attività era in vigore in una data passata (vedi
// trovaMoltiplicatoreAttivoAlla in lib/tdee.ts), stessa tecnica di elencaStoricoProfilo.
export async function elencaStoricoFitness(): Promise<PuntoStoricoFitness[]> {
  const db = await getDb();
  const righe = await db.select<{ level: string; multiplier: number; created_at: string }[]>(
    `SELECT fl.level, fl.multiplier, pf.created_at
     FROM profile_fitness pf
     JOIN fitness_level fl ON fl.id = pf.fitness_level_id
     WHERE pf.profile_id = 1
     ORDER BY pf.created_at`,
  );
  return righe.map((r) => ({ livello: r.level, moltiplicatore: r.multiplier, impostatoIl: r.created_at }));
}
