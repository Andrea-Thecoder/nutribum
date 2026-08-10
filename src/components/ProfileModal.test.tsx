import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileModal } from "./ProfileModal";
import {
  elencaLivelliFitness,
  impostaLivelloFitness,
  leggiLivelloFitnessAttivo,
  leggiProfilo,
  salvaProfilo,
} from "../lib/profile";
import type { VocePeso } from "../lib/weight";

vi.mock("../lib/profile", () => ({
  leggiProfilo: vi.fn(),
  salvaProfilo: vi.fn(),
  elencaLivelliFitness: vi.fn(),
  leggiLivelloFitnessAttivo: vi.fn(),
  impostaLivelloFitness: vi.fn(),
}));
vi.mock("../lib/errorLog", () => ({
  registraErroreNonBloccante: vi.fn(),
}));

const LIVELLI = [
  { id: 1, livello: "sedentary", moltiplicatore: 1.2, etichetta: "Sedentario", descrizione: "poco esercizio", etichettaEng: "", descrizioneEng: "" },
  { id: 2, livello: "moderate", moltiplicatore: 1.55, etichetta: "Moderato", descrizione: "esercizio medio", etichettaEng: "", descrizioneEng: "" },
];

beforeEach(() => {
  vi.mocked(leggiProfilo).mockResolvedValue(null);
  vi.mocked(elencaLivelliFitness).mockResolvedValue(LIVELLI);
  vi.mocked(leggiLivelloFitnessAttivo).mockResolvedValue(null);
});

async function attendiCaricamento() {
  await screen.findByText("Livello di attività");
}

function campoEta() {
  return screen.getByLabelText("Età (anni)");
}

function campoAltezza() {
  return screen.getByLabelText("Altezza (cm)");
}

describe("ProfileModal", () => {
  it("ProfileModal_caricamentoInCorso_mostraIlMessaggioDiAttesa", () => {
    render(<ProfileModal peso={[]} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByText("Caricamento…")).toBeInTheDocument();
  });

  it("ProfileModal_nessunProfiloSalvato_selezionaIlPrimoLivelloDellElencoComeDefault", async () => {
    render(<ProfileModal peso={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
    await attendiCaricamento();

    expect(screen.getByLabelText("Livello di attività")).toHaveTextContent("Sedentario");
  });

  it("ProfileModal_profiloELivelloEsistenti_precompilaEtaAltezzaELivelloAttivo", async () => {
    vi.mocked(leggiProfilo).mockResolvedValue({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
    vi.mocked(leggiLivelloFitnessAttivo).mockResolvedValue(LIVELLI[1]);
    render(<ProfileModal peso={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
    await attendiCaricamento();

    expect(campoEta()).toHaveValue(30);
    expect(campoAltezza()).toHaveValue(180);
    expect(screen.getByLabelText("Livello di attività")).toHaveTextContent("Moderato");
  });

  // Come in WeightGoalModal: un click sul bottone "Salva" passerebbe dalla validazione nativa
  // dell'input number (min/max) prima ancora di raggiungere il gestore React, quindi si dispara il
  // submit direttamente sul form per esercitare la validazione applicativa (età fuori range).
  it("ProfileModal_etaFuoriRange_mostraErroreSenzaSalvare", async () => {
    const utente = userEvent.setup();
    render(<ProfileModal peso={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
    await attendiCaricamento();
    await utente.type(campoEta(), "200");
    await utente.type(campoAltezza(), "180");

    fireEvent.submit(campoEta().closest("form")!);

    expect(screen.getByText(/Età tra/)).toBeInTheDocument();
    expect(salvaProfilo).not.toHaveBeenCalled();
  });

  it("ProfileModal_datiValidiConLivelloNonCambiato_chiamaSalvaProfiloMaNonImpostaLivelloFitness", async () => {
    vi.mocked(leggiProfilo).mockResolvedValue({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
    vi.mocked(leggiLivelloFitnessAttivo).mockResolvedValue(LIVELLI[1]);
    const utente = userEvent.setup();
    render(<ProfileModal peso={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
    await attendiCaricamento();

    await utente.click(screen.getByText("Salva profilo"));

    expect(salvaProfilo).toHaveBeenCalledWith({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
    expect(impostaLivelloFitness).not.toHaveBeenCalled();
  });

  it("ProfileModal_livelloDiAttivitaCambiato_chiamaAncheImpostaLivelloFitness", async () => {
    vi.mocked(leggiProfilo).mockResolvedValue({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
    vi.mocked(leggiLivelloFitnessAttivo).mockResolvedValue(LIVELLI[0]);
    const utente = userEvent.setup();
    render(<ProfileModal peso={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
    await attendiCaricamento();
    await utente.click(screen.getByLabelText("Livello di attività"));
    await utente.click(screen.getByText(/Moderato/));

    await utente.click(screen.getByText("Salva profilo"));

    expect(impostaLivelloFitness).toHaveBeenCalledWith(2);
  });

  it("ProfileModal_salvataggioRiuscito_chiamaOnSavedEOnClose", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    vi.mocked(leggiProfilo).mockResolvedValue({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
    vi.mocked(leggiLivelloFitnessAttivo).mockResolvedValue(LIVELLI[1]);
    const utente = userEvent.setup();
    render(<ProfileModal peso={[]} onClose={onClose} onSaved={onSaved} />);
    await attendiCaricamento();

    await utente.click(screen.getByText("Salva profilo"));

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ProfileModal_nessunPesoRegistrato_mostraLAvvisoENonMostraAnteprimaTDEE", async () => {
    vi.mocked(leggiProfilo).mockResolvedValue({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
    vi.mocked(leggiLivelloFitnessAttivo).mockResolvedValue(LIVELLI[1]);
    render(<ProfileModal peso={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
    await attendiCaricamento();

    expect(screen.getByText(/Nessun peso registrato/)).toBeInTheDocument();
    expect(screen.queryByText(/BMR \(calorie a riposo\)/)).not.toBeInTheDocument();
  });

  it("ProfileModal_profiloValidoConPesoELivelloDisponibili_mostraLAnteprimaBmrETdee", async () => {
    vi.mocked(leggiProfilo).mockResolvedValue({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
    vi.mocked(leggiLivelloFitnessAttivo).mockResolvedValue(LIVELLI[1]);
    const peso: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];
    render(<ProfileModal peso={peso} onClose={vi.fn()} onSaved={vi.fn()} />);
    await attendiCaricamento();

    expect(screen.getByText("1780 kcal")).toBeInTheDocument();
    expect(screen.getByText("2759 kcal")).toBeInTheDocument();
  });
});
