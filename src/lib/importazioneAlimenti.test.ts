import { describe, expect, it } from "vitest";
import { parseAlimentiCsv, parseAlimentiJson } from "./importazioneAlimenti";

describe("parseAlimentiJson", () => {
  it("parseAlimentiJson_contenutoNonJson_lanciaUnErroreParlante", () => {
    expect(() => parseAlimentiJson("nome,kcal_100\nPasta,350")).toThrow("non sembra JSON");
  });

  it("parseAlimentiJson_jsonNonArray_lanciaUnErrore", () => {
    expect(() => parseAlimentiJson('{"nome":"Pasta"}')).toThrow("array di alimenti");
  });

  it("parseAlimentiJson_alimentoValido_lometteTraIValidi", () => {
    const risultato = parseAlimentiJson(
      JSON.stringify([{ nome: "Pasta", kcal_100: 350, proteine_100: 12, carboidrati_100: 70, grassi_100: 2 }]),
    );

    expect(risultato.validi).toEqual([
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

  it("parseAlimentiJson_alimentoConCampoObbligatorioMancante_lometteTraGliErrori", () => {
    const risultato = parseAlimentiJson(JSON.stringify([{ nome: "Pasta" }]));

    expect(risultato.errori).toHaveLength(1);
    expect(risultato.validi).toEqual([]);
  });

  it("parseAlimentiJson_piuAlimentiConUnoInvalido_separaValidiEdErroriPerRiga", () => {
    const risultato = parseAlimentiJson(
      JSON.stringify([
        { nome: "Pasta", kcal_100: 350, proteine_100: 12, carboidrati_100: 70, grassi_100: 2 },
        { nome: "" },
      ]),
    );

    expect(risultato.validi).toHaveLength(1);
    expect(risultato.errori).toEqual([{ riga: 2, messaggio: expect.stringContaining("nome") }]);
  });
});

describe("parseAlimentiCsv", () => {
  it("parseAlimentiCsv_contenutoJson_lanciaUnErroreParlante", () => {
    expect(() => parseAlimentiCsv("[]")).toThrow("sembra JSON");
  });

  it("parseAlimentiCsv_csvVuoto_lanciaUnErrore", () => {
    expect(() => parseAlimentiCsv("")).toThrow("vuoto");
  });

  it("parseAlimentiCsv_colonnaNonRiconosciuta_lanciaUnErrore", () => {
    expect(() => parseAlimentiCsv("nome,colonna_a_caso\nPasta,1")).toThrow("non riconosciute");
  });

  it("parseAlimentiCsv_intestazioneValida_parsaLaRigaInUnAlimentoValido", () => {
    const risultato = parseAlimentiCsv("nome,kcal_100,proteine_100,carboidrati_100,grassi_100\nPasta,350,12,70,2");

    expect(risultato.validi).toEqual([
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

  it("parseAlimentiCsv_daEtichettaSi_vieneCoerciteATrue", () => {
    const risultato = parseAlimentiCsv(
      "nome,kcal_100,proteine_100,carboidrati_100,grassi_100,da_etichetta\nPasta,350,12,70,2,si",
    );

    expect(risultato.validi[0].da_etichetta).toBe(true);
  });
});
