import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GestioneRicettePanel } from "./GestioneRicettePanel";
import { eliminaRicetta, type RicettaConIngredienti } from "../../lib/recipes";
import type { AlimentoCatalogo } from "../../lib/food";

vi.mock("../../lib/recipes", () => ({
  eliminaRicetta: vi.fn(),
}));

const PASTA: AlimentoCatalogo = {
  id: 1,
  nome: "Pasta",
  unita: "g",
  kcal_100: 350,
  proteine_100: 12,
  carboidrati_100: 70,
  grassi_100: 2,
  zuccheri_100: null,
  grassi_saturi_100: null,
  fibre_100: null,
  sale_100: null,
  da_etichetta: false,
};

function creaRicetta(id: number, nome: string): RicettaConIngredienti {
  return {
    id,
    nome,
    ingredienti: [{ alimentoId: 1, nomeAlimento: "Pasta", unita: "g", quantita: 200 }],
  };
}

describe("GestioneRicettePanel", () => {
  it("GestioneRicettePanel_nessunaRicettaCreata_mostraIlMessaggioDedicato", () => {
    render(<GestioneRicettePanel ricette={[]} alimenti={[PASTA]} onCambiato={vi.fn()} />);

    expect(screen.getByText("Nessuna ricetta creata ancora.")).toBeInTheDocument();
  });

  it("GestioneRicettePanel_filtroSenzaRisultati_mostraIlMessaggioDiRicettaNonTrovata", async () => {
    const utente = userEvent.setup();
    render(<GestioneRicettePanel ricette={[creaRicetta(1, "Pasta al pomodoro")]} alimenti={[PASTA]} onCambiato={vi.fn()} />);

    await utente.type(screen.getByPlaceholderText("Cerca ricetta…"), "xyz");

    expect(screen.getByText("Nessuna ricetta trovata.")).toBeInTheDocument();
  });

  it("GestioneRicettePanel_ricetta_mostraGliIngredientiConcatenati", () => {
    render(<GestioneRicettePanel ricette={[creaRicetta(1, "Pasta al pomodoro")]} alimenti={[PASTA]} onCambiato={vi.fn()} />);

    expect(screen.getByText("Pasta (200g)")).toBeInTheDocument();
  });

  it("GestioneRicettePanel_nessunAlimentoInCatalogo_disabilitaNuovaRicetta", () => {
    render(<GestioneRicettePanel ricette={[]} alimenti={[]} onCambiato={vi.fn()} />);

    expect(screen.getByText("+ Nuova ricetta")).toBeDisabled();
  });

  it("GestioneRicettePanel_clicSuUnaRicetta_apreLeAzioni", async () => {
    const utente = userEvent.setup();
    render(<GestioneRicettePanel ricette={[creaRicetta(1, "Pasta al pomodoro")]} alimenti={[PASTA]} onCambiato={vi.fn()} />);

    await utente.click(screen.getByText("Pasta al pomodoro"));

    expect(screen.getByText("Visualizza")).toBeInTheDocument();
  });

  it("GestioneRicettePanel_clicSuVisualizza_mostraLaTabellaConIlTotaleCalcolato", async () => {
    const utente = userEvent.setup();
    render(<GestioneRicettePanel ricette={[creaRicetta(1, "Pasta al pomodoro")]} alimenti={[PASTA]} onCambiato={vi.fn()} />);
    await utente.click(screen.getByText("Pasta al pomodoro"));

    await utente.click(screen.getByText("Visualizza"));

    const rigaTotale = screen.getByText("Totale").closest("tr")!;
    expect(within(rigaTotale).getByText("700")).toBeInTheDocument();
  });

  it("GestioneRicettePanel_clicSuNuovaRicetta_apreIlFormPerUnaNuovaRicetta", async () => {
    const utente = userEvent.setup();
    render(<GestioneRicettePanel ricette={[]} alimenti={[PASTA]} onCambiato={vi.fn()} />);

    await utente.click(screen.getByText("+ Nuova ricetta"));

    expect(screen.getByText("Nuova ricetta")).toBeInTheDocument();
  });

  it("GestioneRicettePanel_eliminazioneConfermata_chiamaEliminaRicettaEOnCambiato", async () => {
    const onCambiato = vi.fn();
    vi.mocked(eliminaRicetta).mockResolvedValue(undefined);
    const utente = userEvent.setup();
    render(<GestioneRicettePanel ricette={[creaRicetta(1, "Pasta al pomodoro")]} alimenti={[PASTA]} onCambiato={onCambiato} />);
    await utente.click(screen.getByText("Pasta al pomodoro"));
    await utente.click(screen.getByText("Elimina"));

    await utente.click(screen.getByText("Conferma"));

    expect(eliminaRicetta).toHaveBeenCalledWith(1);
    expect(onCambiato).toHaveBeenCalledTimes(1);
  });

  it("GestioneRicettePanel_eliminazioneFallita_mostraUnEsitoDiErrore", async () => {
    vi.mocked(eliminaRicetta).mockRejectedValue(new Error("errore di rete"));
    const utente = userEvent.setup();
    render(<GestioneRicettePanel ricette={[creaRicetta(1, "Pasta al pomodoro")]} alimenti={[PASTA]} onCambiato={vi.fn()} />);
    await utente.click(screen.getByText("Pasta al pomodoro"));
    await utente.click(screen.getByText("Elimina"));

    await utente.click(screen.getByText("Conferma"));

    expect(await screen.findByText("errore di rete")).toBeInTheDocument();
  });
});
