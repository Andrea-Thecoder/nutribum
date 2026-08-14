import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TourGuidato } from "./TourGuidato";

describe("TourGuidato", () => {
  it("TourGuidato_avviaRichiestaAZero_nonMostraAlcunTooltip", () => {
    render(<TourGuidato avviaRichiesta={0} onCompletato={vi.fn()} onApriMenu={vi.fn()} />);

    expect(screen.queryByText("Benvenuto in NutriBum")).not.toBeInTheDocument();
  });

  it("TourGuidato_avviaRichiestaMaggioreDiZero_mostraIlPrimoStep", async () => {
    render(<TourGuidato avviaRichiesta={1} onCompletato={vi.fn()} onApriMenu={vi.fn()} />);

    expect(await screen.findByText("Benvenuto in NutriBum")).toBeInTheDocument();
  });

  it("TourGuidato_clicSuSalta_chiamaOnCompletato", async () => {
    const onCompletato = vi.fn();
    const utente = userEvent.setup();
    render(<TourGuidato avviaRichiesta={1} onCompletato={onCompletato} onApriMenu={vi.fn()} />);
    await screen.findByText("Benvenuto in NutriBum");

    await utente.click(screen.getByRole("button", { name: "Salta" }));

    expect(onCompletato).toHaveBeenCalledTimes(1);
  });

  it("TourGuidato_clicSuSalta_chiamaOnApriMenuConNull", async () => {
    const onApriMenu = vi.fn();
    const utente = userEvent.setup();
    render(<TourGuidato avviaRichiesta={1} onCompletato={vi.fn()} onApriMenu={onApriMenu} />);
    await screen.findByText("Benvenuto in NutriBum");

    await utente.click(screen.getByRole("button", { name: "Salta" }));

    expect(onApriMenu).toHaveBeenLastCalledWith(null);
  });

  it("TourGuidato_arrivoAlloStepImpostazioni_chiamaOnApriMenuConFile", async () => {
    const onApriMenu = vi.fn();
    const utente = userEvent.setup();
    render(
      <>
        {/* Target reali per gli step "File" e "Impostazioni" - senza, react-joyride farebbe
            polling per un secondo su un elemento inesistente prima di arrendersi. */}
        <button data-tour="navbar-file">StubFile</button>
        <button data-tour="file-impostazioni">StubImpostazioni</button>
        <TourGuidato avviaRichiesta={1} onCompletato={vi.fn()} onApriMenu={onApriMenu} />
      </>,
    );
    await screen.findByText("Benvenuto in NutriBum");
    await utente.click(screen.getByRole("button", { name: /Prosegui/ }));
    await screen.findByText("File");

    await utente.click(screen.getByRole("button", { name: /Prosegui/ }));
    await screen.findByText("Impostazioni");

    expect(onApriMenu).toHaveBeenLastCalledWith("file");
  });
});
