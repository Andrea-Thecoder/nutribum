import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useImportWeight } from "./useImportWeight";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { importWeightBulk } from "./importWeight";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({ readTextFile: vi.fn() }));
vi.mock("./importWeight", async (importaOriginale) => {
  const originale = await importaOriginale<typeof import("./importWeight")>();
  return { ...originale, importWeightBulk: vi.fn() };
});

const PESO_JSON = JSON.stringify([{ data: "2024-01-01", peso_kg: 80 }]);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useImportWeight - importFromJson", () => {
  it("importFromJson_utenteAnnullaLaSelezioneFile_nonImportaNulla", async () => {
    vi.mocked(open).mockResolvedValue(null);
    const { result } = renderHook(() => useImportWeight(vi.fn()));

    await act(() => result.current.importFromJson());

    expect(importWeightBulk).not.toHaveBeenCalled();
  });

  it("importFromJson_fileValido_chiamaOnImportedEMostraEsitoDiSuccesso", async () => {
    vi.mocked(open).mockResolvedValue("/tmp/peso.json");
    vi.mocked(readTextFile).mockResolvedValue(PESO_JSON);
    vi.mocked(importWeightBulk).mockResolvedValue({ inseriti: 1, aggiornati: 0, errori: [] });
    const onImported = vi.fn();
    const { result } = renderHook(() => useImportWeight(onImported));

    await act(() => result.current.importFromJson());

    expect(onImported).toHaveBeenCalledTimes(1);
    expect(result.current.result).toEqual({ tipo: "successo", messaggio: "1 misurazioni inserite" });
  });

  it("importFromJson_pesateGiaPresenti_includeIlConteggioAggiornateNelMessaggio", async () => {
    vi.mocked(open).mockResolvedValue("/tmp/peso.json");
    vi.mocked(readTextFile).mockResolvedValue(PESO_JSON);
    vi.mocked(importWeightBulk).mockResolvedValue({ inseriti: 0, aggiornati: 1, errori: [] });
    const { result } = renderHook(() => useImportWeight(vi.fn()));

    await act(() => result.current.importFromJson());

    expect(result.current.result?.messaggio).toContain("1 aggiornate");
  });

  it("importFromJson_conRigheErrate_mostraEsitoDiAvviso", async () => {
    vi.mocked(open).mockResolvedValue("/tmp/peso.json");
    vi.mocked(readTextFile).mockResolvedValue(PESO_JSON);
    vi.mocked(importWeightBulk).mockResolvedValue({
      inseriti: 0,
      aggiornati: 0,
      errori: [{ riga: 2, messaggio: "peso non valido" }],
    });
    const { result } = renderHook(() => useImportWeight(vi.fn()));

    await act(() => result.current.importFromJson());

    expect(result.current.result?.tipo).toBe("avviso");
  });
});

describe("useImportWeight - closeResult", () => {
  it("closeResult_dopoUnImport_azzeraIlRisultato", async () => {
    vi.mocked(open).mockResolvedValue("/tmp/peso.json");
    vi.mocked(readTextFile).mockResolvedValue(PESO_JSON);
    vi.mocked(importWeightBulk).mockResolvedValue({ inseriti: 1, aggiornati: 0, errori: [] });
    const { result } = renderHook(() => useImportWeight(vi.fn()));
    await act(() => result.current.importFromJson());

    act(() => result.current.closeResult());

    expect(result.current.result).toBeNull();
  });
});
