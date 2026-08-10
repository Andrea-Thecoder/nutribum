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

const { caricaLayout, salvaLayout } = await import("./layoutStorage");
const { layoutDiDefault } = await import("./layoutSchema");

beforeEach(async () => {
  testFs = await creaFsDiTest();
});

afterEach(async () => {
  await testFs.cleanup();
});

describe("caricaLayout", () => {
  it("caricaLayout_nessunLayoutSalvatoAncora_ritornaIlLayoutDiDefault", async () => {
    const layout = await caricaLayout();

    expect(layout).toEqual(layoutDiDefault());
  });
});

describe("salvaLayout + caricaLayout", () => {
  it("salvaLayout_layoutPersonalizzato_diventaRecuperabileConCaricaLayout", async () => {
    const layout = {
      schemaVersion: "1.0",
      pannelli: [{ id: "a", tipo: "peso-corporeo" as const, x: 0, y: 0, w: 4, h: 6 }],
    };

    await salvaLayout(layout);

    expect(await caricaLayout()).toEqual(layout);
  });

  it("salvaLayout_secondoSalvataggio_sovrascriveCompletamenteIlPrecedente", async () => {
    await salvaLayout({ schemaVersion: "1.0", pannelli: [{ id: "a", tipo: "calendario", x: 0, y: 0, w: 4, h: 6 }] });

    await salvaLayout({ schemaVersion: "1.0", pannelli: [] });

    const layout = await caricaLayout();
    expect(layout.pannelli).toEqual([]);
  });
});
