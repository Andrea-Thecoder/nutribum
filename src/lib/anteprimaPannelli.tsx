import { useState, type ReactNode } from "react";
import type { TipoPannello } from "./layoutSchema";
import { CalendarioPanel } from "../components/panels/CalendarioPanel";
import { KcalGiornoChart } from "../components/panels/KcalGiornoChart";
import { MacroGiornoChart } from "../components/panels/MacroGiornoChart";
import { FibreSaleChart } from "../components/panels/FibreSaleChart";
import { TopAlimentiChart } from "../components/panels/TopAlimentiChart";
import { TopAlimentiFrequenzaChart } from "../components/panels/TopAlimentiFrequenzaChart";
import { DettaglioGiornoPanel } from "../components/panels/DettaglioGiornoPanel";
import { RegistraPastoPanel } from "../components/panels/RegistraPastoPanel";
import { LibroAlimentiPanel } from "../components/panels/LibroAlimentiPanel";
import { AndamentoObiettiviChart } from "../components/panels/AndamentoObiettiviChart";
import { ProgressoObiettiviChart } from "../components/panels/ProgressoObiettiviChart";
import { ConfrontoPeriodiChart, SelettoreVistaConfronto, type VistaConfronto } from "../components/panels/ConfrontoPeriodiChart";
import { PesoPanel } from "../components/panels/PesoPanel";
import { AndamentoTDEEChart } from "../components/panels/AndamentoTDEEChart";
import { CorrelazionePesoSforamentiChart } from "../components/panels/CorrelazionePesoSforamentiChart";
import { GestioneRicettePanel } from "../components/panels/GestioneRicettePanel";
import { TourAnteprimaPannello } from "../components/TourAnteprimaPannello";
import {
  stepsCalendario,
  stepsDettaglioGiorno,
  stepsKcalGiorno,
  stepsMacroGiorno,
  stepsFibreSale,
  stepsTopAlimenti,
  stepsTopAlimentiFrequenza,
  stepsAndamentoObiettivi,
  stepsProgressoObiettivi,
  stepsAndamentoTDEE,
  stepsCorrelazionePesoSforamenti,
  stepsPesoCorporeo,
  stepsConfrontoPeriodi,
  stepsRegistraPasto,
  stepsLibroAlimenti,
  stepsGestioneRicette,
  DATA_TOUR_CELLE_CALENDARIO,
} from "./tourAnteprimaContenuti";
import {
  GIORNI_DIMOSTRATIVI,
  GIORNI_ESEMPIO_CALENDARIO,
  PESO_DIMOSTRATIVO,
  OBIETTIVO_PESO_DIMOSTRATIVO_KG,
  STORICO_OBIETTIVO_PESO_DIMOSTRATIVO,
  STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO,
  STORICO_PROFILO_DIMOSTRATIVO,
  STORICO_FITNESS_DIMOSTRATIVO,
  ALIMENTI_DIMOSTRATIVI,
  RICETTE_DIMOSTRATIVE,
} from "./datiDimostrativi";

const NON_FARE_NIENTE = () => {};

// Data -> data-tour, costruita dalla stessa fonte di verità del mini-tour (DATA_TOUR_CELLE_CALENDARIO
// in TourAnteprimaCalendario.tsx): ogni chiave di GIORNI_ESEMPIO_CALENDARIO diventa l'attributo
// data-tour della cella con quella data.
const DATA_TOUR_PER_DATA_CALENDARIO: Record<string, string> = Object.fromEntries(
  (Object.keys(GIORNI_ESEMPIO_CALENDARIO) as Array<keyof typeof GIORNI_ESEMPIO_CALENDARIO>).map((chiave) => [
    GIORNI_ESEMPIO_CALENDARIO[chiave],
    DATA_TOUR_CELLE_CALENDARIO[chiave],
  ]),
);

// Lo stesso giorno "kcal sforato" del Calendario (2500 contro un limite di 2200, vedi
// datiDimostrativi.ts): numeri già citati nel tour del Calendario, coerenza tra le due schede
// invece di un altro giorno scelto a caso dal dataset generato.
const GIORNO_DETTAGLIO_DIMOSTRATIVO = GIORNI_ESEMPIO_CALENDARIO.kcalSforato;

// Il toggle grafico/tabella vive nell'header del pannello in produzione (vedi headerExtraPannello
// in App.tsx), non dentro il pannello stesso - qui nella modale "?" non c'è nessun header attorno,
// quindi lo si renderizza esplicitamente sopra al grafico, con uno stato locale minimo solo per
// farlo funzionare davvero (non è "vero" stato dell'app, sparisce alla chiusura della modale).
function AnteprimaPesoCorporeo({ onChiudiModale }: { onChiudiModale: () => void }) {
  const [vista, setVista] = useState<VistaConfronto>("grafico");
  return (
    <div id="anteprima-tour-root" className="flex h-full flex-col gap-2">
      <TourAnteprimaPannello steps={stepsPesoCorporeo} onCompletato={onChiudiModale} />
      <SelettoreVistaConfronto vista={vista} onChange={setVista} />
      <div className="min-h-0 flex-1 overflow-auto">
        <PesoPanel
          peso={PESO_DIMOSTRATIVO}
          obiettivoKg={OBIETTIVO_PESO_DIMOSTRATIVO_KG}
          storicoObiettivo={STORICO_OBIETTIVO_PESO_DIMOSTRATIVO}
          vista={vista}
          focusGiorno={null}
          margineKg={5}
        />
      </div>
    </div>
  );
}

function AnteprimaConfrontoPeriodi({ onChiudiModale }: { onChiudiModale: () => void }) {
  const [vista, setVista] = useState<VistaConfronto>("grafico");
  return (
    <div id="anteprima-tour-root" className="flex h-full flex-col gap-2">
      <TourAnteprimaPannello steps={stepsConfrontoPeriodi} onCompletato={onChiudiModale} />
      <SelettoreVistaConfronto vista={vista} onChange={setVista} />
      <div className="min-h-0 flex-1 overflow-auto">
        <ConfrontoPeriodiChart giorni={GIORNI_DIMOSTRATIVI} peso={PESO_DIMOSTRATIVO} vista={vista} />
      </div>
    </div>
  );
}

// Renderizza il componente REALE di ciascuna scheda alimentato dal dataset finto in
// datiDimostrativi.ts - MAI dati reali dell'utente. I 3 tipi che scrivono davvero sul database
// (registra-pasto, libro-alimenti, gestione-ricette) passano `anteprima` per neutralizzare
// salvataggi/eliminazioni (vedi il prop nei rispettivi componenti); i pannelli che leggono lo
// storico obiettivi internamente invece di riceverlo via prop (calendario, dettaglio-giorno,
// andamento-obiettivi, progresso-obiettivi) usano il rispettivo `*Override` per lo stesso motivo.
//
// onChiudiModale: chiamato dal mini-tour di ogni scheda a fine/salta/X (vedi TourAnteprimaPannello)
// per chiudere anche la modale "?" che lo contiene, non solo il tour.
export function anteprimaPannello(tipo: TipoPannello, onChiudiModale?: () => void): ReactNode {
  const chiudi = onChiudiModale ?? NON_FARE_NIENTE;
  switch (tipo) {
    case "calendario":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col gap-2">
          <TourAnteprimaPannello steps={stepsCalendario} onCompletato={chiudi} />
          <div className="min-h-0 flex-1">
            <CalendarioPanel
              giorni={GIORNI_DIMOSTRATIVI}
              onApriGiorno={NON_FARE_NIENTE}
              versioneObiettivi={0}
              peso={PESO_DIMOSTRATIVO}
              storicoProfilo={STORICO_PROFILO_DIMOSTRATIVO}
              storicoFitness={STORICO_FITNESS_DIMOSTRATIVO}
              storicoObiettiviOverride={STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO}
              interattivo={false}
              dataTourPerData={DATA_TOUR_PER_DATA_CALENDARIO}
            />
          </div>
          {/* Sempre visibile, non solo al passaggio del mouse come il tooltip nativo di ogni
              cella: in una demo nessuno sa già che passarci sopra spiega qualcosa. */}
          <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 border-t border-slate-200 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>🔥 kcal superate</span>
            <span>💪 macronutrienti superati</span>
            <span>🧂 fibre/sale superati</span>
            <span>⚠️ sotto il minimo di kcal</span>
            <span>🆘 molto sotto il minimo</span>
          </div>
        </div>
      );
    case "kcal-giorno":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col">
          <TourAnteprimaPannello steps={stepsKcalGiorno} onCompletato={chiudi} />
          <div className="min-h-0 flex-1">
            <KcalGiornoChart
              giorni={GIORNI_DIMOSTRATIVI}
              focusGiorno={null}
              storicoObiettivi={STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO}
              peso={PESO_DIMOSTRATIVO}
              storicoProfilo={STORICO_PROFILO_DIMOSTRATIVO}
              storicoFitness={STORICO_FITNESS_DIMOSTRATIVO}
            />
          </div>
        </div>
      );
    case "macro-giorno":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col">
          <TourAnteprimaPannello steps={stepsMacroGiorno} onCompletato={chiudi} />
          <div className="min-h-0 flex-1">
            <MacroGiornoChart
              giorni={GIORNI_DIMOSTRATIVI}
              focusGiorno={null}
              storicoObiettivi={STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO}
            />
          </div>
        </div>
      );
    case "fibre-sale-giorno":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col">
          <TourAnteprimaPannello steps={stepsFibreSale} onCompletato={chiudi} />
          <div className="min-h-0 flex-1">
            <FibreSaleChart
              giorni={GIORNI_DIMOSTRATIVI}
              focusGiorno={null}
              storicoObiettivi={STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO}
            />
          </div>
        </div>
      );
    case "top-alimenti":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col">
          <TourAnteprimaPannello steps={stepsTopAlimenti} onCompletato={chiudi} />
          <div className="min-h-0 flex-1">
            <TopAlimentiChart giorni={GIORNI_DIMOSTRATIVI} focusGiorno={null} />
          </div>
        </div>
      );
    case "top-alimenti-frequenza":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col">
          <TourAnteprimaPannello steps={stepsTopAlimentiFrequenza} onCompletato={chiudi} />
          <div className="min-h-0 flex-1">
            <TopAlimentiFrequenzaChart giorni={GIORNI_DIMOSTRATIVI} focusGiorno={null} />
          </div>
        </div>
      );
    case "dettaglio-giorno":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col gap-2">
          <TourAnteprimaPannello steps={stepsDettaglioGiorno} onCompletato={chiudi} />
          <div className="min-h-0 flex-1 overflow-auto">
            <DettaglioGiornoPanel
              giorni={GIORNI_DIMOSTRATIVI}
              data={GIORNO_DETTAGLIO_DIMOSTRATIVO}
              onElimina={NON_FARE_NIENTE}
              versioneObiettivi={0}
              peso={PESO_DIMOSTRATIVO}
              storicoProfilo={STORICO_PROFILO_DIMOSTRATIVO}
              storicoFitness={STORICO_FITNESS_DIMOSTRATIVO}
              storicoObiettiviOverride={STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO}
              anteprima
            />
          </div>
        </div>
      );
    case "registra-pasto":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col gap-2">
          <TourAnteprimaPannello steps={stepsRegistraPasto} onCompletato={chiudi} />
          <div className="min-h-0 flex-1 overflow-auto">
            <RegistraPastoPanel
              alimenti={ALIMENTI_DIMOSTRATIVI}
              ricette={RICETTE_DIMOSTRATIVE}
              onSalvato={NON_FARE_NIENTE}
              anteprima
            />
          </div>
        </div>
      );
    case "gestione-ricette":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col gap-2">
          <TourAnteprimaPannello steps={stepsGestioneRicette} onCompletato={chiudi} />
          <div className="min-h-0 flex-1 overflow-auto">
            <GestioneRicettePanel
              ricette={RICETTE_DIMOSTRATIVE}
              alimenti={ALIMENTI_DIMOSTRATIVI}
              onCambiato={NON_FARE_NIENTE}
              anteprima
            />
          </div>
        </div>
      );
    case "libro-alimenti":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col gap-2">
          <TourAnteprimaPannello steps={stepsLibroAlimenti} onCompletato={chiudi} />
          <div className="min-h-0 flex-1 overflow-auto">
            <LibroAlimentiPanel alimenti={ALIMENTI_DIMOSTRATIVI} onCambiato={NON_FARE_NIENTE} anteprima />
          </div>
        </div>
      );
    case "andamento-obiettivi":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col">
          <TourAnteprimaPannello steps={stepsAndamentoObiettivi} onCompletato={chiudi} />
          <div className="min-h-0 flex-1">
            <AndamentoObiettiviChart versione={0} storicoOverride={STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO} />
          </div>
        </div>
      );
    case "progresso-obiettivi":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col">
          <TourAnteprimaPannello steps={stepsProgressoObiettivi} onCompletato={chiudi} />
          <div className="min-h-0 flex-1">
            <ProgressoObiettiviChart
              giorni={GIORNI_DIMOSTRATIVI}
              versioneObiettivi={0}
              focusGiorno={null}
              peso={PESO_DIMOSTRATIVO}
              storicoProfilo={STORICO_PROFILO_DIMOSTRATIVO}
              storicoFitness={STORICO_FITNESS_DIMOSTRATIVO}
              storicoObiettiviOverride={STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO}
            />
          </div>
        </div>
      );
    case "confronto-periodi":
      return <AnteprimaConfrontoPeriodi onChiudiModale={chiudi} />;
    case "peso-corporeo":
      return <AnteprimaPesoCorporeo onChiudiModale={chiudi} />;
    case "andamento-tdee":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col">
          <TourAnteprimaPannello steps={stepsAndamentoTDEE} onCompletato={chiudi} />
          <div className="min-h-0 flex-1">
            <AndamentoTDEEChart
              peso={PESO_DIMOSTRATIVO}
              storicoProfilo={STORICO_PROFILO_DIMOSTRATIVO}
              storicoFitness={STORICO_FITNESS_DIMOSTRATIVO}
            />
          </div>
        </div>
      );
    case "correlazione-peso-sforamenti":
      return (
        <div id="anteprima-tour-root" className="flex h-full flex-col overflow-auto">
          <TourAnteprimaPannello steps={stepsCorrelazionePesoSforamenti} onCompletato={chiudi} />
          <CorrelazionePesoSforamentiChart
            giorni={GIORNI_DIMOSTRATIVI}
            peso={PESO_DIMOSTRATIVO}
            storicoObiettivi={STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO}
            storicoProfilo={STORICO_PROFILO_DIMOSTRATIVO}
            storicoFitness={STORICO_FITNESS_DIMOSTRATIVO}
          />
        </div>
      );
  }
}
