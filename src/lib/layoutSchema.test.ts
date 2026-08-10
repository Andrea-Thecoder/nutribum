import { describe, expect, it } from "vitest";
import { dimensioneMinima, layoutDiDefault } from "./layoutSchema";

describe("dimensioneMinima", () => {
  it("dimensioneMinima_tipoConDimensioneDedicata_ritornaQuellaSpecifica", () => {
    expect(dimensioneMinima("calendario")).toEqual({ w: 4, h: 6 });
  });

  it("dimensioneMinima_tipoSenzaDimensioneDedicata_ritornaIlDefault", () => {
    // Ogni TipoPannello attuale ha già una voce dedicata in DIMENSIONI_MINIME: il fallback esiste
    // solo per un tipo futuro non ancora mappato, va quindi forzato con un valore fuori dall'union.
    expect(dimensioneMinima("tipo-futuro-non-mappato" as never)).toEqual({ w: 2, h: 2 });
  });
});

describe("layoutDiDefault", () => {
  it("layoutDiDefault_layoutIniziale_contieneUnSoloPannelloCalendario", () => {
    const layout = layoutDiDefault();

    expect(layout.pannelli).toHaveLength(1);
    expect(layout.pannelli[0].tipo).toBe("calendario");
  });
});
