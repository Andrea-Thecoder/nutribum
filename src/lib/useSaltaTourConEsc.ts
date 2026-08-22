import { useEffect } from "react";

// react-joyride di default avanza allo step successivo alla pressione di Esc (opzione
// dismissKeyAction, che supporta solo "close"/"next"/"replay" - nessun valore "skip"): l'unico
// modo per farlo coincidere con "Salta"/✕ è intercettare Esc PRIMA che arrivi al listener interno
// della libreria (su document.body, fase bubble), fermandone la propagazione in fase capture, e
// chiudere il tour a mano.
export function useSaltaTourConEsc(attivo: boolean, onSalta: () => void) {
  useEffect(() => {
    if (!attivo) return;
    function saltaConEsc(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onSalta();
    }
    document.addEventListener("keydown", saltaConEsc, { capture: true });
    return () => document.removeEventListener("keydown", saltaConEsc, { capture: true });
  }, [attivo, onSalta]);
}
