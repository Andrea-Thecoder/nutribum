import { describe, expect, it } from "vitest";
import { generateCsv, parseRigheCsv } from "./csv";

describe("parseRigheCsv", () => {
  it("parseRigheCsv_righeSemplici_leDivideInCampiPerVirgola", () => {
    const righe = parseRigheCsv("a,b,c\n1,2,3\n");

    expect(righe).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("parseRigheCsv_campoTraVirgoletteConVirgolaInterna_nonLoSpezza", () => {
    const righe = parseRigheCsv('nome,note\n"Mario","Ciao, tutto bene"\n');

    expect(righe[1]).toEqual(["Mario", "Ciao, tutto bene"]);
  });

  it("parseRigheCsv_virgoletteDoppieEscapate_diventanoUnaVirgolettaLetterale", () => {
    const righe = parseRigheCsv('nome\n"Il ""migliore"""\n');

    expect(righe[1]).toEqual(['Il "migliore"']);
  });

  it("parseRigheCsv_righeConCrLf_lasTrattaComeUnAcapoSingolo", () => {
    const righe = parseRigheCsv("a,b\r\n1,2\r\n");

    expect(righe).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("parseRigheCsv_righeVuote_vengonoScartate", () => {
    const righe = parseRigheCsv("a,b\n\n1,2\n");

    expect(righe).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("generateCsv", () => {
  it("generateCsv_datiSemplici_produceUnaRigaHeaderPiuUnaRigaPerElemento", () => {
    const csv = generateCsv(["nome", "kcal"], [["Pasta", 350]]);

    expect(csv).toBe("nome,kcal\nPasta,350\n");
  });

  it("generateCsv_campoConVirgolaInterna_loRacchiudeTraVirgolette", () => {
    const csv = generateCsv(["note"], [["Ciao, tutto bene"]]);

    expect(csv).toBe('note\n"Ciao, tutto bene"\n');
  });

  it("generateCsv_campoConVirgolettaInterna_laRaddoppia", () => {
    const csv = generateCsv(["nome"], [['Il "migliore"']]);

    expect(csv).toBe('nome\n"Il ""migliore"""\n');
  });

  it("generateCsv_valoreBooleano_loConverteInUnoOZero", () => {
    const csv = generateCsv(["daEtichetta"], [[true], [false]]);

    expect(csv).toBe("daEtichetta\n1\n0\n");
  });

  it("generateCsv_valoreNull_produceUnCampoVuoto", () => {
    const csv = generateCsv(["note"], [[null]]);

    expect(csv).toBe("note\n\n");
  });
});
