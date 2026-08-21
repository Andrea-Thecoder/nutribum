import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopAlimentiChart } from "./TopAlimentiChart";
import type { Alimento, GiornoStorico } from "../../lib/schema";

function creaGiorno(data: string, nome: string, kcal: number): GiornoStorico {
  const alimento: Alimento = { nome, quantita: 100, unita: "g", kcal, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 };
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [alimento] }] };
}

describe("TopAlimentiChart", () => {
  it("TopAlimentiChart_nessunGiornoImportato_mostraIlMessaggioDiElencoVuoto", () => {
    render(<TopAlimentiChart giorni={[]} />);

    expect(screen.getByText("Nessun giorno importato ancora.")).toBeInTheDocument();
  });

  it("TopAlimentiChart_periodoGiornoDiDefault_selezionaIlGiornoPiuRecenteComeIstanza", () => {
    render(<TopAlimentiChart giorni={[creaGiorno("2024-01-01", "Pasta", 350), creaGiorno("2024-01-05", "Riso", 300)]} />);

    expect(screen.getByRole("combobox", { name: /5 gen 2024/ })).toBeInTheDocument();
  });

  it("TopAlimentiChart_cambioPeriodo_selezionaLaPrimaIstanzaDelNuovoPeriodo", async () => {
    const utente = userEvent.setup();
    render(<TopAlimentiChart giorni={[creaGiorno("2024-01-01", "Pasta", 350), creaGiorno("2024-02-01", "Riso", 300)]} />);

    await utente.click(screen.getByText("Mese"));

    expect(screen.getByRole("combobox", { name: /Febbraio 2024/ })).toBeInTheDocument();
  });

  it("TopAlimentiChart_focusGiorno_tornaAlPeriodoGiornoESelezionaQuellaData", async () => {
    const utente = userEvent.setup();
    const { rerender } = render(
      <TopAlimentiChart giorni={[creaGiorno("2024-01-01", "Pasta", 350), creaGiorno("2024-02-01", "Riso", 300)]} />,
    );
    await utente.click(screen.getByText("Mese"));

    rerender(
      <TopAlimentiChart
        giorni={[creaGiorno("2024-01-01", "Pasta", 350), creaGiorno("2024-02-01", "Riso", 300)]}
        focusGiorno={{ data: "2024-01-01" }}
      />,
    );

    expect(screen.getByRole("combobox", { name: /1 gen 2024/ })).toBeInTheDocument();
  });
});
