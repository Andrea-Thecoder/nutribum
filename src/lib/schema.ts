import { z } from "zod";

export const AlimentoSchema = z.object({
  nome: z.string().min(1),
  quantita: z.number().positive(),
  unita: z.string().min(1),
  kcal: z.number().nonnegative(),
  proteine_g: z.number().nonnegative(),
  carboidrati_g: z.number().nonnegative(),
  grassi_g: z.number().nonnegative(),
  // Sottoinsiemi di carboidrati_g/grassi_g (come in etichetta nutrizionale UE 1169/2011: "di cui zuccheri/saturi")
  zuccheri_g: z.number().nonnegative().optional(),
  grassi_saturi_g: z.number().nonnegative().optional(),
  // Voci indipendenti
  fibre_g: z.number().nonnegative().optional(),
  sale_g: z.number().nonnegative().optional(),
  // Provenienza del valore nutrizionale: assente per gli import esterni (JSON/CSV) che non la
  // dichiarano, popolata quando l'alimento viene ricostruito dal catalogo (vedi elencaStoricoCompleto).
  da_etichetta: z.boolean().optional(),
});

export const PastoSchema = z.object({
  tipo: z.string().optional(),
  orario: z.string().optional(),
  alimenti: z.array(AlimentoSchema).min(1),
});

export const GiornoStoricoSchema = z.object({
  schemaVersion: z.string(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve essere in formato YYYY-MM-DD"),
  pasti: z.array(PastoSchema).min(1),
  kcalTotali: z.number().nonnegative().optional(),
  note: z.string().optional(),
});

export const StoricoSchema = z.object({
  schemaVersion: z.string(),
  giorni: z.array(GiornoStoricoSchema),
});

export type Alimento = z.infer<typeof AlimentoSchema>;
export type Pasto = z.infer<typeof PastoSchema>;
export type GiornoStorico = z.infer<typeof GiornoStoricoSchema>;
export type Storico = z.infer<typeof StoricoSchema>;
