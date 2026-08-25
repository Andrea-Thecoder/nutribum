import { useId, useRef } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { createPortal } from "react-dom";
import type { DettaglioGiornoSforato } from "../lib/dailyGoal";
import { useFocusTrap } from "../lib/useFocusTrap";

interface SforamentoDettaglioModalProps {
  titolo: string;
  dettagli: DettaglioGiornoSforato[];
  onChiudi: () => void;
  onApriGiorno: (data: string) => void;
}

export function SforamentoDettaglioModal({
  titolo,
  dettagli,
  onChiudi,
  onApriGiorno,
}: SforamentoDettaglioModalProps) {
  const idTitolo = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useFocusTrap(boxRef, onChiudi);

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 text-slate-900 dark:text-slate-100"
      onClick={onChiudi}
    >
      <div onClick={(e) => e.stopPropagation()} className="min-h-0 p-[3vmin]">
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitolo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-96 min-h-85 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id={idTitolo} className="text-sm font-semibold text-slate-800 dark:text-slate-100">{titolo}</h2>
          <button
            onClick={onChiudi}
            autoFocus
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {dettagli.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nessun giorno da mostrare.</p>
        ) : (
          <ul className="max-h-96 space-y-3 overflow-y-auto">
            {dettagli.map((g) => (
              <li key={g.data}>
                <button
                  onClick={() => onApriGiorno(g.data)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {format(new Date(g.data), "EEEE d MMMM", { locale: it })}
                  </p>
                  <ul className="space-y-0.5">
                    {g.sforamenti.map((s) => (
                      <li key={s.etichetta} className="flex justify-between text-xs text-red-600 dark:text-red-400">
                        <span>{s.etichetta}</span>
                        <span className="font-semibold">
                          {s.valore} / {s.limite}
                        </span>
                      </li>
                    ))}
                  </ul>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </div>,
    document.body,
  );
}
