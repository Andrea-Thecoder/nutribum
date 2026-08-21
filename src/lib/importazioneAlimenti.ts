import { z } from "zod";
import { creaAlimento, elencaAlimenti, type NuovoAlimento } from "./food";
import { parseRigheCsv, type ErroreRigaImport } from "./csv";

const RigaAlimentoImportSchema = z.object({
  nome: z.string().min(1),
  unita: z.enum(["g", "ml"]).optional().default("g"),
  kcal_100: z.number().nonnegative(),
  proteine_100: z.number().nonnegative(),
  carboidrati_100: z.number().nonnegative(),
  grassi_100: z.number().nonnegative(),
  zuccheri_100: z.number().nonnegative().nullable().optional(),
  grassi_saturi_100: z.number().nonnegative().nullable().optional(),
  fibre_100: z.number().nonnegative().nullable().optional(),
  sale_100: z.number().nonnegative().nullable().optional(),
  da_etichetta: z.boolean().optional().default(false),
});
type RigaAlimentoImport = z.infer<typeof RigaAlimentoImportSchema>;

const CAMPI_CSV = [
  "nome",
  "unita",
  "kcal_100",
  "proteine_100",
  "carboidrati_100",
  "grassi_100",
  "zuccheri_100",
  "grassi_saturi_100",
  "fibre_100",
  "sale_100",
  "da_etichetta",
] as const;
const CAMPI_CSV_OPZIONALI_NULLABILI = new Set([
  "zuccheri_100",
  "grassi_saturi_100",
  "fibre_100",
  "sale_100",
]);

function toNuovoAlimento(r: RigaAlimentoImport): NuovoAlimento {
  return {
    nome: r.nome,
    unita: r.unita,
    kcal_100: r.kcal_100,
    proteine_100: r.proteine_100,
    carboidrati_100: r.carboidrati_100,
    grassi_100: r.grassi_100,
    zuccheri_100: r.zuccheri_100 ?? null,
    grassi_saturi_100: r.grassi_saturi_100 ?? null,
    fibre_100: r.fibre_100 ?? null,
    sale_100: r.sale_100 ?? null,
    da_etichetta: r.da_etichetta,
  };
}

export interface AlimentiParsati {
  validi: NuovoAlimento[];
  errori: ErroreRigaImport[];
}

function validaRighe(righeGrezze: { riga: number; dati: unknown }[]): AlimentiParsati {
  const validi: NuovoAlimento[] = [];
  const errori: ErroreRigaImport[] = [];

  for (const { riga, dati } of righeGrezze) {
    const risultato = RigaAlimentoImportSchema.safeParse(dati);
    if (risultato.success) {
      validi.push(toNuovoAlimento(risultato.data));
    } else {
      const dettagli = risultato.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      errori.push({ riga, messaggio: dettagli });
    }
  }

  return { validi, errori };
}

export function parseAlimentiJson(contenuto: string): AlimentiParsati {
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
    throw new Error(`JSON non valido: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
  if (!Array.isArray(dati)) {
    throw new Error("Il file JSON deve contenere un array di alimenti");
  }

  return validaRighe(dati.map((riga, indice) => ({ riga: indice + 1, dati: riga })));
}

// Converte il valore testuale grezzo del CSV nel tipo atteso dallo schema, lasciando che sia zod
// a segnalare l'errore se la conversione non è possibile (es. numero non valido).
function coercizzaValoreCsv(campo: string, valoreGrezzo: string): unknown {
  const v = valoreGrezzo.trim();
  if (campo === "nome") return v;
  if (campo === "unita") return v === "" ? undefined : v;
  if (campo === "da_etichetta") {
    if (v === "") return undefined;
    return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "si";
  }
  if (v === "") return CAMPI_CSV_OPZIONALI_NULLABILI.has(campo) ? null : v;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

export function parseAlimentiCsv(contenuto: string): AlimentiParsati {
  const testoTrim = contenuto.trim();
  if (testoTrim.startsWith("[") || testoTrim.startsWith("{")) {
    throw new Error('Il contenuto sembra JSON, non CSV - usa "Da JSON…" per importarlo');
  }

  const righe = parseRigheCsv(contenuto);
  if (righe.length === 0) {
    throw new Error("Il file CSV è vuoto");
  }

  const intestazione = righe[0]!.map((h) => h.trim());
  const nomiCampiValidi = new Set<string>(CAMPI_CSV);
  const colonneSconosciute = intestazione.filter((h) => !nomiCampiValidi.has(h));
  if (colonneSconosciute.length > 0) {
    throw new Error(`Colonne non riconosciute nell'intestazione CSV: ${colonneSconosciute.join(", ")}`);
  }
  if (!intestazione.includes("nome")) {
    throw new Error('Intestazione CSV mancante della colonna obbligatoria "nome"');
  }

  const righeDati = righe.slice(1).map((valori, indice) => {
    const oggetto: Record<string, unknown> = {};
    intestazione.forEach((campo, i) => {
      oggetto[campo] = coercizzaValoreCsv(campo, valori[i] ?? "");
    });
    // riga 1 dell'intestazione + indice 0-based delle righe dati
    return { riga: indice + 2, dati: oggetto };
  });

  return validaRighe(righeDati);
}

export interface EsitoImportAlimenti {
  inseriti: number;
  saltatiEsistenti: string[];
  errori: ErroreRigaImport[];
}

export async function importaAlimentiMassivo(righe: AlimentiParsati): Promise<EsitoImportAlimenti> {
  const catalogo = await elencaAlimenti();
  const nomiEsistenti = new Set(catalogo.map((a) => a.nome.toLowerCase()));

  const saltatiEsistenti: string[] = [];
  let inseriti = 0;

  for (const riga of righe.validi) {
    const chiave = riga.nome.toLowerCase();
    if (nomiEsistenti.has(chiave)) {
      saltatiEsistenti.push(riga.nome);
      continue;
    }
    // Evita duplicati anche tra righe diverse dello stesso file di import.
    nomiEsistenti.add(chiave);
    await creaAlimento(riga);
    inseriti++;
  }

  return { inseriti, saltatiEsistenti, errori: righe.errori };
}
