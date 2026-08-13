import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useImportGiorno } from "./useImportGiorno";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { importaGiorno, importaGiorniCsv, parseGiornoCsv } from "./importazione";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({ readTextFile: vi.fn() }));
vi.mock("./importazione", async (importaOriginale) => {
  const originale = await importaOriginale<typeof import("./importazione")>();
  return { ...originale, importaGiorno: vi.fn(), parseGiornoCsv: vi.fn(), importaGiorniCsv: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useImportGiorno - importaDaJson", () => {
  it("importaDaJson_utenteAnnullaLaSelezioneFile_nonImportaNulla", async () => {
    vi.mocked(open).mockResolvedValue(null);
    const onImportato = vi.fn();
    const { result } = renderHook(() => useImportGiorno(onImportato));

    await act(() => result.current.importaDaJson());

    expect(importaGiorno).not.toHaveBeenCalled();
    expect(onImportato).not.toHaveBeenCalled();
  });

  it("importaDaJson_fileConUnGiornoSingolo_chiamaImportaGiornoUnaVoltaEMostraEsitoDiSuccesso", async () => {
    vi.mocked(open).mockResolvedValue(["/tmp/giorno.json"]);
    vi.mocked(readTextFile).mockResolvedValue(
      JSON.stringify({ data: "2024-01-01", pasti: [{ tipo: "pranzo", alimenti: [{ nome: "Pasta", quantita: 100 }] }] }),
    );
    vi.mocked(importaGiorno).mockResolvedValue({ vociInserite: 1, avvisiMismatch: [] });
    const { result } = renderHook(() => useImportGiorno(vi.fn()));

    await act(() => result.current.importaDaJson());

    expect(importaGiorno).toHaveBeenCalledTimes(1);
    expect(result.current.esito).toEqual({ tipo: "successo", messaggio: expect.stringContaining("1 giorni importati") });
  });

  it("importaDaJson_fileConStoricoMultiGiorno_chiamaImportaGiornoPerOgniGiorno", async () => {
    vi.mocked(open).mockResolvedValue(["/tmp/storico.json"]);
    vi.mocked(readTextFile).mockResolvedValue(
      JSON.stringify({
        giorni: [
          { data: "2024-01-01", pasti: [{ tipo: "pranzo", alimenti: [{ nome: "Pasta", quantita: 100 }] }] },
          { data: "2024-01-02", pasti: [{ tipo: "cena", alimenti: [{ nome: "Riso", quantita: 100 }] }] },
        ],
      }),
    );
    vi.mocked(importaGiorno).mockResolvedValue({ vociInserite: 1, avvisiMismatch: [] });
    const { result } = renderHook(() => useImportGiorno(vi.fn()));

    await act(() => result.current.importaDaJson());

    expect(importaGiorno).toHaveBeenCalledTimes(2);
  });

  it("importaDaJson_unFileNonJsonTraPiuFile_lometteTraGliErroriSenzaBloccareGliAltri", async () => {
    vi.mocked(open).mockResolvedValue(["/tmp/rotto.json", "/tmp/buono.json"]);
    vi.mocked(readTextFile).mockImplementation(async (percorso) =>
      percorso === "/tmp/rotto.json"
        ? "questo non è json"
        : JSON.stringify({ data: "2024-01-01", pasti: [{ tipo: "pranzo", alimenti: [{ nome: "Pasta", quantita: 100 }] }] }),
    );
    vi.mocked(importaGiorno).mockResolvedValue({ vociInserite: 1, avvisiMismatch: [] });
    const { result } = renderHook(() => useImportGiorno(vi.fn()));

    await act(() => result.current.importaDaJson());

    expect(result.current.esito?.tipo).toBe("avviso");
    expect(result.current.esito?.messaggio).toContain("rotto.json");
    expect(importaGiorno).toHaveBeenCalledTimes(1);
  });
});

describe("useImportGiorno - importaDaCsv", () => {
  it("importaDaCsv_utenteAnnullaLaSelezioneFile_nonImportaNulla", async () => {
    vi.mocked(open).mockResolvedValue(null);
    const { result } = renderHook(() => useImportGiorno(vi.fn()));

    await act(() => result.current.importaDaCsv());

    expect(importaGiorniCsv).not.toHaveBeenCalled();
  });

  it("importaDaCsv_csvValido_chiamaImportaGiorniCsvEMostraEsitoDiSuccesso", async () => {
    vi.mocked(open).mockResolvedValue("/tmp/diario.csv");
    vi.mocked(readTextFile).mockResolvedValue("data,tipo,nome,quantita\n2024-01-01,pranzo,Pasta,100");
    vi.mocked(parseGiornoCsv).mockReturnValue({ giorni: [{ data: "2024-01-01", pasti: [] }], errori: [] });
    vi.mocked(importaGiorniCsv).mockResolvedValue({
      giorniImportati: 1,
      vociInserite: 1,
      avvisiMismatch: [],
      erroriGiorno: [],
      erroriRiga: [],
    });
    const onImportato = vi.fn();
    const { result } = renderHook(() => useImportGiorno(onImportato));

    await act(() => result.current.importaDaCsv());

    expect(onImportato).toHaveBeenCalledTimes(1);
    expect(result.current.esito).toEqual({ tipo: "successo", messaggio: expect.stringContaining("1 giorni importati") });
  });

  it("importaDaCsv_conRigheNonValide_mostraEsitoDiAvvisoConIlConteggio", async () => {
    vi.mocked(open).mockResolvedValue("/tmp/diario.csv");
    vi.mocked(readTextFile).mockResolvedValue("data,tipo,nome,quantita\n2024-01-01,pranzo,Pasta,abc");
    vi.mocked(parseGiornoCsv).mockReturnValue({ giorni: [], errori: [{ riga: 2, messaggio: "quantita non valida" }] });
    vi.mocked(importaGiorniCsv).mockResolvedValue({
      giorniImportati: 0,
      vociInserite: 0,
      avvisiMismatch: [],
      erroriGiorno: [],
      erroriRiga: [{ riga: 2, messaggio: "quantita non valida" }],
    });
    const { result } = renderHook(() => useImportGiorno(vi.fn()));

    await act(() => result.current.importaDaCsv());

    expect(result.current.esito?.tipo).toBe("avviso");
    expect(result.current.esito?.messaggio).toContain("1 righe non valide");
  });

  it("chiudiEsito_dopoUnImport_azzeraLEsito", async () => {
    vi.mocked(open).mockResolvedValue(null);
    const { result } = renderHook(() => useImportGiorno(vi.fn()));
    vi.mocked(open).mockResolvedValue("/tmp/diario.csv");
    vi.mocked(readTextFile).mockResolvedValue("data,tipo,nome,quantita\n2024-01-01,pranzo,Pasta,100");
    vi.mocked(parseGiornoCsv).mockReturnValue({ giorni: [{ data: "2024-01-01", pasti: [] }], errori: [] });
    vi.mocked(importaGiorniCsv).mockResolvedValue({
      giorniImportati: 1,
      vociInserite: 1,
      avvisiMismatch: [],
      erroriGiorno: [],
      erroriRiga: [],
    });
    await act(() => result.current.importaDaCsv());
    await waitFor(() => expect(result.current.esito).not.toBeNull());

    act(() => result.current.chiudiEsito());

    expect(result.current.esito).toBeNull();
  });
});
