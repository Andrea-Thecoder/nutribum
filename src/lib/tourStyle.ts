import type { Locale, Options, PartialDeep, Styles } from "react-joyride";

// Condiviso da TourGuidato.tsx (tour di benvenuto) e da ogni mini-tour annidato dentro una modale
// (es. TourAnteprimaCalendario.tsx): stesso aspetto e comportamento ovunque, un solo posto da
// aggiornare. Sopra 9999: nel progetto TUTTE le modali e il dropdown aperto della NavBar usano
// z-9999 (bare arbitrary Tailwind) - un tour deve stare sopra quel livello.
export const Z_INDEX_TOUR = 10000;

export function localeTourCondiviso(): Locale {
  return {
    back: "Indietro",
    close: "Chiudi",
    last: "Fine",
    next: "Prosegui",
    nextWithProgress: "Prosegui ({current} di {total})",
    skip: "Salta",
  };
}

export function stiliTourCondivisi(isDark: boolean): PartialDeep<Styles> {
  return {
    // Di default "Salta"/"Indietro" sono testo puro (stesso colore del corpo, nessun bordo): non
    // si leggono come bottoni cliccabili. Solo "Salta" ne ha bisogno qui - è l'azione che chiude
    // l'intero tour, va distinta a colpo d'occhio da "Indietro" (che resta testuale).
    buttonSkip: {
      border: isDark ? "1px solid #475569" : "1px solid #cbd5e1",
      backgroundColor: "transparent",
    },
    // Vuoto di default nella libreria: senza queste righe non viene disegnato NESSUN contorno
    // attorno al buco dell'overlay, l'elemento evidenziato si distingue dal resto solo perché non
    // è oscurato - poco evidente. Contorno pieno + bagliore nel colore primario per farlo
    // risaltare a colpo d'occhio, non solo delimitarlo con una riga sottile.
    spotlight: {
      stroke: "#2563eb",
      strokeWidth: 3,
      filter: "drop-shadow(0 0 8px rgba(37, 99, 235, 0.9))",
    },
  };
}

export function opzioniTourCondivise(isDark: boolean): Partial<Options> {
  return {
    zIndex: Z_INDEX_TOUR,
    buttons: ["back", "close", "primary", "skip"],
    showProgress: true,
    // Fisso: senza, la larghezza del tooltip varia con lo step (uno centrato ha più spazio
    // disponibile del previsto e va su una riga sola; altri si stringono) - con un valore fisso
    // il testo va sempre a capo allo stesso modo.
    width: 400,
    // Senza, ogni step mostrerebbe prima un pallino pulsante da cliccare per aprire il tooltip
    // (comportamento pensato per un tour "a scoperta libera", non per uno che avanza da solo in
    // sequenza con continuous).
    skipBeacon: true,
    // Cliccare fuori dal riquadro non deve fare nulla (di default equivale a "Chiudi", che avanza
    // allo step successivo - facile da attivare per sbaglio).
    overlayClickAction: false,
    // La X in alto a destra chiude l'intero tour (come "Salta"), non solo lo step corrente.
    closeButtonAction: "skip",
    // Di default il buco nell'overlay lascia passare i click all'elemento reale sotto - va solo
    // illuminato, non azionato.
    blockTargetInteraction: true,
    // Un po' più arrotondato del default (4): segue meglio gli elementi con angoli smussati.
    spotlightRadius: 8,
    // Valore scelto a mano dall'utente dopo aver provato il default (10): NON toccare.
    spotlightPadding: 4,
    primaryColor: "#2563eb",
    backgroundColor: isDark ? "#0f172a" : "#ffffff",
    textColor: isDark ? "#e2e8f0" : "#0f172a",
    arrowColor: isDark ? "#0f172a" : "#ffffff",
    overlayColor: "rgba(0, 0, 0, 0.5)",
  };
}
