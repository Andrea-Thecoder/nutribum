import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TooltipVeloce } from "./TooltipVeloce";

// onMouseEnter/onMouseLeave sono impostati sul div wrapper (quello con la ref), non sullo span
// figlio: mouseenter/mouseleave nativi non fanno bubbling, quindi l'evento va sparato sul div
// stesso, non sul testo al suo interno, altrimenti il gestore non scatta mai.
function trigger(): HTMLElement {
  return screen.getByText("Trigger").parentElement!;
}

// act() è necessario perché il setTimeout scatta fuori dal ciclo di eventi di React: senza,
// l'aggiornamento di stato dentro il callback non viene flushato nel DOM prima dell'assert.
async function avanzaOltreIlRitardo(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(150);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TooltipVeloce", () => {
  it("TooltipVeloce_mouseEnterAppenaAvvenuto_nonMostraAncoraIlTooltip", () => {
    render(
      <TooltipVeloce contenuto="Info extra">
        <span>Trigger</span>
      </TooltipVeloce>,
    );

    fireEvent.mouseEnter(trigger());

    expect(screen.queryByText("Info extra")).not.toBeInTheDocument();
  });

  it("TooltipVeloce_mouseEnterDopoIlRitardo_mostraIlContenuto", async () => {
    render(
      <TooltipVeloce contenuto="Info extra">
        <span>Trigger</span>
      </TooltipVeloce>,
    );

    fireEvent.mouseEnter(trigger());
    await avanzaOltreIlRitardo();

    expect(screen.getByText("Info extra")).toBeInTheDocument();
  });

  it("TooltipVeloce_mouseLeavePrimaDelRitardo_nonMostraPiuIlTooltipAncheDopo", async () => {
    render(
      <TooltipVeloce contenuto="Info extra">
        <span>Trigger</span>
      </TooltipVeloce>,
    );

    fireEvent.mouseEnter(trigger());
    fireEvent.mouseLeave(trigger());
    await avanzaOltreIlRitardo();

    expect(screen.queryByText("Info extra")).not.toBeInTheDocument();
  });

  it("TooltipVeloce_mouseLeaveDopoMostrato_nascondeIlTooltip", async () => {
    render(
      <TooltipVeloce contenuto="Info extra">
        <span>Trigger</span>
      </TooltipVeloce>,
    );
    fireEvent.mouseEnter(trigger());
    await avanzaOltreIlRitardo();

    fireEvent.mouseLeave(trigger());

    expect(screen.queryByText("Info extra")).not.toBeInTheDocument();
  });

  it("TooltipVeloce_smontaggioConTimeoutInAttesa_nonLanciaErrori", async () => {
    const { unmount } = render(
      <TooltipVeloce contenuto="Info extra">
        <span>Trigger</span>
      </TooltipVeloce>,
    );
    fireEvent.mouseEnter(trigger());
    unmount();

    await expect(vi.advanceTimersByTimeAsync(150)).resolves.not.toThrow();
  });
});
