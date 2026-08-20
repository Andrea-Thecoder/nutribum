import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportPdfModal } from "./ReportPdfModal";
import { generaReportPdf, type DatiFonteReport } from "./generaReportPdf";

vi.mock("./generaReportPdf", () => ({
  generaReportPdf: vi.fn(),
}));

function fonteVuota(): DatiFonteReport {
  return {
    giorni: [],
    storicoObiettivi: [],
    peso: [],
    storicoObiettivoPeso: [],
    obiettivoPesoKg: null,
    storicoProfilo: [],
    storicoFitness: [],
  };
}

describe("ReportPdfModal", () => {
  it("ReportPdfModal_modalitaDefault_mostraICampiMeseDaEA", () => {
    render(<ReportPdfModal fonte={fonteVuota()} onClose={vi.fn()} />);

    expect(screen.getByLabelText("Da")).toBeInTheDocument();
    expect(screen.getByLabelText("A")).toBeInTheDocument();
  });

  it("ReportPdfModal_clicSuTuttoIlPeriodo_nascondeICampiMese", async () => {
    const utente = userEvent.setup();
    render(<ReportPdfModal fonte={fonteVuota()} onClose={vi.fn()} />);

    await utente.click(screen.getByText("Tutto il periodo"));

    expect(screen.queryByLabelText("Da")).not.toBeInTheDocument();
  });

  // Come altrove (WeightGoalModal, ProfileModal): i campi "Da"/"A" hanno min/max nativi legati
  // l'uno all'altro, quindi un click sul bottone di submit verrebbe bloccato dalla validazione
  // nativa prima ancora di raggiungere il nostro codice - si dispara il submit sul form per
  // esercitare la validazione applicativa.
  it("ReportPdfModal_meseDaSuccessivoAMeseA_mostraErroreSenzaGenerare", async () => {
    const utente = userEvent.setup();
    render(<ReportPdfModal fonte={fonteVuota()} onClose={vi.fn()} />);
    await utente.clear(screen.getByLabelText("Da"));
    await utente.type(screen.getByLabelText("Da"), "2024-06");
    await utente.clear(screen.getByLabelText("A"));
    await utente.type(screen.getByLabelText("A"), "2024-03");

    fireEvent.submit(screen.getByLabelText("Da").closest("form")!);

    expect(await screen.findByText(/deve essere prima/)).toBeInTheDocument();
    expect(generaReportPdf).not.toHaveBeenCalled();
  });

  it("ReportPdfModal_modalitaTuttoIlPeriodo_chiamaGeneraReportPdfConPeriodoNullNull", async () => {
    vi.mocked(generaReportPdf).mockResolvedValue(true);
    const utente = userEvent.setup();
    render(<ReportPdfModal fonte={fonteVuota()} onClose={vi.fn()} />);
    await utente.click(screen.getByText("Tutto il periodo"));

    await utente.click(screen.getByText("Genera PDF"));

    expect(generaReportPdf).toHaveBeenCalledWith(fonteVuota(), { dataDa: null, dataA: null });
  });

  it("ReportPdfModal_generazioneRiuscita_chiamaOnClose", async () => {
    vi.mocked(generaReportPdf).mockResolvedValue(true);
    const onClose = vi.fn();
    const utente = userEvent.setup();
    render(<ReportPdfModal fonte={fonteVuota()} onClose={onClose} />);
    await utente.click(screen.getByText("Tutto il periodo"));

    await utente.click(screen.getByText("Genera PDF"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ReportPdfModal_utenteAnnullaLaFinestraDiSalvataggio_nonChiudeLaModale", async () => {
    vi.mocked(generaReportPdf).mockResolvedValue(false);
    const onClose = vi.fn();
    const utente = userEvent.setup();
    render(<ReportPdfModal fonte={fonteVuota()} onClose={onClose} />);
    await utente.click(screen.getByText("Tutto il periodo"));

    await utente.click(screen.getByText("Genera PDF"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("ReportPdfModal_generazioneFallita_mostraLErroreSenzaChiudere", async () => {
    vi.mocked(generaReportPdf).mockRejectedValue(new Error("disco pieno"));
    const onClose = vi.fn();
    const utente = userEvent.setup();
    render(<ReportPdfModal fonte={fonteVuota()} onClose={onClose} />);
    await utente.click(screen.getByText("Tutto il periodo"));

    await utente.click(screen.getByText("Genera PDF"));

    expect(await screen.findByText("disco pieno")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

// Il titolo del primo step del tour coincide col titolo della modale (entrambi "Esporta report
// PDF"): le asserzioni sul tour restano scoperte al portale separato di react-joyride.
function portaleTour() {
  const portale = document.getElementById("react-joyride-portal");
  return portale ? within(portale) : null;
}

describe("ReportPdfModal - mini-tour", () => {
  it("ReportPdfModal_clicSulPuntoInterrogativo_avviaIlTour", async () => {
    const utente = userEvent.setup();
    render(<ReportPdfModal fonte={fonteVuota()} onClose={vi.fn()} />);

    await utente.click(screen.getByTitle("Cosa sono questi campi"));

    expect(await portaleTour()!.findByText("Esporta report PDF")).toBeInTheDocument();
  });

  it("ReportPdfModal_saltaIlTour_nonChiudeLaModale", async () => {
    const onClose = vi.fn();
    const utente = userEvent.setup();
    render(<ReportPdfModal fonte={fonteVuota()} onClose={onClose} />);
    await utente.click(screen.getByTitle("Cosa sono questi campi"));
    await portaleTour()!.findByText("Esporta report PDF");

    await utente.click(screen.getByRole("button", { name: "Salta" }));

    expect(portaleTour()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each(["report-modo", "report-periodo", "report-genera"])(
    "ReportPdfModal_haLAncoraDataTour_%s",
    (dataTour) => {
      render(<ReportPdfModal fonte={fonteVuota()} onClose={vi.fn()} />);

      expect(document.querySelector(`[data-tour="${dataTour}"]`)).toBeInTheDocument();
    },
  );
});
