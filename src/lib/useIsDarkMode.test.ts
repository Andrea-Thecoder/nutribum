import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsDarkMode } from "./useIsDarkMode";

type Listener = () => void;

// Stub locale (non quello globale di setup.ts, sempre matches:false): serve controllare il valore
// e simulare l'evento "change" per verificare che il hook si aggiorni davvero, non solo al mount.
function installaMatchMediaControllabile(matchesIniziale: boolean) {
  let matches = matchesIniziale;
  const listeners = new Set<Listener>();
  const originale = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;

  return {
    cambiaValore: (nuovoValore: boolean) => {
      matches = nuovoValore;
      listeners.forEach((l) => l());
    },
    ripristina: () => {
      window.matchMedia = originale;
    },
  };
}

describe("useIsDarkMode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("useIsDarkMode_prefersColorSchemeChiaro_ritornaFalse", () => {
    const stub = installaMatchMediaControllabile(false);
    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBe(false);
    stub.ripristina();
  });

  it("useIsDarkMode_prefersColorSchemeScuro_ritornaTrue", () => {
    const stub = installaMatchMediaControllabile(true);
    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBe(true);
    stub.ripristina();
  });

  it("useIsDarkMode_eventoChangeDelSistema_aggiornaIlValoreRitornato", () => {
    const stub = installaMatchMediaControllabile(false);
    const { result } = renderHook(() => useIsDarkMode());
    expect(result.current).toBe(false);

    act(() => stub.cambiaValore(true));

    expect(result.current).toBe(true);
    stub.ripristina();
  });
});
