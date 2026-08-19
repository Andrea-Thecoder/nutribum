import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegistraPastoPanel } from "./RegistraPastoPanel";
import {
  eliminaVoceDiario,
  elencaDiarioGiorno,
  registraVoceDiario,
  type AlimentoCatalogo,
  type VoceDiario,
} from "../../lib/food";
import type { RicettaConIngredienti } from "../../lib/recipes";

vi.mock("../../lib/food", async (importaOriginale) => {
  const originale = await importaOriginale<typeof import("../../lib/food")>();
  return {
    ...originale,
    elencaDiarioGiorno: vi.fn(),
    registraVoceDiario: vi.fn(),
    eliminaVoceDiario: vi.fn(),
  };
});
vi.mock("../../lib/errorLog", () => ({
  registraErroreNonBloccante: vi.fn(),
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

function creaVoceSalvata(id: number): VoceDiario {
  return {
    id,
    alimentoId: 1,
    nomeAlimento: "Pasta",
    unita: "g",
    data: "2024-01-01",
    orario: null,
    tipoPasto: "pranzo",
    quantita: 100,
    kcal: 350,
    proteineG: 12,
    carboidratiG: 70,
    grassiG: 2,
    zuccheriG: null,
    grassiSaturiG: null,
    fibreG: null,
    saleG: null,
  };
}

beforeEach(() => {
  vi.mocked(elencaDiarioGiorno).mockResolvedValue([]);
});

async function attendiCaricamento() {
  await screen.findByLabelText("Pasto *");
}

// Il pannello di conferma sul fondo si chiama anch'esso "Conferma" quanto il bottone del dialogo
// useConferma: quando entrambi sono a schermo insieme (dialogo aperto sopra un pannello con
// modifiche pendenti) un getByText("Conferma") generico è ambiguo - si individua il dialogo dal suo
// messaggio (unico) e si clicca il SUO bottone, non quello del pannello sottostante.
async function confermaDialogo(utente: ReturnType<typeof userEvent.setup>, messaggioParziale: RegExp) {
  const messaggio = await screen.findByText(messaggioParziale);
  const dialogo = messaggio.parentElement!;
  await utente.click(within(dialogo).getByText("Conferma"));
}

describe("RegistraPastoPanel", () => {
  it("RegistraPastoPanel_giornoSenzaVoci_mostraIlMessaggioDedicato", async () => {
    render(<RegistraPastoPanel alimenti={[PASTA]} ricette={[]} onSalvato={vi.fn()} />);

    expect(await screen.findByText("Nessun alimento in lista per questo giorno.")).toBeInTheDocument();
  });

  it("RegistraPastoPanel_aggiungiAlimento_creaUnaRigaInBozzaConLeKcalCalcolate", async () => {
    const utente = userEvent.setup();
    render(<RegistraPastoPanel alimenti={[PASTA]} ricette={[]} onSalvato={vi.fn()} />);
    await attendiCaricamento();

    await utente.click(screen.getByText("Aggiungi"));

    const riga = screen.getByText("in bozza").closest("div")!.parentElement!;
    expect(within(riga).getByText(/350 kcal/)).toBeInTheDocument();
  });

  it("RegistraPastoPanel_aggiungiDueVolteStessaCombinazione_mostraErroreDiDuplicatoSenzaAggiungereDiNuovo", async () => {
    const utente = userEvent.setup();
    render(<RegistraPastoPanel alimenti={[PASTA]} ricette={[]} onSalvato={vi.fn()} />);
    await attendiCaricamento();
    await utente.click(screen.getByText("Aggiungi"));

    await utente.click(screen.getByText("Aggiungi"));

    expect(screen.getByText(/è già in lista/)).toBeInTheDocument();
    expect(screen.getAllByText("in bozza")).toHaveLength(1);
  });

  it("RegistraPastoPanel_bottoneConferma_eDisabilitatoSenzaModifichePendenti", async () => {
    render(<RegistraPastoPanel alimenti={[PASTA]} ricette={[]} onSalvato={vi.fn()} />);
    await attendiCaricamento();

    expect(screen.getByText("Conferma")).toBeDisabled();
  });

  it("RegistraPastoPanel_confermaConBozzaPendente_registraLaVoceEChiamaOnSalvato", async () => {
    const onSalvato = vi.fn();
    vi.mocked(registraVoceDiario).mockResolvedValue(1);
    const utente = userEvent.setup();
    render(<RegistraPastoPanel alimenti={[PASTA]} ricette={[]} onSalvato={onSalvato} />);
    await attendiCaricamento();
    await utente.click(screen.getByText("Aggiungi"));

    await utente.click(screen.getByText("Conferma"));
    await confermaDialogo(utente, /Confermi di voler/);

    expect(registraVoceDiario).toHaveBeenCalledWith(
      expect.objectContaining({ alimentoId: 1, quantita: 100, tipoPasto: "colazione" }),
      PASTA,
    );
    expect(onSalvato).toHaveBeenCalledTimes(1);
  });

  it("RegistraPastoPanel_rimuoviVoceGiaSalvataConConferma_laSegnaComeDaEliminareERiduceLaListaVisibile", async () => {
    vi.mocked(elencaDiarioGiorno).mockResolvedValue([creaVoceSalvata(42)]);
    const utente = userEvent.setup();
    render(<RegistraPastoPanel alimenti={[PASTA]} ricette={[]} onSalvato={vi.fn()} />);
    await screen.findByText("Pasta", { exact: false });

    await utente.click(screen.getByTitle("Rimuovi"));
    await confermaDialogo(utente, /Rimuovere "Pasta" dalla lista/);

    expect(screen.getByText("Nessun alimento in lista per questo giorno.")).toBeInTheDocument();
  });

  it("RegistraPastoPanel_svuotaListaConConferma_rimuoveTutteLeVociVisibili", async () => {
    const utente = userEvent.setup();
    render(<RegistraPastoPanel alimenti={[PASTA]} ricette={[]} onSalvato={vi.fn()} />);
    await attendiCaricamento();
    await utente.click(screen.getByText("Aggiungi"));

    await utente.click(screen.getByText("Svuota lista"));
    await confermaDialogo(utente, /Vuoi svuotare la lista/);

    expect(screen.getByText("Nessun alimento in lista per questo giorno.")).toBeInTheDocument();
  });

  it("RegistraPastoPanel_modalitaDaRicetta_aggiungeUnaRigaPerOgniIngredienteDellaRicetta", async () => {
    const ricetta: RicettaConIngredienti = {
      id: 1,
      nome: "Pasta al pomodoro",
      ingredienti: [{ alimentoId: 1, nomeAlimento: "Pasta", unita: "g", quantita: 150 }],
    };
    const utente = userEvent.setup();
    render(<RegistraPastoPanel alimenti={[PASTA]} ricette={[ricetta]} onSalvato={vi.fn()} />);
    await attendiCaricamento();
    await utente.click(screen.getByText("Da ricetta"));

    await utente.click(screen.getByText("Aggiungi da ricetta"));

    expect(screen.getByText("in bozza")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "150" })).toBeInTheDocument();
  });

  it("RegistraPastoPanel_rimozioneVoceGiaSalvata_chiamaEliminaVoceDiarioSoloDopoLaConferma", async () => {
    vi.mocked(elencaDiarioGiorno).mockResolvedValue([creaVoceSalvata(42)]);
    const utente = userEvent.setup();
    render(<RegistraPastoPanel alimenti={[PASTA]} ricette={[]} onSalvato={vi.fn()} />);
    await screen.findByText("Pasta", { exact: false });
    await utente.click(screen.getByTitle("Rimuovi"));
    await confermaDialogo(utente, /Rimuovere "Pasta" dalla lista/);

    expect(eliminaVoceDiario).not.toHaveBeenCalled();

    await utente.click(screen.getByText("Conferma"));
    await confermaDialogo(utente, /Confermi di voler/);

    expect(eliminaVoceDiario).toHaveBeenCalledWith(42);
  });

  it("RegistraPastoPanel_anteprima_nonChiamaElencaDiarioGiornoReale", async () => {
    vi.mocked(elencaDiarioGiorno).mockClear();
    render(<RegistraPastoPanel alimenti={[PASTA]} ricette={[]} onSalvato={vi.fn()} anteprima />);
    await attendiCaricamento();

    expect(elencaDiarioGiorno).not.toHaveBeenCalled();
  });

  it("RegistraPastoPanel_anteprimaConBozzaPendente_confermaMostraAvvisoSenzaChiamareRegistraVoceDiario", async () => {
    vi.mocked(registraVoceDiario).mockClear();
    const utente = userEvent.setup();
    render(<RegistraPastoPanel alimenti={[PASTA]} ricette={[]} onSalvato={vi.fn()} anteprima />);
    await attendiCaricamento();
    await utente.click(screen.getByText("Aggiungi"));

    await utente.click(screen.getByText("Conferma"));

    expect(await screen.findByText(/Anteprima:/)).toBeInTheDocument();
    expect(registraVoceDiario).not.toHaveBeenCalled();
  });
});
