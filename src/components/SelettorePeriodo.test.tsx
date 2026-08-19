import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelettorePeriodo } from "./SelettorePeriodo";

describe("SelettorePeriodo", () => {
  it("SelettorePeriodo_nessunaOpzioneSpecificata_mostraTuttiIQuattroPeriodi", () => {
    render(<SelettorePeriodo periodo="mese" onChange={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("SelettorePeriodo_opzioniLimitate_mostraSoloQuelleIndicate", () => {
    render(<SelettorePeriodo periodo="mese" onChange={vi.fn()} opzioni={["mese", "anno"]} />);

    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Mese", "Anno"]);
  });

  it("SelettorePeriodo_clicSuUnaOpzione_chiamaOnChangeConIlSuoValore", async () => {
    const onChange = vi.fn();
    const utente = userEvent.setup();
    render(<SelettorePeriodo periodo="mese" onChange={onChange} />);

    await utente.click(screen.getByText("Settimana"));

    expect(onChange).toHaveBeenCalledWith("settimana");
  });

  it("SelettorePeriodo_periodoAttivo_vieneEvidenziatoRispettoAgliAltri", () => {
    render(<SelettorePeriodo periodo="anno" onChange={vi.fn()} />);

    expect(screen.getByText("Anno").className).toContain("bg-blue-600");
    expect(screen.getByText("Mese").className).not.toContain("bg-blue-600");
  });

  it("SelettorePeriodo_renderizzato_haLAncoraDataTourPerIMiniTourDelleAnteprime", () => {
    render(<SelettorePeriodo periodo="mese" onChange={vi.fn()} />);

    expect(document.querySelector('[data-tour="selettore-periodo"]')).toBeInTheDocument();
  });
});
