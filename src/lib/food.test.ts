import { describe, expect, it } from "vitest";
import { calcolaValoriPorzione, totaliVoci, type AlimentoCatalogo } from "./food";

function creaAlimentoCatalogo(extra: Partial<AlimentoCatalogo> = {}): AlimentoCatalogo {
  return {
    id: 1,
    nome: "Pasta",
    unita: "g",
    kcal_100: 350,
    proteine_100: 12,
    carboidrati_100: 70,
    grassi_100: 2,
    zuccheri_100: null,
    grassi_saturi_100: null,
    fibre_100: null,
    sale_100: null,
    da_etichetta: false,
    ...extra,
  };
}

describe("calcolaValoriPorzione", () => {
  it("calcolaValoriPorzione_quantitaCento_ritornaIValoriPer100Invariati", () => {
    const alimento = creaAlimentoCatalogo();

    const porzione = calcolaValoriPorzione(alimento, 100);

    expect(porzione.kcal).toBe(350);
  });

  it("calcolaValoriPorzione_quantitaDiversaDaCento_scalaProporzionalmente", () => {
    const alimento = creaAlimentoCatalogo();

    const porzione = calcolaValoriPorzione(alimento, 50);

    expect(porzione.kcal).toBe(175);
  });

  it("calcolaValoriPorzione_campoOpzionaleNonImpostato_restaNull", () => {
    const alimento = creaAlimentoCatalogo({ fibre_100: null });

    const porzione = calcolaValoriPorzione(alimento, 200);

    expect(porzione.fibreG).toBeNull();
  });

  it("calcolaValoriPorzione_campoOpzionaleImpostato_vieneScalatoComeGliAltri", () => {
    const alimento = creaAlimentoCatalogo({ fibre_100: 4 });

    const porzione = calcolaValoriPorzione(alimento, 200);

    expect(porzione.fibreG).toBe(8);
  });
});

describe("totaliVoci", () => {
  it("totaliVoci_nessunaVoce_ritornaTuttiIValoriAZero", () => {
    const totali = totaliVoci([]);

    expect(totali).toEqual({ kcal: 0, proteineG: 0, carboidratiG: 0, grassiG: 0 });
  });

  it("totaliVoci_piuVoci_sommaOgniNutrienteIndipendentemente", () => {
    const totali = totaliVoci([
      { kcal: 100, proteineG: 5, carboidratiG: 10, grassiG: 2 },
      { kcal: 200, proteineG: 10, carboidratiG: 20, grassiG: 4 },
    ]);

    expect(totali).toEqual({ kcal: 300, proteineG: 15, carboidratiG: 30, grassiG: 6 });
  });
});
