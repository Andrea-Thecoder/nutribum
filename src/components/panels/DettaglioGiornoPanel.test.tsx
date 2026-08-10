import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DettaglioGiornoPanel, SchedeGiorno } from "./DettaglioGiornoPanel";
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

function creaAlimento(nome: string, kcal: number, extra: Partial<Alimento> = {}): Alimento {
  return {
    nome,
    quantita: 100,
    unita: "g",
    kcal,
    proteine_g: 10,
    carboidrati_g: 20,
    grassi_g: 5,
    ...extra,
  };
}

function creaGiorno(data: string, alimenti: Alimento[]): GiornoStorico {
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti }] };
}

function creaLimiteKcal(kcal: number): PuntoStoricoObiettivo {
  return {
    id: 1,
    validoDal: "2024-01-01",
    validoAl: null,
    ambito: "sempre",
    registratoIl: "2024-01-01T00:00:00.000Z",
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

const PROPS_BASE = {
  onElimina: vi.fn(),
  versioneObiettivi: 0,
  peso: [],
  storicoProfilo: [],
  storicoFitness: [],
};

describe("SchedeGiorno", () => {
  it("SchedeGiorno_piuGiorniAperti_mostraUnaSchedaPerGiorno", () => {
    render(
      <SchedeGiorno dataGiorni={["2024-01-01", "2024-01-02"]} tabAttiva="2024-01-01" onCambiaTab={vi.fn()} onChiudiTab={vi.fn()} />,
    );

    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("2024-01-02")).toBeInTheDocument();
  });

  it("SchedeGiorno_clicSullEtichettaDiUnaScheda_chiamaOnCambiaTabConQuellaData", async () => {
    const onCambiaTab = vi.fn();
    const utente = userEvent.setup();
    render(
      <SchedeGiorno dataGiorni={["2024-01-01", "2024-01-02"]} tabAttiva="2024-01-01" onCambiaTab={onCambiaTab} onChiudiTab={vi.fn()} />,
    );

    await utente.click(screen.getByText("2024-01-02"));

    expect(onCambiaTab).toHaveBeenCalledWith("2024-01-02");
  });

  it("SchedeGiorno_clicSullaXDiUnaScheda_chiamaOnChiudiTabENonOnCambiaTab", async () => {
    const onCambiaTab = vi.fn();
    const onChiudiTab = vi.fn();
    const utente = userEvent.setup();
    render(
      <SchedeGiorno dataGiorni={["2024-01-01"]} tabAttiva="2024-01-01" onCambiaTab={onCambiaTab} onChiudiTab={onChiudiTab} />,
    );

    await utente.click(screen.getByTitle("Chiudi scheda"));

    expect(onChiudiTab).toHaveBeenCalledWith("2024-01-01");
    expect(onCambiaTab).not.toHaveBeenCalled();
  });
});

describe("DettaglioGiornoPanel", () => {
  it("DettaglioGiornoPanel_nessunGiornoAperto_mostraIlMessaggioDedicato", () => {
    render(<DettaglioGiornoPanel {...PROPS_BASE} giorni={[]} data="" />);

    expect(screen.getByText(/Nessun giorno aperto/)).toBeInTheDocument();
  });

  it("DettaglioGiornoPanel_giornoNonPresenteNelloStorico_mostraIlMessaggioDiDatoMancante", () => {
    render(<DettaglioGiornoPanel {...PROPS_BASE} giorni={[]} data="2024-01-01" />);

    expect(screen.getByText(/Nessun dato per 2024-01-01/)).toBeInTheDocument();
  });

  it("DettaglioGiornoPanel_giornoConAlimenti_mostraNomeQuantitaEKcalDiOgniAlimento", () => {
    const giorno = creaGiorno("2024-01-01", [creaAlimento("Pasta", 350)]);
    render(<DettaglioGiornoPanel {...PROPS_BASE} giorni={[giorno]} data="2024-01-01" />);

    const riga = screen.getByText("Pasta (100g)").closest("li")!;
    expect(within(riga).getByText("350 kcal")).toBeInTheDocument();
  });

  it("DettaglioGiornoPanel_alimentoNonDaEtichetta_mostraLaNotaDiStimaInFondo", () => {
    const giorno = creaGiorno("2024-01-01", [creaAlimento("Pasta", 350, { da_etichetta: false })]);
    render(<DettaglioGiornoPanel {...PROPS_BASE} giorni={[giorno]} data="2024-01-01" />);

    expect(screen.getByText(/Calcolato con valori stimati/)).toBeInTheDocument();
  });

  it("DettaglioGiornoPanel_kcalSopraIlLimiteInVigore_evidenziaIlTotaleConIlLimite", async () => {
    vi.mocked(elencaStoricoObiettivo).mockResolvedValue([creaLimiteKcal(2000)]);
    const giorno = creaGiorno("2024-01-01", [creaAlimento("Torta", 2500)]);
    render(<DettaglioGiornoPanel {...PROPS_BASE} giorni={[giorno]} data="2024-01-01" />);

    expect(await screen.findByText(/limite 2000/)).toBeInTheDocument();
  });

  it("DettaglioGiornoPanel_clicEliminaGiornoConConferma_chiamaOnEliminaConLaData", async () => {
    const onElimina = vi.fn();
    const giorno = creaGiorno("2024-01-01", [creaAlimento("Pasta", 350)]);
    const utente = userEvent.setup();
    render(<DettaglioGiornoPanel {...PROPS_BASE} onElimina={onElimina} giorni={[giorno]} data="2024-01-01" />);
    await utente.click(screen.getByText("Elimina giorno"));

    await utente.click(screen.getByText("Conferma"));

    expect(onElimina).toHaveBeenCalledWith("2024-01-01");
  });

  it("DettaglioGiornoPanel_clicEliminaGiornoEAnnulla_nonChiamaOnElimina", async () => {
    const onElimina = vi.fn();
    const giorno = creaGiorno("2024-01-01", [creaAlimento("Pasta", 350)]);
    const utente = userEvent.setup();
    render(<DettaglioGiornoPanel {...PROPS_BASE} onElimina={onElimina} giorni={[giorno]} data="2024-01-01" />);
    await utente.click(screen.getByText("Elimina giorno"));

    await utente.click(screen.getByText("Annulla"));

    expect(onElimina).not.toHaveBeenCalled();
  });
});
