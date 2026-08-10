import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FibreSaleChart } from "./FibreSaleChart";
import type { Alimento, GiornoStorico } from "../../lib/schema";

function creaGiorno(data: string, extra: Partial<Alimento> = {}): GiornoStorico {
  const alimento: Alimento = {
    nome: "Cibo",
    quantita: 100,
    unita: "g",
    kcal: 100,
    proteine_g: 10,
    carboidrati_g: 20,
    grassi_g: 5,
    ...extra,
  };
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [alimento] }] };
}

describe("FibreSaleChart", () => {
  it("FibreSaleChart_nessunGiornoImportato_mostraIlMessaggioDiElencoVuoto", () => {
    render(<FibreSaleChart giorni={[]} storicoObiettivi={[]} />);

    expect(screen.getByText("Nessun giorno importato ancora.")).toBeInTheDocument();
  });

  it("FibreSaleChart_conGiorni_renderizzaISelettoriDiPeriodoEIstanza", () => {
    render(<FibreSaleChart giorni={[creaGiorno("2024-01-01", { fibre_g: 5, sale_g: 1 })]} storicoObiettivi={[]} />);

    expect(screen.getByText("Giorno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tutto/ })).toBeInTheDocument();
  });
});
