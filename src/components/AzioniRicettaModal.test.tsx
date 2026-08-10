import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AzioniRicettaModal } from "./AzioniRicettaModal";
import type { RicettaConIngredienti } from "../lib/recipes";

const RICETTA: RicettaConIngredienti = {
  id: 1,
  nome: "Pasta al pomodoro",
  ingredienti: [],
};

function renderModal(overrides: Partial<Parameters<typeof AzioniRicettaModal>[0]> = {}) {
  return render(
    <AzioniRicettaModal
      ricetta={RICETTA}
      onChiudi={vi.fn()}
      onVisualizza={vi.fn()}
      onModifica={vi.fn()}
      onElimina={vi.fn()}
      {...overrides}
    />,
  );
}

describe("AzioniRicettaModal", () => {
  it("AzioniRicettaModal_renderizzato_mostraIlNomeDellaRicetta", () => {
    renderModal();

    expect(screen.getByText("Pasta al pomodoro")).toBeInTheDocument();
  });

  it("AzioniRicettaModal_clicSuVisualizza_chiamaOnVisualizza", async () => {
    const onVisualizza = vi.fn();
    const utente = userEvent.setup();
    renderModal({ onVisualizza });

    await utente.click(screen.getByText("Visualizza"));

    expect(onVisualizza).toHaveBeenCalledTimes(1);
  });

  it("AzioniRicettaModal_clicSuModifica_chiamaOnModifica", async () => {
    const onModifica = vi.fn();
    const utente = userEvent.setup();
    renderModal({ onModifica });

    await utente.click(screen.getByText("Modifica"));

    expect(onModifica).toHaveBeenCalledTimes(1);
  });

  it("AzioniRicettaModal_clicSuElimina_chiamaOnElimina", async () => {
    const onElimina = vi.fn();
    const utente = userEvent.setup();
    renderModal({ onElimina });

    await utente.click(screen.getByText("Elimina"));

    expect(onElimina).toHaveBeenCalledTimes(1);
  });

  it("AzioniRicettaModal_clicSuAnnulla_chiamaOnChiudi", async () => {
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    renderModal({ onChiudi });

    await utente.click(screen.getByText("Annulla"));

    expect(onChiudi).toHaveBeenCalledTimes(1);
  });
});
