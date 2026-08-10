// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creaDbDiTest, type TestDb } from "../test/sqliteTestDb";

let db: TestDb;

vi.mock("./db", () => ({
  getDb: () => Promise.resolve(db),
}));

const { importaAlimentiMassivo, parseAlimentiJson } = await import("./importazioneAlimenti");
const { creaAlimento, elencaAlimenti } = await import("./food");

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

describe("importaAlimentiMassivo", () => {
  it("importaAlimentiMassivo_alimentiNuovi_liInseriscePerIntero", async () => {
    const parsati = parseAlimentiJson(
      JSON.stringify([
        { nome: "Pasta", kcal_100: 350, proteine_100: 12, carboidrati_100: 70, grassi_100: 2 },
        { nome: "Riso", kcal_100: 330, proteine_100: 7, carboidrati_100: 80, grassi_100: 1 },
      ]),
    );

    const esito = await importaAlimentiMassivo(parsati);

    expect(esito.inseriti).toBe(2);
  });

  it("importaAlimentiMassivo_alimentoGiaNelCatalogo_lometteTraISaltatiSenzaDuplicarlo", async () => {
    await creaAlimento(nuovoAlimentoInput("Pasta"));
    const parsati = parseAlimentiJson(
      JSON.stringify([{ nome: "pasta", kcal_100: 350, proteine_100: 12, carboidrati_100: 70, grassi_100: 2 }]),
    );

    const esito = await importaAlimentiMassivo(parsati);

    expect(esito.saltatiEsistenti).toEqual(["pasta"]);
    expect(await elencaAlimenti()).toHaveLength(1);
  });

  it("importaAlimentiMassivo_duplicatoTraLeRigheDelloStessoFile_neInserisceUnoSolo", async () => {
    const parsati = parseAlimentiJson(
      JSON.stringify([
        { nome: "Pasta", kcal_100: 350, proteine_100: 12, carboidrati_100: 70, grassi_100: 2 },
        { nome: "Pasta", kcal_100: 300, proteine_100: 10, carboidrati_100: 60, grassi_100: 1 },
      ]),
    );

    const esito = await importaAlimentiMassivo(parsati);

    expect(esito.inseriti).toBe(1);
    expect(esito.saltatiEsistenti).toEqual(["Pasta"]);
  });
});
