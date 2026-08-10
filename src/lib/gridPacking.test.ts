import { describe, expect, it } from "vitest";
import { comprimiVerticale, sovrapposti, trovaPosizioneLibera, type Rettangolo } from "./gridPacking";

describe("sovrapposti", () => {
  it("sovrapposti_dueRettangoliDistanti_ritornaFalse", () => {
    const a: Rettangolo = { x: 0, y: 0, w: 2, h: 2 };
    const b: Rettangolo = { x: 5, y: 5, w: 2, h: 2 };

    expect(sovrapposti(a, b)).toBe(false);
  });

  it("sovrapposti_dueRettangoliCheSiIntersecano_ritornaTrue", () => {
    const a: Rettangolo = { x: 0, y: 0, w: 2, h: 2 };
    const b: Rettangolo = { x: 1, y: 1, w: 2, h: 2 };

    expect(sovrapposti(a, b)).toBe(true);
  });

  it("sovrapposti_dueRettangoliAdiacentiSenzaSovrapposizione_ritornaFalse", () => {
    const a: Rettangolo = { x: 0, y: 0, w: 2, h: 2 };
    const b: Rettangolo = { x: 2, y: 0, w: 2, h: 2 };

    expect(sovrapposti(a, b)).toBe(false);
  });
});

describe("trovaPosizioneLibera", () => {
  it("trovaPosizioneLibera_nessunPannelloOccupato_ritornaLOrigine", () => {
    const posizione = trovaPosizioneLibera([], 2, 2);

    expect(posizione).toEqual({ x: 0, y: 0 });
  });

  it("trovaPosizioneLibera_primaRigaOccupata_scendeAllaRigaLibera", () => {
    const occupati: Rettangolo[] = [{ x: 0, y: 0, w: 12, h: 2 }];

    const posizione = trovaPosizioneLibera(occupati, 2, 2);

    expect(posizione).toEqual({ x: 0, y: 2 });
  });

  it("trovaPosizioneLibera_spazioLiberoAFiancoDiUnPannello_lUsaInvecediScendere", () => {
    const occupati: Rettangolo[] = [{ x: 0, y: 0, w: 2, h: 2 }];

    const posizione = trovaPosizioneLibera(occupati, 2, 2);

    expect(posizione).toEqual({ x: 2, y: 0 });
  });
});

describe("comprimiVerticale", () => {
  it("comprimiVerticale_pannelloNonAncoratoConSpazioVuotoSopra_saleInAlto", () => {
    const pannelli = [{ id: "a", x: 0, y: 5, w: 2, h: 2 }];

    const risultato = comprimiVerticale(pannelli);

    expect(risultato[0].y).toBe(0);
  });

  it("comprimiVerticale_pannelloAncorato_nonVieneSpostato", () => {
    const pannelli = [{ id: "a", x: 0, y: 5, w: 2, h: 2, ancorato: true }];

    const risultato = comprimiVerticale(pannelli);

    expect(risultato[0].y).toBe(5);
  });

  it("comprimiVerticale_pannelloNonAncoratoSottoUnPannelloAncorato_siFermaSubitoDopo", () => {
    const pannelli = [
      { id: "ancora", x: 0, y: 0, w: 2, h: 2, ancorato: true },
      { id: "mobile", x: 0, y: 8, w: 2, h: 2 },
    ];

    const risultato = comprimiVerticale(pannelli);

    expect(risultato.find((p) => p.id === "mobile")?.y).toBe(2);
  });
});
