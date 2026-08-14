import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavBar } from "./NavBar";

// Solo i moduli che fanno IO reale in un useEffect al mount (non quelli usati solo dentro handler
// di click, mai raggiunti in questi test): senza, caricaImpostazioni() (dentro useAggiornamenti) e
// getVersion() proverebbero un vero bridge Tauri inesistente in jsdom.
vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn().mockResolvedValue(false),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readTextFile: vi.fn().mockResolvedValue("{}"),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  BaseDirectory: { AppData: 0 },
}));
vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn().mockResolvedValue("0.0.0-test"),
}));
vi.mock("../lib/dailyGoal", async (importOriginal) => {
  const attuale = await importOriginal<typeof import("../lib/dailyGoal")>();
  return { ...attuale, elencaStoricoObiettivo: vi.fn().mockResolvedValue([]) };
});

function renderNavBar(overrides: Partial<Parameters<typeof NavBar>[0]> = {}) {
  return render(
    <NavBar
      onImportato={vi.fn()}
      onAddPanel={vi.fn()}
      onAddAllPanels={vi.fn()}
      onExportHistoryJson={vi.fn()}
      onExportHistoryCsv={vi.fn()}
      onResetLayout={vi.fn()}
      onNuovoAlimento={vi.fn()}
      onNuovaRicetta={vi.fn()}
      onAlimentiImportati={vi.fn()}
      onExportFoodsJson={vi.fn()}
      onExportFoodsCsv={vi.fn()}
      onObiettivoSalvato={vi.fn()}
      onApriGiorno={vi.fn()}
      comprimiSpazioAutomaticamente={false}
      onToggleComprimiSpazioAutomaticamente={vi.fn()}
      mostraGriglia={true}
      onToggleMostraGriglia={vi.fn()}
      tipiEsistenti={[]}
      giorni={[]}
      versioneObiettivi={0}
      peso={[]}
      obiettivoPesoKg={null}
      margineObiettivoPesoKg={5}
      storicoObiettivoPeso={[]}
      storicoProfilo={[]}
      storicoFitness={[]}
      onWeightImported={vi.fn()}
      onExportWeightJson={vi.fn()}
      onExportWeightCsv={vi.fn()}
      onApriInserimentoPeso={vi.fn()}
      onApriObiettivoPeso={vi.fn()}
      onAzzeraImpostazioni={vi.fn()}
      onRiavviaTour={vi.fn()}
      menuForzatoAperto={null}
      onSvuotaDiario={vi.fn()}
      onCancellaTuttiIDati={vi.fn()}
      onEsportaBackupCompletoJson={vi.fn()}
      onEsportaDiarioJsonPreCancellazione={vi.fn()}
      onEsportaDiarioCsvPreCancellazione={vi.fn()}
      onImportaBackupCompleto={vi.fn()}
      {...overrides}
    />,
  );
}

describe("NavBar", () => {
  it("NavBar_clicSuRivediTutorialNelMenuAiuto_chiamaOnRiavviaTour", async () => {
    const onRiavviaTour = vi.fn();
    const utente = userEvent.setup();
    renderNavBar({ onRiavviaTour });

    await utente.click(screen.getByText("Aiuto"));
    await utente.click(screen.getByText("Rivedi tutorial"));

    expect(onRiavviaTour).toHaveBeenCalledTimes(1);
  });

  it("NavBar_menuForzatoApertoAlimenti_mostraIBottoniDelMenuAlimentiSenzaClick", () => {
    renderNavBar({ menuForzatoAperto: "alimenti" });

    expect(screen.getByText("Aggiungi singolo alimento")).toBeInTheDocument();
  });
});
