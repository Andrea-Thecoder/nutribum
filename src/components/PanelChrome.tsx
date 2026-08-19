import type { MouseEvent, ReactNode } from "react";
import type { DirezioneResize } from "../lib/useDragResize";

interface PanelChromeProps {
  titolo: string;
  headerExtra?: ReactNode;
  ancorato: boolean;
  inMovimento?: boolean;
  onToggleAncora: () => void;
  onRimuovi: () => void;
  onIniziaDrag: (e: MouseEvent) => void;
  onIniziaResize: (e: MouseEvent, direzione: DirezioneResize) => void;
  children: ReactNode;
  // Ancora stabile per il tour guidato (TourGuidato/tours.ts), non per lo stile: se assente, il
  // div radice non ha semplicemente l'attributo - nessun altro effetto.
  dataTour?: string;
  // Apre la spiegazione dettagliata di QUESTO tipo di pannello (vedi infoPannelli.ts). Sempre
  // visibile (non solo in hover come le maniglie di resize) - scelta esplicita dell'utente per
  // massima scopribilità, anche a costo di un'icona fissa in più nell'header.
  onInfo: () => void;
}

export function PanelChrome({
  titolo,
  headerExtra,
  ancorato,
  inMovimento,
  onToggleAncora,
  onRimuovi,
  onIniziaDrag,
  onIniziaResize,
  children,
  dataTour,
  onInfo,
}: PanelChromeProps) {
  return (
    <div
      data-tour={dataTour}
      className={
        "relative flex h-full flex-col overflow-hidden border bg-white dark:bg-slate-900 " +
        // Durante drag/resize niente ombra+angoli arrotondati: su WebKitGTK (webview Linux di
        // Tauri) ricomporre il clip-mask di un bordo arrotondato insieme all'ombra, ad ogni frame
        // di un elemento in transform, è pesante (nessun problema in Chrome/Firefox) - costo
        // confermato indipendente dal numero di pannelli, quindi non risolvibile lato React.
        // overflow-hidden invece resta SEMPRE attivo (un clip rettangolare piatto è economico anche
        // su WebKitGTK): senza, il contenuto sporgerebbe visibilmente dai bordi durante il gesto.
        (inMovimento
          ? "rounded-none border-slate-300 dark:border-slate-700"
          : "rounded-xl border-slate-200 shadow-sm dark:border-slate-800")
      }
    >
      <div
        onMouseDown={(e) => {
          if (ancorato) return;
          if ((e.target as HTMLElement).closest("button")) return;
          onIniziaDrag(e);
        }}
        className={
          "flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 select-none dark:border-slate-800 dark:bg-slate-800/60 " +
          (ancorato ? "cursor-default" : "cursor-move")
        }
      >
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {titolo}
        </span>
        {headerExtra && (
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto senza-scrollbar">
            {headerExtra}
          </div>
        )}
        <button
          onClick={onInfo}
          className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:border-slate-600 dark:text-slate-500 dark:hover:border-blue-400 dark:hover:text-blue-400"
          title="Cosa mostra questa scheda"
        >
          ?
        </button>
        <button
          onClick={onToggleAncora}
          className={
            "shrink-0 rounded px-1.5 " +
            (ancorato
              ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
              : "text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-100")
          }
          title={ancorato ? "Sblocca pannello" : "Ancora pannello (blocca posizione e lo protegge dal reset del layout)"}
        >
          {ancorato ? "🔒" : "🔓"}
        </button>
        <button
          onClick={onRimuovi}
          className="shrink-0 rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          title="Rimuovi pannello"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
      {!ancorato && (
        <>
          <div
            onMouseDown={(e) => onIniziaResize(e, "nw")}
            title="Ridimensiona"
            className="absolute left-0 top-0 h-4 w-4 cursor-nwse-resize"
          >
            <svg viewBox="0 0 10 10" className="h-full w-full -scale-x-100 -scale-y-100 text-slate-300 dark:text-slate-600">
              <path d="M9 1 1 9M9 5 5 9M9 9 9 9" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          </div>
          <div
            onMouseDown={(e) => onIniziaResize(e, "ne")}
            title="Ridimensiona"
            className="absolute right-0 top-0 h-4 w-4 cursor-nesw-resize"
          >
            <svg viewBox="0 0 10 10" className="h-full w-full -scale-y-100 text-slate-300 dark:text-slate-600">
              <path d="M9 1 1 9M9 5 5 9M9 9 9 9" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          </div>
          <div
            onMouseDown={(e) => onIniziaResize(e, "sw")}
            title="Ridimensiona"
            className="absolute bottom-0 left-0 h-4 w-4 cursor-nesw-resize"
          >
            <svg viewBox="0 0 10 10" className="h-full w-full -scale-x-100 text-slate-300 dark:text-slate-600">
              <path d="M9 1 1 9M9 5 5 9M9 9 9 9" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          </div>
          <div
            onMouseDown={(e) => onIniziaResize(e, "se")}
            title="Ridimensiona"
            className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
          >
            <svg viewBox="0 0 10 10" className="h-full w-full text-slate-300 dark:text-slate-600">
              <path d="M9 1 1 9M9 5 5 9M9 9 9 9" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
