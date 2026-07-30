import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    // Se la connessione fallisce, non tenere la promise fallita in cache per sempre: altrimenti
    // un errore transitorio (es. file temporaneamente bloccato) romperebbe l'app fino al riavvio,
    // invece di poter essere ritentato alla chiamata successiva.
    dbPromise = Database.load("sqlite:nutrition.db").catch((err) => {
      dbPromise = null;
      throw new Error(
        `Impossibile connettersi al database: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }
  return dbPromise;
}
