import { exists, mkdir, readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

const CARTELLA_LOG = "logs";

type Gravita = "critico" | "normale";

// Un file per giorno per gravità (non per singolo avvio): se l'app viene riaperta più volte nello
// stesso giorno e incontra altri errori, si accumulano come righe nello stesso file invece di
// frammentarsi in tanti file quasi vuoti. Il suffisso "-critical" separa i due file per poterli
// individuare a colpo d'occhio nella cartella, senza dover aprire ogni file per capire la gravità.
function percorsoFileOggi(gravita: Gravita): string {
  const oggi = new Date().toISOString().slice(0, 10); // yyyy-MM-dd
  const suffisso = gravita === "critico" ? "-critical" : "";
  return `${CARTELLA_LOG}/${oggi}-error-log${suffisso}.txt`;
}

async function assicuraCartellaLog(): Promise<void> {
  const presente = await exists(CARTELLA_LOG, { baseDir: BaseDirectory.AppData });
  if (!presente) {
    await mkdir(CARTELLA_LOG, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

// Scrive una riga di log SOLO quando avviene davvero un errore — la cartella "logs" e il file non
// vengono mai creati preventivamente, solo al primo errore incontrato.
async function scriviRiga(gravita: Gravita, errore: unknown, causa: string, note?: string): Promise<void> {
  const messaggioErrore = errore instanceof Error ? errore.message : String(errore);
  const riga =
    `${new Date().toISOString()} : ${messaggioErrore} : causa: ${causa}` +
    (note ? ` : ${note}` : "") +
    "\n";

  await assicuraCartellaLog();
  const percorso = percorsoFileOggi(gravita);
  const giaPresente = await exists(percorso, { baseDir: BaseDirectory.AppData });
  const contenutoPrecedente = giaPresente
    ? await readTextFile(percorso, { baseDir: BaseDirectory.AppData })
    : "";
  await writeTextFile(percorso, contenutoPrecedente + riga, { baseDir: BaseDirectory.AppData });
}

// Errore bloccante (es. fallimento del caricamento del database all'avvio): registra su file
// critico e chiude subito l'app — non ha senso lasciarla aperta ma inutilizzabile in silenzio.
export async function registraErroreFataleEChiudi(
  errore: unknown,
  causa: string,
  note?: string,
): Promise<void> {
  try {
    await scriviRiga("critico", errore, causa, note);
  } catch {
    // Se anche la scrittura del log fallisce non c'è altro da fare: si chiude comunque l'app.
  } finally {
    await invoke("chiudi_app_per_errore").catch(() => {});
  }
}

// Errore non bloccante (es. un refresh in background che fallisce): registra su file normale,
// l'app continua a funzionare. Fire-and-forget di proposito — chi chiama non deve attendere né
// gestire un eventuale fallimento della scrittura del log stesso.
export function registraErroreNonBloccante(errore: unknown, causa: string, note?: string): void {
  scriviRiga("normale", errore, causa, note).catch(() => {
    // Se anche la scrittura del log fallisce, non c'è nulla da fare — non deve interrompere l'utente.
  });
}
