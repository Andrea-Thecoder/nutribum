import { useCallback, useState } from "react";
import { ConfermaModalView } from "./ConfermaModalView";

interface RichiestaConferma {
  messaggio: string;
  distruttivo?: boolean;
  risolvi: (esito: boolean) => void;
}

// Sostituisce window.confirm: su Tauri/Linux (webkit2gtk) i dialog nativi del browser non vengono
// mostrati ma si risolvono comunque come "OK" senza che l'utente veda nulla (bug noto di wry/Tauri).
export function useConferma() {
  const [richiesta, setRichiesta] = useState<RichiestaConferma | null>(null);

  const chiedi = useCallback((messaggio: string, opzioni?: { distruttivo?: boolean }) => {
    return new Promise<boolean>((risolvi) => {
      setRichiesta({ messaggio, distruttivo: opzioni?.distruttivo, risolvi });
    });
  }, []);

  const elemento = richiesta ? (
    <ConfermaModalView
      messaggio={richiesta.messaggio}
      distruttivo={richiesta.distruttivo}
      onAnnulla={() => {
        richiesta.risolvi(false);
        setRichiesta(null);
      }}
      onConferma={() => {
        richiesta.risolvi(true);
        setRichiesta(null);
      }}
    />
  ) : null;

  return { chiedi, elemento };
}

// Per le modali "di scrittura" (dati inseriti dall'utente non ancora salvati): intercetta il
// tentativo di chiudere (click fuori, pulsante ✕, Annulla) e chiede conferma solo se qualcosa è
// stato davvero modificato - chiudere una modale intonsa non deve mai chiedere nulla.
export function useConfermaChiusura(modificato: boolean, onChiudi: () => void) {
  const { chiedi, elemento } = useConferma();

  const richiediChiusura = useCallback(() => {
    if (!modificato) {
      onChiudi();
      return;
    }
    chiedi("Uscire senza salvare? I dati inseriti andranno persi.", { distruttivo: true }).then((ok) => {
      if (ok) onChiudi();
    });
  }, [modificato, onChiudi, chiedi]);

  return { richiediChiusura, elementoConferma: elemento };
}
