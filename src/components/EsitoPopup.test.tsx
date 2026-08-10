import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { EsitoPopup } from "./EsitoPopup";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function avanzaDi(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("EsitoPopup", () => {
  it("EsitoPopup_renderizzato_mostraIlMessaggio", () => {
    render(<EsitoPopup tipo="successo" messaggio="Salvato correttamente" onChiudi={vi.fn()} />);

    expect(screen.getByText("Salvato correttamente")).toBeInTheDocument();
  });

  it("EsitoPopup_clicSulPopup_chiamaOnChiudiSubito", () => {
    const onChiudi = vi.fn();
    render(<EsitoPopup tipo="successo" messaggio="Salvato" onChiudi={onChiudi} />);

    fireEvent.click(screen.getByText("Salvato"));

    expect(onChiudi).toHaveBeenCalledTimes(1);
  });

  it("EsitoPopup_nessunClic_siChiudeDaSoloDopoSeiSecondi", async () => {
    const onChiudi = vi.fn();
    render(<EsitoPopup tipo="successo" messaggio="Salvato" onChiudi={onChiudi} />);

    await avanzaDi(6000);

    expect(onChiudi).toHaveBeenCalledTimes(1);
  });

  it("EsitoPopup_primaDeiSeiSecondi_nonSiChiudeAncora", async () => {
    const onChiudi = vi.fn();
    render(<EsitoPopup tipo="successo" messaggio="Salvato" onChiudi={onChiudi} />);

    await avanzaDi(5000);

    expect(onChiudi).not.toHaveBeenCalled();
  });

  it("EsitoPopup_messaggioCambiatoPrimaDellaScadenza_riavviaIlTimerDaCapo", async () => {
    const onChiudi = vi.fn();
    const { rerender } = render(<EsitoPopup tipo="successo" messaggio="Primo" onChiudi={onChiudi} />);
    await avanzaDi(5000);

    rerender(<EsitoPopup tipo="successo" messaggio="Secondo" onChiudi={onChiudi} />);
    await avanzaDi(5000);

    expect(onChiudi).not.toHaveBeenCalled();
  });
});
