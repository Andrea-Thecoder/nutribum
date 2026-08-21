import { useEffect } from "react";
import { createPortal } from "react-dom";

export interface EsitoPopupProps {
  tipo: "successo" | "avviso" | "errore";
  messaggio: string;
  onChiudi: () => void;
}

const DURATA_MS = 6000;

const STILE_TIPO: Record<EsitoPopupProps["tipo"], string> = {
  successo:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  avviso:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200",
  errore: "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200",
};

export function EsitoPopup({ tipo, messaggio, onChiudi }: EsitoPopupProps) {
  useEffect(() => {
    const timer = setTimeout(onChiudi, DURATA_MS);
    return () => clearTimeout(timer);
  }, [tipo, messaggio, onChiudi]);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-9999 flex items-center justify-center px-4">
      <button
        onClick={onChiudi}
        role={tipo === "errore" ? "alert" : "status"}
        aria-live={tipo === "errore" ? "assertive" : "polite"}
        className={`pointer-events-auto relative max-w-lg cursor-pointer rounded-xl border px-5 py-4 pr-9 text-left text-sm shadow-xl ${STILE_TIPO[tipo]}`}
      >
        {messaggio}
        <span className="absolute right-2 top-2 text-xs opacity-60">✕</span>
      </button>
    </div>,
    document.body,
  );
}
