import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlimentoFormModal } from "./AlimentoFormModal";
import { aggiornaAlimento, creaAlimento, type AlimentoCatalogo } from "../lib/food";

vi.mock("../lib/food", () => ({
  creaAlimento: vi.fn(),
  aggiornaAlimento: vi.fn(),
}));

const ALIMENTO_ESISTENTE: AlimentoCatalogo = {
  id: 7,
  nome: "Pasta",
  unita: "g",
  kcal_100: 350,
  proteine_100: 12,
  carboidrati_100: 70,
  grassi_100: 2,
  zuccheri_100: 3,
  grassi_saturi_100: 0.5,
  fibre_100: 2,
  sale_100: 0.1,
  da_etichetta: true,
};

// Le chiamate a userEvent.type() sulla stessa istanza condividono uno stato interno di
// tastiera/puntatore: vanno awaited in sequenza, mai lanciate insieme con Promise.all (altrimenti
// si interferiscono a vicenda e i campi restano scompilati senza che il test se ne accorga subito).
async function compilaCampiObbligatori(utente: ReturnType<typeof userEvent.setup>) {
  await utente.type(screen.getByLabelText("Kcal *"), "350");
  await utente.type(screen.getByLabelText("Proteine (g) *"), "12");
  await utente.type(screen.getByLabelText("Carboidrati (g) *"), "70");
  await utente.type(screen.getByLabelText("Grassi (g) *"), "2");
}

describe("AlimentoFormModal - nuovo alimento", () => {
  it("AlimentoFormModal_senzaAlimento_titoloEBottoneSonoPerUnNuovoAlimento", () => {
    render(<AlimentoFormModal onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    expect(screen.getByText("Nuovo alimento (valori per 100g)")).toBeInTheDocument();
    expect(screen.getByText("Crea alimento")).toBeInTheDocument();
  });

  it("AlimentoFormModal_nomeVuoto_mostraErroreSenzaSalvare", async () => {
    const utente = userEvent.setup();
    render(<AlimentoFormModal onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    await compilaCampiObbligatori(utente);

    await utente.click(screen.getByText("Crea alimento"));

    expect(screen.getByText("Il nome è obbligatorio")).toBeInTheDocument();
    expect(creaAlimento).not.toHaveBeenCalled();
  });

  it("AlimentoFormModal_campoObbligatorioMancante_mostraErroreSenzaSalvare", async () => {
    const utente = userEvent.setup();
    render(<AlimentoFormModal onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    await utente.type(screen.getByLabelText("Nome *"), "Pasta");
    await utente.type(screen.getByLabelText("Proteine (g) *"), "12");
    await utente.type(screen.getByLabelText("Carboidrati (g) *"), "70");
    await utente.type(screen.getByLabelText("Grassi (g) *"), "2");

    await utente.click(screen.getByText("Crea alimento"));

    expect(screen.getByText(/sono obbligatori/)).toBeInTheDocument();
    expect(creaAlimento).not.toHaveBeenCalled();
  });

  it("AlimentoFormModal_datiValidi_chiamaCreaAlimentoConIValoriCorretti", async () => {
    const utente = userEvent.setup();
    render(<AlimentoFormModal onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    await utente.type(screen.getByLabelText("Nome *"), "Pasta");
    await compilaCampiObbligatori(utente);

    await utente.click(screen.getByText("Crea alimento"));

    expect(creaAlimento).toHaveBeenCalledWith({
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
    });
  });

  it("AlimentoFormModal_clicSuMillilitri_passaMlComeUnitaAlSalvataggio", async () => {
    const utente = userEvent.setup();
    render(<AlimentoFormModal onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    await utente.type(screen.getByLabelText("Nome *"), "Olio EVO");
    await compilaCampiObbligatori(utente);
    await utente.click(screen.getByText("Millilitri (ml)"));

    await utente.click(screen.getByText("Crea alimento"));

    expect(creaAlimento).toHaveBeenCalledWith(expect.objectContaining({ unita: "ml" }));
  });

  it("AlimentoFormModal_salvataggioRiuscito_chiamaOnSalvatoEOnChiudi", async () => {
    const onSalvato = vi.fn();
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(<AlimentoFormModal onChiudi={onChiudi} onSalvato={onSalvato} />);
    await utente.type(screen.getByLabelText("Nome *"), "Pasta");
    await compilaCampiObbligatori(utente);

    await utente.click(screen.getByText("Crea alimento"));

    expect(onSalvato).toHaveBeenCalledTimes(1);
    expect(onChiudi).toHaveBeenCalledTimes(1);
  });

  it("AlimentoFormModal_anteprima_mostraAvvisoSenzaChiamareCreaAlimentoNeChiudere", async () => {
    vi.mocked(creaAlimento).mockClear();
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(<AlimentoFormModal onChiudi={onChiudi} onSalvato={vi.fn()} anteprima />);
    await utente.type(screen.getByLabelText("Nome *"), "Pasta");
    await compilaCampiObbligatori(utente);

    await utente.click(screen.getByText("Crea alimento"));

    expect(await screen.findByText(/Anteprima:/)).toBeInTheDocument();
    expect(creaAlimento).not.toHaveBeenCalled();
    expect(onChiudi).not.toHaveBeenCalled();
  });
});

describe("AlimentoFormModal - modifica alimento esistente", () => {
  it("AlimentoFormModal_conAlimentoEsistente_precompilaTuttiICampi", () => {
    render(<AlimentoFormModal alimento={ALIMENTO_ESISTENTE} onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    expect(screen.getByLabelText("Nome *")).toHaveValue("Pasta");
    expect(screen.getByLabelText("Kcal *")).toHaveValue(350);
    expect(screen.getByLabelText("di cui zuccheri (g)")).toHaveValue(3);
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByText("Modifica alimento (valori per 100g)")).toBeInTheDocument();
  });

  it("AlimentoFormModal_salvataggioModifica_chiamaAggiornaAlimentoConLIdOriginale", async () => {
    const utente = userEvent.setup();
    render(<AlimentoFormModal alimento={ALIMENTO_ESISTENTE} onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    await utente.click(screen.getByText("Salva modifiche"));

    expect(aggiornaAlimento).toHaveBeenCalledWith(7, expect.objectContaining({ nome: "Pasta" }));
  });
});

// Il titolo del primo step del tour ("Nuovo alimento") non coincide col titolo della modale
// ("Nuovo alimento (valori per 100g)"), ma restiamo scoperti al portale di react-joyride per
// coerenza con gli altri test dello stesso pattern.
function portaleTour() {
  const portale = document.getElementById("react-joyride-portal");
  return portale ? within(portale) : null;
}

describe("AlimentoFormModal - mini-tour", () => {
  it("AlimentoFormModal_clicSulPuntoInterrogativo_avviaIlTour", async () => {
    const utente = userEvent.setup();
    render(<AlimentoFormModal onChiudi={vi.fn()} onSalvato={vi.fn()} />);

    await utente.click(screen.getByTitle("Cosa sono questi campi"));

    expect(await portaleTour()!.findByText("Nuovo alimento")).toBeInTheDocument();
  });

  it("AlimentoFormModal_saltaIlTour_nonChiudeLaModale", async () => {
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(<AlimentoFormModal onChiudi={onChiudi} onSalvato={vi.fn()} />);
    await utente.click(screen.getByTitle("Cosa sono questi campi"));
    await portaleTour()!.findByText("Nuovo alimento");

    await utente.click(screen.getByRole("button", { name: "Salta" }));

    expect(portaleTour()).toBeNull();
    expect(onChiudi).not.toHaveBeenCalled();
  });

  it.each(["alimento-nome", "alimento-unita", "alimento-kcal", "alimento-etichetta"])(
    "AlimentoFormModal_haLAncoraDataTour_%s",
    (dataTour) => {
      render(<AlimentoFormModal onChiudi={vi.fn()} onSalvato={vi.fn()} />);

      expect(document.querySelector(`[data-tour="${dataTour}"]`)).toBeInTheDocument();
    },
  );

  // In anteprima (dentro la modale "?" di Libro Alimenti) questo form vive già annidato in un
  // altro contenitore #anteprima-tour-root - un secondo bottone "?" e un secondo id uguale
  // creerebbero un doppione invalido nel DOM, vedi commento su tourImpostazioni.tsx.
  it("AlimentoFormModal_anteprima_nonMostraIlPuntoInterrogativoNeLIdDiScoping", () => {
    render(<AlimentoFormModal onChiudi={vi.fn()} onSalvato={vi.fn()} anteprima />);

    expect(screen.queryByTitle("Cosa sono questi campi")).not.toBeInTheDocument();
    expect(document.getElementById("anteprima-tour-root")).not.toBeInTheDocument();
  });
});
