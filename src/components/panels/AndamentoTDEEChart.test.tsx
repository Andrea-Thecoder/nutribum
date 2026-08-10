import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AndamentoTDEEChart } from "./AndamentoTDEEChart";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "../../lib/profile";
import type { VocePeso } from "../../lib/weight";

describe("AndamentoTDEEChart", () => {
  it("AndamentoTDEEChart_nessunProfiloOPesoDisponibile_mostraIlMessaggioDedicato", () => {
    render(<AndamentoTDEEChart peso={[]} storicoProfilo={[]} storicoFitness={[]} />);

    expect(screen.getByText(/Nessun dato ancora/)).toBeInTheDocument();
  });

  it("AndamentoTDEEChart_pesataSenzaProfiloImpostatoAllaData_vieneEsclusaEMostraIlMessaggio", () => {
    const peso: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];

    render(<AndamentoTDEEChart peso={peso} storicoProfilo={[]} storicoFitness={[]} />);

    expect(screen.getByText(/Nessun dato ancora/)).toBeInTheDocument();
  });

  it("AndamentoTDEEChart_profiloEPesoDisponibili_nonMostraIlMessaggioDiDatoMancante", () => {
    const storicoProfilo: PuntoStoricoProfilo[] = [
      { etaAnni: 30, altezzaCm: 180, sesso: "M", registratoIl: "2024-01-01" },
    ];
    const storicoFitness: PuntoStoricoFitness[] = [
      { livello: "moderate", moltiplicatore: 1.55, impostatoIl: "2024-01-01" },
    ];
    const peso: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];

    render(<AndamentoTDEEChart peso={peso} storicoProfilo={storicoProfilo} storicoFitness={storicoFitness} />);

    expect(screen.queryByText(/Nessun dato ancora/)).not.toBeInTheDocument();
  });
});
