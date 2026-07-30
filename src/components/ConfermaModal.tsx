import { useCallback, useState } from "react";
import { createPortal } from "react-dom";

interface RichiestaConferma {
  messaggio: string;
  distruttivo?: boolean;
  risolvi: (esito: boolean) => void;
}

function ConfermaModal({
  messaggio,
  distruttivo,
  onConferma,
  onAnnulla,
}: {
  messaggio: string;
  distruttivo?: boolean;
  onConferma: () => void;
  onAnnulla: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 text-slate-900 dark:text-slate-100"
      onClick={onAnnulla}
    >
      <div onClick={(e) => e.stopPropagation()} className="min-h-0 p-[3vmin]">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <p className="text-sm text-slate-700 dark:text-slate-200">{messaggio}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onAnnulla}
            autoFocus
            className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annulla
          </button>
          <button
            onClick={onConferma}
            className={
              "rounded-lg px-3 py-1.5 text-sm font-medium text-white " +
              (distruttivo ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700")
            }
          >
            Conferma
          </button>
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
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
    <ConfermaModal
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
// stato davvero modificato — chiudere una modale intonsa non deve mai chiedere nulla.
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
