import { useCallback, useState } from "react";
import { Joyride, STATUS, type EventData, type Step } from "react-joyride";
import { useIsDarkMode } from "../lib/useIsDarkMode";
import { localeTourCondiviso, stiliTourCondivisi, opzioniTourCondivise } from "../lib/tourStyle";
import { scopedAllaDemo } from "../lib/scopedAllaDemo";
import { useSaltaTourConEsc } from "../lib/useSaltaTourConEsc";

interface TourAnteprimaPannelloProps {
  steps: Step[];
  // Chiamato a tour finito, saltato, o chiuso con la X (closeButtonAction: "skip" nella config
  // condivisa li rende equivalenti) - chiude anche la modale "?" che lo contiene, non solo il
  // tour: restare con la modale aperta e vuota dopo aver chiuso il tour sembrerebbe un bug.
  onCompletato: () => void;
}

// Motore generico per il mini-tour annidato dentro la modale "?" di QUALSIASI scheda: stesso
// motore/aspetto del tour di benvenuto (TourGuidato.tsx) e dell'ex TourAnteprimaCalendario (ora
// solo una lista di step, vedi lib/tourAnteprimaContenuti.tsx), parametrizzato sugli step invece
// di duplicare il wiring di Joyride una volta per scheda. Parte da solo all'apertura della modale
// (l'utente ha già scelto di aprirla cliccando "?") - "Salta" lo chiude subito se non interessa.
export function TourAnteprimaPannello({ steps, onCompletato }: TourAnteprimaPannelloProps) {
  const isDark = useIsDarkMode();
  const [run, setRun] = useState(true);

  const salta = useCallback(() => {
    setRun(false);
    onCompletato();
  }, [onCompletato]);

  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) salta();
  }

  useSaltaTourConEsc(run, salta);

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
