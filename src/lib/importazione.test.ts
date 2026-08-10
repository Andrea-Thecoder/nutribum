import { describe, expect, it } from "vitest";
import { parseGiornoCsv } from "./importazione";

describe("parseGiornoCsv", () => {
  it("parseGiornoCsv_contenutoJson_lanciaUnErroreParlante", () => {
    expect(() => parseGiornoCsv("[]")).toThrow("sembra JSON");
  });

  it("parseGiornoCsv_csvVuoto_lanciaUnErrore", () => {
    expect(() => parseGiornoCsv("")).toThrow("vuoto");
  });

  it("parseGiornoCsv_colonneObbligatorieMancanti_lanciaUnErrore", () => {
    expect(() => parseGiornoCsv("data,tipo\n2024-01-01,pranzo")).toThrow("obbligatorie");
  });

  it("parseGiornoCsv_righeValideStessoGiornoEPasto_leRaggruppaNelloStessoPasto", () => {
    const risultato = parseGiornoCsv(
      "data,tipo,nome,quantita\n2024-01-01,pranzo,Pasta,100\n2024-01-01,pranzo,Pomodoro,200",
    );

    expect(risultato.giorni).toHaveLength(1);
    expect(risultato.giorni[0].pasti).toHaveLength(1);
    expect(risultato.giorni[0].pasti[0].alimenti).toHaveLength(2);
  });

  it("parseGiornoCsv_righeConDateDiverse_produceGiorniDistintiInOrdineCronologico", () => {
    const risultato = parseGiornoCsv(
      "data,tipo,nome,quantita\n2024-01-02,pranzo,Pasta,100\n2024-01-01,pranzo,Pasta,100",
    );

    expect(risultato.giorni.map((g) => g.data)).toEqual(["2024-01-01", "2024-01-02"]);
  });

  it("parseGiornoCsv_rigaConQuantitaInvalida_lometteTraGliErroriSenzaBloccareLeAltre", () => {
    const risultato = parseGiornoCsv(
      "data,tipo,nome,quantita\n2024-01-01,pranzo,Pasta,abc\n2024-01-01,pranzo,Pomodoro,200",
    );

    expect(risultato.errori).toHaveLength(1);
    expect(risultato.giorni[0].pasti[0].alimenti).toHaveLength(1);
  });
});
