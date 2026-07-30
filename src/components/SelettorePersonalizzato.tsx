import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface OpzioneSelettore<T extends string | number> {
  valore: T;
  etichetta: string;
}

// Altezza massima fissa del menu, indipendente da dove si trova il bottone sullo schermo: risolve
// alla radice il problema del <select> nativo, il cui menu a comparsa è renderizzato dal sistema
// operativo (non dalla pagina) e può uscire dai bordi dello schermo senza che nessun CSS lo possa
// impedire — stesso identico problema già risolto per l'<input type="date"> con CalendarioPopover.
const ALTEZZA_MAX_DROPDOWN = 240;

interface SelettorePersonalizzatoProps<T extends string | number> {
  valore: T | "";
  opzioni: OpzioneSelettore<T>[];
  onChange: (valore: T) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SelettorePersonalizzato<T extends string | number>({
  valore,
  opzioni,
  onChange,
  placeholder = "Seleziona…",
  disabled,
}: SelettorePersonalizzatoProps<T>) {
  const [aperto, setAperto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [posizione, setPosizione] = useState<
    { top: number; left: number; minWidth: number; maxWidth: number; sopra: boolean } | null
  >(null);
  const bottoneRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selezionata = opzioni.find((o) => o.valore === valore);

  // Renderizzato in un portale (document.body), non nel normale flusso della pagina: così non
  // viene mai tagliato dall'overflow:auto/hidden di un antenato (es. la lista scrollabile degli
  // ingredienti in RicettaFormModal) — solo lo schermo stesso è il limite, e quello lo gestiamo
  // noi calcolando la posizione dal bottone e capando l'altezza.
  useEffect(() => {
    if (!aperto) return;
    function chiudiSeFuori(e: MouseEvent) {
      if (
        e.target instanceof Node &&
        !bottoneRef.current?.contains(e.target) &&
        !dropdownRef.current?.contains(e.target)
      ) {
        setAperto(false);
      }
    }
    function chiudiConEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setAperto(false);
    }
    // Ridimensionare la finestra mentre il menu è aperto invaliderebbe la posizione già calcolata
    // (fissata al momento dell'apertura, non ricalcolata in automatico): chiudersi è più sicuro che
    // restare visualizzato in un punto ormai sbagliato.
    function chiudiSeRidimensiona() {
      setAperto(false);
    }
    document.addEventListener("mousedown", chiudiSeFuori);
    document.addEventListener("keydown", chiudiConEsc);
    window.addEventListener("resize", chiudiSeRidimensiona);
    return () => {
      document.removeEventListener("mousedown", chiudiSeFuori);
      document.removeEventListener("keydown", chiudiConEsc);
      window.removeEventListener("resize", chiudiSeRidimensiona);
    };
  }, [aperto]);

  // Margine di sicurezza dal bordo destro della finestra, coerente con lo spazio già lasciato
  // altrove nei popover di questa app.
  const MARGINE_BORDO_FINESTRA = 16;

  function apri() {
    const rect = bottoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spazioSotto = window.innerHeight - rect.bottom;
    // Si apre verso l'alto solo se sotto non c'è spazio a sufficienza E sopra ce n'è di più:
    // altrimenti resta sotto anche se un po' tagliato dal cap di altezza, meglio prevedibile.
    const sopra = spazioSotto < ALTEZZA_MAX_DROPDOWN && rect.top > spazioSotto;
    setPosizione({
      top: sopra ? rect.top : rect.bottom,
      left: rect.left,
      // Mai più stretto del bottone che lo apre, ma libero di allargarsi per il contenuto più
      // lungo (es. un nome alimento lungo) finché c'è spazio prima del bordo della finestra —
      // sempre relativo alla finestra vera (window.innerWidth), non al pannello che lo contiene.
      minWidth: rect.width,
      maxWidth: Math.max(rect.width, window.innerWidth - rect.left - MARGINE_BORDO_FINESTRA),
      sopra,
    });
    setFiltro("");
    setAperto(true);
  }

  const filtrate =
    filtro.trim() === "" ? opzioni : opzioni.filter((o) => o.etichetta.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <>
      <button
        type="button"
        ref={bottoneRef}
        disabled={disabled}
        onClick={() => (aperto ? setAperto(false) : apri())}
        className="flex w-full items-center justify-between gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-left text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <span className="truncate">{selezionata?.etichetta ?? placeholder}</span>
        <span className="pointer-events-none shrink-0 text-slate-400">▾</span>
      </button>

      {aperto &&
        posizione &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              left: posizione.left,
              minWidth: posizione.minWidth,
              maxWidth: posizione.maxWidth,
              top: posizione.sopra ? undefined : posizione.top,
              bottom: posizione.sopra ? window.innerHeight - posizione.top : undefined,
              maxHeight: ALTEZZA_MAX_DROPDOWN,
            }}
            className="z-9999 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {opzioni.length > 6 && (
              <input
                autoFocus
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Cerca…"
                className="border-b border-slate-200 px-2 py-1 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            )}
            <div className="overflow-y-auto">
              {filtrate.length === 0 && (
                <p className="px-2 py-1.5 text-sm text-slate-400 dark:text-slate-500">Nessun risultato</p>
              )}
              {filtrate.map((o) => (
                <button
                  key={o.valore}
                  type="button"
                  onClick={() => {
                    onChange(o.valore);
                    setAperto(false);
                  }}
                  className={
                    "block w-full px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 " +
                    (o.valore === valore
                      ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-200")
                  }
                >
                  {o.etichetta}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
