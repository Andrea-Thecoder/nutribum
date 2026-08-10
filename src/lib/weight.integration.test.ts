// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creaDbDiTest, type TestDb } from "../test/sqliteTestDb";

let db: TestDb;

vi.mock("./db", () => ({
  getDb: () => Promise.resolve(db),
}));

const { registraPeso, eliminaPeso, elencaPesoCompleto, salvaObiettivoPeso, leggiObiettivoPeso, elencaStoricoObiettivoPeso } =
  await import("./weight");

beforeEach(() => {
  db = creaDbDiTest();
});

afterEach(() => {
  db.close();
});

describe("registraPeso + elencaPesoCompleto", () => {
  it("registraPeso_primaPesataDelGiorno_diventaRecuperabile", async () => {
    await registraPeso("2024-01-01", 80);

    const peso = await elencaPesoCompleto();

    expect(peso).toEqual([{ data: "2024-01-01", pesoKg: 80 }]);
  });

  it("registraPeso_secondaPesataStessoGiorno_correggeQuellaPrecedenteInvecediAggiungerne", async () => {
    await registraPeso("2024-01-01", 80);
    await registraPeso("2024-01-01", 79.5);

    const peso = await elencaPesoCompleto();

    expect(peso).toEqual([{ data: "2024-01-01", pesoKg: 79.5 }]);
  });
});

describe("eliminaPeso", () => {
  it("eliminaPeso_pesataEsistente_laRimuoveDallElenco", async () => {
    await registraPeso("2024-01-01", 80);

    await eliminaPeso("2024-01-01");

    expect(await elencaPesoCompleto()).toEqual([]);
  });
});

describe("salvaObiettivoPeso + leggiObiettivoPeso + elencaStoricoObiettivoPeso", () => {
  it("salvaObiettivoPeso_primoSalvataggio_diventaRecuperabile", async () => {
    await salvaObiettivoPeso(75);

    expect(await leggiObiettivoPeso()).toBe(75);
  });

  it("salvaObiettivoPeso_ogniImpostazione_vieneAccodataAlloStoricoAppendOnly", async () => {
    await salvaObiettivoPeso(75);
    await salvaObiettivoPeso(73);

    const storico = await elencaStoricoObiettivoPeso();

    expect(storico.map((p) => p.targetKg)).toEqual([75, 73]);
  });

  it("salvaObiettivoPeso_rimozioneConTargetNull_nonGeneraUnaVoceDiStorico", async () => {
    await salvaObiettivoPeso(75);
    await salvaObiettivoPeso(null);

    const storico = await elencaStoricoObiettivoPeso();

    expect(storico).toHaveLength(1);
  });
});
