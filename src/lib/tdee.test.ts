import { describe, expect, it } from "vitest";
import {
  calcolaTDEE,
  stimaTDEEAllaData,
  trovaMoltiplicatoreAttivoAlla,
  trovaPesoAttivoAlla,
  trovaProfiloAttivoAlla,
  type ProfiloTDEE,
} from "./tdee";
import type { PuntoStoricoFitness, PuntoStoricoProfilo } from "./profile";
import type { VocePeso } from "./weight";

describe("calcolaTDEE", () => {
  it("calcolaTDEE_sessoMaschile_aggiungeCincoAlBmrBase", () => {
    const profilo: ProfiloTDEE = { etaAnni: 30, sesso: "M", altezzaCm: 180 };

    const risultato = calcolaTDEE(profilo, 80, 1.55);

    expect(risultato.bmr).toBe(1780);
  });

  it("calcolaTDEE_sessoFemminile_sottraeCentoSessantunoAlBmrBase", () => {
    const profilo: ProfiloTDEE = { etaAnni: 30, sesso: "F", altezzaCm: 165 };

    const risultato = calcolaTDEE(profilo, 60, 1.2);

    expect(risultato.bmr).toBe(1320);
  });

  it("calcolaTDEE_moltiplicatoreAttivita_scalaIlTdeeRispettoAlBmr", () => {
    const profilo: ProfiloTDEE = { etaAnni: 30, sesso: "M", altezzaCm: 180 };

    const risultato = calcolaTDEE(profilo, 80, 1.55);

    expect(risultato.tdee).toBe(2759);
  });
});

describe("trovaProfiloAttivoAlla", () => {
  const storico: PuntoStoricoProfilo[] = [
    { etaAnni: 30, altezzaCm: 180, sesso: "M", registratoIl: "2024-01-01" },
    { etaAnni: 31, altezzaCm: 180, sesso: "M", registratoIl: "2024-06-01" },
  ];

  it("trovaProfiloAttivoAlla_dataPrimaDelPrimoPunto_ritornaNull", () => {
    const profilo = trovaProfiloAttivoAlla("2023-12-31", storico);

    expect(profilo).toBeNull();
  });

  it("trovaProfiloAttivoAlla_dataTraDuePunti_ritornaIlPuntoPiuVecchio", () => {
    const profilo = trovaProfiloAttivoAlla("2024-03-01", storico);

    expect(profilo?.etaAnni).toBe(30);
  });

  it("trovaProfiloAttivoAlla_dataDopoUltimoPunto_ritornaIlPuntoPiuRecente", () => {
    const profilo = trovaProfiloAttivoAlla("2025-01-01", storico);

    expect(profilo?.etaAnni).toBe(31);
  });
});

describe("trovaMoltiplicatoreAttivoAlla", () => {
  const storico: PuntoStoricoFitness[] = [
    { livello: "sedentary", moltiplicatore: 1.2, impostatoIl: "2024-01-01" },
    { livello: "active", moltiplicatore: 1.725, impostatoIl: "2024-06-01" },
  ];

  it("trovaMoltiplicatoreAttivoAlla_dataPrimaDelPrimoPunto_ritornaNull", () => {
    const moltiplicatore = trovaMoltiplicatoreAttivoAlla("2023-12-31", storico);

    expect(moltiplicatore).toBeNull();
  });

  it("trovaMoltiplicatoreAttivoAlla_dataDopoUnCambioLivello_ritornaIlNuovoMoltiplicatore", () => {
    const moltiplicatore = trovaMoltiplicatoreAttivoAlla("2024-07-01", storico);

    expect(moltiplicatore).toBe(1.725);
  });
});

describe("trovaPesoAttivoAlla", () => {
  it("trovaPesoAttivoAlla_nessunaPesataRegistrata_ritornaNull", () => {
    const peso = trovaPesoAttivoAlla("2024-01-01", []);

    expect(peso).toBeNull();
  });

  it("trovaPesoAttivoAlla_pesataRegistrataPrimaDellaData_ritornaQuelPeso", () => {
    const storico: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];

    const peso = trovaPesoAttivoAlla("2024-02-01", storico);

    expect(peso).toBe(80);
  });
});

describe("stimaTDEEAllaData", () => {
  it("stimaTDEEAllaData_mancaLaPesata_ritornaNull", () => {
    const storicoProfilo: PuntoStoricoProfilo[] = [
      { etaAnni: 30, altezzaCm: 180, sesso: "M", registratoIl: "2024-01-01" },
    ];
    const storicoFitness: PuntoStoricoFitness[] = [
      { livello: "moderate", moltiplicatore: 1.55, impostatoIl: "2024-01-01" },
    ];

    const stima = stimaTDEEAllaData("2024-02-01", storicoProfilo, storicoFitness, []);

    expect(stima).toBeNull();
  });

  it("stimaTDEEAllaData_tuttiGliIngredientiDisponibili_combinaProfiloPesoEMoltiplicatore", () => {
    const storicoProfilo: PuntoStoricoProfilo[] = [
      { etaAnni: 30, altezzaCm: 180, sesso: "M", registratoIl: "2024-01-01" },
    ];
    const storicoFitness: PuntoStoricoFitness[] = [
      { livello: "moderate", moltiplicatore: 1.55, impostatoIl: "2024-01-01" },
    ];
    const peso: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];

    const stima = stimaTDEEAllaData("2024-02-01", storicoProfilo, storicoFitness, peso);

    expect(stima).toEqual({ bmr: 1780, tdee: 2759 });
  });
});
