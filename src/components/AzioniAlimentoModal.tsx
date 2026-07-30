import { createPortal } from "react-dom";
import type { AlimentoCatalogo } from "../lib/food";

interface AzioniAlimentoModalProps {
  alimento: AlimentoCatalogo;
  onChiudi: () => void;
  onModifica: () => void;
  onElimina: () => void;
}

export function AzioniAlimentoModal({ alimento, onChiudi, onModifica, onElimina }: AzioniAlimentoModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 text-slate-900 dark:text-slate-100" onClick={onChiudi}>
      {/* Cuscinetto invisibile intorno alla modale: senza, un drag che parte dentro la modale ma
          termina appena fuori (es. selezione testo, trascinamento di un cursore) la chiude di
          scatto — questo margine assorbe il click prima che raggiunga lo sfondo. */}
      <div onClick={(e) => e.stopPropagation()} className="min-h-0 p-[3vmin]">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="mb-3 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {alimento.nome}
        </h2>
        <div className="flex flex-col gap-2">
          <button
            onClick={onModifica}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Modifica
          </button>
          <button
            onClick={onElimina}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            Elimina
          </button>
          <button
            onClick={onChiudi}
            className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annulla
          </button>
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}
