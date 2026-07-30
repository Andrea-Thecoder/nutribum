import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import {
  GiornoImportSchema,
  StoricoImportSchema,
  importaGiorno,
  parseGiornoCsv,
  importaGiorniCsv,
  type GiornoImport,
} from "./importazione";

export type EsitoImport =
  | { tipo: "successo"; messaggio: string }
  | { tipo: "avviso"; messaggio: string }
  | { tipo: "errore"; messaggio: string }
  | null;

export function useImportGiorno(onImportato: () => void) {
  const [esito, setEsito] = useState<EsitoImport>(null);
  const [caricamento, setCaricamento] = useState(false);

  async function apriFile(estensione: "json" | "csv") {
    return open({
      multiple: false,
      filters: [{ name: estensione.toUpperCase(), extensions: [estensione] }],
    });
  }

  async function importaDaJson() {
    setEsito(null);
    const percorsi = await open({
      multiple: true,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!percorsi || percorsi.length === 0) return;

    setCaricamento(true);
    try {
      let giorniImportati = 0;
      let vociInserite = 0;
      const avvisiMismatch: string[] = [];
      const erroriFile: { file: string; messaggio: string }[] = [];

      for (const percorso of percorsi) {
        const nomeFile = percorso.split(/[/\\]/).pop() ?? percorso;
        try {
          const contenuto = await readTextFile(percorso);
          const testoTrim = contenuto.trim();
          if (!testoTrim.startsWith("{") && !testoTrim.startsWith("[")) {
            throw new Error('Il contenuto non sembra JSON — se è un file CSV usa "Da CSV…"');
          }

          const parsato = JSON.parse(contenuto);

          // Un file può essere UN giorno solo ({data, pasti} — l'export di un singolo giorno) o
          // l'intero storico ({giorni: [...]}  — prodotto da "Esporta storico diario in JSON"):
          // si prova prima la forma singola, poi quella multi-giorno, invece di richiedere
          // all'utente di sapere quale delle due ha in mano.
          let giorniDaImportare: GiornoImport[];
          const comeGiornoSingolo = GiornoImportSchema.safeParse(parsato);
          if (comeGiornoSingolo.success) {
            giorniDaImportare = [comeGiornoSingolo.data];
          } else {
            const comeStorico = StoricoImportSchema.safeParse(parsato);
            if (!comeStorico.success) {
              const dettagli = comeGiornoSingolo.error.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ");
              throw new Error(`JSON non valido — ${dettagli}`);
            }
            giorniDaImportare = comeStorico.data.giorni;
          }

          for (const giorno of giorniDaImportare) {
            const esitoImport = await importaGiorno(giorno);
            giorniImportati++;
            vociInserite += esitoImport.vociInserite;
            if (esitoImport.avvisiMismatch.length > 0) {
              avvisiMismatch.push(`${giorno.data}: ${esitoImport.avvisiMismatch.join(" · ")}`);
            }
          }
        } catch (err) {
          erroriFile.push({
            file: nomeFile,
            messaggio: err instanceof Error ? err.message : String(err),
          });
        }
      }

      onImportato();

      const parti: string[] = [`${giorniImportati} giorni importati (${vociInserite} voci)`];
      if (avvisiMismatch.length > 0) parti.push(avvisiMismatch.join(" · "));
      if (erroriFile.length > 0) {
        parti.push(erroriFile.map((e) => `${e.file}: ${e.messaggio}`).join(" · "));
      }

      const tipo = erroriFile.length > 0 || avvisiMismatch.length > 0 ? "avviso" : "successo";
      setEsito({ tipo, messaggio: parti.join(" — ") });
    } catch (err) {
      setEsito({ tipo: "errore", messaggio: err instanceof Error ? err.message : String(err) });
    } finally {
      setCaricamento(false);
    }
  }

  async function importaDaCsv() {
    setEsito(null);
    const percorso = await apriFile("csv");
    if (!percorso || Array.isArray(percorso)) return;

    setCaricamento(true);
    try {
      const contenuto = await readTextFile(percorso);
      const parsato = parseGiornoCsv(contenuto);
      if (parsato.giorni.length === 0 && parsato.errori.length === 0) {
        throw new Error("Il file CSV non contiene righe da importare");
      }

      const esitoImport = await importaGiorniCsv(parsato);
      onImportato();

      const parti: string[] = [
        `${esitoImport.giorniImportati} giorni importati (${esitoImport.vociInserite} voci)`,
      ];
      if (esitoImport.avvisiMismatch.length > 0) {
        parti.push(esitoImport.avvisiMismatch.join(" · "));
      }
      if (esitoImport.erroriGiorno.length > 0) {
        parti.push(esitoImport.erroriGiorno.map((e) => `${e.data}: ${e.messaggio}`).join(" · "));
      }
      if (esitoImport.erroriRiga.length > 0) {
        parti.push(
          `${esitoImport.erroriRiga.length} righe non valide (${esitoImport.erroriRiga
            .map((e) => `riga ${e.riga}: ${e.messaggio}`)
            .join(" · ")})`,
        );
      }

      const tipo =
        esitoImport.erroriGiorno.length > 0 ||
        esitoImport.erroriRiga.length > 0 ||
        esitoImport.avvisiMismatch.length > 0
          ? "avviso"
          : "successo";
      setEsito({ tipo, messaggio: parti.join(" — ") });
    } catch (err) {
      setEsito({ tipo: "errore", messaggio: err instanceof Error ? err.message : String(err) });
    } finally {
      setCaricamento(false);
    }
  }

  return { importaDaJson, importaDaCsv, caricamento, esito, chiudiEsito: () => setEsito(null) };
}
