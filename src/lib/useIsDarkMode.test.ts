import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useIsDarkMode } from "./useIsDarkMode";

describe("useIsDarkMode", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("useIsDarkMode_classeDarkAssenteSuHtml_ritornaFalse", () => {
    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBe(false);
  });

  it("useIsDarkMode_classeDarkPresenteSuHtml_ritornaTrue", () => {
    document.documentElement.classList.add("dark");

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBe(true);
  });

  it("useIsDarkMode_classeDarkAggiuntaDopoIlMount_aggiornaIlValoreRitornato", async () => {
    const { result } = renderHook(() => useIsDarkMode());

    await act(async () => {
      document.documentElement.classList.add("dark");
      await Promise.resolve();
    });

    expect(result.current).toBe(true);
  });
});
