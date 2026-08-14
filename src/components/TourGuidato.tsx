import { useEffect, useState } from "react";
import { Joyride, STATUS, type EventData, type TourData } from "react-joyride";
import { useIsDarkMode } from "../lib/useIsDarkMode";
import { TOURS, type DatiStep } from "../lib/tours";

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

// Sopra 9999: nel progetto TUTTE le modali e il dropdown aperto della NavBar usano z-9999 (bare
// arbitrary Tailwind) - il tour deve stare sopra quel livello o finirebbe nascosto dietro un menu
// aperto durante uno dei suoi step.
const Z_INDEX_TOUR = 10000;

export function TourGuidato({ avviaRichiesta, onCompletato, onApriMenu }: TourGuidatoProps) {
  const isDark = useIsDarkMode();
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (avviaRichiesta > 0) setRun(true);
  }, [avviaRichiesta]);

  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      // Chiudere qui, non solo lasciarlo all'hook "before" del prossimo step (che con Salta/Fine
      // non scatta mai, il tour finisce senza "prossimo step"): altrimenti un menu aperto
      // dall'ultimo step attivo resterebbe aperto dopo la chiusura del tour.
      onApriMenu(null);
      setRun(false);
      onCompletato();
    }
  }

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
      locale={{
        back: "Indietro",
        close: "Chiudi",
        last: "Fine",
        next: "Prosegui",
        nextWithProgress: "Prosegui ({current} di {total})",
        skip: "Salta",
      }}
      styles={{
        // Di default "Salta"/"Indietro" sono testo puro (stesso colore del corpo, nessun bordo):
        // non si leggono come bottoni cliccabili. Solo "Salta" ne ha bisogno qui - è l'azione che
        // chiude l'intero tour, va distinta a colpo d'occhio da "Indietro" (che resta testuale).
        buttonSkip: {
          border: isDark ? "1px solid #475569" : "1px solid #cbd5e1",
          backgroundColor: "transparent",
        },
        // Vuoto di default nella libreria: senza queste righe non viene disegnato NESSUN contorno
        // attorno al buco dell'overlay, l'elemento evidenziato si distingue dal resto solo perché
        // non è oscurato - poco evidente. Contorno pieno + bagliore nel colore primario per farlo
        // risaltare a colpo d'occhio, non solo delimitarlo con una riga sottile.
        spotlight: {
          stroke: "#2563eb",
          strokeWidth: 3,
          filter: "drop-shadow(0 0 8px rgba(37, 99, 235, 0.9))",
        },
      }}
      options={{
        before: apriMenuPrimaDelloStep,
        zIndex: Z_INDEX_TOUR,
        buttons: ["back", "close", "primary", "skip"],
        showProgress: true,
        // Fisso: senza, la larghezza del tooltip varia con lo step (il primo, centrato su "body",
        // ha più spazio disponibile del previsto e va su una riga sola; quelli sui bottoni della
        // navbar si stringono) - con un valore fisso il testo va sempre a capo allo stesso modo.
        width: 400,
        // Senza, ogni step mostrerebbe prima un pallino pulsante da cliccare per aprire il
        // tooltip (comportamento pensato per un tour "a scoperta libera", non per uno che avanza
        // da solo in sequenza con continuous).
        skipBeacon: true,
        // Cliccare fuori dal riquadro non deve fare nulla (di default equivale a "Chiudi", che
        // avanza allo step successivo - facile da attivare per sbaglio).
        overlayClickAction: false,
        // La X in alto a destra chiude l'intero tour (come "Salta"), non solo lo step corrente.
        closeButtonAction: "skip",
        // Di default il buco nell'overlay lascia passare i click all'elemento reale sotto -
        // durante il tour "File" era davvero cliccabile e apriva il suo menu. Va solo illuminato,
        // non azionato.
        blockTargetInteraction: true,
        // Un po' più arrotondato del default (4): il buco segue meglio i bottoni della navbar,
        // che hanno già angoli smussati loro stessi (classe Tailwind "rounded"/"rounded-lg").
        spotlightRadius: 8,
        // Valore scelto a mano dall'utente dopo aver provato il default (10): NON toccare.
        spotlightPadding: 4,
        primaryColor: "#2563eb",
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        textColor: isDark ? "#e2e8f0" : "#0f172a",
        arrowColor: isDark ? "#0f172a" : "#ffffff",
        overlayColor: "rgba(0, 0, 0, 0.5)",
      }}
    />
  );
}
