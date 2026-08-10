import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LibroAlimentiPanel } from "./LibroAlimentiPanel";
import { eliminaAlimento, type AlimentoCatalogo } from "../../lib/food";

vi.mock("../../lib/food", () => ({
  eliminaAlimento: vi.fn(),
}));

function creaAlimento(id: number, nome: string): AlimentoCatalogo {
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

describe("LibroAlimentiPanel", () => {
  it("LibroAlimentiPanel_piuAlimenti_mostraIlConteggioAlPlurale", () => {
    render(<LibroAlimentiPanel alimenti={[creaAlimento(1, "Pasta"), creaAlimento(2, "Riso")]} onCambiato={vi.fn()} />);

    expect(screen.getByText(/2 alimenti/)).toBeInTheDocument();
  });

  it("LibroAlimentiPanel_unSoloAlimento_mostraIlConteggioAlSingolare", () => {
    render(<LibroAlimentiPanel alimenti={[creaAlimento(1, "Pasta")]} onCambiato={vi.fn()} />);

    expect(screen.getByText(/1 alimento(?!i)/)).toBeInTheDocument();
  });

  it("LibroAlimentiPanel_filtroPerNome_mostraSoloIRisultatiCorrispondenti", async () => {
    const utente = userEvent.setup();
    render(<LibroAlimentiPanel alimenti={[creaAlimento(1, "Pasta"), creaAlimento(2, "Riso")]} onCambiato={vi.fn()} />);

    await utente.type(screen.getByPlaceholderText("Cerca alimento…"), "ris");

    expect(screen.getByText("Riso")).toBeInTheDocument();
    expect(screen.queryByText("Pasta")).not.toBeInTheDocument();
  });

  it("LibroAlimentiPanel_filtroSenzaRisultati_mostraIlMessaggioDedicato", async () => {
    const utente = userEvent.setup();
    render(<LibroAlimentiPanel alimenti={[creaAlimento(1, "Pasta")]} onCambiato={vi.fn()} />);

    await utente.type(screen.getByPlaceholderText("Cerca alimento…"), "xyz");

    expect(screen.getByText("Nessun alimento trovato.")).toBeInTheDocument();
  });

  it("LibroAlimentiPanel_piuDiVentiAlimenti_paginaEMostraIlBottoneAvantiAttivo", () => {
    const alimenti = Array.from({ length: 25 }, (_, i) => creaAlimento(i + 1, `Alimento ${i + 1}`));

    render(<LibroAlimentiPanel alimenti={alimenti} onCambiato={vi.fn()} />);

    expect(screen.getByText("Pagina 1 di 2")).toBeInTheDocument();
    expect(screen.getByText("›")).not.toBeDisabled();
    expect(screen.queryByText("Alimento 21")).not.toBeInTheDocument();
  });

  it("LibroAlimentiPanel_clicSuAvantiNellaPaginazione_mostraGliAlimentiDellaPaginaSuccessiva", async () => {
    const alimenti = Array.from({ length: 25 }, (_, i) => creaAlimento(i + 1, `Alimento ${i + 1}`));
    const utente = userEvent.setup();
    render(<LibroAlimentiPanel alimenti={alimenti} onCambiato={vi.fn()} />);

    await utente.click(screen.getByText("›"));

    expect(screen.getByText("Alimento 21")).toBeInTheDocument();
    expect(screen.getByText("Pagina 2 di 2")).toBeInTheDocument();
  });

  it("LibroAlimentiPanel_clicSuUnaRiga_apreLeAzioniPerQuellAlimento", async () => {
    const utente = userEvent.setup();
    render(<LibroAlimentiPanel alimenti={[creaAlimento(1, "Pasta")]} onCambiato={vi.fn()} />);

    await utente.click(screen.getByText("Pasta"));

    expect(screen.getByText("Modifica")).toBeInTheDocument();
  });

  it("LibroAlimentiPanel_clicSuAlimentoSingolo_apreIlFormPerUnNuovoAlimento", async () => {
    const utente = userEvent.setup();
    render(<LibroAlimentiPanel alimenti={[]} onCambiato={vi.fn()} />);

    await utente.click(screen.getByText("+ Alimento singolo"));

    expect(screen.getByText("Nuovo alimento (valori per 100g)")).toBeInTheDocument();
  });

  it("LibroAlimentiPanel_eliminazioneConfermata_chiamaEliminaAlimentoEOnCambiato", async () => {
    const onCambiato = vi.fn();
    vi.mocked(eliminaAlimento).mockResolvedValue(undefined);
    const utente = userEvent.setup();
    render(<LibroAlimentiPanel alimenti={[creaAlimento(1, "Pasta")]} onCambiato={onCambiato} />);
    await utente.click(screen.getByText("Pasta"));
    await utente.click(screen.getByText("Elimina"));

    await utente.click(screen.getByText("Conferma"));

    expect(eliminaAlimento).toHaveBeenCalledWith(1);
    expect(onCambiato).toHaveBeenCalledTimes(1);
  });

  it("LibroAlimentiPanel_eliminazioneFallita_mostraUnEsitoDiErrore", async () => {
    vi.mocked(eliminaAlimento).mockRejectedValue(new Error("alimento in uso"));
    const utente = userEvent.setup();
    render(<LibroAlimentiPanel alimenti={[creaAlimento(1, "Pasta")]} onCambiato={vi.fn()} />);
    await utente.click(screen.getByText("Pasta"));
    await utente.click(screen.getByText("Elimina"));

    await utente.click(screen.getByText("Conferma"));

    expect(await screen.findByText("alimento in uso")).toBeInTheDocument();
  });
});
