import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AndamentoObiettiviChart } from "./AndamentoObiettiviChart";
import { elencaStoricoObiettivo, type PuntoStoricoObiettivo } from "../../lib/dailyGoal";

vi.mock("../../lib/dailyGoal", () => ({
  elencaStoricoObiettivo: vi.fn(),
}));
vi.mock("../../lib/errorLog", () => ({
  registraErroreNonBloccante: vi.fn(),
}));

function creaPunto(overrides: Partial<PuntoStoricoObiettivo> & { id: number }): PuntoStoricoObiettivo {
  return {
    validoDal: "2024-01-01",
    validoAl: null,
    ambito: "sempre",
    registratoIl: "2024-01-01T00:00:00.000Z",
    gruppo: "kcal",
    kcal: null,
    kcalMin: null,
    proteineG: null,
    carboidratiG: null,
    grassiG: null,
    fibreG: null,
    saleG: null,
    ...overrides,
  };
}

function sezione(titolo: string): HTMLElement {
  return screen.getByText(titolo).parentElement!;
}

describe("AndamentoObiettiviChart", () => {
  it("AndamentoObiettiviChart_caricamentoInCorso_mostraIlMessaggioDiAttesa", () => {
    vi.mocked(elencaStoricoObiettivo).mockReturnValue(new Promise(() => {}));

    render(<AndamentoObiettiviChart versione={0} />);

    expect(screen.getByText("Caricamento…")).toBeInTheDocument();
  });

  it("AndamentoObiettiviChart_nessunObiettivoImpostato_mostraIlMessaggioDedicato", async () => {
    vi.mocked(elencaStoricoObiettivo).mockResolvedValue([]);

    render(<AndamentoObiettiviChart versione={0} />);

    expect(await screen.findByText(/Nessun obiettivo impostato ancora/)).toBeInTheDocument();
  });

  it("AndamentoObiettiviChart_soloStoricoKcal_mostraSoloLaSezioneKcalConIlGrafico", async () => {
    vi.mocked(elencaStoricoObiettivo).mockResolvedValue([creaPunto({ id: 1, gruppo: "kcal", kcal: 2000 })]);

    render(<AndamentoObiettiviChart versione={0} />);
    await screen.findByText("Kcal");

    expect(within(sezione("Macronutrienti")).getByText(/Nessun limite impostato/)).toBeInTheDocument();
    expect(within(sezione("Altro")).getByText(/Nessun limite impostato/)).toBeInTheDocument();
  });

  it("AndamentoObiettiviChart_storicoMacroImpostato_nonMostraIlMessaggioDiCategoriaVuotaPerMacronutrienti", async () => {
    vi.mocked(elencaStoricoObiettivo).mockResolvedValue([
      creaPunto({ id: 1, gruppo: "macro", proteineG: 120 }),
    ]);

    render(<AndamentoObiettiviChart versione={0} />);
    await screen.findByText("Macronutrienti");

    expect(within(sezione("Macronutrienti")).queryByText(/Nessun limite impostato/)).not.toBeInTheDocument();
  });
});
