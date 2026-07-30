import { generateCsv } from "./csv";
import type { VocePeso } from "./weight";

const CSV_HEADER = ["data", "peso_kg"] as const;

export function weightToJson(peso: VocePeso[]): string {
  return JSON.stringify(
    peso.map((v) => ({ data: v.data, peso_kg: v.pesoKg })),
    null,
    2,
  );
}

export function weightToCsv(peso: VocePeso[]): string {
  const rows = peso.map((v) => [v.data, v.pesoKg]);
  return generateCsv([...CSV_HEADER], rows);
}
