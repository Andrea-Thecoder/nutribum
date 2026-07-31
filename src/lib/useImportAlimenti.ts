import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import {
  parseAlimentiJson,
  parseAlimentiCsv,
  importaAlimentiMassivo,
  type AlimentiParsati,
} from "./importazioneAlimenti";

export type EsitoImportAlimentiUI =
  | { tipo: "successo"; messaggio: string }
  | { tipo: "avviso"; messaggio: string }
  | { tipo: "errore"; messaggio: string }
  | null;

// Bundlato con l'app (vedi bundle.resources in tauri.conf.json): un catalogo di partenza pronto da
// importare subito, senza dover procurarsi/scrivere un file a mano al primo avvio.
const FILE_CATALOGO_ESEMPIO = "alimenti-di-esempio.json";

export function useImportAlimenti(onImportato: () => void) {
  const [esito, setEsito] = useState<EsitoImportAlimentiUI>(null);
  const [caricamento, setCaricamento] = useState(false);

  async function eseguiImport(contenuto: string, parser: (contenuto: string) => AlimentiParsati) {
    const parsato = parser(contenuto);
    const esitoImport = await importaAlimentiMassivo(parsato);
    onImportato();

    const parti: string[] = [`${esitoImport.inseriti} alimenti inseriti`];
    if (esitoImport.saltatiEsistenti.length > 0) {
      parti.push(
        `${esitoImport.saltatiEsistenti.length} già presenti (saltati: ${esitoImport.saltatiEsistenti.join(", ")})`,
      );
    }
    if (esitoImport.errori.length > 0) {
      parti.push(
        `${esitoImport.errori.length} righe con errori (${esitoImport.errori
          .map((e) => `riga ${e.riga}: ${e.messaggio}`)
          .join(" · ")})`,
      );
    }

    const tipo = esitoImport.errori.length > 0 || esitoImport.saltatiEsistenti.length > 0 ? "avviso" : "successo";
    setEsito({ tipo, messaggio: parti.join(" - ") });
  }

  async function importa(estensione: "json" | "csv", parser: (contenuto: string) => AlimentiParsati) {
    setEsito(null);
    const percorso = await open({
      multiple: false,
      filters: [{ name: estensione.toUpperCase(), extensions: [estensione] }],
    });
    if (!percorso || Array.isArray(percorso)) return;

    setCaricamento(true);
    try {
      const contenuto = await readTextFile(percorso);
      await eseguiImport(contenuto, parser);
    } catch (err) {
      setEsito({ tipo: "errore", messaggio: err instanceof Error ? err.message : String(err) });
    } finally {
      setCaricamento(false);
    }
  }

  // Nessuna scelta file: legge direttamente la risorsa impacchettata con l'installer.
  async function importaEsempio() {
    setEsito(null);
    setCaricamento(true);
    try {
      const contenuto = await readTextFile(FILE_CATALOGO_ESEMPIO, { baseDir: BaseDirectory.Resource });
      await eseguiImport(contenuto, parseAlimentiJson);
    } catch (err) {
      setEsito({ tipo: "errore", messaggio: err instanceof Error ? err.message : String(err) });
    } finally {
      setCaricamento(false);
    }
  }

  return {
    importaDaJson: () => importa("json", parseAlimentiJson),
    importaDaCsv: () => importa("csv", parseAlimentiCsv),
    importaEsempio,
    caricamento,
    esito,
    chiudiEsito: () => setEsito(null),
  };
}
