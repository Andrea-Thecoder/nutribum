import { describe, expect, it } from "vitest";
import {
  datiGraficoFibreSale,
  datiGraficoKcal,
  datiGraficoMacro,
  datiGraficoPeso,
  datiGraficoTDEE,
  filtraPerPeriodo,
  periodoGraficoPerRange,
  riepilogoKcalMacro,
  riepilogoPeso,
  riepilogoSforamenti,
  riepilogoTDEE,
  type PeriodoReport,
} from "./report";
import type { Alimento, GiornoStorico } from "./schema";
import type { PuntoStoricoObiettivo } from "./dailyGoal";
import type { PuntoStoricoObiettivoPeso, VocePeso } from "./weight";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "./profile";

function creaAlimento(kcal: number): Alimento {
  return { nome: "Cibo", quantita: 100, unita: "g", kcal, proteine_g: 10, carboidrati_g: 20, grassi_g: 5 };
}

function creaGiorno(data: string, kcal: number): GiornoStorico {
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [creaAlimento(kcal)] }] };
}

function creaLimiteKcal(kcal: number): PuntoStoricoObiettivo {
  return {
    id: 1,
    validoDal: "2024-01-01",
    validoAl: null,
    ambito: "sempre",
    registratoIl: "2024-01-01T00:00:00.000Z",
    gruppo: "kcal",
    kcal,
    kcalMin: null,
    proteineG: null,
    carboidratiG: null,
    grassiG: null,
    fibreG: null,
    saleG: null,
  };
}

describe("filtraPerPeriodo", () => {
  const righe = [{ data: "2024-01-01" }, { data: "2024-02-01" }, { data: "2024-03-01" }];

  it("filtraPerPeriodo_senzaLimiti_ritornaTutteLeRighe", () => {
    const periodo: PeriodoReport = { dataDa: null, dataA: null };

    expect(filtraPerPeriodo(righe, periodo)).toHaveLength(3);
  });

  it("filtraPerPeriodo_conDataDaEDataA_ritornaSoloLeRigheNellIntervallo", () => {
    const periodo: PeriodoReport = { dataDa: "2024-01-15", dataA: "2024-02-15" };

    expect(filtraPerPeriodo(righe, periodo)).toEqual([{ data: "2024-02-01" }]);
  });
});

describe("periodoGraficoPerRange", () => {
  it("periodoGraficoPerRange_rangeSenzaLimiti_ritornaMese", () => {
    expect(periodoGraficoPerRange({ dataDa: null, dataA: null })).toBe("mese");
  });

  it("periodoGraficoPerRange_rangeDentroLoStessoMese_ritornaGiorno", () => {
    expect(periodoGraficoPerRange({ dataDa: "2024-03-01", dataA: "2024-03-15" })).toBe("giorno");
  });

  it("periodoGraficoPerRange_rangeSuPiuMesi_ritornaMese", () => {
    expect(periodoGraficoPerRange({ dataDa: "2024-03-01", dataA: "2024-04-15" })).toBe("mese");
  });
});

describe("riepilogoSforamenti", () => {
  it("riepilogoSforamenti_giornoSenzaObiettivo_vieneEscluso", () => {
    const giorni = [creaGiorno("2024-01-01", 2500)];

    expect(riepilogoSforamenti(giorni, [])).toEqual({ sforati: 0, puliti: 0, totale: 0 });
  });

  it("riepilogoSforamenti_mixDiGiorniSforatiEPuliti_liContaSeparatamente", () => {
    const giorni = [creaGiorno("2024-01-01", 2500), creaGiorno("2024-01-02", 1800)];

    const riepilogo = riepilogoSforamenti(giorni, [creaLimiteKcal(2000)]);

    expect(riepilogo).toEqual({ sforati: 1, puliti: 1, totale: 2 });
  });
});

describe("riepilogoKcalMacro", () => {
  it("riepilogoKcalMacro_nessunGiornoNelRange_ritornaNull", () => {
    expect(riepilogoKcalMacro([], [])).toBeNull();
  });

  it("riepilogoKcalMacro_nessunGiornoConLimiteImpostato_ritornaNull", () => {
    const giorni = [creaGiorno("2024-01-01", 2000)];

    expect(riepilogoKcalMacro(giorni, [])).toBeNull();
  });

  it("riepilogoKcalMacro_datiDisponibili_includeMetricheESforamenti", () => {
    const giorni = [creaGiorno("2024-01-01", 2500)];

    const riepilogo = riepilogoKcalMacro(giorni, [creaLimiteKcal(2000)]);

    expect(riepilogo?.sforamenti).toEqual({ sforati: 1, puliti: 0, totale: 1 });
  });
});

describe("riepilogoPeso", () => {
  it("riepilogoPeso_nessunaPesataNelRange_ritornaNull", () => {
    expect(riepilogoPeso([], 75)).toBeNull();
  });

  it("riepilogoPeso_piuPesate_calcolaLaVariazioneTraPrimaEUltima", () => {
    const peso: VocePeso[] = [
      { data: "2024-01-01", pesoKg: 80 },
      { data: "2024-01-31", pesoKg: 78 },
    ];

    const riepilogo = riepilogoPeso(peso, 75);

    expect(riepilogo).toEqual({ primoKg: 80, ultimoKg: 78, variazioneKg: -2, obiettivoKg: 75 });
  });
});

describe("riepilogoTDEE", () => {
  const storicoProfilo: PuntoStoricoProfilo[] = [
    { etaAnni: 30, altezzaCm: 180, sesso: "M", registratoIl: "2024-01-01" },
  ];
  const storicoFitness: PuntoStoricoFitness[] = [
    { livello: "moderate", moltiplicatore: 1.55, impostatoIl: "2024-01-01" },
  ];

  it("riepilogoTDEE_nessunaStimaDisponibile_ritornaNull", () => {
    expect(riepilogoTDEE([{ data: "2024-01-01", pesoKg: 80 }], [], [], [])).toBeNull();
  });

  it("riepilogoTDEE_stimeDisponibili_mediaBmrETdeeSuIGiorniStimati", () => {
    const pesoCompleto: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];

    const riepilogo = riepilogoTDEE(pesoCompleto, storicoProfilo, storicoFitness, pesoCompleto);

    expect(riepilogo).toEqual({ tdeeMedio: 2759, bmrMedio: 1780, giorniStimati: 1 });
  });
});

describe("datiGraficoMacro", () => {
  it("datiGraficoMacro_giorniDelMese_riportaIMacronutrientiPerPeriodo", () => {
    const giorni = [creaGiorno("2024-01-01", 2000)];

    const dati = datiGraficoMacro(giorni, "mese");

    expect(dati).toEqual([{ chiave: "2024-01", proteine_g: 10, carboidrati_g: 20, grassi_g: 5 }]);
  });
});

describe("datiGraficoFibreSale", () => {
  it("datiGraficoFibreSale_giornoSenzaFibreOSale_riportaZero", () => {
    const giorni = [creaGiorno("2024-01-01", 2000)];

    const dati = datiGraficoFibreSale(giorni, "mese");

    expect(dati).toEqual([{ chiave: "2024-01", fibre_g: 0, sale_g: 0 }]);
  });
});

describe("datiGraficoPeso", () => {
  it("datiGraficoPeso_pesataConObiettivoStoricoInVigore_loAssociaAlPuntoDelGrafico", () => {
    const storicoObiettivoPeso: PuntoStoricoObiettivoPeso[] = [{ targetKg: 75, registratoIl: "2024-01-01" }];

    const dati = datiGraficoPeso([{ data: "2024-01-15", pesoKg: 78 }], storicoObiettivoPeso);

    expect(dati).toEqual([{ chiave: "2024-01-15", peso: 78, obiettivoStorico: 75 }]);
  });
});

describe("datiGraficoTDEE", () => {
  const storicoProfilo: PuntoStoricoProfilo[] = [
    { etaAnni: 30, altezzaCm: 180, sesso: "M", registratoIl: "2024-01-01" },
  ];
  const storicoFitness: PuntoStoricoFitness[] = [
    { livello: "moderate", moltiplicatore: 1.55, impostatoIl: "2024-01-01" },
  ];

  it("datiGraficoTDEE_pesataSenzaStimaDisponibile_vieneEsclusaDalGrafico", () => {
    const dati = datiGraficoTDEE([{ data: "2024-01-01", pesoKg: 80 }], [], [], []);

    expect(dati).toEqual([]);
  });

  it("datiGraficoTDEE_pesataConStimaDisponibile_includeBmrETdee", () => {
    const pesoCompleto: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];

    const dati = datiGraficoTDEE(pesoCompleto, storicoProfilo, storicoFitness, pesoCompleto);

    expect(dati).toEqual([{ chiave: "2024-01-01", bmr: 1780, tdee: 2759 }]);
  });
});

describe("datiGraficoKcal", () => {
  it("datiGraficoKcal_giornoSenzaAlcunRiferimento_lasciaTuttiIRiferimentiANull", () => {
    const giorni = [creaGiorno("2024-01-01", 2000)];

    const dati = datiGraficoKcal(giorni, "mese", [], [], [], []);

    expect(dati).toEqual([
      { chiave: "2024-01", kcal: 2000, limiteKcal: null, tdeeStimato: null, limiteKcalMin: null, bmrStimato: null },
    ]);
  });

  it("datiGraficoKcal_giornoConLimiteManualeInVigore_loRiportaComeLimiteKcal", () => {
    const giorni = [creaGiorno("2024-01-01", 2000)];

    const dati = datiGraficoKcal(giorni, "mese", [creaLimiteKcal(2200)], [], [], []);

    expect(dati[0].limiteKcal).toBe(2200);
  });
});
