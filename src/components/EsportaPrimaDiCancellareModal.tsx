import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../lib/useFocusTrap";

export interface OpzioneExportCancellazione {
  chiave: string;
  etichetta: string;
  onEsporta: () => Promise<boolean>; // false se l'utente ha annullato la finestra di salvataggio
}

interface EsportaPrimaDiCancellareModalProps {
  titolo: string;
  messaggio: string;
  opzioniExport: OpzioneExportCancellazione[];
  onProcedi: () => Promise<void>;
  onChiudi: () => void;
}

// Secondo passo del flusso di sicurezza per le azioni distruttive (svuota diario / cancella tutti
// i dati): il primo passo è una conferma semplice (useConferma), questo è il secondo - offre di
// esportare un backup PRIMA di procedere, invece di limitarsi a chiedere "sei sicuro?" una seconda
// volta. "Procedi senza esportare" resta disponibile per chi ha già un backup o non lo vuole.
export function EsportaPrimaDiCancellareModal({
  titolo,
  messaggio,
  opzioniExport,
  onProcedi,
  onChiudi,
}: EsportaPrimaDiCancellareModalProps) {
  const [elaborazione, setElaborazione] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function gestisciEsportaEProcedi(opzione: OpzioneExportCancellazione) {
    setErrore(null);
    setElaborazione(opzione.chiave);
    try {
      const salvato = await opzione.onEsporta();
      if (!salvato) {
        setElaborazione(null);
        return; // l'utente ha annullato la finestra di salvataggio: resta sulla modale
      }
      await onProcedi();
      onChiudi();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante l'operazione");
      setElaborazione(null);
    }
  }

  async function gestisciProcediSenzaExport() {
    setErrore(null);
    setElaborazione("__nessuno__");
    try {
      await onProcedi();
      onChiudi();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante l'operazione");
      setElaborazione(null);
    }
  }

  const inCorso = elaborazione !== null;
  const idTitolo = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useFocusTrap(boxRef, inCorso ? undefined : onChiudi);

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 text-slate-900 dark:text-slate-100" onClick={inCorso ? undefined : onChiudi}>
      <div onClick={(e) => e.stopPropagation()} className="min-h-0 p-[3vmin]">
      <div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitolo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-96 min-h-85 rounded-xl border border-red-300 bg-white p-4 shadow-xl dark:border-red-800 dark:bg-slate-900"
      >
        <h2 id={idTitolo} className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">{titolo}</h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{messaggio}</p>

        <div className="flex flex-col gap-2">
          {opzioniExport.map((opzione) => (
            <button
              key={opzione.chiave}
              onClick={() => gestisciEsportaEProcedi(opzione)}
              disabled={inCorso}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {elaborazione === opzione.chiave ? "In corso…" : opzione.etichetta}
            </button>
          ))}
          <button
            onClick={gestisciProcediSenzaExport}
            disabled={inCorso}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            {elaborazione === "__nessuno__" ? "In corso…" : "Procedi senza esportare"}
          </button>
          <button
            onClick={onChiudi}
            disabled={inCorso}
            className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annulla
          </button>
        </div>

        {errore && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errore}</p>}
      </div>
      </div>
    </div>,
    document.body,
  );
}
