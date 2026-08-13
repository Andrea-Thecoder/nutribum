import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useImportAlimenti } from "./useImportAlimenti";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { importaAlimentiMassivo } from "./importazioneAlimenti";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({ readTextFile: vi.fn(), BaseDirectory: { Resource: 0 } }));
vi.mock("./importazioneAlimenti", async (importaOriginale) => {
  const originale = await importaOriginale<typeof import("./importazioneAlimenti")>();
  return { ...originale, importaAlimentiMassivo: vi.fn() };
});

const ALIMENTO_JSON = JSON.stringify([
  { nome: "Pasta", kcal_100: 350, proteine_100: 12, carboidrati_100: 70, grassi_100: 2 },
]);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useImportAlimenti - importaDaJson", () => {
  it("importaDaJson_utenteAnnullaLaSelezioneFile_nonImportaNulla", async () => {
    vi.mocked(open).mockResolvedValue(null);
    const { result } = renderHook(() => useImportAlimenti(vi.fn()));

    await act(() => result.current.importaDaJson());

    expect(importaAlimentiMassivo).not.toHaveBeenCalled();
  });

  it("importaDaJson_fileValido_chiamaOnImportatoEMostraEsitoDiSuccesso", async () => {
    vi.mocked(open).mockResolvedValue("/tmp/alimenti.json");
    vi.mocked(readTextFile).mockResolvedValue(ALIMENTO_JSON);
    vi.mocked(importaAlimentiMassivo).mockResolvedValue({ inseriti: 1, saltatiEsistenti: [], errori: [] });
    const onImportato = vi.fn();
    const { result } = renderHook(() => useImportAlimenti(onImportato));

    await act(() => result.current.importaDaJson());

    expect(onImportato).toHaveBeenCalledTimes(1);
    expect(result.current.esito).toEqual({ tipo: "successo", messaggio: "1 alimenti inseriti" });
  });

  it("importaDaJson_alimentiGiaEsistenti_mostraEsitoDiAvvisoConINomiSaltati", async () => {
    vi.mocked(open).mockResolvedValue("/tmp/alimenti.json");
    vi.mocked(readTextFile).mockResolvedValue(ALIMENTO_JSON);
    vi.mocked(importaAlimentiMassivo).mockResolvedValue({ inseriti: 0, saltatiEsistenti: ["Pasta"], errori: [] });
    const { result } = renderHook(() => useImportAlimenti(vi.fn()));

    await act(() => result.current.importaDaJson());

    expect(result.current.esito?.tipo).toBe("avviso");
    expect(result.current.esito?.messaggio).toContain("saltati: Pasta");
  });

  it("importaDaJson_letturaFileFallita_mostraEsitoDiErrore", async () => {
    vi.mocked(open).mockResolvedValue("/tmp/alimenti.json");
    vi.mocked(readTextFile).mockRejectedValue(new Error("permesso negato"));
    const { result } = renderHook(() => useImportAlimenti(vi.fn()));

    await act(() => result.current.importaDaJson());

    expect(result.current.esito).toEqual({ tipo: "errore", messaggio: "permesso negato" });
  });
});

describe("useImportAlimenti - importaEsempio", () => {
  it("importaEsempio_leggeIlCatalogoBundlato_senzaChiedereUnPercorsoAllUtente", async () => {
    vi.mocked(readTextFile).mockResolvedValue(ALIMENTO_JSON);
    vi.mocked(importaAlimentiMassivo).mockResolvedValue({ inseriti: 1, saltatiEsistenti: [], errori: [] });
    const { result } = renderHook(() => useImportAlimenti(vi.fn()));

    await act(() => result.current.importaEsempio());

    expect(open).not.toHaveBeenCalled();
    expect(readTextFile).toHaveBeenCalledWith("alimenti-di-esempio.json", { baseDir: 0 });
    expect(result.current.esito?.tipo).toBe("successo");
  });
});
