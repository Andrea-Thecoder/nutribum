import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EsportaPrimaDiCancellareModal, type OpzioneExportCancellazione } from "./EsportaPrimaDiCancellareModal";

function creaOpzione(overrides: Partial<OpzioneExportCancellazione> = {}): OpzioneExportCancellazione {
  return {
    chiave: "json",
    etichetta: "Esporta in JSON",
    onEsporta: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("EsportaPrimaDiCancellareModal", () => {
  it("EsportaPrimaDiCancellareModal_renderizzato_mostraTitoloMessaggioEOpzioni", () => {
    render(
      <EsportaPrimaDiCancellareModal
        titolo="Cancellare tutto?"
        messaggio="Questa azione è irreversibile."
        opzioniExport={[creaOpzione()]}
        onProcedi={vi.fn()}
        onChiudi={vi.fn()}
      />,
    );

    expect(screen.getByText("Cancellare tutto?")).toBeInTheDocument();
    expect(screen.getByText("Questa azione è irreversibile.")).toBeInTheDocument();
    expect(screen.getByText("Esporta in JSON")).toBeInTheDocument();
  });

  it("EsportaPrimaDiCancellareModal_esportazioneRiuscita_chiamaOnProcediEOnChiudi", async () => {
    const onProcedi = vi.fn().mockResolvedValue(undefined);
    const onChiudi = vi.fn();
    const utente = userEvent.setup();
    render(
      <EsportaPrimaDiCancellareModal
        titolo="t"
        messaggio="m"
        opzioniExport={[creaOpzione()]}
        onProcedi={onProcedi}
        onChiudi={onChiudi}
      />,
    );

    await utente.click(screen.getByText("Esporta in JSON"));

    expect(onProcedi).toHaveBeenCalledTimes(1);
    expect(onChiudi).toHaveBeenCalledTimes(1);
  });

  it("EsportaPrimaDiCancellareModal_utenteAnnullaLaFinestraDiSalvataggio_nonProcedeENonChiude", async () => {
    const onProcedi = vi.fn();
    const onChiudi = vi.fn();
    const opzione = creaOpzione({ onEsporta: vi.fn().mockResolvedValue(false) });
    const utente = userEvent.setup();
    render(
      <EsportaPrimaDiCancellareModal
        titolo="t"
        messaggio="m"
        opzioniExport={[opzione]}
        onProcedi={onProcedi}
        onChiudi={onChiudi}
      />,
    );

    await utente.click(screen.getByText("Esporta in JSON"));

    expect(onProcedi).not.toHaveBeenCalled();
    expect(onChiudi).not.toHaveBeenCalled();
  });

  it("EsportaPrimaDiCancellareModal_esportazioneFallita_mostraErroreSenzaProcedereONeChiudere", async () => {
    const onProcedi = vi.fn();
    const onChiudi = vi.fn();
    const opzione = creaOpzione({ onEsporta: vi.fn().mockRejectedValue(new Error("disco pieno")) });
    const utente = userEvent.setup();
    render(
      <EsportaPrimaDiCancellareModal
        titolo="t"
        messaggio="m"
        opzioniExport={[opzione]}
        onProcedi={onProcedi}
        onChiudi={onChiudi}
      />,
    );

    await utente.click(screen.getByText("Esporta in JSON"));

    expect(screen.getByText("disco pieno")).toBeInTheDocument();
    expect(onProcedi).not.toHaveBeenCalled();
    expect(onChiudi).not.toHaveBeenCalled();
  });

  it("EsportaPrimaDiCancellareModal_procediSenzaEsportare_chiamaOnProcediSenzaChiamareAlcunaOpzione", async () => {
    const onProcedi = vi.fn().mockResolvedValue(undefined);
    const opzione = creaOpzione();
    const utente = userEvent.setup();
    render(
      <EsportaPrimaDiCancellareModal
        titolo="t"
        messaggio="m"
        opzioniExport={[opzione]}
        onProcedi={onProcedi}
        onChiudi={vi.fn()}
      />,
    );

    await utente.click(screen.getByText("Procedi senza esportare"));

    expect(opzione.onEsporta).not.toHaveBeenCalled();
    expect(onProcedi).toHaveBeenCalledTimes(1);
  });

  it("EsportaPrimaDiCancellareModal_esportazioneInCorso_disabilitaGliAltriBottoni", async () => {
    let risolviEsportazione: (v: boolean) => void = () => {};
    const opzione = creaOpzione({
      onEsporta: vi.fn(() => new Promise<boolean>((risolvi) => (risolviEsportazione = risolvi))),
    });
    const utente = userEvent.setup();
    render(
      <EsportaPrimaDiCancellareModal
        titolo="t"
        messaggio="m"
        opzioniExport={[opzione]}
        onProcedi={vi.fn()}
        onChiudi={vi.fn()}
      />,
    );

    await utente.click(screen.getByText("Esporta in JSON"));

    expect(screen.getByText("Procedi senza esportare")).toBeDisabled();
    expect(screen.getByText("Annulla")).toBeDisabled();
    risolviEsportazione(false);
  });
});
