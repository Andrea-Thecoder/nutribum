import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegendaManuale, type VoceLegenda } from "./LegendaManuale";

describe("LegendaManuale", () => {
  it("LegendaManuale_piuVoci_lePreservaNellOrdineDellArrayPassato", () => {
    const voci: VoceLegenda[] = [
      { etichetta: "Kcal", colore: "#f00", tipo: "barra" },
      { etichetta: "Limite", colore: "#00f", tipo: "linea" },
    ];

    render(<LegendaManuale voci={voci} />);

    const testi = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(testi).toEqual(["Kcal", "Limite"]);
  });

  it("LegendaManuale_voceDiTipoBarra_applicaIlColorePassatoAlloSwatch", () => {
    const voci: VoceLegenda[] = [{ etichetta: "Kcal", colore: "rgb(255, 0, 0)", tipo: "barra" }];

    render(<LegendaManuale voci={voci} />);

    const swatch = screen.getByText("Kcal").querySelector("span")!;
    expect(swatch).toHaveStyle({ backgroundColor: "rgb(255, 0, 0)" });
  });

  it("LegendaManuale_voceDiTipoLinea_usaUnoSwatchPiuSottileDiQuelloABarra", () => {
    const voci: VoceLegenda[] = [
      { etichetta: "Barra", colore: "#000", tipo: "barra" },
      { etichetta: "Linea", colore: "#000", tipo: "linea" },
    ];

    render(<LegendaManuale voci={voci} />);

    const swatchBarra = screen.getByText("Barra").querySelector("span")!;
    const swatchLinea = screen.getByText("Linea").querySelector("span")!;
    expect(swatchBarra.className).toContain("h-2.5");
    expect(swatchLinea.className).toContain("h-0.5");
  });

  it("LegendaManuale_voce_haLAncoraDataTourBasataSullEtichettaPerIMiniTourDelleAnteprime", () => {
    const voci: VoceLegenda[] = [{ etichetta: "Limite massimo", colore: "#000", tipo: "linea" }];

    render(<LegendaManuale voci={voci} />);

    expect(document.querySelector('[data-tour="legenda-Limite massimo"]')).toBeInTheDocument();
  });
});
