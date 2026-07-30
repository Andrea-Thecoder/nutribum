import { z } from "zod";
import { getDb } from "./db";

// Backup/ripristino COMPLETO del database: a differenza degli export per dominio (alimenti,
// diario, peso — vedi exportFoods.ts/lib/report.ts ecc.), qui si esporta/reimporta lo stato grezzo
// di ogni tabella (id compresi, per preservare le foreign key tra tabelle collegate come
// food_log.food_id o recipe_ingredients.recipe_id) invece di passare per le forme "amichevoli" già
// usate altrove, che sono rimodellamenti con perdita (es. GiornoStorico raggruppa per giorno/pasto)
// pensati per essere leggibili, non per una ricostruzione 1:1. "fitness_level" non è inclusa: è una
// tabella di lookup fissa riseminata identica da ogni installazione della migration, non un dato
// utente — i suoi id restano stabili senza bisogno di backup/ripristino.

const RigaFoodSchema = z.object({
  id: z.number(),
  name: z.string(),
  unit_100: z.enum(["g", "ml"]),
  kcal_100: z.number(),
  protein_100: z.number(),
  carbs_100: z.number(),
  fat_100: z.number(),
  sugar_100: z.number().nullable(),
  saturated_fat_100: z.number().nullable(),
  fiber_100: z.number().nullable(),
  salt_100: z.number().nullable(),
  from_label: z.number(),
  created_at: z.string(),
});

const RigaFoodLogSchema = z.object({
  id: z.number(),
  food_id: z.number(),
  log_date: z.string(),
  log_time: z.string().nullable(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  quantity: z.number(),
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  sugar_g: z.number().nullable(),
  saturated_fat_g: z.number().nullable(),
  fiber_g: z.number().nullable(),
  salt_g: z.number().nullable(),
  created_at: z.string(),
});

const RigaGoalSchema = z.object({
  id: z.number(),
  kcal: z.number().nullable(),
  kcal_min: z.number().nullable(),
  protein_g: z.number().nullable(),
  carbs_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  fiber_g: z.number().nullable(),
  salt_g: z.number().nullable(),
  updated_at: z.string(),
});

const RigaGoalHistorySchema = z.object({
  id: z.number(),
  valido_dal: z.string(),
  valido_al: z.string().nullable(),
  ambito: z.enum(["daOra", "sempre", "settimana", "mese"]),
  kcal: z.number().nullable(),
  kcal_min: z.number().nullable(),
  protein_g: z.number().nullable(),
  carbs_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  fiber_g: z.number().nullable(),
  salt_g: z.number().nullable(),
  recorded_at: z.string(),
  gruppo: z.enum(["kcal", "macro", "altro"]),
});

const RigaWeightLogSchema = z.object({
  id: z.number(),
  log_date: z.string(),
  weight_kg: z.number(),
  created_at: z.string(),
});

const RigaWeightGoalSchema = z.object({
  id: z.number(),
  target_kg: z.number().nullable(),
  updated_at: z.string(),
});

const RigaWeightGoalHistorySchema = z.object({
  id: z.number(),
  target_kg: z.number(),
  recorded_at: z.string(),
});

const RigaProfileSchema = z.object({
  id: z.number(),
  age_years: z.number(),
  height_cm: z.number(),
  sex: z.enum(["M", "F"]),
  updated_at: z.string(),
});

const RigaProfileHistorySchema = z.object({
  id: z.number(),
  age_years: z.number(),
  height_cm: z.number(),
  sex: z.enum(["M", "F"]),
  recorded_at: z.string(),
});

const RigaProfileFitnessSchema = z.object({
  id: z.number(),
  profile_id: z.number(),
  fitness_level_id: z.number(),
  created_at: z.string(),
});

const RigaRecipeSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string(),
});

const RigaRecipeIngredientSchema = z.object({
  id: z.number(),
  recipe_id: z.number(),
  food_id: z.number(),
  quantity: z.number(),
});

const BackupCompletoSchema = z.object({
  schemaVersion: z.literal("1.0"),
  esportatoIl: z.string(),
  food: z.array(RigaFoodSchema),
  food_log: z.array(RigaFoodLogSchema),
  goal: z.array(RigaGoalSchema),
  goal_history: z.array(RigaGoalHistorySchema),
  weight_log: z.array(RigaWeightLogSchema),
  weight_goal: z.array(RigaWeightGoalSchema),
  weight_goal_history: z.array(RigaWeightGoalHistorySchema),
  profile: z.array(RigaProfileSchema),
  profile_history: z.array(RigaProfileHistorySchema),
  profile_fitness: z.array(RigaProfileFitnessSchema),
  recipes: z.array(RigaRecipeSchema),
  recipe_ingredients: z.array(RigaRecipeIngredientSchema),
});

export type BackupCompleto = z.infer<typeof BackupCompletoSchema>;

const COLONNE: Record<string, string[]> = {
  food: [
    "id", "name", "unit_100", "kcal_100", "protein_100", "carbs_100", "fat_100",
    "sugar_100", "saturated_fat_100", "fiber_100", "salt_100", "from_label", "created_at",
  ],
  food_log: [
    "id", "food_id", "log_date", "log_time", "meal_type", "quantity", "kcal",
    "protein_g", "carbs_g", "fat_g", "sugar_g", "saturated_fat_g", "fiber_g", "salt_g", "created_at",
  ],
  goal: ["id", "kcal", "kcal_min", "protein_g", "carbs_g", "fat_g", "fiber_g", "salt_g", "updated_at"],
  goal_history: [
    "id", "valido_dal", "valido_al", "ambito", "kcal", "kcal_min", "protein_g", "carbs_g",
    "fat_g", "fiber_g", "salt_g", "recorded_at", "gruppo",
  ],
  weight_log: ["id", "log_date", "weight_kg", "created_at"],
  weight_goal: ["id", "target_kg", "updated_at"],
  weight_goal_history: ["id", "target_kg", "recorded_at"],
  profile: ["id", "age_years", "height_cm", "sex", "updated_at"],
  profile_history: ["id", "age_years", "height_cm", "sex", "recorded_at"],
  profile_fitness: ["id", "profile_id", "fitness_level_id", "created_at"],
  recipes: ["id", "name", "created_at"],
  recipe_ingredients: ["id", "recipe_id", "food_id", "quantity"],
};

// Ordine di cancellazione: tabelle con foreign key prima di quelle che referenziano (rispettato
// anche se le altre non hanno vincoli, per uniformità). "fitness_level" esclusa di proposito.
const TABELLE_FIGLIE = ["recipe_ingredients", "profile_fitness", "food_log"] as const;
const TABELLE_GENITORI = ["recipes", "food", "profile"] as const;
const TABELLE_INDIPENDENTI = [
  "goal", "goal_history", "weight_log", "weight_goal", "weight_goal_history", "profile_history",
] as const;

export async function esportaBackupCompleto(): Promise<BackupCompleto> {
  const db = await getDb();
  async function leggi<T>(tabella: string): Promise<T[]> {
    return db.select<T[]>(`SELECT ${COLONNE[tabella].join(", ")} FROM ${tabella} ORDER BY id`);
  }
  return {
    schemaVersion: "1.0",
    esportatoIl: new Date().toISOString(),
    food: await leggi("food"),
    food_log: await leggi("food_log"),
    goal: await leggi("goal"),
    goal_history: await leggi("goal_history"),
    weight_log: await leggi("weight_log"),
    weight_goal: await leggi("weight_goal"),
    weight_goal_history: await leggi("weight_goal_history"),
    profile: await leggi("profile"),
    profile_history: await leggi("profile_history"),
    profile_fitness: await leggi("profile_fitness"),
    recipes: await leggi("recipes"),
    recipe_ingredients: await leggi("recipe_ingredients"),
  };
}

export function validaBackupJson(contenuto: string): BackupCompleto {
  let dati: unknown;
  try {
    dati = JSON.parse(contenuto);
  } catch (err) {
    throw new Error(`JSON non valido: ${err instanceof Error ? err.message : String(err)}`);
  }
  const risultato = BackupCompletoSchema.safeParse(dati);
  if (!risultato.success) {
    const dettagli = risultato.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Il file non è un backup completo valido di NutriBum: ${dettagli}`);
  }
  return risultato.data;
}

// Cancella le righe di TUTTE le tabelle dati (non le tabelle stesse: DELETE, non DROP — lo schema
// resta intatto) — "fitness_level" esclusa perché non è un dato utente.
export async function svuotaTuttiIDati(): Promise<void> {
  const db = await getDb();
  for (const tabella of TABELLE_FIGLIE) await db.execute(`DELETE FROM ${tabella}`);
  for (const tabella of TABELLE_GENITORI) await db.execute(`DELETE FROM ${tabella}`);
  for (const tabella of TABELLE_INDIPENDENTI) await db.execute(`DELETE FROM ${tabella}`);
}

export async function svuotaDiario(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM food_log");
}

// Sovrascrive lo stato attuale con quello del backup: svuota tutto, poi reinserisce riga per riga
// preservando gli id originali (indispensabile per le foreign key tra tabelle collegate).
export async function ripristinaBackupCompleto(backup: BackupCompleto): Promise<void> {
  await svuotaTuttiIDati();
  const db = await getDb();

  async function inserisci(tabella: string, righe: Record<string, unknown>[]): Promise<void> {
    const colonne = COLONNE[tabella];
    const placeholders = colonne.map((_, i) => `$${i + 1}`).join(", ");
    for (const riga of righe) {
      await db.execute(
        `INSERT INTO ${tabella} (${colonne.join(", ")}) VALUES (${placeholders})`,
        colonne.map((c) => riga[c]),
      );
    }
  }

  await inserisci("food", backup.food);
  await inserisci("recipes", backup.recipes);
  await inserisci("profile", backup.profile);
  await inserisci("recipe_ingredients", backup.recipe_ingredients);
  await inserisci("food_log", backup.food_log);
  await inserisci("profile_fitness", backup.profile_fitness);
  await inserisci("goal", backup.goal);
  await inserisci("goal_history", backup.goal_history);
  await inserisci("weight_log", backup.weight_log);
  await inserisci("weight_goal", backup.weight_goal);
  await inserisci("weight_goal_history", backup.weight_goal_history);
  await inserisci("profile_history", backup.profile_history);
}
