// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creaDbDiTest, type TestDb } from "../test/sqliteTestDb";

let db: TestDb;

vi.mock("./db", () => ({
  getDb: () => Promise.resolve(db),
}));

const { creaAlimento, aggiornaAlimento, eliminaAlimento, elencaAlimenti, registraVoceDiario, elencaDiarioGiorno } =
  await import("./food");

function nuovoAlimentoInput() {
  return {
    nome: "Pasta",
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

beforeEach(() => {
  db = creaDbDiTest();
});

afterEach(() => {
  db.close();
});

describe("creaAlimento + elencaAlimenti", () => {
  it("creaAlimento_alimentoValido_diventaRecuperabileConElencaAlimenti", async () => {
    await creaAlimento(nuovoAlimentoInput());

    const alimenti = await elencaAlimenti();

    expect(alimenti).toHaveLength(1);
  });

  it("elencaAlimenti_piuAlimenti_liOrdinaPerNomeIgnorandoIlCase", async () => {
    await creaAlimento(nuovoAlimentoInput());
    await creaAlimento({ ...nuovoAlimentoInput(), nome: "avocado" });

    const alimenti = await elencaAlimenti();

    expect(alimenti.map((a) => a.nome)).toEqual(["avocado", "Pasta"]);
  });
});

describe("aggiornaAlimento", () => {
  it("aggiornaAlimento_valoriPer100Cambiati_ricalcolaACascataLeVociDiDiarioGiaRegistrate", async () => {
    const id = await creaAlimento(nuovoAlimentoInput());
    const alimento = (await elencaAlimenti())[0];
    await registraVoceDiario(
      { alimentoId: id, data: "2024-01-01", tipoPasto: "pranzo", quantita: 200 },
      alimento,
    );

    await aggiornaAlimento(id, { ...nuovoAlimentoInput(), kcal_100: 400 });

    const diario = await elencaDiarioGiorno("2024-01-01");
    expect(diario[0].kcal).toBe(800);
  });
});

describe("eliminaAlimento", () => {
  it("eliminaAlimento_alimentoUsatoNelDiario_falliceConMessaggioParlante", async () => {
    const id = await creaAlimento(nuovoAlimentoInput());
    const alimento = (await elencaAlimenti())[0];
    await registraVoceDiario(
      { alimentoId: id, data: "2024-01-01", tipoPasto: "pranzo", quantita: 200 },
      alimento,
    );

    await expect(eliminaAlimento(id)).rejects.toThrow("usato in una o più voci del diario");
  });

  it("eliminaAlimento_alimentoNonUsato_vieneRimossoDalCatalogo", async () => {
    const id = await creaAlimento(nuovoAlimentoInput());

    await eliminaAlimento(id);

    expect(await elencaAlimenti()).toEqual([]);
  });
});

describe("registraVoceDiario + elencaDiarioGiorno", () => {
  it("registraVoceDiario_quantitaDiversaDaCento_salvaIValoriGiaScalati", async () => {
    const id = await creaAlimento(nuovoAlimentoInput());
    const alimento = (await elencaAlimenti())[0];

    await registraVoceDiario(
      { alimentoId: id, data: "2024-01-01", tipoPasto: "colazione", quantita: 50 },
      alimento,
    );

    const diario = await elencaDiarioGiorno("2024-01-01");
    expect(diario[0].kcal).toBe(175);
  });

  it("elencaDiarioGiorno_vociDiGiorniDiversi_ritornaSoloQuelleDelGiornoRichiesto", async () => {
    const id = await creaAlimento(nuovoAlimentoInput());
    const alimento = (await elencaAlimenti())[0];
    await registraVoceDiario({ alimentoId: id, data: "2024-01-01", tipoPasto: "pranzo", quantita: 100 }, alimento);
    await registraVoceDiario({ alimentoId: id, data: "2024-01-02", tipoPasto: "pranzo", quantita: 100 }, alimento);

    const diario = await elencaDiarioGiorno("2024-01-01");

    expect(diario).toHaveLength(1);
  });
});
