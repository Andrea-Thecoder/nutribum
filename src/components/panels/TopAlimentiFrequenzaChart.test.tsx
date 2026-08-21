import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopAlimentiFrequenzaChart } from "./TopAlimentiFrequenzaChart";
import type { Alimento, GiornoStorico } from "../../lib/schema";

function creaGiorno(data: string, nome: string): GiornoStorico {
  const alimento: Alimento = { nome, quantita: 100, unita: "g", kcal: 100, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 };
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [alimento] }] };
}

describe("TopAlimentiFrequenzaChart", () => {
  it("TopAlimentiFrequenzaChart_nessunGiornoImportato_mostraIlMessaggioDiElencoVuoto", () => {
    render(<TopAlimentiFrequenzaChart giorni={[]} />);

    expect(screen.getByText("Nessun giorno importato ancora.")).toBeInTheDocument();
  });

  it("TopAlimentiFrequenzaChart_nonOffreIlPeriodoGiorno_soloSettimanaMeseAnno", () => {
    render(<TopAlimentiFrequenzaChart giorni={[creaGiorno("2024-01-01", "Pasta")]} />);

    expect(screen.queryByText("Giorno")).not.toBeInTheDocument();
    expect(screen.getByText("Settimana")).toBeInTheDocument();
  });

  it("TopAlimentiFrequenzaChart_focusGiorno_selezionaLaSettimanaCheContieneQuellaData", () => {
    render(
      <TopAlimentiFrequenzaChart
        giorni={[creaGiorno("2024-01-01", "Pasta"), creaGiorno("2024-03-11", "Riso")]}
        focusGiorno={{ data: "2024-03-11" }}
      />,
    );

    expect(screen.getByRole("button", { name: /Settimana del 11 mar/ })).toBeInTheDocument();
  });
});
