import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MacroGiornoChart } from "./MacroGiornoChart";
import type { Alimento, GiornoStorico } from "../../lib/schema";

function creaGiorno(data: string): GiornoStorico {
  const alimento: Alimento = {
    nome: "Cibo",
    quantita: 100,
    unita: "g",
    kcal: 100,
    proteine_g: 10,
    carboidrati_g: 20,
    grassi_g: 5,
  };
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [alimento] }] };
}

describe("MacroGiornoChart", () => {
  it("MacroGiornoChart_nessunGiornoImportato_mostraIlMessaggioDiElencoVuoto", () => {
    render(<MacroGiornoChart giorni={[]} storicoObiettivi={[]} />);

    expect(screen.getByText("Nessun giorno importato ancora.")).toBeInTheDocument();
  });

  it("MacroGiornoChart_conGiorni_renderizzaISelettoriDiPeriodoEIstanza", () => {
    render(<MacroGiornoChart giorni={[creaGiorno("2024-01-01")]} storicoObiettivi={[]} />);

    expect(screen.getByText("Giorno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tutto/ })).toBeInTheDocument();
  });

  it("MacroGiornoChart_focusGiorno_selezionaQuelGiornoNelSelettoreIstanza", () => {
    render(
      <MacroGiornoChart
        giorni={[creaGiorno("2024-01-01"), creaGiorno("2024-02-01")]}
        storicoObiettivi={[]}
        focusGiorno={{ data: "2024-02-01" }}
      />,
    );

    expect(screen.getByRole("button", { name: /1 feb 2024/ })).toBeInTheDocument();
  });
});
