import { describe, expect, it } from "vitest";
import { foodsToCsv, foodsToJson } from "./exportFoods";
import type { AlimentoCatalogo } from "./food";

const PASTA: AlimentoCatalogo = {
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
};

describe("foodsToJson", () => {
  it("foodsToJson_alimento_omette_lIdDalCatalogoEsportato", () => {
    const json = foodsToJson([PASTA]);

    expect(JSON.parse(json)).toEqual([
      {
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
      },
    ]);
  });
});

describe("foodsToCsv", () => {
  it("foodsToCsv_unAlimento_produceUnaRigaConTuttiICampi", () => {
    const csv = foodsToCsv([PASTA]);

    expect(csv).toBe(
      "nome,unita,kcal_100,proteine_100,carboidrati_100,grassi_100,zuccheri_100,grassi_saturi_100,fibre_100,sale_100,da_etichetta\n" +
        "Pasta,g,350,12,70,2,,,,,0\n",
    );
  });

  it("foodsToCsv_daEtichettaTrue_loScriveComeUnoNonComeTestoTrue", () => {
    const csv = foodsToCsv([{ ...PASTA, da_etichetta: true }]);

    expect(csv).toContain(",1\n");
  });
});
