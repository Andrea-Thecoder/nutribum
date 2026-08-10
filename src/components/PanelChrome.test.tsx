import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PanelChrome } from "./PanelChrome";

function renderChrome(overrides: Partial<Parameters<typeof PanelChrome>[0]> = {}) {
  return render(
    <PanelChrome
      titolo="Calendario"
      ancorato={false}
      onToggleAncora={vi.fn()}
      onRimuovi={vi.fn()}
      onIniziaDrag={vi.fn()}
      onIniziaResize={vi.fn()}
      {...overrides}
    >
      <p>Contenuto</p>
    </PanelChrome>,
  );
}

describe("PanelChrome", () => {
  it("PanelChrome_nonAncorato_mostraQuattroManiglieDiResize", () => {
    renderChrome({ ancorato: false });

    expect(screen.getAllByTitle("Ridimensiona")).toHaveLength(4);
  });

  it("PanelChrome_ancorato_nonMostraLeManiglieDiResize", () => {
    renderChrome({ ancorato: true });

    expect(screen.queryByTitle("Ridimensiona")).not.toBeInTheDocument();
  });

  it("PanelChrome_mousedownSuUnaManigliaSudEst_chiamaOnIniziaResizeConQuellaDirezione", () => {
    const onIniziaResize = vi.fn();
    renderChrome({ onIniziaResize });

    fireEvent.mouseDown(screen.getAllByTitle("Ridimensiona")[3]);

    expect(onIniziaResize).toHaveBeenCalledWith(expect.anything(), "se");
  });

  it("PanelChrome_mousedownSullHeaderNonAncorato_chiamaOnIniziaDrag", () => {
    const onIniziaDrag = vi.fn();
    renderChrome({ onIniziaDrag });

    fireEvent.mouseDown(screen.getByText("Calendario"));

    expect(onIniziaDrag).toHaveBeenCalledTimes(1);
  });

  it("PanelChrome_mousedownSullHeaderAncorato_nonChiamaOnIniziaDrag", () => {
    const onIniziaDrag = vi.fn();
    renderChrome({ ancorato: true, onIniziaDrag });

    fireEvent.mouseDown(screen.getByText("Calendario"));

    expect(onIniziaDrag).not.toHaveBeenCalled();
  });

  it("PanelChrome_mousedownSulBottoneAncora_nonChiamaOnIniziaDrag", () => {
    const onIniziaDrag = vi.fn();
    renderChrome({ onIniziaDrag });

    fireEvent.mouseDown(screen.getByTitle(/Ancora pannello/));

    expect(onIniziaDrag).not.toHaveBeenCalled();
  });

  it("PanelChrome_clicSulBottoneAncora_chiamaOnToggleAncora", async () => {
    const onToggleAncora = vi.fn();
    const utente = userEvent.setup();
    renderChrome({ onToggleAncora });

    await utente.click(screen.getByTitle(/Ancora pannello/));

    expect(onToggleAncora).toHaveBeenCalledTimes(1);
  });

  it("PanelChrome_clicSulBottoneRimuovi_chiamaOnRimuovi", async () => {
    const onRimuovi = vi.fn();
    const utente = userEvent.setup();
    renderChrome({ onRimuovi });

    await utente.click(screen.getByTitle("Rimuovi pannello"));

    expect(onRimuovi).toHaveBeenCalledTimes(1);
  });

  it("PanelChrome_headerExtraFornito_vieneRenderizzatoNellHeader", () => {
    renderChrome({ headerExtra: <span>Extra</span> });

    expect(screen.getByText("Extra")).toBeInTheDocument();
  });
});
