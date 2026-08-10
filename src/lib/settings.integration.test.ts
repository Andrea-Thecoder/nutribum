// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creaFsDiTest, type TestFsPlugin } from "../test/fsTestDir";

let testFs: TestFsPlugin;

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: (path: string) => testFs.exists(path),
  mkdir: (path: string, opts?: { recursive?: boolean }) => testFs.mkdir(path, opts),
  readTextFile: (path: string) => testFs.readTextFile(path),
  writeTextFile: (path: string, contenuto: string) => testFs.writeTextFile(path, contenuto),
  BaseDirectory: { AppData: 0 },
}));

const { caricaImpostazioni, salvaImpostazioni, IMPOSTAZIONI_DEFAULT } = await import("./settings");

beforeEach(async () => {
  testFs = await creaFsDiTest();
});

afterEach(async () => {
  await testFs.cleanup();
});

describe("caricaImpostazioni", () => {
  it("caricaImpostazioni_nessunFileSalvatoAncora_ritornaIDefault", async () => {
    const impostazioni = await caricaImpostazioni();

    expect(impostazioni).toEqual(IMPOSTAZIONI_DEFAULT);
  });
});

describe("salvaImpostazioni + caricaImpostazioni", () => {
  it("salvaImpostazioni_patchParziale_vieneUnitaAiDefaultPerICampiNonToccati", async () => {
    await salvaImpostazioni({ mostraGriglia: false });

    const impostazioni = await caricaImpostazioni();

    expect(impostazioni).toEqual({ ...IMPOSTAZIONI_DEFAULT, mostraGriglia: false });
  });

  it("salvaImpostazioni_duePatchSuccessive_nonSiSovrascrivonoACausaDelReadModifyWrite", async () => {
    await salvaImpostazioni({ mostraGriglia: false });
    await salvaImpostazioni({ aggiornamentiAutomatici: true });

    const impostazioni = await caricaImpostazioni();

    expect(impostazioni).toEqual({
      ...IMPOSTAZIONI_DEFAULT,
      mostraGriglia: false,
      aggiornamentiAutomatici: true,
    });
  });
});
