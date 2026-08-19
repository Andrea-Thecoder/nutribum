import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InfoModal } from "./InfoModal";

describe("InfoModal", () => {
  it("InfoModal_renderizzato_mostraTitoloEContenuto", () => {
    render(
      <InfoModal titolo="Glossario" onChiudi={vi.fn()}>
        <p>Testo di aiuto</p>
      </InfoModal>,
    );

    expect(screen.getByText("Glossario")).toBeInTheDocument();
    expect(screen.getByText("Testo di aiuto")).toBeInTheDocument();
  });

  it("InfoModal_clicSulBottoneChiudi_chiamaOnChiudi", async () => {
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(
      <InfoModal titolo="Glossario" onChiudi={onChiudi}>
        <p>Testo</p>
      </InfoModal>,
    );

    await utente.click(screen.getByText("✕"));

    expect(onChiudi).toHaveBeenCalledTimes(1);
  });

  it("InfoModal_clicSulloSfondo_chiamaOnChiudi", async () => {
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(
      <InfoModal titolo="Glossario" onChiudi={onChiudi}>
        <p>Testo</p>
      </InfoModal>,
    );

    await utente.click(screen.getByText("Glossario").closest(".fixed")!);

    expect(onChiudi).toHaveBeenCalledTimes(1);
  });

  it("InfoModal_clicSulContenuto_nonChiamaOnChiudi", async () => {
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(
      <InfoModal titolo="Glossario" onChiudi={onChiudi}>
        <p>Testo</p>
      </InfoModal>,
    );

    await utente.click(screen.getByText("Testo"));

    expect(onChiudi).not.toHaveBeenCalled();
  });

  it("InfoModal_chiudiSuClickFuoriAFalse_clicSulloSfondoNonChiamaOnChiudi", async () => {
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(
      <InfoModal titolo="Glossario" onChiudi={onChiudi} chiudiSuClickFuori={false}>
        <p>Testo</p>
      </InfoModal>,
    );

    await utente.click(screen.getByText("Glossario").closest(".fixed")!);

    expect(onChiudi).not.toHaveBeenCalled();
  });
});
