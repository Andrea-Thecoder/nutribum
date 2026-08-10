import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useConferma, useConfermaChiusura } from "./ConfermaModal";

function ComponenteDiProva({ onEsito }: { onEsito: (esito: boolean) => void }) {
  const { chiedi, elemento } = useConferma();
  return (
    <div>
      <button onClick={() => chiedi("Confermi l'operazione?").then(onEsito)}>Chiedi conferma</button>
      {elemento}
    </div>
  );
}

describe("useConferma", () => {
  it("useConferma_chiedi_mostraIlMessaggioPassato", async () => {
    const utente = userEvent.setup();
    render(<ComponenteDiProva onEsito={vi.fn()} />);

    await utente.click(screen.getByText("Chiedi conferma"));

    expect(screen.getByText("Confermi l'operazione?")).toBeInTheDocument();
  });

  it("useConferma_clicSuConferma_risolveLaPromiseATrue", async () => {
    const onEsito = vi.fn();
    const utente = userEvent.setup();
    render(<ComponenteDiProva onEsito={onEsito} />);
    await utente.click(screen.getByText("Chiedi conferma"));

    await utente.click(screen.getByText("Conferma"));

    expect(onEsito).toHaveBeenCalledWith(true);
  });

  it("useConferma_clicSuAnnulla_risolveLaPromiseAFalse", async () => {
    const onEsito = vi.fn();
    const utente = userEvent.setup();
    render(<ComponenteDiProva onEsito={onEsito} />);
    await utente.click(screen.getByText("Chiedi conferma"));

    await utente.click(screen.getByText("Annulla"));

    expect(onEsito).toHaveBeenCalledWith(false);
  });

  it("useConferma_clicSuAnnulla_rimuoveIlMessaggioDalDom", async () => {
    const utente = userEvent.setup();
    render(<ComponenteDiProva onEsito={vi.fn()} />);
    await utente.click(screen.getByText("Chiedi conferma"));

    await utente.click(screen.getByText("Annulla"));

    expect(screen.queryByText("Confermi l'operazione?")).not.toBeInTheDocument();
  });
});

function ComponenteChiusura({ modificato }: { modificato: boolean }) {
  const { richiediChiusura, elementoConferma } = useConfermaChiusura(modificato, vi.fn());
  return (
    <div>
      <button onClick={richiediChiusura}>Chiudi</button>
      {elementoConferma}
    </div>
  );
}

describe("useConfermaChiusura", () => {
  it("useConfermaChiusura_nienteDaSalvare_chiudeSubitoSenzaChiedereConferma", async () => {
    const utente = userEvent.setup();
    render(<ComponenteChiusura modificato={false} />);

    await utente.click(screen.getByText("Chiudi"));

    expect(screen.queryByText("Uscire senza salvare? I dati inseriti andranno persi.")).not.toBeInTheDocument();
  });

  it("useConfermaChiusura_datiModificati_chiedeConfermaPrimaDiChiudere", async () => {
    const utente = userEvent.setup();
    render(<ComponenteChiusura modificato={true} />);

    await utente.click(screen.getByText("Chiudi"));

    expect(screen.getByText("Uscire senza salvare? I dati inseriti andranno persi.")).toBeInTheDocument();
  });
});
