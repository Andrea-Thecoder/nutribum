import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAggiornamenti } from "./useAggiornamenti";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { caricaImpostazioni, salvaImpostazioni, IMPOSTAZIONI_DEFAULT } from "./settings";

vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn() }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }));
vi.mock("./settings", async (importaOriginale) => {
  const originale = await importaOriginale<typeof import("./settings")>();
  return { ...originale, caricaImpostazioni: vi.fn(), salvaImpostazioni: vi.fn() };
});
vi.mock("./errorLog", () => ({ registraErroreNonBloccante: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(caricaImpostazioni).mockResolvedValue({ ...IMPOSTAZIONI_DEFAULT, aggiornamentiAutomatici: false });
});

describe("useAggiornamenti - avvio", () => {
  it("useAggiornamenti_impostazioneAutomaticaDisattivata_nonControllaAllAvvio", async () => {
    const chiedi = vi.fn();
    renderHook(() => useAggiornamenti(chiedi));

    await waitFor(() => expect(caricaImpostazioni).toHaveBeenCalled());
    expect(check).not.toHaveBeenCalled();
  });

  it("useAggiornamenti_impostazioneAutomaticaAttivaDaSessionePrecedente_controllaSubitoSenzaChiedereConferma", async () => {
    vi.mocked(caricaImpostazioni).mockResolvedValue({ ...IMPOSTAZIONI_DEFAULT, aggiornamentiAutomatici: true });
    vi.mocked(check).mockResolvedValue(null);
    const chiedi = vi.fn();
    renderHook(() => useAggiornamenti(chiedi));

    await waitFor(() => expect(check).toHaveBeenCalledTimes(1));
    expect(chiedi).not.toHaveBeenCalled();
  });

  it("useAggiornamenti_controlloAutomaticoSenzaAggiornamenti_nonMostraAlcunEsito", async () => {
    vi.mocked(caricaImpostazioni).mockResolvedValue({ ...IMPOSTAZIONI_DEFAULT, aggiornamentiAutomatici: true });
    vi.mocked(check).mockResolvedValue(null);
    const { result } = renderHook(() => useAggiornamenti(vi.fn()));

    await waitFor(() => expect(check).toHaveBeenCalled());
    expect(result.current.esito).toBeNull();
  });
});

describe("useAggiornamenti - cercaAggiornamenti", () => {
  it("cercaAggiornamenti_utenteNonAutorizzaLaConnessione_nonControlla", async () => {
    const chiedi = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useAggiornamenti(chiedi));
    await waitFor(() => expect(caricaImpostazioni).toHaveBeenCalled());

    await act(() => result.current.cercaAggiornamenti());

    expect(check).not.toHaveBeenCalled();
  });

  it("cercaAggiornamenti_nessunAggiornamentoTrovato_mostraEsitoDiSuccesso", async () => {
    const chiedi = vi.fn().mockResolvedValue(true);
    vi.mocked(check).mockResolvedValue(null);
    const { result } = renderHook(() => useAggiornamenti(chiedi));
    await waitFor(() => expect(caricaImpostazioni).toHaveBeenCalled());

    await act(() => result.current.cercaAggiornamenti());

    expect(result.current.esito).toEqual(
      expect.objectContaining({ tipo: "successo", messaggio: expect.stringContaining("ultima versione") }),
    );
  });

  it("cercaAggiornamenti_aggiornamentoTrovatoEConfermato_scaricaInstallaERiavvia", async () => {
    const chiedi = vi.fn().mockResolvedValue(true);
    const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
    vi.mocked(check).mockResolvedValue({
      version: "2.0.0",
      currentVersion: "1.0.0",
      downloadAndInstall,
    } as unknown as Awaited<ReturnType<typeof check>>);
    const { result } = renderHook(() => useAggiornamenti(chiedi));
    await waitFor(() => expect(caricaImpostazioni).toHaveBeenCalled());

    await act(() => result.current.cercaAggiornamenti());

    expect(downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(relaunch).toHaveBeenCalledTimes(1);
  });

  it("cercaAggiornamenti_aggiornamentoTrovatoMaNonConfermatoDallUtente_nonInstallaNulla", async () => {
    const chiedi = vi
      .fn()
      .mockResolvedValueOnce(true) // autorizza la connessione
      .mockResolvedValueOnce(false); // rifiuta l'installazione
    const downloadAndInstall = vi.fn();
    vi.mocked(check).mockResolvedValue({
      version: "2.0.0",
      currentVersion: "1.0.0",
      downloadAndInstall,
    } as unknown as Awaited<ReturnType<typeof check>>);
    const { result } = renderHook(() => useAggiornamenti(chiedi));
    await waitFor(() => expect(caricaImpostazioni).toHaveBeenCalled());

    await act(() => result.current.cercaAggiornamenti());

    expect(downloadAndInstall).not.toHaveBeenCalled();
    expect(relaunch).not.toHaveBeenCalled();
  });

  it("cercaAggiornamenti_ricercaFallita_mostraEsitoDiErrore", async () => {
    const chiedi = vi.fn().mockResolvedValue(true);
    vi.mocked(check).mockRejectedValue(new Error("nessuna connessione"));
    const { result } = renderHook(() => useAggiornamenti(chiedi));
    await waitFor(() => expect(caricaImpostazioni).toHaveBeenCalled());

    await act(() => result.current.cercaAggiornamenti());

    expect(result.current.esito).toEqual({ tipo: "errore", messaggio: "nessuna connessione" });
  });
});

describe("useAggiornamenti - toggleAggiornamentiAutomatici", () => {
  it("toggleAggiornamentiAutomatici_daDisattivatoConConferma_loAttivaESalva", async () => {
    const chiedi = vi.fn().mockResolvedValue(true);
    vi.mocked(salvaImpostazioni).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAggiornamenti(chiedi));
    await waitFor(() => expect(caricaImpostazioni).toHaveBeenCalled());

    await act(() => result.current.toggleAggiornamentiAutomatici());

    expect(salvaImpostazioni).toHaveBeenCalledWith({ aggiornamentiAutomatici: true });
    expect(result.current.aggiornamentiAutomatici).toBe(true);
  });

  it("toggleAggiornamentiAutomatici_daDisattivatoSenzaConferma_nonCambiaNulla", async () => {
    const chiedi = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useAggiornamenti(chiedi));
    await waitFor(() => expect(caricaImpostazioni).toHaveBeenCalled());

    await act(() => result.current.toggleAggiornamentiAutomatici());

    expect(salvaImpostazioni).not.toHaveBeenCalled();
    expect(result.current.aggiornamentiAutomatici).toBe(false);
  });

  it("toggleAggiornamentiAutomatici_daAttivato_loDisattivaSenzaChiedereConferma", async () => {
    vi.mocked(caricaImpostazioni).mockResolvedValue({ ...IMPOSTAZIONI_DEFAULT, aggiornamentiAutomatici: true });
    vi.mocked(check).mockResolvedValue(null);
    const chiedi = vi.fn();
    const { result } = renderHook(() => useAggiornamenti(chiedi));
    await waitFor(() => expect(result.current.aggiornamentiAutomatici).toBe(true));

    await act(() => result.current.toggleAggiornamentiAutomatici());

    expect(chiedi).not.toHaveBeenCalled();
    expect(salvaImpostazioni).toHaveBeenCalledWith({ aggiornamentiAutomatici: false });
    expect(result.current.aggiornamentiAutomatici).toBe(false);
  });
});
