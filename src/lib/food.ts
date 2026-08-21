import { z } from "zod";
import { getDb } from "./db";
import type { Alimento, GiornoStorico, Pasto } from "./schema";

// "unita": g o ml - il riferimento di "100" nei campi _100 qui sotto (es. kcal_100 è "kcal per 100
// unita", non sempre grammi). Serve per alimenti come l'olio EVO, la cui etichetta nutrizionale è
// spesso espressa per 100ml: forzare sempre i grammi richiederebbe stimare una densità (g/ml), che
// introdurrebbe un errore di conversione. Dichiarando l'unità reale e loggando le quantità nella
// STESSA unità, non serve nessuna conversione.
export const UNITA_ALIMENTO = ["g", "ml"] as const;
export type UnitaAlimento = (typeof UNITA_ALIMENTO)[number];

export const AlimentoCatalogoSchema = z.object({
  id: z.number(),
  nome: z.string().min(1),
  unita: z.enum(UNITA_ALIMENTO),
  kcal_100: z.number().nonnegative(),
  proteine_100: z.number().nonnegative(),
  carboidrati_100: z.number().nonnegative(),
  grassi_100: z.number().nonnegative(),
  zuccheri_100: z.number().nonnegative().nullable(),
  grassi_saturi_100: z.number().nonnegative().nullable(),
  fibre_100: z.number().nonnegative().nullable(),
  sale_100: z.number().nonnegative().nullable(),
  da_etichetta: z.boolean(),
});
export type AlimentoCatalogo = z.infer<typeof AlimentoCatalogoSchema>;

export const NuovoAlimentoSchema = AlimentoCatalogoSchema.omit({ id: true });
export type NuovoAlimento = z.infer<typeof NuovoAlimentoSchema>;

export const TIPI_PASTO = ["colazione", "pranzo", "cena", "spuntino"] as const;
export type TipoPasto = (typeof TIPI_PASTO)[number];

const MAPPA_TIPO_PASTO_DB: Record<TipoPasto, string> = {
  colazione: "breakfast",
  pranzo: "lunch",
  cena: "dinner",
  spuntino: "snack",
};
const MAPPA_TIPO_PASTO_APP: Record<string, TipoPasto> = {
  breakfast: "colazione",
  lunch: "pranzo",
  dinner: "cena",
  snack: "spuntino",
};

export interface VoceDiario {
  id: number;
  alimentoId: number;
  nomeAlimento: string;
  unita: UnitaAlimento;
  data: string;
  orario: string | null;
  tipoPasto: TipoPasto;
  quantita: number;
  kcal: number;
  proteineG: number;
  carboidratiG: number;
  grassiG: number;
  zuccheriG: number | null;
  grassiSaturiG: number | null;
  fibreG: number | null;
  saleG: number | null;
}

export interface NuovaVoceDiarioInput {
  alimentoId: number;
  data: string;
  orario?: string;
  tipoPasto: TipoPasto;
  quantita: number;
}

export interface Nutrienti {
  kcal: number;
  proteineG: number;
  carboidratiG: number;
  grassiG: number;
}
export type TotaliVoci = Nutrienti;

export interface VocePorzione extends Nutrienti {
  zuccheriG: number | null;
  grassiSaturiG: number | null;
  fibreG: number | null;
  saleG: number | null;
}

interface RigaFood {
  id: number;
  name: string;
  unit_100: string;
  kcal_100: number;
  protein_100: number;
  carbs_100: number;
  fat_100: number;
  sugar_100: number | null;
  saturated_fat_100: number | null;
  fiber_100: number | null;
  salt_100: number | null;
  from_label: number;
}

interface RigaFoodLog {
  id: number;
  food_id: number;
  nome_alimento: string;
  unit_100: string;
  log_date: string;
  log_time: string | null;
  meal_type: string;
  quantity: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number | null;
  saturated_fat_g: number | null;
  fiber_g: number | null;
  salt_g: number | null;
}

function unitaValida(u: string): UnitaAlimento {
  return u === "ml" ? "ml" : "g";
}

function mappaAlimento(r: RigaFood): AlimentoCatalogo {
  return {
    id: r.id,
    nome: r.name,
    unita: unitaValida(r.unit_100),
    kcal_100: r.kcal_100,
    proteine_100: r.protein_100,
    carboidrati_100: r.carbs_100,
    grassi_100: r.fat_100,
    zuccheri_100: r.sugar_100,
    grassi_saturi_100: r.saturated_fat_100,
    fibre_100: r.fiber_100,
    sale_100: r.salt_100,
    da_etichetta: r.from_label === 1,
  };
}

function mappaVoceDiario(r: RigaFoodLog): VoceDiario {
  return {
    id: r.id,
    alimentoId: r.food_id,
    nomeAlimento: r.nome_alimento,
    unita: unitaValida(r.unit_100),
    data: r.log_date,
    orario: r.log_time,
    tipoPasto: MAPPA_TIPO_PASTO_APP[r.meal_type] ?? "spuntino",
    quantita: r.quantity,
    kcal: r.kcal,
    proteineG: r.protein_g,
    carboidratiG: r.carbs_g,
    grassiG: r.fat_g,
    zuccheriG: r.sugar_g,
    grassiSaturiG: r.saturated_fat_g,
    fibreG: r.fiber_g,
    saleG: r.salt_g,
  };
}

function scala(valorePer100: number | null, quantita: number): number | null {
  if (valorePer100 === null) return null;
  return (valorePer100 * quantita) / 100;
}

export function calcolaValoriPorzione(alimento: AlimentoCatalogo, quantita: number): VocePorzione {
  return {
    kcal: scala(alimento.kcal_100, quantita)!,
    proteineG: scala(alimento.proteine_100, quantita)!,
    carboidratiG: scala(alimento.carboidrati_100, quantita)!,
    grassiG: scala(alimento.grassi_100, quantita)!,
    zuccheriG: scala(alimento.zuccheri_100, quantita),
    grassiSaturiG: scala(alimento.grassi_saturi_100, quantita),
    fibreG: scala(alimento.fibre_100, quantita),
    saleG: scala(alimento.sale_100, quantita),
  };
}

export async function elencaAlimenti(): Promise<AlimentoCatalogo[]> {
  const db = await getDb();
  const righe = await db.select<RigaFood[]>(
    `SELECT id, name, unit_100, kcal_100, protein_100, carbs_100, fat_100, sugar_100,
            saturated_fat_100, fiber_100, salt_100, from_label
     FROM food ORDER BY name COLLATE NOCASE`,
  );
  return righe.map(mappaAlimento);
}

export async function creaAlimento(input: NuovoAlimento): Promise<number> {
  const dati = NuovoAlimentoSchema.parse(input);
  const db = await getDb();
  const risultato = await db.execute(
    `INSERT INTO food (name, unit_100, kcal_100, protein_100, carbs_100, fat_100, sugar_100,
                        saturated_fat_100, fiber_100, salt_100, from_label)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      dati.nome,
      dati.unita,
      dati.kcal_100,
      dati.proteine_100,
      dati.carboidrati_100,
      dati.grassi_100,
      dati.zuccheri_100,
      dati.grassi_saturi_100,
      dati.fibre_100,
      dati.sale_100,
      dati.da_etichetta ? 1 : 0,
    ],
  );
  return Number(risultato.lastInsertId);
}

export async function aggiornaAlimento(id: number, input: NuovoAlimento): Promise<void> {
  const dati = NuovoAlimentoSchema.parse(input);
  const db = await getDb();
  await db.execute(
    `UPDATE food
     SET name = $1, unit_100 = $2, kcal_100 = $3, protein_100 = $4, carbs_100 = $5, fat_100 = $6,
         sugar_100 = $7, saturated_fat_100 = $8, fiber_100 = $9, salt_100 = $10, from_label = $11
     WHERE id = $12`,
    [
      dati.nome,
      dati.unita,
      dati.kcal_100,
      dati.proteine_100,
      dati.carboidrati_100,
      dati.grassi_100,
      dati.zuccheri_100,
      dati.grassi_saturi_100,
      dati.fibre_100,
      dati.sale_100,
      dati.da_etichetta ? 1 : 0,
      id,
    ],
  );

  // Le voci del diario memorizzano i valori nutrizionali già scalati per la quantità registrata
  // (non un riferimento dinamico al catalogo): quando cambiano i valori per 100 dell'alimento,
  // vanno ricalcolate a cascata, altrimenti resterebbero congelate a quelli precedenti.
  await db.execute(
    `UPDATE food_log
     SET kcal = $1 * quantity / 100.0,
         protein_g = $2 * quantity / 100.0,
         carbs_g = $3 * quantity / 100.0,
         fat_g = $4 * quantity / 100.0,
         sugar_g = $5 * quantity / 100.0,
         saturated_fat_g = $6 * quantity / 100.0,
         fiber_g = $7 * quantity / 100.0,
         salt_g = $8 * quantity / 100.0
     WHERE food_id = $9`,
    [
      dati.kcal_100,
      dati.proteine_100,
      dati.carboidrati_100,
      dati.grassi_100,
      dati.zuccheri_100,
      dati.grassi_saturi_100,
      dati.fibre_100,
      dati.sale_100,
      id,
    ],
  );
}

export async function eliminaAlimento(id: number): Promise<void> {
  const db = await getDb();
  try {
    await db.execute("DELETE FROM food WHERE id = $1", [id]);
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : String(err);
    if (messaggio.toLowerCase().includes("foreign key")) {
      throw new Error(
        "Impossibile eliminare: l'alimento è usato in una o più voci del diario. Elimina prima quelle voci.",
        { cause: err },
      );
    }
    throw err;
  }
}

export async function registraVoceDiario(
  input: NuovaVoceDiarioInput,
  alimento: AlimentoCatalogo,
): Promise<number> {
  const db = await getDb();
  const { kcal, proteineG, carboidratiG, grassiG, zuccheriG, grassiSaturiG, fibreG, saleG } =
    calcolaValoriPorzione(alimento, input.quantita);

  const risultato = await db.execute(
    `INSERT INTO food_log (food_id, log_date, log_time, meal_type, quantity, kcal,
                            protein_g, carbs_g, fat_g, sugar_g, saturated_fat_g, fiber_g, salt_g)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      input.alimentoId,
      input.data,
      input.orario ?? null,
      MAPPA_TIPO_PASTO_DB[input.tipoPasto],
      input.quantita,
      kcal,
      proteineG,
      carboidratiG,
      grassiG,
      zuccheriG,
      grassiSaturiG,
      fibreG,
      saleG,
    ],
  );
  return Number(risultato.lastInsertId);
}

export async function elencaDiarioGiorno(data: string): Promise<VoceDiario[]> {
  const db = await getDb();
  const righe = await db.select<RigaFoodLog[]>(
    `SELECT fl.id, fl.food_id, f.name as nome_alimento, f.unit_100, fl.log_date, fl.log_time,
            fl.meal_type, fl.quantity, fl.kcal, fl.protein_g, fl.carbs_g, fl.fat_g, fl.sugar_g,
            fl.saturated_fat_g, fl.fiber_g, fl.salt_g
     FROM food_log fl
     JOIN food f ON f.id = fl.food_id
     WHERE fl.log_date = $1
     ORDER BY fl.id`,
    [data],
  );
  return righe.map(mappaVoceDiario);
}

export async function eliminaVoceDiario(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM food_log WHERE id = $1", [id]);
}

interface RigaStorico {
  nome: string;
  unit_100: string;
  log_date: string;
  log_time: string | null;
  meal_type: string;
  quantity: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number | null;
  saturated_fat_g: number | null;
  fiber_g: number | null;
  salt_g: number | null;
  from_label: number;
}

/**
 * Ricompone l'intero storico dal DB nella stessa forma `GiornoStorico[]` che grafici, calendario e
 * aggregate.ts già usano - così la UI resta identica, ma la fonte dati diventa sempre e solo SQLite.
 */
export async function elencaStoricoCompleto(): Promise<GiornoStorico[]> {
  const db = await getDb();
  const righe = await db.select<RigaStorico[]>(
    `SELECT f.name AS nome, f.unit_100, fl.log_date, fl.log_time, fl.meal_type, fl.quantity,
            fl.kcal, fl.protein_g, fl.carbs_g, fl.fat_g, fl.sugar_g, fl.saturated_fat_g,
            fl.fiber_g, fl.salt_g, f.from_label
     FROM food_log fl
     JOIN food f ON f.id = fl.food_id
     ORDER BY fl.log_date, fl.log_time, fl.id`,
  );

  const pastiPerGiorno = new Map<string, Map<string, Pasto>>();
  for (const r of righe) {
    const alimento: Alimento = {
      nome: r.nome,
      quantita: r.quantity,
      unita: unitaValida(r.unit_100),
      kcal: r.kcal,
      proteine_g: r.protein_g,
      carboidrati_g: r.carbs_g,
      grassi_g: r.fat_g,
      zuccheri_g: r.sugar_g ?? undefined,
      grassi_saturi_g: r.saturated_fat_g ?? undefined,
      fibre_g: r.fiber_g ?? undefined,
      sale_g: r.salt_g ?? undefined,
      da_etichetta: r.from_label === 1,
    };
    const tipoPasto = MAPPA_TIPO_PASTO_APP[r.meal_type] ?? "spuntino";

    const pastiDelGiorno = pastiPerGiorno.get(r.log_date) ?? new Map<string, Pasto>();
    pastiPerGiorno.set(r.log_date, pastiDelGiorno);

    const chiavePasto = `${tipoPasto}|${r.log_time ?? ""}`;
    const pasto = pastiDelGiorno.get(chiavePasto) ?? {
      tipo: tipoPasto,
      orario: r.log_time ?? undefined,
      alimenti: [],
    };
    pasto.alimenti.push(alimento);
    pastiDelGiorno.set(chiavePasto, pasto);
  }

  return [...pastiPerGiorno.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, pastiMap]) => ({
      schemaVersion: "1.0",
      data,
      pasti: [...pastiMap.values()],
    }));
}

export async function eliminaGiornoCompleto(data: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM food_log WHERE log_date = $1", [data]);
}

export function totaliVoci(voci: Nutrienti[]): TotaliVoci {
  return voci.reduce(
    (acc, v) => ({
      kcal: acc.kcal + v.kcal,
      proteineG: acc.proteineG + v.proteineG,
      carboidratiG: acc.carboidratiG + v.carboidratiG,
      grassiG: acc.grassiG + v.grassiG,
    }),
    { kcal: 0, proteineG: 0, carboidratiG: 0, grassiG: 0 },
  );
}
