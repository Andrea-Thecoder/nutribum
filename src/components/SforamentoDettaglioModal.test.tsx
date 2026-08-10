import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SforamentoDettaglioModal } from "./SforamentoDettaglioModal";
import type { DettaglioGiornoSforato } from "../lib/dailyGoal";

describe("SforamentoDettaglioModal", () => {
  it("SforamentoDettaglioModal_nessunDettaglio_mostraIlMessaggioDiElencoVuoto", () => {
    render(<SforamentoDettaglioModal titolo="Sforamenti" dettagli={[]} onChiudi={vi.fn()} onApriGiorno={vi.fn()} />);

    expect(screen.getByText("Nessun giorno da mostrare.")).toBeInTheDocument();
  });

  it("SforamentoDettaglioModal_giornoConSforamenti_mostraEtichettaValoreELimite", () => {
    const dettagli: DettaglioGiornoSforato[] = [
      { data: "2024-03-15", sforamenti: [{ etichetta: "Kcal (limite)", valore: 2500, limite: 2000 }] },
    ];

    render(
      <SforamentoDettaglioModal titolo="Sforamenti" dettagli={dettagli} onChiudi={vi.fn()} onApriGiorno={vi.fn()} />,
    );

    expect(screen.getByText("Kcal (limite)")).toBeInTheDocument();
    expect(screen.getByText("2500 / 2000")).toBeInTheDocument();
  });

  it("SforamentoDettaglioModal_clicSuUnGiorno_chiamaOnApriGiornoConQuellaData", async () => {
    const onApriGiorno = vi.fn();
    const utente = userEvent.setup();
    const dettagli: DettaglioGiornoSforato[] = [
      { data: "2024-03-15", sforamenti: [{ etichetta: "Kcal (limite)", valore: 2500, limite: 2000 }] },
    ];
    render(
      <SforamentoDettaglioModal
        titolo="Sforamenti"
        dettagli={dettagli}
        onChiudi={vi.fn()}
        onApriGiorno={onApriGiorno}
      />,
    );

    await utente.click(screen.getByText(/marzo/));

    expect(onApriGiorno).toHaveBeenCalledWith("2024-03-15");
  });

  it("SforamentoDettaglioModal_clicSuChiudi_chiamaOnChiudi", async () => {
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(<SforamentoDettaglioModal titolo="Sforamenti" dettagli={[]} onChiudi={onChiudi} onApriGiorno={vi.fn()} />);

    await utente.click(screen.getByText("✕"));

    expect(onChiudi).toHaveBeenCalledTimes(1);
  });
});
