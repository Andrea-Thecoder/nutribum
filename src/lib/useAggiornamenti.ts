import { useCallback, useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { caricaImpostazioni, salvaImpostazioni } from "./settings";
import { registraErroreNonBloccante } from "./errorLog";

export interface EsitoAggiornamento {
  tipo: "successo" | "avviso" | "errore";
  messaggio: string;
}

const AVVISO_CONNESSIONE_INTERNET =
  "La ricerca di aggiornamenti richiede una connessione a internet. Nessun dato dell'app (alimenti, diario, peso, ricette, ecc.) viene inviato online: viene solo confrontata la versione installata con quella disponibile. Continuare?";

const AVVISO_ATTIVAZIONE_AUTOMATICA =
  "Stai per attivare il controllo automatico degli aggiornamenti: ad ogni avvio dell'app verrà verificato, tramite una connessione a internet, se è disponibile una versione più recente (nessun dato dell'app viene inviato online, solo la versione viene controllata). Se viene trovato un aggiornamento, ti verrà comunque chiesta conferma prima di scaricarlo e installarlo. Continuare?";

type ChiediConferma = (messaggio: string, opzioni?: { distruttivo?: boolean }) => Promise<boolean>;

// Centralizza tutta la logica dell'updater (plugin @tauri-apps/plugin-updater): controllo manuale da
// menu, controllo automatico all'avvio (solo se l'utente l'ha attivato esplicitamente), e la richiesta
// di conferma prima di installare, condivisa da entrambi i percorsi. Riceve `chiedi` da fuori (invece
// di importare useConferma qui) perché la UI di conferma è già istanziata una sola volta in NavBar:
// evita due modali di conferma indipendenti che potrebbero aprirsi insieme.
export function useAggiornamenti(chiedi: ChiediConferma) {
  const [aggiornamentiAutomatici, setAggiornamentiAutomatici] = useState(false);
  const [controlloInCorso, setControlloInCorso] = useState(false);
  const [esito, setEsito] = useState<EsitoAggiornamento | null>(null);

  const proponiInstallazione = useCallback(
    async (update: Update) => {
      const ok = await chiedi(
        `È disponibile la versione ${update.version} di NutriBum (attualmente installata: ${update.currentVersion}). Vuoi scaricarla e installarla ora? Al termine l'app si riavvierà automaticamente.`,
      );
      if (!ok) return;
      try {
        await update.downloadAndInstall();
        await relaunch();
      } catch (err) {
        registraErroreNonBloccante(err, "Installazione aggiornamento fallita");
        setEsito({
          tipo: "errore",
          messaggio: err instanceof Error ? err.message : "Errore durante l'installazione dell'aggiornamento",
        });
      }
    },
    [chiedi],
  );

  const eseguiControllo = useCallback(
    async (automatico: boolean) => {
      if (!automatico) setControlloInCorso(true);
      try {
        const update = await check();
        if (update) {
          await proponiInstallazione(update);
        } else if (!automatico) {
          setEsito({ tipo: "successo", messaggio: "Nessun aggiornamento disponibile: hai già l'ultima versione." });
        }
        // Se automatico e non trova nulla: nessun popup, sarebbe un fastidio ad ogni avvio.
      } catch (err) {
        registraErroreNonBloccante(err, automatico ? "Controllo automatico aggiornamenti fallito" : "Ricerca aggiornamenti fallita");
        if (!automatico) {
          setEsito({
            tipo: "errore",
            messaggio: err instanceof Error ? err.message : "Errore durante la ricerca di aggiornamenti",
          });
        }
      } finally {
        if (!automatico) setControlloInCorso(false);
      }
    },
    [proponiInstallazione],
  );

  // Controllo automatico: solo una volta, all'avvio, e solo se l'impostazione era già attiva da una
  // sessione precedente — attivarla ora (vedi toggleAggiornamentiAutomatici) non scatena anche un
  // controllo immediato, per non confondere "l'ho attivato" con "l'ho anche cercato adesso".
  useEffect(() => {
    caricaImpostazioni().then((imp) => {
      setAggiornamentiAutomatici(imp.aggiornamentiAutomatici);
      if (imp.aggiornamentiAutomatici) {
        eseguiControllo(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cercaAggiornamenti = useCallback(async () => {
    const ok = await chiedi(AVVISO_CONNESSIONE_INTERNET);
    if (ok) await eseguiControllo(false);
  }, [chiedi, eseguiControllo]);

  const toggleAggiornamentiAutomatici = useCallback(async () => {
    if (aggiornamentiAutomatici) {
      await salvaImpostazioni({ aggiornamentiAutomatici: false });
      setAggiornamentiAutomatici(false);
      return;
    }
    const ok = await chiedi(AVVISO_ATTIVAZIONE_AUTOMATICA);
    if (!ok) return;
    await salvaImpostazioni({ aggiornamentiAutomatici: true });
    setAggiornamentiAutomatici(true);
  }, [aggiornamentiAutomatici, chiedi]);

  return {
    aggiornamentiAutomatici,
    controlloInCorso,
    esito,
    chiudiEsito: () => setEsito(null),
    cercaAggiornamenti,
    toggleAggiornamentiAutomatici,
  };
}
