import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

// Frammenti tipici nel messaggio sqlx/tauri-plugin-sql quando una migration già applicata non
// corrisponde più al file sul disco (checksum) - vedi il grosso avviso in PROGETTO.md: "mai
// modificare una migration già applicata". Senza questo indizio, chi legge il log critico vede
// solo un errore sqlx generico e non capisce a colpo d'occhio la causa più probabile.
function suggerimentoSeErroreDiMigrazione(messaggio: string): string {
  const minuscolo = messaggio.toLowerCase();
  const eDiMigrazione = minuscolo.includes("checksum") || minuscolo.includes("migration");
  return eDiMigrazione
    ? " (possibile migration già applicata modificata sul disco dopo l'esecuzione - vedi PROGETTO.md: mai modificare un file di migration già applicato, va fatto con una nuova migration)"
    : "";
}

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    // Se la connessione fallisce, non tenere la promise fallita in cache per sempre: altrimenti
    // un errore transitorio (es. file temporaneamente bloccato) romperebbe l'app fino al riavvio,
    // invece di poter essere ritentato alla chiamata successiva.
    dbPromise = Database.load("sqlite:nutrition.db").catch((err) => {
      dbPromise = null;
      const messaggioOriginale = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Impossibile connettersi al database: ${messaggioOriginale}${suggerimentoSeErroreDiMigrazione(messaggioOriginale)}`,
      );
    });
  }
  return dbPromise;
}
