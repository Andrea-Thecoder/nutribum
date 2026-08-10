// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creaDbDiTest, type TestDb } from "../test/sqliteTestDb";

let db: TestDb;

vi.mock("./db", () => ({
  getDb: () => Promise.resolve(db),
}));

const { esportaBackupCompleto, ripristinaBackupCompleto, svuotaDiario, svuotaTuttiIDati } = await import("./backup");
const { creaAlimento, elencaAlimenti, registraVoceDiario, elencaDiarioGiorno } = await import("./food");
const { salvaProfilo } = await import("./profile");

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

describe("esportaBackupCompleto", () => {
  it("esportaBackupCompleto_datiInPiuTabelle_liIncludeTuttiNelBackup", async () => {
    const id = await creaAlimento(nuovoAlimentoInput("Pasta"));
    const alimento = (await elencaAlimenti())[0];
    await registraVoceDiario({ alimentoId: id, data: "2024-01-01", tipoPasto: "pranzo", quantita: 100 }, alimento);
    await salvaProfilo({ etaAnni: 30, altezzaCm: 180, sesso: "M" });

    const backup = await esportaBackupCompleto();

    expect(backup.food).toHaveLength(1);
    expect(backup.food_log).toHaveLength(1);
    expect(backup.profile).toHaveLength(1);
  });
});

describe("svuotaDiario", () => {
  it("svuotaDiario_vociRegistrate_leCancellaMaLascaIlCatalogoIntatto", async () => {
    const id = await creaAlimento(nuovoAlimentoInput("Pasta"));
    const alimento = (await elencaAlimenti())[0];
    await registraVoceDiario({ alimentoId: id, data: "2024-01-01", tipoPasto: "pranzo", quantita: 100 }, alimento);

    await svuotaDiario();

    expect(await elencaDiarioGiorno("2024-01-01")).toEqual([]);
    expect(await elencaAlimenti()).toHaveLength(1);
  });
});

describe("svuotaTuttiIDati", () => {
  it("svuotaTuttiIDati_catalogoEDiarioPopolati_liCancellaEntrambi", async () => {
    const id = await creaAlimento(nuovoAlimentoInput("Pasta"));
    const alimento = (await elencaAlimenti())[0];
    await registraVoceDiario({ alimentoId: id, data: "2024-01-01", tipoPasto: "pranzo", quantita: 100 }, alimento);

    await svuotaTuttiIDati();

    expect(await elencaAlimenti()).toEqual([]);
  });
});

describe("esportaBackupCompleto + ripristinaBackupCompleto", () => {
  it("ripristinaBackupCompleto_backupDiUnAltroStato_ricostruisceCatalogoEDiarioIdentici", async () => {
    const id = await creaAlimento(nuovoAlimentoInput("Pasta"));
    const alimento = (await elencaAlimenti())[0];
    await registraVoceDiario({ alimentoId: id, data: "2024-01-01", tipoPasto: "pranzo", quantita: 100 }, alimento);
    const backup = await esportaBackupCompleto();

    await svuotaTuttiIDati();
    await ripristinaBackupCompleto(backup);

    expect(await elencaAlimenti()).toHaveLength(1);
    expect(await elencaDiarioGiorno("2024-01-01")).toHaveLength(1);
  });

  it("ripristinaBackupCompleto_idOriginali_vengonoPreservatiPerLeForeignKey", async () => {
    const id = await creaAlimento(nuovoAlimentoInput("Pasta"));
    const alimento = (await elencaAlimenti())[0];
    await registraVoceDiario({ alimentoId: id, data: "2024-01-01", tipoPasto: "pranzo", quantita: 100 }, alimento);
    const backup = await esportaBackupCompleto();

    await svuotaTuttiIDati();
    await ripristinaBackupCompleto(backup);

    const diario = await elencaDiarioGiorno("2024-01-01");
    expect(diario[0].alimentoId).toBe(id);
  });
});
