import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfrontoPeriodiChart, SelettoreVistaConfronto } from "./ConfrontoPeriodiChart";
import type { Alimento, GiornoStorico } from "../../lib/schema";
import type { VocePeso } from "../../lib/weight";

function creaGiorno(data: string, kcal: number): GiornoStorico {
  const alimento: Alimento = { nome: "Cibo", quantita: 100, unita: "g", kcal, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 };
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [alimento] }] };
}

const GIORNI_DUE_SETTIMANE = [creaGiorno("2024-01-01", 2000), creaGiorno("2024-01-08", 1800)];

describe("ConfrontoPeriodiChart", () => {
  it("ConfrontoPeriodiChart_nessunGiornoImportato_mostraIlMessaggioDedicato", () => {
    render(<ConfrontoPeriodiChart giorni={[]} peso={[]} vista="tabella" />);

    expect(screen.getByText("Nessun giorno importato ancora.")).toBeInTheDocument();
  });

  // Con un solo periodo disponibile, sia l'istanza A che B ricadono di default sullo stesso
  // periodo (fallback in ConfrontoPeriodiChart): il confronto resta possibile, mostra solo una
  // differenza a zero invece del messaggio "dati insufficienti" (quel messaggio scatta solo se
  // mappaPerChiave non trova affatto l'istanza selezionata, non raggiungibile con `giorni` non vuoto).
  it("ConfrontoPeriodiChart_unSoloPeriodoConDati_confrontaIlPeriodoConSeStesso", () => {
    render(<ConfrontoPeriodiChart giorni={[creaGiorno("2024-01-01", 2000)]} peso={[]} vista="tabella" />);

    expect(screen.getByText("→ 0 (0%)")).toBeInTheDocument();
  });

  it("ConfrontoPeriodiChart_duePeriodiConDati_mostraLeEtichetteDiEntrambiInIntestazione", () => {
    render(<ConfrontoPeriodiChart giorni={GIORNI_DUE_SETTIMANE} peso={[]} vista="tabella" />);

    expect(screen.getByText("Settimana del 1 gen")).toBeInTheDocument();
    expect(screen.getByText("Settimana del 8 gen")).toBeInTheDocument();
  });

  it("ConfrontoPeriodiChart_kcalDiminuite_mostraLaFrecciaInBassoConDeltaEPercentuale", () => {
    render(<ConfrontoPeriodiChart giorni={GIORNI_DUE_SETTIMANE} peso={[]} vista="tabella" />);

    expect(screen.getByText("↓ -200 (-10%)")).toBeInTheDocument();
  });

  it("ConfrontoPeriodiChart_nessunPesoRegistrato_nonMostraLaRigaPeso", () => {
    render(<ConfrontoPeriodiChart giorni={GIORNI_DUE_SETTIMANE} peso={[]} vista="tabella" />);

    expect(screen.queryByText("Peso")).not.toBeInTheDocument();
  });

  it("ConfrontoPeriodiChart_pesoRegistrato_mostraLaRigaPesoConLaMedia", () => {
    const peso: VocePeso[] = [
      { data: "2024-01-01", pesoKg: 80 },
      { data: "2024-01-08", pesoKg: 79 },
    ];
    render(<ConfrontoPeriodiChart giorni={GIORNI_DUE_SETTIMANE} peso={peso} vista="tabella" />);

    expect(screen.getByText("Peso")).toBeInTheDocument();
    expect(screen.getByText("80.0 kg")).toBeInTheDocument();
    expect(screen.getByText("79.0 kg")).toBeInTheDocument();
  });
});

describe("SelettoreVistaConfronto", () => {
  it("SelettoreVistaConfronto_clicSullAltraVista_chiamaOnChangeConQuellaVista", async () => {
    const onChange = vi.fn();
    const utente = userEvent.setup();
    render(<SelettoreVistaConfronto vista="grafico" onChange={onChange} />);

    await utente.click(screen.getByText("tabella"));

    expect(onChange).toHaveBeenCalledWith("tabella");
  });
});
