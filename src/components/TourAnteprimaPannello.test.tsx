import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TourAnteprimaPannello, scopedAllaDemo } from "./TourAnteprimaPannello";
import type { Step } from "react-joyride";

// Almeno 2 step: su un tour di un solo step (contemporaneamente primo e ultimo) react-joyride non
// mostra il bottone "Salta" - inutile saltare l'unico step rimasto - scenario diverso da qualunque
// uso reale (ogni scheda ha sempre più step).
const STEP_DI_TEST: Step[] = [
  { target: "body", placement: "center", title: "Titolo di prova", content: "Contenuto di prova" },
  { target: "body", placement: "center", title: "Secondo step", content: "Altro contenuto" },
];

describe("TourAnteprimaPannello", () => {
  it("TourAnteprimaPannello_montato_mostraIlPrimoStepRicevuto", async () => {
    render(<TourAnteprimaPannello steps={STEP_DI_TEST} onCompletato={vi.fn()} />);

    expect(await screen.findByText("Titolo di prova")).toBeInTheDocument();
  });

  it("TourAnteprimaPannello_clicSuSalta_chiamaOnCompletato", async () => {
    const onCompletato = vi.fn();
    const utente = userEvent.setup();
    render(<TourAnteprimaPannello steps={STEP_DI_TEST} onCompletato={onCompletato} />);
    await screen.findByText("Titolo di prova");

    await utente.click(screen.getByRole("button", { name: "Salta" }));

    expect(onCompletato).toHaveBeenCalledTimes(1);
  });
});

// Bug reale osservato in produzione: la scheda vera resta montata in dashboard, con dati reali,
// mentre la demo è aperta nella modale "?" - stesso data-tour in entrambe (es.
// "legenda-Kcal consumate"). Un selettore CSS globale trova la prima nel DOM (la scheda vera,
// posizione qualunque nella pagina) invece di quella dentro la modale: lo spotlight del tour
// finiva su un punto a caso della dashboard. scopedAllaDemo() deve restringere la ricerca al
// contenitore #anteprima-tour-root della demo.
describe("scopedAllaDemo", () => {
  it("scopedAllaDemo_stessoDataTourFuoriEDentroIlContenitoreDemo_risolveSoloQuelloDentro", () => {
    document.body.innerHTML = `
      <div data-tour="legenda-Kcal consumate" id="fuori">scheda reale in dashboard</div>
      <div id="anteprima-tour-root">
        <div data-tour="legenda-Kcal consumate" id="dentro">demo nella modale</div>
      </div>
    `;
    const steps: Step[] = [{ target: '[data-tour="legenda-Kcal consumate"]', content: "..." }];

    const [step] = scopedAllaDemo(steps);
    const risolto = typeof step.target === "function" ? step.target() : null;

    expect(risolto).toBe(document.getElementById("dentro"));
  });

  it("scopedAllaDemo_targetBody_nonVieneRiscritto", () => {
    const steps: Step[] = [{ target: "body", placement: "center", content: "..." }];

    const [step] = scopedAllaDemo(steps);

    expect(step.target).toBe("body");
  });
});
