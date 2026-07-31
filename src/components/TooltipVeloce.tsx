import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipVeloceProps {
  contenuto: ReactNode;
  children: ReactNode;
}

const RITARDO_MS = 150;
const ALTEZZA_STIMATA = 150;

// Portal + position: fixed (stesso approccio di SelettorePersonalizzato), non un tooltip
// posizionato in flusso via CSS: un antenato con overflow-auto/hidden (es. la lista scrollabile di
// un pannello) altrimenti taglia il tooltip ogni volta che il trigger è vicino al bordo del
// contenitore, non solo ai bordi dello schermo. Ritardo breve (150ms) invece dei ~1s fissi
// dell'attributo title nativo.
export function TooltipVeloce({ contenuto, children }: TooltipVeloceProps) {
  const [posizione, setPosizione] = useState<{ top: number; left: number; sopra: boolean } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  function mostra() {
    timeoutRef.current = window.setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spazioSotto = window.innerHeight - rect.bottom;
      const sopra = spazioSotto < ALTEZZA_STIMATA && rect.top > spazioSotto;
      setPosizione({ top: sopra ? rect.top : rect.bottom, left: rect.left, sopra });
    }, RITARDO_MS);
  }

  function nascondi() {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    setPosizione(null);
  }

  // La riga può sparire (es. filtro di ricerca) mentre il timeout di "mostra" è ancora in attesa:
  // senza pulizia, scatterebbe comunque un setPosizione su un componente già smontato.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div ref={triggerRef} onMouseEnter={mostra} onMouseLeave={nascondi}>
      {children}
      {posizione &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: posizione.left,
              top: posizione.sopra ? undefined : posizione.top + 4,
              bottom: posizione.sopra ? window.innerHeight - posizione.top + 4 : undefined,
            }}
            className="pointer-events-none z-9999 max-w-xs rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {contenuto}
          </div>,
          document.body,
        )}
    </div>
  );
}
