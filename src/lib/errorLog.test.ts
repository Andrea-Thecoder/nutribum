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
const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invoke(...args) }));

const { registraErroreFataleEChiudi, registraErroreNonBloccante } = await import("./errorLog");

function percorsoOggi(suffisso = ""): string {
  const oggi = new Date().toISOString().slice(0, 10);
  return `logs/${oggi}-error-log${suffisso}.txt`;
}

beforeEach(async () => {
  testFs = await creaFsDiTest();
  invoke.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  await testFs.cleanup();
});

// registraErroreNonBloccante è fire-and-forget (non ritorna una promise da attendere) e la
// scrittura reale passa da più await concatenati (exists, eventuale mkdir, readTextFile,
// writeTextFile): un singolo setTimeout(0) non garantisce che siano tutti completati, specialmente
// quando la suite intera gira sotto carico (il fallimento era intermittente solo in quel caso, non
// eseguendo questo file da solo) - si fa polling sul contenuto reale invece di indovinare un ritardo.
async function attendiRigheNelFile(percorso: string, numeroAtteso: number, timeoutMs = 2000): Promise<string> {
  const scadenza = Date.now() + timeoutMs;
  for (;;) {
    if (await testFs.exists(percorso)) {
      const contenuto = await testFs.readTextFile(percorso);
      if (contenuto.trim().split("\n").length >= numeroAtteso) return contenuto;
    }
    if (Date.now() > scadenza) {
      throw new Error(`Timeout in attesa di ${numeroAtteso} righe in ${percorso}`);
    }
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe("registraErroreNonBloccante", () => {
  it("registraErroreNonBloccante_primoErrore_creaIlFileDiLogDelGiornoConLaCausa", async () => {
    registraErroreNonBloccante(new Error("qualcosa è rotto"), "test caso 1");

    const contenuto = await attendiRigheNelFile(percorsoOggi(), 1);

    expect(contenuto).toContain("qualcosa è rotto");
    expect(contenuto).toContain("causa: test caso 1");
  });

  it("registraErroreNonBloccante_dueErroriDiSeguito_liAccodaNelloStessoFileInveceDiSovrascrivere", async () => {
    registraErroreNonBloccante(new Error("primo"), "causa 1");
    await attendiRigheNelFile(percorsoOggi(), 1);
    registraErroreNonBloccante(new Error("secondo"), "causa 2");

    const contenuto = await attendiRigheNelFile(percorsoOggi(), 2);

    expect(contenuto.trim().split("\n")).toHaveLength(2);
  });

  it("registraErroreNonBloccante_gravitaNormale_nonScriveNelFileCritico", async () => {
    registraErroreNonBloccante(new Error("errore lieve"), "causa");
    await attendiRigheNelFile(percorsoOggi(), 1);

    await expect(testFs.exists(percorsoOggi("-critical"))).resolves.toBe(false);
  });
});

describe("registraErroreFataleEChiudi", () => {
  it("registraErroreFataleEChiudi_scriveNelFileCriticoNonInQuelloNormale", async () => {
    await registraErroreFataleEChiudi(new Error("crash all'avvio"), "causa fatale");

    const contenuto = await testFs.readTextFile(percorsoOggi("-critical"));
    expect(contenuto).toContain("crash all'avvio");
    await expect(testFs.exists(percorsoOggi())).resolves.toBe(false);
  });

  it("registraErroreFataleEChiudi_sempre_invocaLaChiusuraDellApp", async () => {
    await registraErroreFataleEChiudi(new Error("crash all'avvio"), "causa fatale");

    expect(invoke).toHaveBeenCalledWith("chiudi_app_per_errore");
  });

  it("registraErroreFataleEChiudi_ancheSeLaScritturaDelLogFallisce_chiudeComunqueLApp", async () => {
    testFs.writeTextFile = vi.fn().mockRejectedValue(new Error("disco pieno"));

    await registraErroreFataleEChiudi(new Error("crash all'avvio"), "causa fatale");

    expect(invoke).toHaveBeenCalledWith("chiudi_app_per_errore");
  });
});
