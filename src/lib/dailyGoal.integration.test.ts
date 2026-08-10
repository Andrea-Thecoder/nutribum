// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creaDbDiTest, type TestDb } from "../test/sqliteTestDb";

let db: TestDb;

vi.mock("./db", () => ({
  getDb: () => Promise.resolve(db),
}));

const { salvaObiettivoKcal, salvaObiettivoMacro, leggiObiettivo, elencaStoricoObiettivo } = await import(
  "./dailyGoal"
);

beforeEach(() => {
  db = creaDbDiTest();
});

afterEach(() => {
  db.close();
});

describe("salvaObiettivoKcal + leggiObiettivo", () => {
  it("salvaObiettivoKcal_primoSalvataggio_diventaRecuperabileConLeggiObiettivo", async () => {
    await salvaObiettivoKcal(2000, 1500);

    const obiettivo = await leggiObiettivo();

    expect(obiettivo).toEqual(
      expect.objectContaining({ kcal: 2000, kcalMin: 1500 }),
    );
  });

  it("salvaObiettivoKcal_secondoSalvataggio_sovrascriveIlPrecedenteInvecedDiAggiungereUnaRiga", async () => {
    await salvaObiettivoKcal(2000, 1500);
    await salvaObiettivoKcal(2200, 1600);

    const obiettivo = await leggiObiettivo();

    expect(obiettivo).toEqual(expect.objectContaining({ kcal: 2200, kcalMin: 1600 }));
  });
});

describe("salvaObiettivoKcal + elencaStoricoObiettivo", () => {
  it("salvaObiettivoKcal_ogniSalvataggio_accodaUnoSnapshotAllaStorico", async () => {
    await salvaObiettivoKcal(2000, 1500);
    await salvaObiettivoKcal(2200, 1600);

    const storico = await elencaStoricoObiettivo();

    expect(storico).toHaveLength(2);
  });

  it("salvaObiettivoMacro_gruppoIndipendenteDalKcal_registraUnPuntoDiStoricoSeparato", async () => {
    await salvaObiettivoKcal(2000, 1500);
    await salvaObiettivoMacro({ grassiG: 70, proteineG: 120, carboidratiG: 250 });

    const storico = await elencaStoricoObiettivo();

    expect(storico.map((p) => p.gruppo)).toEqual(["kcal", "macro"]);
  });
});
