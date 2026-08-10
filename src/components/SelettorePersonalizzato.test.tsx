import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelettorePersonalizzato, type OpzioneSelettore } from "./SelettorePersonalizzato";

const OPZIONI: OpzioneSelettore<string>[] = [
  { valore: "colazione", etichetta: "Colazione" },
  { valore: "pranzo", etichetta: "Pranzo" },
  { valore: "cena", etichetta: "Cena" },
];

describe("SelettorePersonalizzato", () => {
  it("SelettorePersonalizzato_nessunaOpzioneSelezionata_mostraIlPlaceholder", () => {
    render(<SelettorePersonalizzato valore="" opzioni={OPZIONI} onChange={vi.fn()} placeholder="Scegli…" />);

    expect(screen.getByRole("button", { name: /Scegli…/ })).toBeInTheDocument();
  });

  it("SelettorePersonalizzato_valoreSelezionato_mostraLaSuaEtichettaInvecedelPlaceholder", () => {
    render(<SelettorePersonalizzato valore="pranzo" opzioni={OPZIONI} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Pranzo/ })).toBeInTheDocument();
  });

  it("SelettorePersonalizzato_clicSulBottone_apreLElencoDelleOpzioni", async () => {
    const utente = userEvent.setup();
    render(<SelettorePersonalizzato valore="" opzioni={OPZIONI} onChange={vi.fn()} />);

    await utente.click(screen.getByRole("button"));

    expect(screen.getByText("Cena")).toBeInTheDocument();
  });

  it("SelettorePersonalizzato_clicSuUnOpzione_chiamaOnChangeConIlSuoValore", async () => {
    const onChange = vi.fn();
    const utente = userEvent.setup();
    render(<SelettorePersonalizzato valore="" opzioni={OPZIONI} onChange={onChange} />);
    await utente.click(screen.getByRole("button"));

    await utente.click(screen.getByText("Cena"));

    expect(onChange).toHaveBeenCalledWith("cena");
  });

  it("SelettorePersonalizzato_clicSuUnOpzione_richiudeLElenco", async () => {
    const utente = userEvent.setup();
    render(<SelettorePersonalizzato valore="" opzioni={OPZIONI} onChange={vi.fn()} />);
    await utente.click(screen.getByRole("button"));

    await utente.click(screen.getByText("Cena"));

    expect(screen.queryByText("Pranzo")).not.toBeInTheDocument();
  });

  it("SelettorePersonalizzato_disabled_nonApreLElencoAlClic", async () => {
    const utente = userEvent.setup();
    render(<SelettorePersonalizzato valore="" opzioni={OPZIONI} onChange={vi.fn()} disabled />);

    await utente.click(screen.getByRole("button"));

    expect(screen.queryByText("Cena")).not.toBeInTheDocument();
  });
});
