import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { parseWeightJson, parseWeightCsv, importWeightBulk, type ParsedWeight } from "./importWeight";

export type ImportWeightResultUI =
  | { tipo: "successo"; messaggio: string }
  | { tipo: "avviso"; messaggio: string }
  | { tipo: "errore"; messaggio: string }
  | null;

export function useImportWeight(onImported: () => void) {
  const [result, setResult] = useState<ImportWeightResultUI>(null);
  const [loading, setLoading] = useState(false);

  async function importFile(estensione: "json" | "csv", parser: (contenuto: string) => ParsedWeight) {
    setResult(null);
    const percorso = await open({
      multiple: false,
      filters: [{ name: estensione.toUpperCase(), extensions: [estensione] }],
    });
    if (!percorso || Array.isArray(percorso)) return;

    setLoading(true);
    try {
      const contenuto = await readTextFile(percorso);
      const parsato = parser(contenuto);
      const esitoImport = await importWeightBulk(parsato);
      onImported();

      const parti: string[] = [`${esitoImport.inseriti} misurazioni inserite`];
      if (esitoImport.aggiornati > 0) {
        parti.push(`${esitoImport.aggiornati} aggiornate (data già presente)`);
      }
      if (esitoImport.errori.length > 0) {
        parti.push(
          `${esitoImport.errori.length} righe con errori (${esitoImport.errori
            .map((e) => `riga ${e.riga}: ${e.messaggio}`)
            .join(" · ")})`,
        );
      }

      const tipo = esitoImport.errori.length > 0 ? "avviso" : "successo";
      setResult({ tipo, messaggio: parti.join(" - ") });
    } catch (err) {
      setResult({ tipo: "errore", messaggio: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }

  return {
    importFromJson: () => importFile("json", parseWeightJson),
    importFromCsv: () => importFile("csv", parseWeightCsv),
    loading,
    result,
    closeResult: () => setResult(null),
  };
}
