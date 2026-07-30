import { getDb } from "./db";

export interface Ricetta {
  id: number;
  nome: string;
}

export interface IngredienteRicetta {
  alimentoId: number;
  nomeAlimento: string;
  unita: string;
  quantita: number;
}

export interface RicettaConIngredienti extends Ricetta {
  ingredienti: IngredienteRicetta[];
}

export interface NuovoIngrediente {
  alimentoId: number;
  quantita: number;
}

interface RigaRicetta {
  id: number;
  name: string;
}

interface RigaIngrediente {
  food_id: number;
  nome_alimento: string;
  unit_100: string;
  quantity: number;
}

export async function elencaRicette(): Promise<Ricetta[]> {
  const db = await getDb();
  const righe = await db.select<RigaRicetta[]>("SELECT id, name FROM recipes ORDER BY name COLLATE NOCASE");
  return righe.map((r) => ({ id: r.id, nome: r.name }));
}

async function leggiIngredienti(recipeId: number): Promise<IngredienteRicetta[]> {
  const db = await getDb();
  const righe = await db.select<RigaIngrediente[]>(
    `SELECT ri.food_id, f.name as nome_alimento, f.unit_100, ri.quantity
     FROM recipe_ingredients ri
     JOIN food f ON f.id = ri.food_id
     WHERE ri.recipe_id = $1
     ORDER BY ri.id`,
    [recipeId],
  );
  return righe.map((r) => ({
    alimentoId: r.food_id,
    nomeAlimento: r.nome_alimento,
    unita: r.unit_100,
    quantita: r.quantity,
  }));
}

// Una query per ricetta (elencaIngredienti), non una join unica per tutte: il catalogo ricette di
// un utente singolo resta piccolo (poche decine al massimo), non serve ottimizzare qui a scapito
// della leggibilità — stesso compromesso già accettato altrove in quest'app (es. elencaStoricoCompleto).
export async function elencaRicetteConIngredienti(): Promise<RicettaConIngredienti[]> {
  const ricette = await elencaRicette();
  const conIngredienti = await Promise.all(
    ricette.map(async (r) => ({ ...r, ingredienti: await leggiIngredienti(r.id) })),
  );
  return conIngredienti;
}

export async function creaRicetta(nome: string, ingredienti: NuovoIngrediente[]): Promise<number> {
  const db = await getDb();
  const risultato = await db.execute("INSERT INTO recipes (name) VALUES ($1)", [nome]);
  const id = Number(risultato.lastInsertId);
  for (const ing of ingredienti) {
    await db.execute("INSERT INTO recipe_ingredients (recipe_id, food_id, quantity) VALUES ($1, $2, $3)", [
      id,
      ing.alimentoId,
      ing.quantita,
    ]);
  }
  return id;
}

// Aggiorna sostituendo TUTTI gli ingredienti (cancella e reinserisce), non con un diff riga per
// riga: una ricetta ha poche righe, un replace completo è più semplice da ragionare correttamente
// di un diff, e non ha bisogno di conservare gli id delle righe di recipe_ingredients (non sono
// referenziati da nessun'altra tabella, a differenza di food_log che invece va storicizzato).
export async function aggiornaRicetta(id: number, nome: string, ingredienti: NuovoIngrediente[]): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE recipes SET name = $1 WHERE id = $2", [nome, id]);
  await db.execute("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [id]);
  for (const ing of ingredienti) {
    await db.execute("INSERT INTO recipe_ingredients (recipe_id, food_id, quantity) VALUES ($1, $2, $3)", [
      id,
      ing.alimentoId,
      ing.quantita,
    ]);
  }
}

// Cancella prima le righe di recipe_ingredients esplicitamente lato applicazione, non con una
// ON DELETE CASCADE nello schema — stesso stile esplicito già usato altrove in questo progetto
// (vedi commento in 0009_recipes.sql).
export async function eliminaRicetta(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [id]);
  await db.execute("DELETE FROM recipes WHERE id = $1", [id]);
}
