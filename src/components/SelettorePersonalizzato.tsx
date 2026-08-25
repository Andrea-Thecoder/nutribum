import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface OpzioneSelettore<T extends string | number> {
  valore: T;
  etichetta: string;
}

// Altezza massima fissa del menu, indipendente da dove si trova il bottone sullo schermo: risolve
// alla radice il problema del <select> nativo, il cui menu a comparsa è renderizzato dal sistema
// operativo (non dalla pagina) e può uscire dai bordi dello schermo senza che nessun CSS lo possa
// impedire - stesso identico problema già risolto per l'<input type="date"> con CalendarioPopover.
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
  const [evidenziato, setEvidenziato] = useState(0);
  const [posizione, setPosizione] = useState<
    { top: number; left: number; minWidth: number; maxWidth: number; sopra: boolean } | null
  >(null);
  const bottoneRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const opzioneRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const idBase = useId();
  const idListbox = `${idBase}-listbox`;
  const idOpzione = (idx: number) => `${idBase}-opzione-${idx}`;

  const selezionata = opzioni.find((o) => o.valore === valore);

  // Margine di sicurezza dal bordo destro della finestra, coerente con lo spazio già lasciato
  // altrove nei popover di questa app.
  const MARGINE_BORDO_FINESTRA = 16;

  // Ricalcola la posizione dal bottone: usata sia all'apertura sia ad ogni scroll (della finestra
  // o di un antenato scrollabile, es. il corpo di una modale) mentre il menu resta aperto, così il
  // menu segue il bottone invece di restare fissato al punto in cui si trovava all'apertura e
  // "staccarsi" dalla scheda che lo ha aperto.
  function ricalcolaPosizione(): boolean {
    const rect = bottoneRef.current?.getBoundingClientRect();
    if (!rect) return false;
    const spazioSotto = window.innerHeight - rect.bottom;
    // Si apre verso l'alto solo se sotto non c'è spazio a sufficienza E sopra ce n'è di più:
    // altrimenti resta sotto anche se un po' tagliato dal cap di altezza, meglio prevedibile.
    const sopra = spazioSotto < ALTEZZA_MAX_DROPDOWN && rect.top > spazioSotto;
    setPosizione({
      top: sopra ? rect.top : rect.bottom,
      left: rect.left,
      // Mai più stretto del bottone che lo apre, ma libero di allargarsi per il contenuto più
      // lungo (es. un nome alimento lungo) finché c'è spazio prima del bordo della finestra -
      // sempre relativo alla finestra vera (window.innerWidth), non al pannello che lo contiene.
      minWidth: rect.width,
      maxWidth: Math.max(rect.width, window.innerWidth - rect.left - MARGINE_BORDO_FINESTRA),
      sopra,
    });
    return true;
  }

  // Renderizzato in un portale (document.body), non nel normale flusso della pagina: così non
  // viene mai tagliato dall'overflow:auto/hidden di un antenato (es. la lista scrollabile degli
  // ingredienti in RicettaFormModal) - solo lo schermo stesso è il limite, e quello lo gestiamo
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
    // Ridimensionare la finestra è più drastico di un semplice scroll (può cambiare anche lo
    // spazio disponibile sopra/sotto, non solo la posizione): chiudersi resta più sicuro che
    // ricalcolare in un layout che potrebbe essere cambiato radicalmente.
    function chiudiSeRidimensiona() {
      setAperto(false);
    }
    // capture:true, non bubble: uno scroll dentro un contenitore interno (es. il corpo di una
    // modale) non arriva a "document" in fase di bubbling, va intercettato in fase di cattura per
    // essere notificati indipendentemente da QUALE antenato scrollabile si è mosso.
    function seguiScroll() {
      if (!ricalcolaPosizione()) setAperto(false);
    }
    document.addEventListener("mousedown", chiudiSeFuori);
    document.addEventListener("keydown", chiudiConEsc);
    window.addEventListener("resize", chiudiSeRidimensiona);
    document.addEventListener("scroll", seguiScroll, true);
    return () => {
      document.removeEventListener("mousedown", chiudiSeFuori);
      document.removeEventListener("keydown", chiudiConEsc);
      window.removeEventListener("resize", chiudiSeRidimensiona);
      document.removeEventListener("scroll", seguiScroll, true);
    };
  }, [aperto]);

  function apri() {
    if (!ricalcolaPosizione()) return;
    setFiltro("");
    // Riparte dall'opzione già selezionata (non sempre dalla prima): con le frecce che applicano
    // subito la scelta (vedi sotto), la prima pressione deve muoversi rispetto a dov'è ora, non
    // saltare all'inizio della lista.
    const indiceCorrente = opzioni.findIndex((o) => o.valore === valore);
    setEvidenziato(indiceCorrente >= 0 ? indiceCorrente : 0);
    setAperto(true);
  }

  const filtrate =
    filtro.trim() === "" ? opzioni : opzioni.filter((o) => o.etichetta.toLowerCase().includes(filtro.toLowerCase()));

  // Il filtro cambia l'elenco visibile ad ogni tasto premuto: l'evidenziazione riparte dal primo
  // risultato invece di puntare a un indice ormai riferito a un'opzione diversa (o inesistente).
  useEffect(() => {
    setEvidenziato(0);
  }, [filtro]);

  // Frecce/Invio non arrivano a nessun elemento della tendina (i bottoni delle opzioni non hanno
  // mai il focus, per non spostarlo dal campo di ricerca mentre si digita): stesso approccio già
  // usato sopra per mousedown/Escape, un listener globale invece di gestire il focus manualmente.
  useEffect(() => {
    if (!aperto) return;
    function gestisciTastiera(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const nuovoIndice =
          e.key === "ArrowDown"
            ? Math.min(evidenziato + 1, filtrate.length - 1)
            : Math.max(evidenziato - 1, 0);
        setEvidenziato(nuovoIndice);
        // Applica subito la scelta man mano che ci si sposta con le frecce, come un <select>
        // nativo, invece di aspettare Invio per confermare.
        const scelta = filtrate[nuovoIndice];
        if (scelta) onChange(scelta.valore);
      } else if (e.key === "Enter") {
        const scelta = filtrate[evidenziato];
        if (scelta) {
          e.preventDefault();
          onChange(scelta.valore);
          setAperto(false);
        }
      }
    }
    document.addEventListener("keydown", gestisciTastiera);
    return () => document.removeEventListener("keydown", gestisciTastiera);
  }, [aperto, filtrate, evidenziato, onChange]);

  useEffect(() => {
    opzioneRefs.current[evidenziato]?.scrollIntoView({ block: "nearest" });
  }, [evidenziato]);

  return (
    <>
      <button
        type="button"
        ref={bottoneRef}
        disabled={disabled}
        role="combobox"
        aria-label={selezionata?.etichetta ?? placeholder}
        aria-haspopup="listbox"
        aria-expanded={aperto}
        aria-controls={idListbox}
        aria-activedescendant={aperto && filtrate[evidenziato] ? idOpzione(evidenziato) : undefined}
        onClick={() => (aperto ? setAperto(false) : apri())}
        // Con il menu chiuso basta che il bottone sia a fuoco (es. dopo un Tab) per cambiare
        // opzione con le frecce, senza doverlo prima aprire: stesso comportamento di un <select>
        // nativo. Con il menu aperto le frecce sono già gestite dal listener globale sopra.
        onKeyDown={(e) => {
          if (aperto) return;
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          e.preventDefault();
          const indiceCorrente = opzioni.findIndex((o) => o.valore === valore);
          const nuovoIndice =
            e.key === "ArrowDown"
              ? Math.min(indiceCorrente + 1, opzioni.length - 1)
              : Math.max(indiceCorrente - 1, 0);
          const scelta = opzioni[nuovoIndice];
          if (scelta) onChange(scelta.valore);
        }}
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
            role="listbox"
            id={idListbox}
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
                aria-label="Cerca opzione"
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
              {filtrate.map((o, idx) => (
                <button
                  key={o.valore}
                  id={idOpzione(idx)}
                  role="option"
                  aria-selected={o.valore === valore}
                  ref={(el) => {
                    opzioneRefs.current[idx] = el;
                  }}
                  type="button"
                  onMouseEnter={() => setEvidenziato(idx)}
                  onClick={() => {
                    onChange(o.valore);
                    setAperto(false);
                  }}
                  className={
                    "block w-full px-2 py-1.5 text-left text-sm hover:bg-slate-200 dark:hover:bg-slate-800 " +
                    (o.valore === valore
                      ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : idx === evidenziato
                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
