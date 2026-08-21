import type { Step } from "react-joyride";

const ID_RADICE_ANTEPRIMA = "anteprima-tour-root";

// I data-tour dentro una demo (es. "legenda-Kcal consumate") sono le STESSE stringhe usate dal
// componente reale - e la scheda vera, con i dati reali dell'utente, resta montata dietro la
// modale mentre la demo è aperta. Un selettore globale `[data-tour="..."]` trova quindi la prima
// occorrenza nel DOM, che può essere quella della scheda reale in dashboard invece di quella
// dentro la modale (bug osservato: lo spotlight puntava su un elemento fuori dalla modale, in una
// posizione qualunque della pagina). Ogni scheda demo è avvolta in un contenitore con
// id="anteprima-tour-root" (vedi anteprimaPannelli.tsx): qui si riscrivono i target stringa perché
// cerchino solo dentro quel contenitore.
export function scopedAllaDemo(steps: Step[]): Step[] {
  return steps.map((step) => {
    // "body" è lo step introduttivo/di chiusura (placement "center", nessun elemento reale da
    // evidenziare): non è un discendente del contenitore demo, va lasciato globale.
    if (typeof step.target !== "string" || step.target === "body") return step;
    const target = step.target;
    return {
      ...step,
      target: () => document.querySelector(`#${ID_RADICE_ANTEPRIMA} ${target}`),
    };
  });
}
