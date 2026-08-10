// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creaDbDiTest, type TestDb } from "../test/sqliteTestDb";

let db: TestDb;

vi.mock("./db", () => ({
  getDb: () => Promise.resolve(db),
}));

const { creaRicetta, aggiornaRicetta, eliminaRicetta, elencaRicette, elencaRicetteConIngredienti } = await import(
  "./recipes"
);
const { creaAlimento } = await import("./food");

beforeEach(() => {
  db = creaDbDiTest();
});

afterEach(() => {
  db.close();
});

function nuovoAlimentoInput(nome: string) {
  return {
    nome,
    unita: "g" as const,
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

describe("creaRicetta + elencaRicette", () => {
  it("creaRicetta_ricettaValida_diventaRecuperabileConElencaRicette", async () => {
    const pastaId = await creaAlimento(nuovoAlimentoInput("Pasta"));

    await creaRicetta("Pasta al pomodoro", [{ alimentoId: pastaId, quantita: 100 }]);

    const ricette = await elencaRicette();
    expect(ricette.map((r) => r.nome)).toEqual(["Pasta al pomodoro"]);
  });
});

describe("creaRicetta + elencaRicetteConIngredienti", () => {
  it("creaRicetta_piuIngredienti_liSalvaTuttiELiRitornaConElencaRicetteConIngredienti", async () => {
    const pastaId = await creaAlimento(nuovoAlimentoInput("Pasta"));
    const pomodoroId = await creaAlimento(nuovoAlimentoInput("Pomodoro"));
    await creaRicetta("Pasta al pomodoro", [
      { alimentoId: pastaId, quantita: 100 },
      { alimentoId: pomodoroId, quantita: 200 },
    ]);

    const [ricetta] = await elencaRicetteConIngredienti();

    expect(ricetta.ingredienti.map((i) => i.nomeAlimento)).toEqual(["Pasta", "Pomodoro"]);
  });
});

describe("aggiornaRicetta", () => {
  it("aggiornaRicetta_nuovoElencoIngredienti_sostituisceCompletamenteQuelloPrecedente", async () => {
    const pastaId = await creaAlimento(nuovoAlimentoInput("Pasta"));
    const pomodoroId = await creaAlimento(nuovoAlimentoInput("Pomodoro"));
    const ricettaId = await creaRicetta("Pasta al pomodoro", [{ alimentoId: pastaId, quantita: 100 }]);

    await aggiornaRicetta(ricettaId, "Pasta al pomodoro", [{ alimentoId: pomodoroId, quantita: 200 }]);

    const [ricetta] = await elencaRicetteConIngredienti();
    expect(ricetta.ingredienti.map((i) => i.nomeAlimento)).toEqual(["Pomodoro"]);
  });
});

describe("eliminaRicetta", () => {
  it("eliminaRicetta_ricettaEsistente_laRimuoveConITuoiIngredienti", async () => {
    const pastaId = await creaAlimento(nuovoAlimentoInput("Pasta"));
    const ricettaId = await creaRicetta("Pasta al pomodoro", [{ alimentoId: pastaId, quantita: 100 }]);

    await eliminaRicetta(ricettaId);

    expect(await elencaRicette()).toEqual([]);
  });
});
