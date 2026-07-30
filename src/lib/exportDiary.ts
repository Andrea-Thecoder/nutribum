import { generateCsv } from "./csv";
import type { Storico } from "./schema";

const CSV_HEADER = [
  "data",
  "orario",
  "tipo_pasto",
  "alimento",
  "quantita",
  "unita",
  "kcal",
  "proteine_g",
  "carboidrati_g",
  "grassi_g",
  "zuccheri_g",
  "grassi_saturi_g",
  "fibre_g",
  "sale_g",
] as const;

export function historyToCsv(storico: Storico): string {
  const rows = storico.giorni.flatMap((giorno) =>
    giorno.pasti.flatMap((pasto) =>
      pasto.alimenti.map((a) => [
        giorno.data,
        pasto.orario ?? null,
        pasto.tipo ?? null,
        a.nome,
        a.quantita,
        a.unita,
        a.kcal,
        a.proteine_g,
        a.carboidrati_g,
        a.grassi_g,
        a.zuccheri_g ?? null,
        a.grassi_saturi_g ?? null,
        a.fibre_g ?? null,
        a.sale_g ?? null,
      ]),
    ),
  );
  return generateCsv([...CSV_HEADER], rows);
}
