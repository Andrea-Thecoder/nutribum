import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AzioniPesoHeader, PesoPanel } from "./PesoPanel";
import type { PuntoStoricoObiettivoPeso, VocePeso } from "../../lib/weight";

describe("AzioniPesoHeader", () => {
  it("AzioniPesoHeader_nessunPesoOObiettivoOggi_mostraLeEtichetteAggiungi", () => {
    render(
      <AzioniPesoHeader
        haPesoOggi={false}
        haObiettivo={false}
        onApriInserimentoPeso={vi.fn()}
        onApriObiettivoPeso={vi.fn()}
      />,
    );

    expect(screen.getByText("Aggiungi peso")).toBeInTheDocument();
    expect(screen.getByText("Aggiungi obiettivo peso")).toBeInTheDocument();
  });

  it("AzioniPesoHeader_pesoEObiettivoGiaPresenti_mostraLeEtichetteAggiorna", () => {
    render(
      <AzioniPesoHeader
        haPesoOggi={true}
        haObiettivo={true}
        onApriInserimentoPeso={vi.fn()}
        onApriObiettivoPeso={vi.fn()}
      />,
    );

    expect(screen.getByText("Aggiorna peso")).toBeInTheDocument();
    expect(screen.getByText("Aggiorna obiettivo peso")).toBeInTheDocument();
  });

  it("AzioniPesoHeader_clicSuAggiungiPeso_chiamaOnApriInserimentoPeso", async () => {
    const onApriInserimentoPeso = vi.fn();
    const utente = userEvent.setup();
    render(
      <AzioniPesoHeader
        haPesoOggi={false}
        haObiettivo={false}
        onApriInserimentoPeso={onApriInserimentoPeso}
        onApriObiettivoPeso={vi.fn()}
      />,
    );

    await utente.click(screen.getByText("Aggiungi peso"));

    expect(onApriInserimentoPeso).toHaveBeenCalledTimes(1);
  });
});

// vista="grafico" di default: nel pannello reale la tabella e il riepilogo in testa mostrano
// spesso lo stesso peso, e in jsdom il grafico (recharts) non renderizza nulla di ispezionabile -
// così le asserzioni sul riepilogo non incappano in duplicati provenienti dalla tabella sottostante.
const PROPS_BASE = {
  storicoObiettivo: [] as PuntoStoricoObiettivoPeso[],
  vista: "grafico" as const,
  margineKg: 1,
};

describe("PesoPanel", () => {
  it("PesoPanel_nessunaMisurazione_mostraIlMessaggioDedicato", () => {
    render(<PesoPanel {...PROPS_BASE} peso={[]} obiettivoKg={null} />);

    expect(screen.getByText("Nessuna misurazione ancora.")).toBeInTheDocument();
  });

  it("PesoPanel_unaSolaMisurazione_mostraPesoEDataSenzaDelta", () => {
    const peso: VocePeso[] = [{ data: "2024-01-08", pesoKg: 80 }];

    render(<PesoPanel {...PROPS_BASE} peso={peso} obiettivoKg={null} />);

    expect(screen.getByText("80.0 kg")).toBeInTheDocument();
    expect(screen.queryByText(/dall'ultima misurazione/)).not.toBeInTheDocument();
  });

  it("PesoPanel_dueMisurazioni_mostraLaVariazioneRispettoAllaPrecedente", () => {
    const peso: VocePeso[] = [
      { data: "2024-01-01", pesoKg: 82 },
      { data: "2024-01-08", pesoKg: 80 },
    ];

    render(<PesoPanel {...PROPS_BASE} peso={peso} obiettivoKg={null} />);

    expect(screen.getByText(/↓ -2.0 kg dall'ultima misurazione/)).toBeInTheDocument();
  });

  it("PesoPanel_giaEntroLObiettivo_mostraIlTestoDiObiettivoRaggiunto", () => {
    const peso: VocePeso[] = [{ data: "2024-01-08", pesoKg: 80 }];

    render(<PesoPanel {...PROPS_BASE} peso={peso} obiettivoKg={80} />);

    expect(screen.getByText("Sei al di sotto del tuo obiettivo di peso.")).toBeInTheDocument();
  });

  it("PesoPanel_nonAncoraEntroLObiettivo_mostraIKgMancanti", () => {
    const peso: VocePeso[] = [{ data: "2024-01-08", pesoKg: 80 }];

    render(<PesoPanel {...PROPS_BASE} peso={peso} obiettivoKg={70} />);

    expect(screen.getByText(/mancano 9.0 kg/)).toBeInTheDocument();
  });

  it("PesoPanel_ritmoInAumentoConObiettivoDiCalo_mostraLAvvisoDiRitmoNonAllineato", () => {
    const peso: VocePeso[] = [
      { data: "2024-01-01", pesoKg: 78 },
      { data: "2024-01-08", pesoKg: 80 },
    ];

    render(<PesoPanel {...PROPS_BASE} peso={peso} obiettivoKg={70} />);

    expect(screen.getByText(/Il ritmo attuale non sta andando verso l'obiettivo\./)).toBeInTheDocument();
  });

  it("PesoPanel_vistaTabella_mostraObiettivoStoricoEVariazionePerRiga", () => {
    const peso: VocePeso[] = [
      { data: "2024-01-01", pesoKg: 82 },
      { data: "2024-01-08", pesoKg: 80 },
    ];
    const storicoObiettivo: PuntoStoricoObiettivoPeso[] = [{ targetKg: 75, registratoIl: "2024-01-01T00:00:00.000Z" }];

    render(
      <PesoPanel {...PROPS_BASE} vista="tabella" peso={peso} obiettivoKg={75} storicoObiettivo={storicoObiettivo} />,
    );

    expect(screen.getAllByText("75.0 kg")).toHaveLength(2);
    const tabella = screen.getByRole("table");
    expect(within(tabella).getByText("-2.0", { exact: false })).toBeInTheDocument();
  });
});
