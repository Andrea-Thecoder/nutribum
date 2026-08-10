import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarioPanel } from "./CalendarioPanel";
import { elencaStoricoObiettivo, type PuntoStoricoObiettivo } from "../../lib/dailyGoal";
import type { Alimento, GiornoStorico } from "../../lib/schema";

vi.mock("../../lib/dailyGoal", async (importaOriginale) => {
  const originale = await importaOriginale<typeof import("../../lib/dailyGoal")>();
  return { ...originale, elencaStoricoObiettivo: vi.fn() };
});
vi.mock("../../lib/errorLog", () => ({
  registraErroreNonBloccante: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(elencaStoricoObiettivo).mockResolvedValue([]);
});

function creaGiorno(data: string, kcal: number): GiornoStorico {
  const alimento: Alimento = { nome: "Cibo", quantita: 100, unita: "g", kcal, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 };
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [alimento] }] };
}

function creaLimiteKcal(kcal: number): PuntoStoricoObiettivo {
  return {
    id: 1,
    validoDal: "2000-01-01",
    validoAl: null,
    ambito: "sempre",
    registratoIl: "2000-01-01T00:00:00.000Z",
    gruppo: "kcal",
    kcal,
    kcalMin: null,
    proteineG: null,
    carboidratiG: null,
    grassiG: null,
    fibreG: null,
    saleG: null,
  };
}

const PROPS_BASE = { onApriGiorno: vi.fn(), versioneObiettivi: 0, peso: [], storicoProfilo: [], storicoFitness: [] };

describe("CalendarioPanel", () => {
  it("CalendarioPanel_renderizzato_mostraLIntestazioneDeiGiorniDellaSettimana", () => {
    render(<CalendarioPanel {...PROPS_BASE} giorni={[]} />);

    expect(screen.getByText("Lun")).toBeInTheDocument();
    expect(screen.getByText("Dom")).toBeInTheDocument();
  });

  it("CalendarioPanel_clicSuUnaCellaConDati_chiamaOnApriGiornoConQuellaChiave", async () => {
    const onApriGiorno = vi.fn();
    const utente = userEvent.setup();
    const oggi = new Date();
    const giornoConDati = new Date(oggi.getFullYear(), oggi.getMonth(), 10);
    const chiave = `${giornoConDati.getFullYear()}-${String(giornoConDati.getMonth() + 1).padStart(2, "0")}-10`;
    render(<CalendarioPanel {...PROPS_BASE} onApriGiorno={onApriGiorno} giorni={[creaGiorno(chiave, 2000)]} />);

    await utente.click(screen.getByText("10"));

    expect(onApriGiorno).toHaveBeenCalledWith(chiave);
  });

  it("CalendarioPanel_clicSuUnaCellaSenzaDati_nonChiamaOnApriGiorno", async () => {
    const onApriGiorno = vi.fn();
    const utente = userEvent.setup();
    render(<CalendarioPanel {...PROPS_BASE} onApriGiorno={onApriGiorno} giorni={[]} />);

    await utente.click(screen.getByText("10"));

    expect(onApriGiorno).not.toHaveBeenCalled();
  });

  it("CalendarioPanel_clicSuFrecciaAvanti_cambiaIlMeseVisualizzato", async () => {
    const utente = userEvent.setup();
    render(<CalendarioPanel {...PROPS_BASE} giorni={[]} />);
    const meseIniziale = screen.getByText(/\d{4}$/).textContent;

    await utente.click(screen.getByText("›"));

    expect(screen.getByText(/\d{4}$/).textContent).not.toBe(meseIniziale);
  });

  // Regressione: sforamentoDi/kcalSforato cercavano l'etichetta "Kcal" ma calcolaSforamenti produce
  // "Kcal (limite)" (rinominata in dailyGoal.ts) - senza il fix sotto l'emoji 🔥 non comparirebbe mai.
  it("CalendarioPanel_giornoConSforamentoKcal_mostraLEmojiDiFuoco", async () => {
    vi.mocked(elencaStoricoObiettivo).mockResolvedValue([creaLimiteKcal(2000)]);
    const oggi = new Date();
    const chiave = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, "0")}-10`;
    render(<CalendarioPanel {...PROPS_BASE} giorni={[creaGiorno(chiave, 2500)]} />);

    expect(await screen.findByTitle("Kcal superate")).toBeInTheDocument();
  });
});
