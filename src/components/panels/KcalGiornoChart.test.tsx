import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KcalGiornoChart, accumulaRiferimenti } from "./KcalGiornoChart";
import type { Alimento, GiornoStorico } from "../../lib/schema";
import type { PuntoStoricoObiettivo } from "../../lib/dailyGoal";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "../../lib/profile";
import type { VocePeso } from "../../lib/weight";

function creaGiorno(data: string, kcal = 100): GiornoStorico {
  const alimento: Alimento = {
    nome: "Cibo",
    quantita: 100,
    unita: "g",
    kcal,
    proteine_g: 10,
    carboidrati_g: 20,
    grassi_g: 5,
  };
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [alimento] }] };
}

function creaLimiteKcal(kcal: number, kcalMin: number | null = null): PuntoStoricoObiettivo {
  return {
    id: 1,
    validoDal: "2024-01-01",
    validoAl: null,
    ambito: "sempre",
    registratoIl: "2024-01-01T00:00:00.000Z",
    gruppo: "kcal",
    kcal,
    kcalMin,
    proteineG: null,
    carboidratiG: null,
    grassiG: null,
    fibreG: null,
    saleG: null,
  };
}

describe("KcalGiornoChart", () => {
  it("KcalGiornoChart_nessunGiornoImportato_mostraIlMessaggioDiElencoVuoto", () => {
    render(<KcalGiornoChart giorni={[]} storicoObiettivi={[]} peso={[]} storicoProfilo={[]} storicoFitness={[]} />);

    expect(screen.getByText("Nessun giorno importato ancora.")).toBeInTheDocument();
  });

  it("KcalGiornoChart_conGiorni_renderizzaISelettoriDiPeriodoEIstanza", () => {
    render(
      <KcalGiornoChart
        giorni={[creaGiorno("2024-01-01")]}
        storicoObiettivi={[]}
        peso={[]}
        storicoProfilo={[]}
        storicoFitness={[]}
      />,
    );

    expect(screen.getByText("Giorno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tutto/ })).toBeInTheDocument();
  });

  it("KcalGiornoChart_focusGiorno_selezionaQuelGiornoNelSelettoreIstanza", () => {
    render(
      <KcalGiornoChart
        giorni={[creaGiorno("2024-01-01"), creaGiorno("2024-02-01")]}
        storicoObiettivi={[]}
        peso={[]}
        storicoProfilo={[]}
        storicoFitness={[]}
        focusGiorno={{ data: "2024-02-01" }}
      />,
    );

    expect(screen.getByRole("button", { name: /1 feb 2024/ })).toBeInTheDocument();
  });
});

describe("accumulaRiferimenti", () => {
  const storicoProfilo: PuntoStoricoProfilo[] = [
    { etaAnni: 30, altezzaCm: 180, sesso: "M", registratoIl: "2024-01-01" },
  ];
  const storicoFitness: PuntoStoricoFitness[] = [
    { livello: "moderate", moltiplicatore: 1.55, impostatoIl: "2024-01-01" },
  ];
  const peso: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];

  it("accumulaRiferimenti_giornoSenzaLimiteNeTdee_ritornaTuttiIRiferimentiANull", () => {
    const risultato = accumulaRiferimenti([creaGiorno("2024-01-01")], "giorno", [], [], [], []);

    expect(risultato.get("2024-01-01")).toEqual({
      limiteKcal: null,
      tdeeStimato: null,
      limiteKcalMin: null,
      bmrStimato: null,
    });
  });

  it("accumulaRiferimenti_piuGiorniNelloStessoBucket_sommaIlLimiteSuIGiorniConValore", () => {
    const giorni = [creaGiorno("2024-01-01"), creaGiorno("2024-01-02")];
    const storicoObiettivi = [creaLimiteKcal(2000)];

    const risultato = accumulaRiferimenti(giorni, "mese", storicoObiettivi, [], [], []);

    expect(risultato.get("2024-01")?.limiteKcal).toBe(4000);
  });

  it("accumulaRiferimenti_tdeeCalcolabile_sommaLaStimaTdeeEBmr", () => {
    const risultato = accumulaRiferimenti(
      [creaGiorno("2024-01-01")],
      "giorno",
      [],
      storicoProfilo,
      storicoFitness,
      peso,
    );

    expect(risultato.get("2024-01-01")).toEqual({
      limiteKcal: null,
      tdeeStimato: 2759,
      limiteKcalMin: null,
      bmrStimato: 1780,
    });
  });

  it("accumulaRiferimenti_bucketSenzaAlcunGiornoConValore_restaNullInveceDiZero", () => {
    const risultato = accumulaRiferimenti([creaGiorno("2024-01-01")], "giorno", [], [], [], []);

    expect(risultato.get("2024-01-01")?.limiteKcal).toBeNull();
  });
});
