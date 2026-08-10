import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressoObiettiviChart } from "./ProgressoObiettiviChart";
import { elencaStoricoObiettivo, type PuntoStoricoObiettivo } from "../../lib/dailyGoal";
import type { Alimento, GiornoStorico } from "../../lib/schema";

vi.mock("../../lib/dailyGoal", async (importaOriginale) => {
  const originale = await importaOriginale<typeof import("../../lib/dailyGoal")>();
  return { ...originale, elencaStoricoObiettivo: vi.fn() };
});
vi.mock("../../lib/errorLog", () => ({
  registraErroreNonBloccante: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(elencaStoricoObiettivo).mockResolvedValue([]);
});

function creaGiorno(data: string, kcal: number): GiornoStorico {
  const alimento: Alimento = { nome: "Cibo", quantita: 100, unita: "g", kcal, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 };
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [alimento] }] };
}

function creaLimiteKcal(kcal: number): PuntoStoricoObiettivo {
  return {
    id: 1,
    validoDal: "2000-01-01",
    validoAl: null,
    ambito: "sempre",
    registratoIl: "2000-01-01T00:00:00.000Z",
    gruppo: "kcal",
    kcal,
    kcalMin: null,
    proteineG: null,
    carboidratiG: null,
    grassiG: null,
    fibreG: null,
    saleG: null,
  };
}

const PROPS_BASE = { versioneObiettivi: 0, peso: [], storicoProfilo: [], storicoFitness: [] };

describe("ProgressoObiettiviChart", () => {
  it("ProgressoObiettiviChart_nessunGiornoRegistrato_mostraIlMessaggioDedicato", () => {
    render(<ProgressoObiettiviChart {...PROPS_BASE} giorni={[]} />);

    expect(screen.getByText("Nessun giorno registrato ancora.")).toBeInTheDocument();
  });

  it("ProgressoObiettiviChart_nessunLimiteImpostato_mostraIlMessaggioDiNessunLimite", async () => {
    render(<ProgressoObiettiviChart {...PROPS_BASE} giorni={[creaGiorno("2020-01-01", 2000)]} />);

    expect(await screen.findByText(/Nessun limite impostato ancora/)).toBeInTheDocument();
  });

  it("ProgressoObiettiviChart_limiteKcalImpostato_nonMostraIlMessaggioDiNessunLimite", async () => {
    vi.mocked(elencaStoricoObiettivo).mockResolvedValue([creaLimiteKcal(2000)]);

    render(<ProgressoObiettiviChart {...PROPS_BASE} giorni={[creaGiorno("2020-01-01", 2500)]} />);

    await screen.findByRole("button", { name: /1 gen 2020/ });
    expect(screen.queryByText(/Nessun limite impostato ancora/)).not.toBeInTheDocument();
  });

  it("ProgressoObiettiviChart_focusGiorno_tornaAlPeriodoGiornoESelezionaQuellaData", () => {
    render(
      <ProgressoObiettiviChart
        {...PROPS_BASE}
        giorni={[creaGiorno("2020-01-01", 2000), creaGiorno("2020-02-01", 2000)]}
        focusGiorno={{ data: "2020-02-01" }}
      />,
    );

    expect(screen.getByRole("button", { name: /1 feb 2020/ })).toBeInTheDocument();
  });
});
