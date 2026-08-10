import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeightGoalModal } from "./WeightGoalModal";
import { salvaObiettivoPeso } from "../lib/weight";

vi.mock("../lib/weight", () => ({
  salvaObiettivoPeso: vi.fn(),
}));

function campoObiettivo() {
  return screen.getByLabelText(/Peso obiettivo/);
}

function campoMargine() {
  return screen.getByLabelText(/Margine di tolleranza/);
}

describe("WeightGoalModal", () => {
  it("WeightGoalModal_goalKgPresente_precompilaIlCampoObiettivo", () => {
    render(<WeightGoalModal goalKg={75} margineKg={2} onClose={vi.fn()} onSaved={vi.fn()} onSalvaMargine={vi.fn()} />);

    expect(campoObiettivo()).toHaveValue(75);
  });

  it("WeightGoalModal_goalKgAssente_lasciaIlCampoObiettivoVuoto", () => {
    render(
      <WeightGoalModal goalKg={null} margineKg={2} onClose={vi.fn()} onSaved={vi.fn()} onSalvaMargine={vi.fn()} />,
    );

    expect(campoObiettivo()).toHaveValue(null);
  });

  // Il click sul bottone "Salva" passa dalla validazione nativa dell'input number (min/max), che a
  // valori fuori range blocca il submit prima ancora che il gestore React scatti - per esercitare
  // la validazione applicativa (il vero bersaglio di questi test) si dispara il submit direttamente
  // sul form, come farebbe comunque un valore incollato o impostato in altro modo.
  it("WeightGoalModal_pesoObiettivoFuoriRange_mostraErroreSenzaSalvare", async () => {
    const utente = userEvent.setup();
    render(
      <WeightGoalModal goalKg={null} margineKg={2} onClose={vi.fn()} onSaved={vi.fn()} onSalvaMargine={vi.fn()} />,
    );
    await utente.type(campoObiettivo(), "600");

    fireEvent.submit(campoObiettivo().closest("form")!);

    expect(screen.getByText(/Il valore deve essere un numero tra/)).toBeInTheDocument();
    expect(salvaObiettivoPeso).not.toHaveBeenCalled();
  });

  it("WeightGoalModal_margineFuoriRange_mostraErroreSenzaSalvare", async () => {
    const utente = userEvent.setup();
    render(
      <WeightGoalModal goalKg={75} margineKg={2} onClose={vi.fn()} onSaved={vi.fn()} onSalvaMargine={vi.fn()} />,
    );
    await utente.clear(campoMargine());
    await utente.type(campoMargine(), "60");

    fireEvent.submit(campoMargine().closest("form")!);

    expect(screen.getByText(/Il margine deve essere un numero tra/)).toBeInTheDocument();
    expect(salvaObiettivoPeso).not.toHaveBeenCalled();
  });

  it("WeightGoalModal_campoObiettivoVuoto_salvaNullPerRimuovereLObiettivo", async () => {
    const utente = userEvent.setup();
    render(
      <WeightGoalModal goalKg={75} margineKg={2} onClose={vi.fn()} onSaved={vi.fn()} onSalvaMargine={vi.fn()} />,
    );
    await utente.clear(campoObiettivo());

    await utente.click(screen.getByText("Salva"));

    expect(salvaObiettivoPeso).toHaveBeenCalledWith(null);
  });

  it("WeightGoalModal_datiValidi_chiamaSalvaObiettivoPesoEOnSalvaMargineConIValoriCorretti", async () => {
    const onSalvaMargine = vi.fn().mockResolvedValue(undefined);
    const utente = userEvent.setup();
    render(
      <WeightGoalModal
        goalKg={null}
        margineKg={2}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onSalvaMargine={onSalvaMargine}
      />,
    );
    await utente.type(campoObiettivo(), "78.5");
    await utente.clear(campoMargine());
    await utente.type(campoMargine(), "3");

    await utente.click(screen.getByText("Salva"));

    expect(salvaObiettivoPeso).toHaveBeenCalledWith(78.5);
    expect(onSalvaMargine).toHaveBeenCalledWith(3);
  });

  it("WeightGoalModal_salvataggioRiuscito_chiamaOnSavedEOnClose", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const utente = userEvent.setup();
    render(
      <WeightGoalModal
        goalKg={null}
        margineKg={2}
        onClose={onClose}
        onSaved={onSaved}
        onSalvaMargine={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    await utente.type(campoObiettivo(), "78.5");

    await utente.click(screen.getByText("Salva"));

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
