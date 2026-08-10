import { describe, expect, it } from "vitest";
import { parseWeightCsv, parseWeightJson } from "./importWeight";

describe("parseWeightJson", () => {
  it("parseWeightJson_contenutoNonJson_lanciaUnErroreParlante", () => {
    expect(() => parseWeightJson("data,peso_kg\n2024-01-01,80")).toThrow("non sembra JSON");
  });

  it("parseWeightJson_jsonNonArray_lanciaUnErrore", () => {
    expect(() => parseWeightJson('{"data":"2024-01-01"}')).toThrow("array");
  });

  it("parseWeightJson_misurazioneValida_lometteTraLeValide", () => {
    const risultato = parseWeightJson(JSON.stringify([{ data: "2024-01-01", peso_kg: 80 }]));

    expect(risultato.validi).toEqual([{ data: "2024-01-01", pesoKg: 80 }]);
  });

  it("parseWeightJson_pesoNonPositivo_lometteTraGliErrori", () => {
    const risultato = parseWeightJson(JSON.stringify([{ data: "2024-01-01", peso_kg: -5 }]));

    expect(risultato.errori).toHaveLength(1);
  });
});

describe("parseWeightCsv", () => {
  it("parseWeightCsv_contenutoJson_lanciaUnErroreParlante", () => {
    expect(() => parseWeightCsv("[]")).toThrow("sembra JSON");
  });

  it("parseWeightCsv_colonneObbligatorieMancanti_lanciaUnErrore", () => {
    expect(() => parseWeightCsv("data\n2024-01-01")).toThrow("obbligatorie");
  });

  it("parseWeightCsv_righeValide_leParsaTutte", () => {
    const risultato = parseWeightCsv("data,peso_kg\n2024-01-01,80\n2024-01-02,79.5");

    expect(risultato.validi).toEqual([
      { data: "2024-01-01", pesoKg: 80 },
      { data: "2024-01-02", pesoKg: 79.5 },
    ]);
  });
});
