import { useEffect, type RefObject } from "react";

const SELETTORE_FOCUSABILI =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Porta il focus dentro la modale all'apertura (solo se non c'è già, per rispettare un eventuale
// autoFocus già presente su un campo specifico) e lo intrappola dentro col Tab: senza, Tab
// scapperebbe verso i pannelli sottostanti, invisibili dietro l'overlay ma ancora nel DOM.
//
// Il fallback quando nulla ha già il focus è il contenitore stesso, NON "il primo elemento
// cliccabile": in ogni modale l'header (bottone "?"/✕) precede il corpo nel DOM, quindi "il primo
// cliccabile" sarebbe sempre "?" invece del campo pensato per l'autoFocus - risultato,
// l'anello di focus del browser finiva sempre lì, sembrando un bottone diverso dagli altri.
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, onEscape?: () => void) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!container.contains(document.activeElement)) {
      container.focus();
    }

    function gestisciTastiera(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const focusabili = Array.from(container.querySelectorAll<HTMLElement>(SELETTORE_FOCUSABILI));
      const primo = focusabili[0];
      const ultimo = focusabili[focusabili.length - 1];
      if (!primo || !ultimo) return;
      if (e.shiftKey && document.activeElement === primo) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primo.focus();
      }
    }

    container.addEventListener("keydown", gestisciTastiera);
    return () => container.removeEventListener("keydown", gestisciTastiera);
  }, [containerRef, onEscape]);
}
