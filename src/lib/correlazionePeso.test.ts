import { addDays, format } from "date-fns";
import { describe, expect, it } from "vitest";
import { analizzaCorrelazionePeso, classificaGiornoKcal } from "./correlazionePeso";
import type { Alimento, GiornoStorico } from "./schema";
import type { PuntoStoricoObiettivo } from "./dailyGoal";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "./profile";
import type { VocePeso } from "./weight";

function creaAlimento(kcal: number): Alimento {
  return { nome: "Cibo", quantita: 100, unita: "g", kcal, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 };
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

describe("classificaGiornoKcal", () => {
  it("classificaGiornoKcal_kcalSopraIlLimiteManuale_ritornaSforato", () => {
    const giorno = creaGiorno("2024-01-01", 2500);

    const classificazione = classificaGiornoKcal(giorno, [creaLimiteKcal(2000)], [], [], []);

    expect(classificazione).toBe("sforato");
  });

  it("classificaGiornoKcal_kcalSottoIlLimiteManuale_ritornaPulito", () => {
    const giorno = creaGiorno("2024-01-01", 1800);

    const classificazione = classificaGiornoKcal(giorno, [creaLimiteKcal(2000)], [], [], []);

    expect(classificazione).toBe("pulito");
  });

  it("classificaGiornoKcal_nessunLimiteManualeConTdeeDisponibile_usaIlTdeeComeFallback", () => {
    const giorno = creaGiorno("2024-02-01", 3000);
    const storicoProfilo: PuntoStoricoProfilo[] = [
      { etaAnni: 30, altezzaCm: 180, sesso: "M", registratoIl: "2024-01-01" },
    ];
    const storicoFitness: PuntoStoricoFitness[] = [
      { livello: "moderate", moltiplicatore: 1.55, impostatoIl: "2024-01-01" },
    ];
    const peso: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];

    const classificazione = classificaGiornoKcal(giorno, [], storicoProfilo, storicoFitness, peso);

    expect(classificazione).toBe("sforato");
  });

  it("classificaGiornoKcal_nessunLimiteENessunTdeeDisponibile_ritornaNull", () => {
    const giorno = creaGiorno("2024-01-01", 2000);

    const classificazione = classificaGiornoKcal(giorno, [], [], [], []);

    expect(classificazione).toBeNull();
  });
});

describe("analizzaCorrelazionePeso", () => {
  it("analizzaCorrelazionePeso_giornoSenzaPesataQuelGiornoOQuattroGiorniDopo_vieneScartato", () => {
    const giorni = [creaGiorno("2024-01-01", 2500)];

    const risultato = analizzaCorrelazionePeso(giorni, [], [creaLimiteKcal(2000)], [], []);

    expect(risultato.punti).toEqual([]);
  });

  it("analizzaCorrelazionePeso_menoDiCinqueCampioniSforati_lasciaLaMediaANull", () => {
    const giorni = [creaGiorno("2024-01-01", 2500), creaGiorno("2024-01-02", 2500)];
    const peso: VocePeso[] = [
      { data: "2024-01-01", pesoKg: 80 },
      { data: "2024-01-05", pesoKg: 81 },
      { data: "2024-01-02", pesoKg: 80 },
      { data: "2024-01-06", pesoKg: 81 },
    ];

    const risultato = analizzaCorrelazionePeso(giorni, peso, [creaLimiteKcal(2000)], [], []);

    expect(risultato.mediaSforatiKg).toBeNull();
  });

  it("analizzaCorrelazionePeso_almenoCinqueCampioniSforati_calcolaLaMediaDelDeltaCorretto", () => {
    const giorniBase = ["2024-01-01", "2024-01-06", "2024-01-11", "2024-01-16", "2024-01-21"];
    const giorni = giorniBase.map((data) => creaGiorno(data, 2500));
    const peso: VocePeso[] = giorniBase.flatMap((data) => [
      { data, pesoKg: 80 },
      { data: format4GiorniDopo(data), pesoKg: 81 },
    ]);

    const risultato = analizzaCorrelazionePeso(giorni, peso, [creaLimiteKcal(2000)], [], []);

    expect(risultato.nSforati).toBe(5);
    expect(risultato.mediaSforatiKg).not.toBeNull();
    expect(risultato.mediaSforatiKg!).toBeGreaterThan(0);
  });
});

function format4GiorniDopo(data: string): string {
  return format(addDays(new Date(data), 4), "yyyy-MM-dd");
}
