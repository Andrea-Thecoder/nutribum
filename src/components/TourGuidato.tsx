import { useCallback, useEffect, useState } from "react";
import { Joyride, STATUS, type EventData, type TourData } from "react-joyride";
import { useIsDarkMode } from "../lib/useIsDarkMode";
import { TOURS, type DatiStep } from "../lib/tours";
import { localeTourCondiviso, stiliTourCondivisi, opzioniTourCondivise } from "../lib/tourStyle";
import { useSaltaTourConEsc } from "../lib/useSaltaTourConEsc";

interface TourGuidatoProps {
  // Contatore, non un booleano: ogni incremento (dal caricamento impostazioni al primo avvio, o dal
  // click su "Rivedi tutorial" nel menu Aiuto) è una richiesta di partenza. Usato anche come `key`
  // sotto per forzare un remount di Joyride, l'unico modo affidabile di farlo ripartire dal primo
  // step: Joyride tiene l'indice corrente nel proprio stato interno, non nei props.
  avviaRichiesta: number;
  onCompletato: () => void;
  // Specchia step.data.menu (vedi tours.ts) verso NavBar (prop menuForzatoAperto): quando lo step
  // in arrivo dichiara un menu, questo lo forza aperto per evidenziarne i bottoni interni; null lo
  // richiude. Pilotato dall'hook "before" qui sotto (non da onEvent): deve essere GARANTITO aperto
  // prima che Joyride cerchi il target, altrimenti per un istante non lo trova e mostra il loader
  // di attesa (loaderDelay) invece del tooltip.
  onApriMenu: (nome: string | null) => void;
}

export function TourGuidato({ avviaRichiesta, onCompletato, onApriMenu }: TourGuidatoProps) {
  const isDark = useIsDarkMode();
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (avviaRichiesta > 0) setRun(true);
  }, [avviaRichiesta]);

  const salta = useCallback(() => {
    // Chiudere qui, non solo lasciarlo all'hook "before" del prossimo step (che con Salta/Fine
    // non scatta mai, il tour finisce senza "prossimo step"): altrimenti un menu aperto
    // dall'ultimo step attivo resterebbe aperto dopo la chiusura del tour.
    onApriMenu(null);
    setRun(false);
    onCompletato();
  }, [onApriMenu, onCompletato]);

  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) salta();
  }

  useSaltaTourConEsc(run, salta);

  // Garantisce che il menu richiesto dallo step in arrivo sia aperto (o richiuso) PRIMA che
  // Joyride provi a cercarne il target - a differenza di reagire dentro onEvent, dove lo stato si
  // aggiorna un frame troppo tardi rispetto alla ricerca del target e per un istante scatta il
  // loader di attesa invece del tooltip.
  function apriMenuPrimaDelloStep(data: TourData): Promise<void> {
    return new Promise((resolve) => {
      onApriMenu((data.step.data as DatiStep | undefined)?.menu ?? null);
      // Due frame, non uno: garantisce che React abbia sia committato sia dipinto il nuovo stato
      // (il menu aperto nel DOM) prima che Joyride misuri il target.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  return (
    <Joyride
      key={avviaRichiesta}
      steps={TOURS.benvenuto}
      run={run}
      continuous
      onEvent={handleEvent}
      locale={localeTourCondiviso()}
      styles={stiliTourCondivisi(isDark)}
      options={{
        ...opzioniTourCondivise(isDark),
        before: apriMenuPrimaDelloStep,
      }}
    />
  );
}
