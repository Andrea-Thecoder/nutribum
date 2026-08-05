import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface InfoModalProps {
  titolo: string;
  onChiudi: () => void;
  children: ReactNode;
  // Larghezza COMPLETA (non un max-w da combinare con w-full): il default "w-96" è la stessa
  // fissa di tutte le altre modali dell'app. Un contenuto genuinamente più largo (es. la tabella
  // nutrienti di "Visualizza ricetta") può passare "w-full max-w-3xl" per crescere col viewport -
  // eccezione dichiarata, non il comportamento normale di questa modale.
  larghezzaClasse?: string;
}

// Modale generica di sola lettura (glossario, feedback, informazioni - menu "Aiuto"): stesso
// pattern (portal, cuscinetto, max-h-[85vh], min-h-85 come le modali di scrittura) ma senza form
// né conferma alla chiusura, non c'è nessun dato da perdere qui.
export function InfoModal({ titolo, onChiudi, children, larghezzaClasse = "w-96" }: InfoModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 text-slate-900 dark:text-slate-100"
      onClick={onChiudi}
    >
      <div onClick={(e) => e.stopPropagation()} className="min-h-0 p-[3vmin]">
        <div
          onClick={(e) => e.stopPropagation()}
          className={`flex max-h-[85vh] min-h-85 ${larghezzaClasse} flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900`}
        >
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{titolo}</h2>
            <button
              onClick={onChiudi}
              className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              ✕
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 text-sm text-slate-700 dark:text-slate-300">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
