import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDragResize } from "./useDragResize";
import type { Pannello } from "./layoutSchema";

// Con COLS=12 e MARGIN=[12,12] (vedi gridConstants.ts), questa larghezza rende colStepPx un numero
// rotondo (100px): colWidth = (1212 - 12*11 - 24) / 12 = 88, colStepPx = 88 + 12 = 100.
const LARGHEZZA_CONTENITORE = 1212;
const COL_STEP_PX = 100;
const ROW_STEP_PX = 42; // ROW_HEIGHT(30) + MARGIN[1](12)

function creaPannello(overrides: Partial<Pannello> = {}): Pannello {
  return { id: "a", tipo: "calendario", x: 2, y: 3, w: 4, h: 8, ...overrides };
}

function creaEvento(clientX: number, clientY: number) {
  return { clientX, clientY, preventDefault: vi.fn() } as unknown as Parameters<
    ReturnType<typeof useDragResize>["iniziaDrag"]
  >[1];
}

function configuraHook(pannelli: Pannello[], ancorataAllaGriglia = true) {
  let attuali = pannelli;
  const setPannelli = vi.fn((updater: (prev: Pannello[]) => Pannello[]) => {
    attuali = updater(attuali);
  });
  const onCommit = vi.fn();
  const onInizioMovimento = vi.fn();
  const containerRef = { current: null };
  const { result } = renderHook(() =>
    useDragResize(
      attuali,
      setPannelli,
      LARGHEZZA_CONTENITORE,
      onCommit,
      ancorataAllaGriglia,
      onInizioMovimento,
      containerRef,
    ),
  );
  return { result, onCommit, onInizioMovimento, leggiAttuali: () => attuali };
}

function muovi(dxPx: number, dyPx: number, clientXBase: number, clientYBase: number) {
  document.dispatchEvent(new MouseEvent("mousemove", { clientX: clientXBase + dxPx, clientY: clientYBase + dyPx }));
}

function rilascia() {
  document.dispatchEvent(new MouseEvent("mouseup"));
}

describe("useDragResize - iniziaDrag", () => {
  it("iniziaDrag_spostamentoDiDueColonneEUnaRiga_aggiornaXeYDiConseguenza", () => {
    const { result, leggiAttuali } = configuraHook([creaPannello({ x: 2, y: 3 })]);

    result.current.iniziaDrag("a", creaEvento(100, 100));
    muovi(COL_STEP_PX * 2, ROW_STEP_PX * 1, 100, 100);
    rilascia();

    expect(leggiAttuali()[0]).toEqual(expect.objectContaining({ x: 4, y: 4 }));
  });

  it("iniziaDrag_spostamentoOltreIlBordoDestro_clampaXAllaColonnaMassimaConsentita", () => {
    const { result, leggiAttuali } = configuraHook([creaPannello({ x: 2, y: 0, w: 4 })]);

    result.current.iniziaDrag("a", creaEvento(0, 0));
    muovi(COL_STEP_PX * 100, 0, 0, 0);
    rilascia();

    // w=4, COLS=12 -> la colonna massima raggiungibile è 12-4=8.
    expect(leggiAttuali()[0].x).toBe(8);
  });

  it("iniziaDrag_spostamentoVersoValoriNegativi_clampaXeYAZero", () => {
    const { result, leggiAttuali } = configuraHook([creaPannello({ x: 2, y: 3 })]);

    result.current.iniziaDrag("a", creaEvento(0, 0));
    muovi(-COL_STEP_PX * 100, -ROW_STEP_PX * 100, 0, 0);
    rilascia();

    expect(leggiAttuali()[0]).toEqual(expect.objectContaining({ x: 0, y: 0 }));
  });

  it("iniziaDrag_alRilascio_chiamaOnCommitConIPannelliAggiornati", () => {
    const { result, onCommit } = configuraHook([creaPannello({ x: 2, y: 3 })]);

    result.current.iniziaDrag("a", creaEvento(100, 100));
    muovi(COL_STEP_PX, 0, 100, 100);
    rilascia();

    expect(onCommit).toHaveBeenCalledWith([expect.objectContaining({ x: 3, y: 3 })]);
  });

  it("iniziaDrag_ancorataAllaGrigliaFalse_alRilascioArrotondaComunqueAllaCellaPiuVicina", () => {
    const { result, leggiAttuali } = configuraHook([creaPannello({ x: 2, y: 3 })], false);

    result.current.iniziaDrag("a", creaEvento(100, 100));
    // 1.6 colonne di spostamento: senza ancoraggio segue il pixel durante il movimento, ma il
    // rilascio arrotonda comunque alla cella intera più vicina (2 colonne).
    muovi(COL_STEP_PX * 1.6, 0, 100, 100);
    rilascia();

    expect(leggiAttuali()[0].x).toBe(4);
  });

  it("iniziaDrag_chiamataIniziale_notificaOnInizioMovimentoConLId", () => {
    const { result, onInizioMovimento } = configuraHook([creaPannello({ id: "b" })]);

    result.current.iniziaDrag("b", creaEvento(0, 0));
    rilascia();

    expect(onInizioMovimento).toHaveBeenCalledWith("b");
  });
});

describe("useDragResize - iniziaResize", () => {
  it("iniziaResize_direzioneSudEstDiDefault_aumentaLarghezzaEAltezza", () => {
    const { result, leggiAttuali } = configuraHook([creaPannello({ x: 0, y: 0, w: 4, h: 8 })]);

    result.current.iniziaResize("a", creaEvento(0, 0));
    muovi(COL_STEP_PX * 2, ROW_STEP_PX * 3, 0, 0);
    rilascia();

    expect(leggiAttuali()[0]).toEqual(expect.objectContaining({ x: 0, y: 0, w: 6, h: 11 }));
  });

  it("iniziaResize_restringimentoSottoIlMinimo_clampaAllaDimensioneMinimaDelTipo", () => {
    const { result, leggiAttuali } = configuraHook([creaPannello({ x: 0, y: 0, w: 6, h: 8 })]);

    result.current.iniziaResize("a", creaEvento(0, 0));
    muovi(-COL_STEP_PX * 100, -ROW_STEP_PX * 100, 0, 0);
    rilascia();

    // dimensioneMinima("calendario") = { w: 4, h: 6 } (vedi layoutSchema.ts).
    expect(leggiAttuali()[0]).toEqual(expect.objectContaining({ w: 4, h: 6 }));
  });

  it("iniziaResize_direzioneNordOvest_spostaXeYMantenendoFissoIlBordoOpposto", () => {
    const { result, leggiAttuali } = configuraHook([creaPannello({ x: 4, y: 4, w: 4, h: 8 })]);

    result.current.iniziaResize("a", creaEvento(0, 0), "nw");
    muovi(-COL_STEP_PX * 1, -ROW_STEP_PX * 1, 0, 0);
    rilascia();

    // Bordo destro fisso a x+w=8: x scende a 3, w cresce a 5 per restare a 3+5=8.
    // Bordo inferiore fisso a y+h=12: y scende a 3, h cresce a 9 per restare a 3+9=12.
    expect(leggiAttuali()[0]).toEqual(expect.objectContaining({ x: 3, w: 5, y: 3, h: 9 }));
  });
});
