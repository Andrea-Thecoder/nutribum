import { beforeEach, describe, expect, it, vi } from "vitest";
import Database from "@tauri-apps/plugin-sql";

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: { load: vi.fn() },
}));

// db.ts tiene la Promise di connessione in una variabile di modulo (la cache/il retry sotto test
// sono proprio quello): serve un modulo fresco ad ogni test, altrimenti il dbPromise di un test
// resterebbe visibile al successivo.
async function importaDbFresco() {
  vi.resetModules();
  return import("./db");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDb", () => {
  it("getDb_connessioneRiuscita_ritornaLIstanzaRestituitaDaDatabaseLoad", async () => {
    const istanza = {} as Database;
    vi.mocked(Database.load).mockResolvedValue(istanza);
    const { getDb } = await importaDbFresco();

    await expect(getDb()).resolves.toBe(istanza);
  });

  it("getDb_secondaChiamataDopoUnaConnessioneRiuscita_nonRichiamaDatabaseLoadDiNuovo", async () => {
    vi.mocked(Database.load).mockResolvedValue({} as Database);
    const { getDb } = await importaDbFresco();
    await getDb();

    await getDb();

    expect(Database.load).toHaveBeenCalledTimes(1);
  });

  it("getDb_connessioneFallita_rilancialErroreConUnMessaggioParlante", async () => {
    vi.mocked(Database.load).mockRejectedValue(new Error("file bloccato"));
    const { getDb } = await importaDbFresco();

    await expect(getDb()).rejects.toThrow("Impossibile connettersi al database: file bloccato");
  });

  it("getDb_connessioneFallitaPerChecksumMigrazione_ilMessaggioSuggerisceLaCausa", async () => {
    vi.mocked(Database.load).mockRejectedValue(new Error("checksum mismatch for migration 1"));
    const { getDb } = await importaDbFresco();

    await expect(getDb()).rejects.toThrow(/migration già applicata modificata/);
  });

  it("getDb_connessioneFallitaPerMotivoNonDiMigrazione_ilMessaggioNonMenzionaLeMigration", async () => {
    vi.mocked(Database.load).mockRejectedValue(new Error("file bloccato"));
    const { getDb } = await importaDbFresco();

    await expect(getDb()).rejects.not.toThrow(/migration/);
  });

  it("getDb_dopoUnaConnessioneFallita_unaNuovaChiamataRiprovaInvecediRestareBloccata", async () => {
    vi.mocked(Database.load).mockRejectedValueOnce(new Error("file bloccato"));
    const { getDb } = await importaDbFresco();
    await expect(getDb()).rejects.toThrow();

    const istanza = {} as Database;
    vi.mocked(Database.load).mockResolvedValueOnce(istanza);
    await expect(getDb()).resolves.toBe(istanza);

    expect(Database.load).toHaveBeenCalledTimes(2);
  });
});
