import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RicettaFormModal } from "./RicettaFormModal";
import { aggiornaRicetta, creaRicetta, type RicettaConIngredienti } from "../lib/recipes";
import type { AlimentoCatalogo } from "../lib/food";

vi.mock("../lib/recipes", () => ({
  creaRicetta: vi.fn(),
  aggiornaRicetta: vi.fn(),
}));

function creaAlimentoCatalogo(id: number, nome: string): AlimentoCatalogo {
  return {
    id,
    nome,
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
}

const ALIMENTI = [creaAlimentoCatalogo(1, "Pasta"), creaAlimentoCatalogo(2, "Pomodoro")];

describe("RicettaFormModal - nuova ricetta", () => {
  it("RicettaFormModal_alimentiDisponibili_precompilaUnaRigaConIlPrimoAlimentoEQuantita100", () => {
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    expect(screen.getByText("Pasta")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(100);
  });

  it("RicettaFormModal_nessunAlimentoInCatalogo_disabilitaAggiungiIngrediente", () => {
    render(<RicettaFormModal alimenti={[]} onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    expect(screen.getByText("+ Aggiungi ingrediente")).toBeDisabled();
  });

  it("RicettaFormModal_nomeVuoto_mostraErroreSenzaSalvare", async () => {
    const utente = userEvent.setup();
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    await utente.click(screen.getByText("Crea ricetta"));

    expect(screen.getByText("Il nome è obbligatorio")).toBeInTheDocument();
    expect(creaRicetta).not.toHaveBeenCalled();
  });

  it("RicettaFormModal_nessunAlimentoSelezionabile_mostraErroreSenzaSalvare", async () => {
    const utente = userEvent.setup();
    render(<RicettaFormModal alimenti={[]} onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    await utente.type(screen.getByLabelText("Nome ricetta *"), "Insalata");

    await utente.click(screen.getByText("Crea ricetta"));

    expect(screen.getByText("Seleziona un alimento per ogni riga")).toBeInTheDocument();
    expect(creaRicetta).not.toHaveBeenCalled();
  });

  it("RicettaFormModal_quantitaAZero_mostraErroreSenzaSalvare", async () => {
    const utente = userEvent.setup();
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    await utente.type(screen.getByLabelText("Nome ricetta *"), "Pasta al pomodoro");
    await utente.clear(screen.getByRole("spinbutton"));

    await utente.click(screen.getByText("Crea ricetta"));

    expect(screen.getByText("Ogni quantità deve essere un numero maggiore di zero")).toBeInTheDocument();
    expect(creaRicetta).not.toHaveBeenCalled();
  });

  it("RicettaFormModal_clicAggiungiIngrediente_aggiungeUnaSecondaRiga", async () => {
    const utente = userEvent.setup();
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    await utente.click(screen.getByText("+ Aggiungi ingrediente"));

    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
  });

  it("RicettaFormModal_unaSolaRiga_disabilitaIlBottoneRimuovi", () => {
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    expect(screen.getByTitle("Rimuovi ingrediente")).toBeDisabled();
  });

  it("RicettaFormModal_duesRighe_ilBottoneRimuoviTogieUnaRiga", async () => {
    const utente = userEvent.setup();
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    await utente.click(screen.getByText("+ Aggiungi ingrediente"));

    await utente.click(screen.getAllByTitle("Rimuovi ingrediente")[0]);

    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
  });

  it("RicettaFormModal_datiValidi_chiamaCreaRicettaConNomeEIngredienti", async () => {
    const utente = userEvent.setup();
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    await utente.type(screen.getByLabelText("Nome ricetta *"), "Pasta al pomodoro");

    await utente.click(screen.getByText("Crea ricetta"));

    expect(creaRicetta).toHaveBeenCalledWith("Pasta al pomodoro", [{ alimentoId: 1, quantita: 100 }]);
  });

  it("RicettaFormModal_salvataggioRiuscito_chiamaOnSalvatoEOnChiudi", async () => {
    const onSalvato = vi.fn();
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={onChiudi} onSalvato={onSalvato} />);
    await utente.type(screen.getByLabelText("Nome ricetta *"), "Pasta al pomodoro");

    await utente.click(screen.getByText("Crea ricetta"));

    expect(onSalvato).toHaveBeenCalledTimes(1);
    expect(onChiudi).toHaveBeenCalledTimes(1);
  });

  it("RicettaFormModal_anteprima_mostraAvvisoSenzaChiamareCreaRicettaNeChiudere", async () => {
    vi.mocked(creaRicetta).mockClear();
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={onChiudi} onSalvato={vi.fn()} anteprima />);
    await utente.type(screen.getByLabelText("Nome ricetta *"), "Pasta al pomodoro");

    await utente.click(screen.getByText("Crea ricetta"));

    expect(await screen.findByText(/Anteprima:/)).toBeInTheDocument();
    expect(creaRicetta).not.toHaveBeenCalled();
    expect(onChiudi).not.toHaveBeenCalled();
  });
});

describe("RicettaFormModal - modifica ricetta esistente", () => {
  const RICETTA: RicettaConIngredienti = {
    id: 5,
    nome: "Pasta al pomodoro",
    ingredienti: [
      { alimentoId: 1, nomeAlimento: "Pasta", unita: "g", quantita: 100 },
      { alimentoId: 2, nomeAlimento: "Pomodoro", unita: "g", quantita: 200 },
    ],
  };

  it("RicettaFormModal_ricettaEsistente_precompilaNomeETutteLeRigheDiIngredienti", () => {
    render(<RicettaFormModal ricetta={RICETTA} alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    expect(screen.getByLabelText("Nome ricetta *")).toHaveValue("Pasta al pomodoro");
    expect(screen.getAllByRole("spinbutton").map((el) => (el as HTMLInputElement).value)).toEqual(["100", "200"]);
  });

  it("RicettaFormModal_salvataggioModifica_chiamaAggiornaRicettaConLIdOriginale", async () => {
    const utente = userEvent.setup();
    render(<RicettaFormModal ricetta={RICETTA} alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    await utente.click(screen.getByText("Salva modifiche"));

    expect(aggiornaRicetta).toHaveBeenCalledWith(5, "Pasta al pomodoro", [
      { alimentoId: 1, quantita: 100 },
      { alimentoId: 2, quantita: 200 },
    ]);
  });
});

function portaleTour() {
  const portale = document.getElementById("react-joyride-portal");
  return portale ? within(portale) : null;
}

describe("RicettaFormModal - mini-tour", () => {
  it("RicettaFormModal_clicSulPuntoInterrogativo_avviaIlTour", async () => {
    const utente = userEvent.setup();
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    await utente.click(screen.getByTitle("Cosa sono questi campi"));

    expect(await portaleTour()!.findByText("Nuova ricetta")).toBeInTheDocument();
  });

  it("RicettaFormModal_saltaIlTour_nonChiudeLaModale", async () => {
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={onChiudi} onSalvato={vi.fn()} />);
    await utente.click(screen.getByTitle("Cosa sono questi campi"));
    await portaleTour()!.findByText("Nuova ricetta");

    await utente.click(screen.getByRole("button", { name: "Salta" }));

    expect(portaleTour()).toBeNull();
    expect(onChiudi).not.toHaveBeenCalled();
  });

  it.each(["ricetta-nome", "ricetta-ingredienti"])("RicettaFormModal_haLAncoraDataTour_%s", (dataTour) => {
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    expect(document.querySelector(`[data-tour="${dataTour}"]`)).toBeInTheDocument();
  });

  it("RicettaFormModal_anteprima_nonMostraIlPuntoInterrogativoNeLIdDiScoping", () => {
    render(<RicettaFormModal alimenti={ALIMENTI} onChiudi={vi.fn()} onSalvato={vi.fn()} anteprima />);

    expect(screen.queryByTitle("Cosa sono questi campi")).not.toBeInTheDocument();
    expect(document.getElementById("anteprima-tour-root")).not.toBeInTheDocument();
  });
});
