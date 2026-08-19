import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { Step } from "react-joyride";
import { anteprimaPannello } from "./anteprimaPannelli";
import { elencaStoricoObiettivo } from "./dailyGoal";
import type { TipoPannello } from "./layoutSchema";
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
} from "./tourAnteprimaContenuti";

// Difensivo: ogni pannello che normalmente leggerebbe questi dati dal DB reale riceve qui un
// override dal dataset finto (vedi anteprimaPannelli.tsx), quindi queste funzioni non dovrebbero
// MAI essere chiamate durante il render - il mock serve a farlo esplodere subito se un futuro
// pannello aggiunto dimenticasse di passare il proprio override.
vi.mock("./dailyGoal", async (importaOriginale) => {
  const originale = await importaOriginale<typeof import("./dailyGoal")>();
  return { ...originale, elencaStoricoObiettivo: vi.fn() };
});
vi.mock("./food", async (importaOriginale) => {
  const originale = await importaOriginale<typeof import("./food")>();
  return { ...originale, eliminaAlimento: vi.fn(), creaAlimento: vi.fn(), aggiornaAlimento: vi.fn() };
});
vi.mock("./recipes", async (importaOriginale) => {
  const originale = await importaOriginale<typeof import("./recipes")>();
  return { ...originale, eliminaRicetta: vi.fn(), creaRicetta: vi.fn(), aggiornaRicetta: vi.fn() };
});
vi.mock("./errorLog", () => ({
  registraErroreNonBloccante: vi.fn(),
}));

const TUTTI_I_TIPI: TipoPannello[] = [
  "calendario",
  "kcal-giorno",
  "macro-giorno",
  "fibre-sale-giorno",
  "top-alimenti",
  "top-alimenti-frequenza",
  "dettaglio-giorno",
  "registra-pasto",
  "libro-alimenti",
  "andamento-obiettivi",
  "progresso-obiettivi",
  "confronto-periodi",
  "peso-corporeo",
  "andamento-tdee",
  "correlazione-peso-sforamenti",
  "gestione-ricette",
];

// Stessa mappa tipo -> step usata dentro anteprimaPannello() per montare il mini-tour: duplicata
// qui apposta, non importata da lì, perché il punto di questo test è verificare dal di fuori che
// ogni target dichiarato nello step esista davvero nel DOM renderizzato - un refuso nella stringa
// del selettore (es. "legenda-Kcal consumato" invece di "consumate") non farebbe fallire il
// render (Joyride non trova il target e aspetta/salta in silenzio), quindi va controllato a parte.
const STEP_PER_TIPO: Record<TipoPannello, Step[]> = {
  calendario: stepsCalendario,
  "kcal-giorno": stepsKcalGiorno,
  "macro-giorno": stepsMacroGiorno,
  "fibre-sale-giorno": stepsFibreSale,
  "top-alimenti": stepsTopAlimenti,
  "top-alimenti-frequenza": stepsTopAlimentiFrequenza,
  "dettaglio-giorno": stepsDettaglioGiorno,
  "registra-pasto": stepsRegistraPasto,
  "libro-alimenti": stepsLibroAlimenti,
  "andamento-obiettivi": stepsAndamentoObiettivi,
  "progresso-obiettivi": stepsProgressoObiettivi,
  "confronto-periodi": stepsConfrontoPeriodi,
  "peso-corporeo": stepsPesoCorporeo,
  "andamento-tdee": stepsAndamentoTDEE,
  "correlazione-peso-sforamenti": stepsCorrelazionePesoSforamenti,
  "gestione-ricette": stepsGestioneRicette,
};

// Verificato scrivendo il DOM renderizzato su file durante il debug di questo test: Recharts non
// disegna nulla dentro <ResponsiveContainer> in jsdom (nessun vero motore di layout, width/height
// calcolati restano 0) - la legenda custom (LegendaManuale, dentro <Legend content={...}/>) non fa
// eccezione. Nessun test esistente nel progetto interroga contenuto dentro un grafico Recharts per
// lo stesso motivo (vedi es. KcalGiornoChart.test.tsx): stessa convenzione qui, non un bug.
function selettoriDataTour(steps: Step[]): string[] {
  return steps
    .map((s) => (typeof s.target === "string" ? s.target : null))
    .filter((t): t is string => t !== null && t.startsWith('[data-tour="') && !t.startsWith('[data-tour="legenda-'));
}

describe("anteprimaPannello", () => {
  it.each(TUTTI_I_TIPI)("anteprimaPannello_tipo_%s_siMontaSenzaErroriENonLeggeLoStoricoObiettiviReale", (tipo) => {
    const { container } = render(<>{anteprimaPannello(tipo)}</>);

    expect(container).not.toBeEmptyDOMElement();
    expect(elencaStoricoObiettivo).not.toHaveBeenCalled();
  });

  it.each(TUTTI_I_TIPI)("anteprimaPannello_tipo_%s_ogniTargetDichiaratoNelTourEsisteDavveroNelDom", (tipo) => {
    render(<>{anteprimaPannello(tipo)}</>);

    for (const selettore of selettoriDataTour(STEP_PER_TIPO[tipo])) {
      expect(document.querySelector(selettore), `target mancante: ${selettore} (scheda "${tipo}")`).not.toBeNull();
    }
  });
});
