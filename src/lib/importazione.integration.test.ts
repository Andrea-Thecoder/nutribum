// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creaDbDiTest, type TestDb } from "../test/sqliteTestDb";

let db: TestDb;

vi.mock("./db", () => ({
  getDb: () => Promise.resolve(db),
}));

const { importaGiorno, importaGiorniCsv, parseGiornoCsv } = await import("./importazione");
const { creaAlimento, elencaDiarioGiorno } = await import("./food");

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

describe("importaGiorno", () => {
  it("importaGiorno_alimentoAssenteDalCatalogo_rifiutaLInteroGiornoSenzaScrivereNulla", async () => {
    await expect(
      importaGiorno({
        data: "2024-01-01",
        pasti: [{ tipo: "pranzo", alimenti: [{ nome: "Pasta", quantita: 100 }] }],
      }),
    ).rejects.toThrow("non presenti nel catalogo");

    expect(await elencaDiarioGiorno("2024-01-01")).toEqual([]);
  });

  it("importaGiorno_tuttiGliAlimentiNelCatalogo_registraUnaVocePerAlimento", async () => {
    await creaAlimento(nuovoAlimentoInput("Pasta"));

    const esito = await importaGiorno({
      data: "2024-01-01",
      pasti: [{ tipo: "pranzo", alimenti: [{ nome: "Pasta", quantita: 100 }] }],
    });

    expect(esito.vociInserite).toBe(1);
  });

  it("importaGiorno_kcalDichiarateDiverseDalCatalogo_segnalaLAvvisoMaUsaIlCatalogo", async () => {
    await creaAlimento(nuovoAlimentoInput("Pasta"));

    const esito = await importaGiorno({
      data: "2024-01-01",
      pasti: [{ tipo: "pranzo", alimenti: [{ nome: "Pasta", quantita: 100, kcal: 999 }] }],
    });

    expect(esito.avvisiMismatch).toHaveLength(1);
    const diario = await elencaDiarioGiorno("2024-01-01");
    expect(diario[0].kcal).toBe(350);
  });
});

describe("importaGiorniCsv", () => {
  it("importaGiorniCsv_unGiornoConAlimentoMancante_nonBloccaGliAltriGiorniDelFile", async () => {
    await creaAlimento(nuovoAlimentoInput("Pasta"));
    const parsati = parseGiornoCsv(
      "data,tipo,nome,quantita\n2024-01-01,pranzo,Pasta,100\n2024-01-02,pranzo,Alimento Ignoto,50",
    );

    const esito = await importaGiorniCsv(parsati);

    expect(esito.giorniImportati).toBe(1);
    expect(esito.erroriGiorno).toEqual([
      { data: "2024-01-02", messaggio: expect.stringContaining("Alimento Ignoto") },
    ]);
  });
});
