import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AzioniAlimentoModal } from "./AzioniAlimentoModal";
import type { AlimentoCatalogo } from "../lib/food";

const ALIMENTO: AlimentoCatalogo = {
  id: 1,
  nome: "Pasta",
  unita: "g",
  kcal_100: 350,
  proteine_100: 12,
  carboidrati_100: 70,
  grassi_100: 2,
  zuccheri_100: null,
  grassi_saturi_100: null,
  fibre_100: null,
  sale_100: null,
  da_etichetta: false,
};

describe("AzioniAlimentoModal", () => {
  it("AzioniAlimentoModal_renderizzato_mostraIlNomeDellAlimento", () => {
    render(<AzioniAlimentoModal alimento={ALIMENTO} onChiudi={vi.fn()} onModifica={vi.fn()} onElimina={vi.fn()} />);

    expect(screen.getByText("Pasta")).toBeInTheDocument();
  });

  it("AzioniAlimentoModal_clicSuModifica_chiamaOnModifica", async () => {
    const onModifica = vi.fn();
    const utente = userEvent.setup();
    render(<AzioniAlimentoModal alimento={ALIMENTO} onChiudi={vi.fn()} onModifica={onModifica} onElimina={vi.fn()} />);

    await utente.click(screen.getByText("Modifica"));

    expect(onModifica).toHaveBeenCalledTimes(1);
  });

  it("AzioniAlimentoModal_clicSuElimina_chiamaOnElimina", async () => {
    const onElimina = vi.fn();
    const utente = userEvent.setup();
    render(<AzioniAlimentoModal alimento={ALIMENTO} onChiudi={vi.fn()} onModifica={vi.fn()} onElimina={onElimina} />);

    await utente.click(screen.getByText("Elimina"));

    expect(onElimina).toHaveBeenCalledTimes(1);
  });

  it("AzioniAlimentoModal_clicSuAnnullaOSfondo_chiamaOnChiudi", async () => {
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(<AzioniAlimentoModal alimento={ALIMENTO} onChiudi={onChiudi} onModifica={vi.fn()} onElimina={vi.fn()} />);

    await utente.click(screen.getByText("Annulla"));

    expect(onChiudi).toHaveBeenCalledTimes(1);
  });
});
