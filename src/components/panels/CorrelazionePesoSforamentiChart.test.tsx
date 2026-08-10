import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CorrelazionePesoSforamentiChart } from "./CorrelazionePesoSforamentiChart";
import type { Alimento, GiornoStorico } from "../../lib/schema";
import type { PuntoStoricoObiettivo } from "../../lib/dailyGoal";
import type { VocePeso } from "../../lib/weight";

function creaGiorno(data: string, kcal: number): GiornoStorico {
  const alimento: Alimento = { nome: "Cibo", quantita: 100, unita: "g", kcal, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 };
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [alimento] }] };
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

describe("CorrelazionePesoSforamentiChart", () => {
  it("CorrelazionePesoSforamentiChart_nessunaPesataRegistrata_mostraIlMessaggioDedicato", () => {
    render(
      <CorrelazionePesoSforamentiChart
        giorni={[creaGiorno("2024-01-01", 2000)]}
        peso={[]}
        storicoObiettivi={[]}
        storicoProfilo={[]}
        storicoFitness={[]}
      />,
    );

    expect(screen.getByText(/Servono sia un diario alimentare/)).toBeInTheDocument();
  });

  it("CorrelazionePesoSforamentiChart_nessunGiornoNelDiario_mostraIlMessaggioDedicato", () => {
    render(
      <CorrelazionePesoSforamentiChart
        giorni={[]}
        peso={[{ data: "2024-01-01", pesoKg: 80 }]}
        storicoObiettivi={[]}
        storicoProfilo={[]}
        storicoFitness={[]}
      />,
    );

    expect(screen.getByText(/Servono sia un diario alimentare/)).toBeInTheDocument();
  });

  it("CorrelazionePesoSforamentiChart_campioneSottoLaSogliaMinima_mostraLAvvisoDiDatiInsufficienti", () => {
    const peso: VocePeso[] = [
      { data: "2024-01-01", pesoKg: 80 },
      { data: "2024-01-05", pesoKg: 81 },
    ];
    render(
      <CorrelazionePesoSforamentiChart
        giorni={[creaGiorno("2024-01-01", 2500)]}
        peso={peso}
        storicoObiettivi={[creaLimiteKcal(2000)]}
        storicoProfilo={[]}
        storicoFitness={[]}
      />,
    );

    expect(screen.getByText(/Dati insufficienti per un confronto affidabile/)).toBeInTheDocument();
    expect(screen.getByText(/Dopo sforamento \(n=1\)/)).toBeInTheDocument();
  });

  it("CorrelazionePesoSforamentiChart_giornoClassificabileConPesataAQuattroGiorni_mostraLaRigaInTabella", () => {
    const peso: VocePeso[] = [
      { data: "2024-01-01", pesoKg: 80 },
      { data: "2024-01-05", pesoKg: 81 },
    ];
    render(
      <CorrelazionePesoSforamentiChart
        giorni={[creaGiorno("2024-01-01", 2500)]}
        peso={peso}
        storicoObiettivi={[creaLimiteKcal(2000)]}
        storicoProfilo={[]}
        storicoFitness={[]}
      />,
    );

    expect(screen.getByText("Sforato")).toBeInTheDocument();
    expect(screen.getByText("80.0 kg")).toBeInTheDocument();
    expect(screen.getByText("81.0 kg")).toBeInTheDocument();
  });
});
