import { useState } from "react";
import { Joyride, STATUS, type EventData, type Step } from "react-joyride";
import { useIsDarkMode } from "../lib/useIsDarkMode";
import { localeTourCondiviso, stiliTourCondivisi, opzioniTourCondivise } from "../lib/tourStyle";

interface TourAnteprimaPannelloProps {
  steps: Step[];
  // Chiamato a tour finito, saltato, o chiuso con la X (closeButtonAction: "skip" nella config
  // condivisa li rende equivalenti) - chiude anche la modale "?" che lo contiene, non solo il
  // tour: restare con la modale aperta e vuota dopo aver chiuso il tour sembrerebbe un bug.
  onCompletato: () => void;
}

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

// Motore generico per il mini-tour annidato dentro la modale "?" di QUALSIASI scheda: stesso
// motore/aspetto del tour di benvenuto (TourGuidato.tsx) e dell'ex TourAnteprimaCalendario (ora
// solo una lista di step, vedi lib/tourAnteprimaContenuti.tsx), parametrizzato sugli step invece
// di duplicare il wiring di Joyride una volta per scheda. Parte da solo all'apertura della modale
// (l'utente ha già scelto di aprirla cliccando "?") - "Salta" lo chiude subito se non interessa.
export function TourAnteprimaPannello({ steps, onCompletato }: TourAnteprimaPannelloProps) {
  const isDark = useIsDarkMode();
  const [run, setRun] = useState(true);

  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRun(false);
      onCompletato();
    }
  }

  return (
    <Joyride
      steps={scopedAllaDemo(steps)}
      run={run}
      continuous
      onEvent={handleEvent}
      locale={localeTourCondiviso()}
      styles={stiliTourCondivisi(isDark)}
      options={opzioniTourCondivise(isDark)}
    />
  );
}
