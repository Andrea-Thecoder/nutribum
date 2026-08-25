import { exists, mkdir, readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";

// File separato in AppData, non nel DB - stesso motivo di layout.json (vedi layoutStorage.ts):
// impostazioni locali ad accesso raro, non dati che serva interrogare con SQL.
const SETTINGS_FILE = "settings.json";

export interface Impostazioni {
  margineObiettivoPesoKg: number;
  // Default disattivato: la ricerca aggiornamenti richiede una connessione a internet, va attivata
  // esplicitamente dall'utente (vedi useAggiornamenti.ts) - non deve mai partire da sola al primo avvio.
  aggiornamentiAutomatici: boolean;
  // Default disattivato: chiudere gli spazi vuoti verticali dopo un drag/resize elimina anche le
  // sovrapposizioni volute (due pannelli impilati con lo z-index per passare dall'uno all'altro),
  // l'algoritmo non distingue le due cose - va abilitato esplicitamente da chi non usa quel pattern.
  comprimiSpazioAutomaticamente: boolean;
  // Default attivo: guida visiva per capire dove si allineeranno i pannelli durante drag/resize,
  // al posto dello sfondo pieno.
  mostraGriglia: boolean;
  // Default disattivato: se falso, il tour di benvenuto parte da solo al prossimo avvio. Campo
  // piatto (non un oggetto tipo tourCompletati.benvenuto) per restare coerente con lo stile del
  // resto del file e perché il merge col default qui sopra è shallow, non deep.
  tourBenvenutoCompletato: boolean;
  // Default "sistema": segue il tema del sistema operativo (comportamento storico dell'app, prima
  // che questa impostazione esistesse). "chiaro"/"scuro" sono una scelta manuale che sovrascrive il
  // sistema finché non si torna a "sistema" - risolto in App.tsx (classe "dark" su <html>), non qui.
  tema: "chiaro" | "scuro" | "sistema";
}

export const IMPOSTAZIONI_DEFAULT: Impostazioni = {
  margineObiettivoPesoKg: 5,
  aggiornamentiAutomatici: false,
  comprimiSpazioAutomaticamente: false,
  mostraGriglia: true,
  tourBenvenutoCompletato: false,
  tema: "sistema",
};

async function assicuraDirDati(): Promise<void> {
  const presente = await exists("", { baseDir: BaseDirectory.AppData });
  if (!presente) {
    await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

// Merge col default, non sostituzione: un campo nuovo aggiunto in futuro a Impostazioni non deve
// far esplodere il caricamento di un settings.json scritto da una versione precedente dell'app che
// non lo conosceva ancora - semplicemente prende il valore di default finché non viene salvato.
export async function caricaImpostazioni(): Promise<Impostazioni> {
  await assicuraDirDati();
  const presente = await exists(SETTINGS_FILE, { baseDir: BaseDirectory.AppData });
  if (!presente) return IMPOSTAZIONI_DEFAULT;
  const contenuto = await readTextFile(SETTINGS_FILE, { baseDir: BaseDirectory.AppData });
  return { ...IMPOSTAZIONI_DEFAULT, ...(JSON.parse(contenuto) as Partial<Impostazioni>) };
}

// Accetta una patch parziale (non l'oggetto intero): fa read-modify-write sul file esistente, così
// un chiamante che vuole aggiornare un solo campo (es. aggiornamentiAutomatici) non deve conoscere né
// ripassare gli altri, e non rischia di sovrascriverli con un valore vecchio/stantio.
export async function salvaImpostazioni(patch: Partial<Impostazioni>): Promise<void> {
  await assicuraDirDati();
  const attuali = await caricaImpostazioni();
  const aggiornate: Impostazioni = { ...attuali, ...patch };
  await writeTextFile(SETTINGS_FILE, JSON.stringify(aggiornate, null, 2), {
    baseDir: BaseDirectory.AppData,
  });
}
