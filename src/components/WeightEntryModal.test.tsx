import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeightEntryModal } from "./WeightEntryModal";
import { registraPeso } from "../lib/weight";

vi.mock("../lib/weight", () => ({
  registraPeso: vi.fn(),
}));

function oggi(): string {
  return new Date().toISOString().slice(0, 10);
}

describe("WeightEntryModal", () => {
  it("WeightEntryModal_valoreOggiPresente_precompilaIlCampoPesoConQuelValore", () => {
    render(<WeightEntryModal valoreOggi={80} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByRole("spinbutton")).toHaveValue(80);
  });

  it("WeightEntryModal_valoreOggiAssente_lasciaIlCampoPesoVuoto", () => {
    render(<WeightEntryModal valoreOggi={null} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByRole("spinbutton")).toHaveValue(null);
  });

  it("WeightEntryModal_pesoVuoto_mostraErroreSenzaSalvare", async () => {
    const utente = userEvent.setup();
    render(<WeightEntryModal valoreOggi={80} onClose={vi.fn()} onSaved={vi.fn()} />);
    await utente.clear(screen.getByRole("spinbutton"));

    await utente.click(screen.getByText("Salva"));

    expect(screen.getByText(/deve essere un numero tra/)).toBeInTheDocument();
    expect(registraPeso).not.toHaveBeenCalled();
  });

  it("WeightEntryModal_pesoValido_chiamaRegistraPesoConDataEValoreCorretti", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const utente = userEvent.setup();
    render(<WeightEntryModal valoreOggi={null} onClose={onClose} onSaved={onSaved} />);
    await utente.type(screen.getByRole("spinbutton"), "82.5");

    await utente.click(screen.getByText("Salva"));

    expect(registraPeso).toHaveBeenCalledWith(oggi(), 82.5);
  });

  it("WeightEntryModal_pesoValidoSalvatoConSuccesso_chiamaOnSavedEOnClose", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const utente = userEvent.setup();
    render(<WeightEntryModal valoreOggi={null} onClose={onClose} onSaved={onSaved} />);
    await utente.type(screen.getByRole("spinbutton"), "82.5");

    await utente.click(screen.getByText("Salva"));

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("WeightEntryModal_clicSuAnnullaSenzaModifiche_chiudeSubitoSenzaChiedereConferma", async () => {
    const onClose = vi.fn();
    const utente = userEvent.setup();
    render(<WeightEntryModal valoreOggi={80} onClose={onClose} onSaved={vi.fn()} />);

    await utente.click(screen.getByText("Annulla"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Uscire senza salvare/)).not.toBeInTheDocument();
  });

  it("WeightEntryModal_clicSuAnnullaDopoUnaModifica_chiedeConfermaPrimaDiChiudere", async () => {
    const onClose = vi.fn();
    const utente = userEvent.setup();
    render(<WeightEntryModal valoreOggi={80} onClose={onClose} onSaved={vi.fn()} />);
    await utente.type(screen.getByRole("spinbutton"), "1");

    await utente.click(screen.getByText("Annulla"));

    expect(screen.getByText(/Uscire senza salvare/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
