import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../lib/useFocusTrap";

export function ConfermaModalView({
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
  const idMessaggio = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useFocusTrap(boxRef, onAnnulla);

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 text-slate-900 dark:text-slate-100"
      onClick={onAnnulla}
    >
      <div onClick={(e) => e.stopPropagation()} className="min-h-0 p-[3vmin]">
      <div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-describedby={idMessaggio}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <p id={idMessaggio} className="text-sm text-slate-700 dark:text-slate-200">{messaggio}</p>
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
