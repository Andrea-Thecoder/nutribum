import { describe, expect, it } from "vitest";
import {
  calcolaRitmoKgSettimana,
  calcolaStatoPositivoPeso,
  calcolaStatoSforamentoPeso,
  dettaglioMisurazioniSforatePeso,
  nelObiettivoPeso,
  type VocePeso,
} from "./weight";

describe("nelObiettivoPeso", () => {
  it("nelObiettivoPeso_pesoEntroLObiettivo_ritornaTrue", () => {
    expect(nelObiettivoPeso(78, 80, 1)).toBe(true);
  });

  it("nelObiettivoPeso_pesoEntroIlMargineDiTolleranza_ritornaTrue", () => {
    expect(nelObiettivoPeso(80.5, 80, 1)).toBe(true);
  });

  it("nelObiettivoPeso_pesoSopraObiettivoEMargine_ritornaFalse", () => {
    expect(nelObiettivoPeso(82, 80, 1)).toBe(false);
  });
});

describe("calcolaStatoSforamentoPeso", () => {
  it("calcolaStatoSforamentoPeso_obiettivoNonImpostato_ritornaTuttoAZero", () => {
    const stato = calcolaStatoSforamentoPeso([{ data: "2024-01-01", pesoKg: 90 }], null, "2024-01-01", 1);

    expect(stato).toEqual({ serieConsecutiva: 0, giorniSforatiNelMese: 0 });
  });

  it("calcolaStatoSforamentoPeso_pesateSopraObiettivoConsecutiveFinoAdOggi_contaLaSerie", () => {
    const peso: VocePeso[] = [
      { data: "2024-01-08", pesoKg: 85 },
      { data: "2024-01-09", pesoKg: 85 },
    ];

    const stato = calcolaStatoSforamentoPeso(peso, 80, "2024-01-09", 1);

    expect(stato.serieConsecutiva).toBe(2);
  });

  it("calcolaStatoSforamentoPeso_giornoSenzaPesataRegistrata_interrompeLaSerie", () => {
    const peso: VocePeso[] = [{ data: "2024-01-09", pesoKg: 85 }];

    const stato = calcolaStatoSforamentoPeso(peso, 80, "2024-01-10", 1);

    expect(stato.serieConsecutiva).toBe(0);
  });
});

describe("dettaglioMisurazioniSforatePeso", () => {
  it("dettaglioMisurazioniSforatePeso_obiettivoNonImpostato_ritornaArrayVuoto", () => {
    const dettagli = dettaglioMisurazioniSforatePeso([{ data: "2024-01-01", pesoKg: 90 }], null, "2024-01-01", "serie", 1);

    expect(dettagli).toEqual([]);
  });

  it("dettaglioMisurazioniSforatePeso_periodoSerie_ripercorreLaSerieDalPiuRecenteAlMenoRecente", () => {
    const peso: VocePeso[] = [
      { data: "2024-01-08", pesoKg: 85 },
      { data: "2024-01-09", pesoKg: 86 },
    ];

    const dettagli = dettaglioMisurazioniSforatePeso(peso, 80, "2024-01-09", "serie", 1);

    expect(dettagli.map((d) => d.data)).toEqual(["2024-01-09", "2024-01-08"]);
  });
});

describe("calcolaStatoPositivoPeso", () => {
  it("calcolaStatoPositivoPeso_obiettivoNonImpostato_ritornaTuttoNegativo", () => {
    const stato = calcolaStatoPositivoPeso([{ data: "2024-01-01", pesoKg: 78 }], null, "2024-01-01", 1);

    expect(stato).toEqual({ serieConsecutivaPulita: 0, settimanaPulita: false, giorniPulitiNelMese: 0 });
  });

  it("calcolaStatoPositivoPeso_pesataEntroLObiettivo_contaComePulita", () => {
    const stato = calcolaStatoPositivoPeso([{ data: "2024-01-08", pesoKg: 78 }], 80, "2024-01-08", 1);

    expect(stato.serieConsecutivaPulita).toBe(1);
  });
});

describe("calcolaRitmoKgSettimana", () => {
  it("calcolaRitmoKgSettimana_menoDiDuePesate_ritornaNull", () => {
    const ritmo = calcolaRitmoKgSettimana([{ data: "2024-01-01", pesoKg: 80 }]);

    expect(ritmo).toBeNull();
  });

  it("calcolaRitmoKgSettimana_pesateTroppoViciniNelTempo_ritornaNull", () => {
    const peso: VocePeso[] = [
      { data: "2024-01-01", pesoKg: 80 },
      { data: "2024-01-03", pesoKg: 79 },
    ];

    const ritmo = calcolaRitmoKgSettimana(peso);

    expect(ritmo).toBeNull();
  });

  it("calcolaRitmoKgSettimana_calaDiUnKgInDieciGiorni_proiettaIlRitmoSettimanale", () => {
    const peso: VocePeso[] = [
      { data: "2024-01-01", pesoKg: 80 },
      { data: "2024-01-11", pesoKg: 79 },
    ];

    const ritmo = calcolaRitmoKgSettimana(peso);

    expect(ritmo).toBeCloseTo(-0.7, 5);
  });
});
