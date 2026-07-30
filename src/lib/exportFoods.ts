import { generateCsv } from "./csv";
import type { AlimentoCatalogo } from "./food";

const CSV_HEADER = [
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

export function foodsToJson(alimenti: AlimentoCatalogo[]): string {
  return JSON.stringify(
    alimenti.map(({ id: _id, ...resto }) => resto),
    null,
    2,
  );
}

export function foodsToCsv(alimenti: AlimentoCatalogo[]): string {
  const rows = alimenti.map((a) => [
    a.nome,
    a.unita,
    a.kcal_100,
    a.proteine_100,
    a.carboidrati_100,
    a.grassi_100,
    a.zuccheri_100,
    a.grassi_saturi_100,
    a.fibre_100,
    a.sale_100,
    a.da_etichetta,
  ]);
  return generateCsv([...CSV_HEADER], rows);
}
