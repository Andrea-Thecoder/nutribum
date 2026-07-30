import { z } from "zod";
import {
  elencaAlimenti,
  calcolaValoriPorzione,
  registraVoceDiario,
  TIPI_PASTO,
  type AlimentoCatalogo,
  type TipoPasto,
} from "./food";
import { parseRigheCsv, type ErroreRigaImport } from "./csv";

const AlimentoImportSchema = z.object({
  nome: z.string().min(1),
  quantita: z.number().positive(),
  // Opzionali: se assenti si usano i valori del catalogo, se presenti servono solo da controllo.
  // Niente "unita": nell'app si lavora sempre e solo in grammi.
  kcal: z.number().nonnegative().optional(),
  proteine_g: z.number().nonnegative().optional(),
  carboidrati_g: z.number().nonnegative().optional(),
  grassi_g: z.number().nonnegative().optional(),
  zuccheri_g: z.number().nonnegative().optional(),
  grassi_saturi_g: z.number().nonnegative().optional(),
  fibre_g: z.number().nonnegative().optional(),
  sale_g: z.number().nonnegative().optional(),
});

const PastoImportSchema = z.object({
  tipo: z.enum(TIPI_PASTO),
  orario: z.string().optional(),
  alimenti: z.array(AlimentoImportSchema).min(1),
});

export const GiornoImportSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve essere in formato YYYY-MM-DD"),
  pasti: z.array(PastoImportSchema).min(1),
});
export type GiornoImport = z.infer<typeof GiornoImportSchema>;
type PastoImport = GiornoImport["pasti"][number];
type AlimentoImport = PastoImport["alimenti"][number];

// Forma prodotta da "Esporta storico diario in JSON" (l'intero storico multi-giorno, non un
// singolo giorno): { schemaVersion, giorni: [...] }. GiornoImportSchema non è "strict", quindi
// ogni elemento di "giorni" (che porta anche un suo schemaVersion, campo extra qui ignorato)
// valida comunque contro di essa senza bisogno di rimappare nulla.
export const StoricoImportSchema = z.object({
  giorni: z.array(GiornoImportSchema).min(1),
});
export type StoricoImport = z.infer<typeof StoricoImportSchema>;

export interface EsitoImportGiorno {
  vociInserite: number;
  avvisiMismatch: string[];
}

const TOLLERANZA_KCAL = 5;

export async function importaGiorno(giorno: GiornoImport): Promise<EsitoImportGiorno> {
  const catalogo = await elencaAlimenti();
  const trovaNelCatalogo = (nome: string): AlimentoCatalogo | undefined =>
    catalogo.find((a) => a.nome.toLowerCase() === nome.toLowerCase());

  // Validazione completa prima di scrivere qualsiasi cosa: se manca anche un solo alimento,
  // l'import viene rifiutato per intero — niente creazione automatica nel catalogo.
  const nomiMancanti = new Set<string>();
  for (const pasto of giorno.pasti) {
    for (const alimento of pasto.alimenti) {
      if (!trovaNelCatalogo(alimento.nome)) nomiMancanti.add(alimento.nome);
    }
  }
  if (nomiMancanti.size > 0) {
    throw new Error(
      `Alimenti non presenti nel catalogo, aggiungili prima di importare: ${[...nomiMancanti].join(", ")}`,
    );
  }

  const avvisiMismatch: string[] = [];
  let vociInserite = 0;

  for (const pasto of giorno.pasti) {
    const tipoPasto: TipoPasto = pasto.tipo;
    for (const alimento of pasto.alimenti) {
      const alimentoCatalogo = trovaNelCatalogo(alimento.nome)!;
      const valori = calcolaValoriPorzione(alimentoCatalogo, alimento.quantita);

      if (alimento.kcal !== undefined && Math.abs(alimento.kcal - valori.kcal) > TOLLERANZA_KCAL) {
        avvisiMismatch.push(
          `${alimento.nome}: kcal dichiarate nel JSON (${alimento.kcal}) diverse da quelle del catalogo per ${alimento.quantita}g (${Math.round(valori.kcal)}) — usato il valore del catalogo`,
        );
      }

      await registraVoceDiario(
        {
          alimentoId: alimentoCatalogo.id,
          data: giorno.data,
          orario: pasto.orario,
          tipoPasto,
          quantita: alimento.quantita,
        },
        alimentoCatalogo,
      );
      vociInserite++;
    }
  }

  return { vociInserite, avvisiMismatch };
}

const CAMPI_CSV_GIORNO = [
  "data",
  "tipo",
  "orario",
  "nome",
  "quantita",
  "kcal",
  "proteine_g",
  "carboidrati_g",
  "grassi_g",
  "zuccheri_g",
  "grassi_saturi_g",
  "fibre_g",
  "sale_g",
] as const;
const CAMPI_CSV_GIORNO_OBBLIGATORI = ["data", "tipo", "nome", "quantita"] as const;

// Una riga CSV = un alimento di un pasto di un giorno. Più righe con stessi data+tipo+orario
// vengono raggruppate nello stesso pasto; data diverse producono giorni distinti, ciascuno
// importato a sé (vedi importaGiorniCsv).
const RigaGiornoCsvSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve essere in formato YYYY-MM-DD"),
  tipo: z.enum(TIPI_PASTO),
  orario: z.string().optional(),
  nome: z.string().min(1),
  quantita: z.number().positive(),
  kcal: z.number().nonnegative().optional(),
  proteine_g: z.number().nonnegative().optional(),
  carboidrati_g: z.number().nonnegative().optional(),
  grassi_g: z.number().nonnegative().optional(),
  zuccheri_g: z.number().nonnegative().optional(),
  grassi_saturi_g: z.number().nonnegative().optional(),
  fibre_g: z.number().nonnegative().optional(),
  sale_g: z.number().nonnegative().optional(),
});

function coercizzaValoreCsvGiorno(campo: string, valoreGrezzo: string): unknown {
  const v = valoreGrezzo.trim();
  if (campo === "data" || campo === "tipo" || campo === "nome") return v;
  if (campo === "orario") return v === "" ? undefined : v;
  if (campo === "quantita") {
    if (v === "") return v; // lascia la stringa vuota: zod segnala "atteso un numero" con un messaggio chiaro
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  }
  // campi di controllo numerici opzionali (kcal, proteine_g, ...): vuoto -> assente,
  // altrimenti numero (o stringa originale se non valido, per far fallire zod con un messaggio chiaro)
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

export interface GiorniParsati {
  giorni: GiornoImport[];
  errori: ErroreRigaImport[];
}

export function parseGiornoCsv(contenuto: string): GiorniParsati {
  const testoTrim = contenuto.trim();
  if (testoTrim.startsWith("[") || testoTrim.startsWith("{")) {
    throw new Error('Il contenuto sembra JSON, non CSV — usa "Da JSON…" per importarlo');
  }

  const righe = parseRigheCsv(contenuto);
  if (righe.length === 0) {
    throw new Error("Il file CSV è vuoto");
  }

  const intestazione = righe[0].map((h) => h.trim());
  const nomiCampiValidi = new Set<string>(CAMPI_CSV_GIORNO);
  const colonneSconosciute = intestazione.filter((h) => !nomiCampiValidi.has(h));
  if (colonneSconosciute.length > 0) {
    throw new Error(`Colonne non riconosciute nell'intestazione CSV: ${colonneSconosciute.join(", ")}`);
  }
  const colonneMancanti = CAMPI_CSV_GIORNO_OBBLIGATORI.filter((c) => !intestazione.includes(c));
  if (colonneMancanti.length > 0) {
    throw new Error(`Intestazione CSV mancante delle colonne obbligatorie: ${colonneMancanti.join(", ")}`);
  }

  const errori: ErroreRigaImport[] = [];
  const righeValide: z.infer<typeof RigaGiornoCsvSchema>[] = [];

  righe.slice(1).forEach((valori, indice) => {
    const oggetto: Record<string, unknown> = {};
    intestazione.forEach((campo, i) => {
      oggetto[campo] = coercizzaValoreCsvGiorno(campo, valori[i] ?? "");
    });

    const risultato = RigaGiornoCsvSchema.safeParse(oggetto);
    if (risultato.success) {
      righeValide.push(risultato.data);
    } else {
      const dettagli = risultato.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      // riga 1 = intestazione, +2 per l'indice 0-based delle righe dati
      errori.push({ riga: indice + 2, messaggio: dettagli });
    }
  });

  // Ricompone la stessa forma GiornoImport[] usata dall'import JSON, raggruppando per
  // data -> (tipo, orario) -> alimenti.
  const perGiorno = new Map<string, Map<string, PastoImport>>();
  for (const r of righeValide) {
    const pastiDelGiorno = perGiorno.get(r.data) ?? new Map<string, PastoImport>();
    perGiorno.set(r.data, pastiDelGiorno);

    const chiavePasto = `${r.tipo}|${r.orario ?? ""}`;
    const pasto = pastiDelGiorno.get(chiavePasto) ?? { tipo: r.tipo, orario: r.orario, alimenti: [] };

    const alimento: AlimentoImport = {
      nome: r.nome,
      quantita: r.quantita,
      kcal: r.kcal,
      proteine_g: r.proteine_g,
      carboidrati_g: r.carboidrati_g,
      grassi_g: r.grassi_g,
      zuccheri_g: r.zuccheri_g,
      grassi_saturi_g: r.grassi_saturi_g,
      fibre_g: r.fibre_g,
      sale_g: r.sale_g,
    };
    pasto.alimenti.push(alimento);
    pastiDelGiorno.set(chiavePasto, pasto);
  }

  const giorni: GiornoImport[] = [...perGiorno.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, pastiMap]) => ({ data, pasti: [...pastiMap.values()] }));

  return { giorni, errori };
}

export interface EsitoImportGiorniMultipli {
  giorniImportati: number;
  vociInserite: number;
  avvisiMismatch: string[];
  erroriGiorno: { data: string; messaggio: string }[];
  erroriRiga: ErroreRigaImport[];
}

// A differenza di importaGiorno (un solo giorno, tutto-o-niente), qui ogni giorno del CSV viene
// importato indipendentemente: un giorno con alimenti mancanti dal catalogo viene rifiutato e
// segnalato, ma non blocca l'importazione degli altri giorni nello stesso file.
export async function importaGiorniCsv(parsati: GiorniParsati): Promise<EsitoImportGiorniMultipli> {
  let giorniImportati = 0;
  let vociInserite = 0;
  const avvisiMismatch: string[] = [];
  const erroriGiorno: { data: string; messaggio: string }[] = [];

  for (const giorno of parsati.giorni) {
    try {
      const esito = await importaGiorno(giorno);
      giorniImportati++;
      vociInserite += esito.vociInserite;
      avvisiMismatch.push(...esito.avvisiMismatch);
    } catch (err) {
      erroriGiorno.push({ data: giorno.data, messaggio: err instanceof Error ? err.message : String(err) });
    }
  }

  return { giorniImportati, vociInserite, avvisiMismatch, erroriGiorno, erroriRiga: parsati.errori };
}
