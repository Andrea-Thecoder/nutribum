// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creaDbDiTest, type TestDb } from "../test/sqliteTestDb";

let db: TestDb;

vi.mock("./db", () => ({
  getDb: () => Promise.resolve(db),
}));

const { importWeightBulk, parseWeightJson } = await import("./importWeight");
const { registraPeso, elencaPesoCompleto } = await import("./weight");

beforeEach(() => {
  db = creaDbDiTest();
});

afterEach(() => {
  db.close();
});

describe("importWeightBulk", () => {
  it("importWeightBulk_dateNuove_leContaComeInserite", async () => {
    const parsati = parseWeightJson(JSON.stringify([{ data: "2024-01-01", peso_kg: 80 }]));

    const esito = await importWeightBulk(parsati);

    expect(esito).toEqual({ inseriti: 1, aggiornati: 0, errori: [] });
  });

  it("importWeightBulk_dataGiaPresente_laContaComeAggiornataESovrascriveIlValore", async () => {
    await registraPeso("2024-01-01", 80);
    const parsati = parseWeightJson(JSON.stringify([{ data: "2024-01-01", peso_kg: 79 }]));

    const esito = await importWeightBulk(parsati);

    expect(esito).toEqual({ inseriti: 0, aggiornati: 1, errori: [] });
    expect(await elencaPesoCompleto()).toEqual([{ data: "2024-01-01", pesoKg: 79 }]);
  });
});
