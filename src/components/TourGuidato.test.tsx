import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TourGuidato } from "./TourGuidato";

describe("TourGuidato", () => {
  it("TourGuidato_avviaRichiestaAZero_nonMostraAlcunTooltip", () => {
    render(<TourGuidato avviaRichiesta={0} onCompletato={vi.fn()} />);

    expect(screen.queryByText("Benvenuto in NutriBum")).not.toBeInTheDocument();
  });

  it("TourGuidato_avviaRichiestaMaggioreDiZero_mostraIlPrimoStep", async () => {
    render(<TourGuidato avviaRichiesta={1} onCompletato={vi.fn()} />);

    expect(await screen.findByText("Benvenuto in NutriBum")).toBeInTheDocument();
  });

  it("TourGuidato_clicSuSalta_chiamaOnCompletato", async () => {
    const onCompletato = vi.fn();
    const utente = userEvent.setup();
    render(<TourGuidato avviaRichiesta={1} onCompletato={onCompletato} />);
    await screen.findByText("Benvenuto in NutriBum");

    await utente.click(screen.getByRole("button", { name: "Salta" }));

    expect(onCompletato).toHaveBeenCalledTimes(1);
  });
});
