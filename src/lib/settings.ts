import { exists, mkdir, readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";

// File separato in AppData, non nel DB — stesso motivo di layout.json (vedi layoutStorage.ts):
// impostazioni locali ad accesso raro, non dati che serva interrogare con SQL.
const SETTINGS_FILE = "settings.json";

export interface Impostazioni {
  margineObiettivoPesoKg: number;
}

const IMPOSTAZIONI_DEFAULT: Impostazioni = {
  margineObiettivoPesoKg: 5,
};

async function assicuraDirDati(): Promise<void> {
  const presente = await exists("", { baseDir: BaseDirectory.AppData });
  if (!presente) {
    await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

// Merge col default, non sostituzione: un campo nuovo aggiunto in futuro a Impostazioni non deve
// far esplodere il caricamento di un settings.json scritto da una versione precedente dell'app che
// non lo conosceva ancora — semplicemente prende il valore di default finché non viene salvato.
export async function caricaImpostazioni(): Promise<Impostazioni> {
  await assicuraDirDati();
  const presente = await exists(SETTINGS_FILE, { baseDir: BaseDirectory.AppData });
  if (!presente) return IMPOSTAZIONI_DEFAULT;
  const contenuto = await readTextFile(SETTINGS_FILE, { baseDir: BaseDirectory.AppData });
  return { ...IMPOSTAZIONI_DEFAULT, ...(JSON.parse(contenuto) as Partial<Impostazioni>) };
}

export async function salvaImpostazioni(impostazioni: Impostazioni): Promise<void> {
  await assicuraDirDati();
  await writeTextFile(SETTINGS_FILE, JSON.stringify(impostazioni, null, 2), {
    baseDir: BaseDirectory.AppData,
  });
}
