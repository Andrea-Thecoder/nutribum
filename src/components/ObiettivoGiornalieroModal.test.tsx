import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObiettivoGiornalieroModal } from "./ObiettivoGiornalieroModal";
import { leggiObiettivo, salvaObiettivoAltro, salvaObiettivoKcal, salvaObiettivoMacro } from "../lib/dailyGoal";
import { leggiLivelloFitnessAttivo, leggiProfilo } from "../lib/profile";
import type { VocePeso } from "../lib/weight";

vi.mock("../lib/dailyGoal", () => ({
  leggiObiettivo: vi.fn(),
  salvaObiettivoKcal: vi.fn(),
  salvaObiettivoMacro: vi.fn(),
  salvaObiettivoAltro: vi.fn(),
}));
vi.mock("../lib/profile", () => ({
  leggiProfilo: vi.fn(),
  leggiLivelloFitnessAttivo: vi.fn(),
}));
vi.mock("../lib/errorLog", () => ({
  registraErroreNonBloccante: vi.fn(),
}));

function nessunObiettivoEsistente() {
  return {
    kcal: null,
    kcalMin: null,
    proteineG: null,
    carboidratiG: null,
    grassiG: null,
    fibreG: null,
    saleG: null,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(leggiObiettivo).mockResolvedValue(nessunObiettivoEsistente());
  vi.mocked(leggiProfilo).mockResolvedValue(null);
  vi.mocked(leggiLivelloFitnessAttivo).mockResolvedValue(null);
});

async function attendiCaricamento() {
  await screen.findByText("Ambito di validità");
}

describe("ObiettivoGiornalieroModal - tipo kcal", () => {
  it("ObiettivoGiornalieroModal_caricamentoInCorso_mostraIlMessaggioDiAttesa", () => {
    render(<ObiettivoGiornalieroModal tipo="kcal" peso={[]} onChiudi={vi.fn()} />);

    expect(screen.getByText("Caricamento…")).toBeInTheDocument();
  });

  it("ObiettivoGiornalieroModal_obiettivoEsistente_precompilaICampiKcal", async () => {
    vi.mocked(leggiObiettivo).mockResolvedValue({ ...nessunObiettivoEsistente(), kcal: 2000, kcalMin: 1500 });
    render(<ObiettivoGiornalieroModal tipo="kcal" peso={[]} onChiudi={vi.fn()} />);
    await attendiCaricamento();

    expect(screen.getByLabelText("Kcal al giorno")).toHaveValue(2000);
    expect(screen.getByLabelText("Kcal minimo al giorno")).toHaveValue(1500);
  });

  it("ObiettivoGiornalieroModal_minimoMaggioreOEgualeAlMassimo_mostraErroreSenzaSalvare", async () => {
    const utente = userEvent.setup();
    render(<ObiettivoGiornalieroModal tipo="kcal" peso={[]} onChiudi={vi.fn()} />);
    await attendiCaricamento();
    await utente.type(screen.getByLabelText("Kcal al giorno"), "1500");
    await utente.type(screen.getByLabelText("Kcal minimo al giorno"), "1600");

    await utente.click(screen.getByText("Salva"));

    expect(screen.getByText("Il limite minimo deve essere inferiore al limite massimo")).toBeInTheDocument();
    expect(salvaObiettivoKcal).not.toHaveBeenCalled();
  });

  it("ObiettivoGiornalieroModal_valoriValidi_chiamaSalvaObiettivoKcalConAmbitoDiDefault", async () => {
    const utente = userEvent.setup();
    render(<ObiettivoGiornalieroModal tipo="kcal" peso={[]} onChiudi={vi.fn()} />);
    await attendiCaricamento();
    await utente.type(screen.getByLabelText("Kcal al giorno"), "2000");
    await utente.type(screen.getByLabelText("Kcal minimo al giorno"), "1500");

    await utente.click(screen.getByText("Salva"));

    expect(salvaObiettivoKcal).toHaveBeenCalledWith(2000, 1500, "daOra");
  });

  it("ObiettivoGiornalieroModal_salvataggioRiuscito_chiamaOnSalvatoOnChiudiERicordaLAmbito", async () => {
    const onSalvato = vi.fn();
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(<ObiettivoGiornalieroModal tipo="kcal" peso={[]} onChiudi={onChiudi} onSalvato={onSalvato} />);
    await attendiCaricamento();
    await utente.type(screen.getByLabelText("Kcal al giorno"), "2000");

    await utente.click(screen.getByText("Salva"));

    expect(onSalvato).toHaveBeenCalledTimes(1);
    expect(onChiudi).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("nutribum:ambito:kcal")).toBe("daOra");
  });

  it("ObiettivoGiornalieroModal_senzaProfiloSalvato_disabilitaLaCheckboxUsaTDEE", async () => {
    render(<ObiettivoGiornalieroModal tipo="kcal" peso={[]} onChiudi={vi.fn()} />);
    await attendiCaricamento();

    expect(screen.getByLabelText("Usa TDEE calcolato")).toBeDisabled();
  });

  it("ObiettivoGiornalieroModal_profiloEPesoDisponibili_spuntareUsaTDEEPrecompilaKcalConIlValoreCalcolato", async () => {
    vi.mocked(leggiProfilo).mockResolvedValue({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
    vi.mocked(leggiLivelloFitnessAttivo).mockResolvedValue({
      id: 1,
      livello: "moderate",
      moltiplicatore: 1.55,
      etichetta: "Moderatamente attivo",
      descrizione: "",
      etichettaEng: "",
      descrizioneEng: "",
    });
    const peso: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];
    const utente = userEvent.setup();
    render(<ObiettivoGiornalieroModal tipo="kcal" peso={peso} onChiudi={vi.fn()} />);
    await attendiCaricamento();

    await utente.click(screen.getByLabelText("Usa TDEE calcolato"));

    expect(screen.getByLabelText("Kcal al giorno")).toHaveValue(2759);
  });
});

describe("ObiettivoGiornalieroModal - tipo macro", () => {
  it("ObiettivoGiornalieroModal_tipoMacro_valoriValidi_chiamaSalvaObiettivoMacro", async () => {
    const utente = userEvent.setup();
    render(<ObiettivoGiornalieroModal tipo="macro" peso={[]} onChiudi={vi.fn()} />);
    await attendiCaricamento();
    await utente.type(screen.getByLabelText("Grassi (g)"), "70");
    await utente.type(screen.getByLabelText("Proteine (g)"), "120");
    await utente.type(screen.getByLabelText("Carboidrati (g)"), "250");

    await utente.click(screen.getByText("Salva"));

    expect(salvaObiettivoMacro).toHaveBeenCalledWith(
      { grassiG: 70, proteineG: 120, carboidratiG: 250 },
      "daOra",
    );
  });
});

describe("ObiettivoGiornalieroModal - tipo altro", () => {
  it("ObiettivoGiornalieroModal_tipoAltro_valoriValidi_chiamaSalvaObiettivoAltro", async () => {
    const utente = userEvent.setup();
    render(<ObiettivoGiornalieroModal tipo="altro" peso={[]} onChiudi={vi.fn()} />);
    await attendiCaricamento();
    await utente.type(screen.getByLabelText("Sale (g)"), "5");
    await utente.type(screen.getByLabelText("Fibre (g)"), "25");

    await utente.click(screen.getByText("Salva"));

    expect(salvaObiettivoAltro).toHaveBeenCalledWith({ saleG: 5, fibreG: 25 }, "daOra");
  });
});
