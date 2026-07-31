import { z } from "zod";
import { registraPeso, elencaPesoCompleto, type VocePeso } from "./weight";
import { parseRigheCsv, type ErroreRigaImport } from "./csv";

const WeightImportRowSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve essere in formato YYYY-MM-DD"),
  peso_kg: z.number().positive(),
});
type WeightImportRow = z.infer<typeof WeightImportRowSchema>;

const CSV_FIELDS = ["data", "peso_kg"] as const;

function toWeightEntry(r: WeightImportRow): VocePeso {
  return { data: r.data, pesoKg: r.peso_kg };
}

export interface ParsedWeight {
  validi: VocePeso[];
  errori: ErroreRigaImport[];
}

function validateRows(rawRows: { riga: number; dati: unknown }[]): ParsedWeight {
  const validi: VocePeso[] = [];
  const errori: ErroreRigaImport[] = [];

  for (const { riga, dati } of rawRows) {
    const risultato = WeightImportRowSchema.safeParse(dati);
    if (risultato.success) {
      validi.push(toWeightEntry(risultato.data));
    } else {
      const dettagli = risultato.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      errori.push({ riga, messaggio: dettagli });
    }
  }

  return { validi, errori };
}

export function parseWeightJson(contenuto: string): ParsedWeight {
  const testoTrim = contenuto.trim();
  if (!testoTrim.startsWith("[") && !testoTrim.startsWith("{")) {
    throw new Error(
      "Il contenuto non sembra JSON (deve iniziare con [ oppure {) - se è un file CSV usa \"Da CSV…\"",
    );
  }

  let dati: unknown;
  try {
    dati = JSON.parse(contenuto);
  } catch (err) {
    throw new Error(`JSON non valido: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!Array.isArray(dati)) {
    throw new Error("Il file JSON deve contenere un array di misurazioni di peso");
  }

  return validateRows(dati.map((riga, indice) => ({ riga: indice + 1, dati: riga })));
}

function coerceCsvValue(campo: string, valoreGrezzo: string): unknown {
  const v = valoreGrezzo.trim();
  if (campo === "data") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

export function parseWeightCsv(contenuto: string): ParsedWeight {
  const testoTrim = contenuto.trim();
  if (testoTrim.startsWith("[") || testoTrim.startsWith("{")) {
    throw new Error('Il contenuto sembra JSON, non CSV - usa "Da JSON…" per importarlo');
  }

  const righe = parseRigheCsv(contenuto);
  if (righe.length === 0) {
    throw new Error("Il file CSV è vuoto");
  }

  const intestazione = righe[0].map((h) => h.trim());
  const nomiCampiValidi = new Set<string>(CSV_FIELDS);
  const colonneSconosciute = intestazione.filter((h) => !nomiCampiValidi.has(h));
  if (colonneSconosciute.length > 0) {
    throw new Error(`Colonne non riconosciute nell'intestazione CSV: ${colonneSconosciute.join(", ")}`);
  }
  if (!intestazione.includes("data") || !intestazione.includes("peso_kg")) {
    throw new Error('Intestazione CSV mancante delle colonne obbligatorie "data" e "peso_kg"');
  }

  const righeDati = righe.slice(1).map((valori, indice) => {
    const oggetto: Record<string, unknown> = {};
    intestazione.forEach((campo, i) => {
      oggetto[campo] = coerceCsvValue(campo, valori[i] ?? "");
    });
    return { riga: indice + 2, dati: oggetto };
  });

  return validateRows(righeDati);
}

export interface WeightImportResult {
  inseriti: number;
  aggiornati: number;
  errori: ErroreRigaImport[];
}

export async function importWeightBulk(righe: ParsedWeight): Promise<WeightImportResult> {
  const esistenti = await elencaPesoCompleto();
  const dateEsistenti = new Set(esistenti.map((v) => v.data));

  let inseriti = 0;
  let aggiornati = 0;

  for (const riga of righe.validi) {
    if (dateEsistenti.has(riga.data)) {
      aggiornati++;
    } else {
      dateEsistenti.add(riga.data);
      inseriti++;
    }
    await registraPeso(riga.data, riga.pesoKg);
  }

  return { inseriti, aggiornati, errori: righe.errori };
}
