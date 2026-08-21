import { useEffect, type RefObject } from "react";

const SELETTORE_FOCUSABILI =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Porta il focus dentro la modale all'apertura (solo se non c'è già, per rispettare un eventuale
// autoFocus già presente su un campo specifico) e lo intrappola dentro col Tab: senza, Tab
// scapperebbe verso i pannelli sottostanti, invisibili dietro l'overlay ma ancora nel DOM.
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!container.contains(document.activeElement)) {
      const primoFocusabile = container.querySelector<HTMLElement>(SELETTORE_FOCUSABILI);
      (primoFocusabile ?? container).focus();
    }

    function gestisciTab(e: KeyboardEvent) {
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

    container.addEventListener("keydown", gestisciTab);
    return () => container.removeEventListener("keydown", gestisciTab);
  }, [containerRef]);
}
