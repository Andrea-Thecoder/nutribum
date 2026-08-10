import { describe, expect, it } from "vitest";
import {
  chiavePeriodo,
  filtraIstanza,
  raggruppaPerPeriodo,
  totaliGiorno,
  totaliPerAlimento,
  TUTTO_IL_PERIODO,
} from "./aggregate";
import type { Alimento, GiornoStorico } from "./schema";

function creaAlimento(nome: string, kcal: number, extra: Partial<Alimento> = {}): Alimento {
  return {
    nome,
    quantita: 100,
    unita: "g",
    kcal,
    proteine_g: 0,
    carboidrati_g: 0,
    grassi_g: 0,
    ...extra,
  };
}

function creaGiorno(data: string, alimenti: Alimento[]): GiornoStorico {
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti }] };
}

describe("totaliGiorno", () => {
  it("totaliGiorno_piuPastiNelGiorno_sommaTuttiIValoriNutrizionali", () => {
    const giorno: GiornoStorico = {
      schemaVersion: "1.0",
      data: "2024-01-01",
      pasti: [
        { tipo: "colazione", alimenti: [creaAlimento("Latte", 100)] },
        { tipo: "pranzo", alimenti: [creaAlimento("Pasta", 300)] },
      ],
    };

    const totali = totaliGiorno(giorno);

    expect(totali.kcal).toBe(400);
  });

  it("totaliGiorno_campiOpzionaliAssenti_liTrattaComeZero", () => {
    const giorno = creaGiorno("2024-01-01", [creaAlimento("Pasta", 300)]);

    const totali = totaliGiorno(giorno);

    expect(totali.fibre_g).toBe(0);
  });

  it("totaliGiorno_valoriConDecimali_arrotondaADuePosizioni", () => {
    const giorno = creaGiorno("2024-01-01", [
      creaAlimento("A", 1 / 3),
      creaAlimento("B", 1 / 3),
      creaAlimento("C", 1 / 3),
    ]);

    const totali = totaliGiorno(giorno);

    expect(totali.kcal).toBe(1);
  });
});

describe("totaliPerAlimento", () => {
  it("totaliPerAlimento_stessoAlimentoInGiorniDiversi_accumulaSottoLaStessaChiave", () => {
    const giorni = [
      creaGiorno("2024-01-01", [creaAlimento("Pasta", 300)]),
      creaGiorno("2024-01-02", [creaAlimento("Pasta", 200)]),
    ];

    const totali = totaliPerAlimento(giorni);

    expect(totali.get("Pasta")?.kcal).toBe(500);
  });
});

describe("chiavePeriodo", () => {
  it("chiavePeriodo_periodoGiorno_ritornaLaDataInvariata", () => {
    expect(chiavePeriodo("2024-03-15", "giorno")).toBe("2024-03-15");
  });

  it("chiavePeriodo_periodoMese_ritornaAnnoEMese", () => {
    expect(chiavePeriodo("2024-03-15", "mese")).toBe("2024-03");
  });

  it("chiavePeriodo_periodoAnno_ritornaSoloLAnno", () => {
    expect(chiavePeriodo("2024-03-15", "anno")).toBe("2024");
  });

  it("chiavePeriodo_periodoSettimana_ritornaIlLunedìDiQuellaSettimana", () => {
    expect(chiavePeriodo("2024-03-15", "settimana")).toBe("2024-03-11");
  });
});

describe("filtraIstanza", () => {
  const righe = [{ data: "2024-01-01" }, { data: "2024-02-01" }];

  it("filtraIstanza_istanzaTuttoIlPeriodo_ritornaTutteLeRigheInvariate", () => {
    const risultato = filtraIstanza(righe, "mese", TUTTO_IL_PERIODO);

    expect(risultato).toHaveLength(2);
  });

  it("filtraIstanza_istanzaSpecifica_ritornaSoloLeRigheDiQuelPeriodo", () => {
    const risultato = filtraIstanza(righe, "mese", "2024-01");

    expect(risultato).toEqual([{ data: "2024-01-01" }]);
  });
});

describe("raggruppaPerPeriodo", () => {
  it("raggruppaPerPeriodo_giorniDiMesiDiversi_produceUnPuntoPerMeseInOrdineCronologico", () => {
    const giorni = [
      creaGiorno("2024-02-01", [creaAlimento("A", 100)]),
      creaGiorno("2024-01-01", [creaAlimento("B", 200)]),
    ];

    const punti = raggruppaPerPeriodo(giorni, "mese");

    expect(punti.map((p) => p.chiave)).toEqual(["2024-01", "2024-02"]);
  });
});
