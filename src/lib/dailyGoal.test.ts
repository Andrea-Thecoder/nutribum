import { describe, expect, it } from "vitest";
import {
  calcolaSforamenti,
  calcolaStatoCarenza,
  calcolaStatoPositivo,
  calcolaStatoSforamenti,
  carenzaGrave,
  limiteMinimoEffettivo,
  obiettivoEffettivo,
  type Goal,
  type PuntoStoricoObiettivo,
} from "./dailyGoal";
import type { Totali } from "./aggregate";
import type { Alimento, GiornoStorico } from "./schema";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "./profile";
import type { VocePeso } from "./weight";

function creaPuntoStorico(overrides: Partial<PuntoStoricoObiettivo> & { id: number }): PuntoStoricoObiettivo {
  return {
    validoDal: "2024-01-01",
    validoAl: null,
    ambito: "sempre",
    registratoIl: "2024-01-01T00:00:00.000Z",
    gruppo: "kcal",
    kcal: null,
    kcalMin: null,
    proteineG: null,
    carboidratiG: null,
    grassiG: null,
    fibreG: null,
    saleG: null,
    ...overrides,
  };
}

function creaTotali(overrides: Partial<Totali> = {}): Totali {
  return {
    kcal: 0,
    proteine_g: 0,
    carboidrati_g: 0,
    grassi_g: 0,
    zuccheri_g: 0,
    grassi_saturi_g: 0,
    fibre_g: 0,
    sale_g: 0,
    ...overrides,
  };
}

function creaAlimento(kcal: number): Alimento {
  return { nome: "Cibo", quantita: 100, unita: "g", kcal, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 };
}

function creaGiorno(data: string, kcal: number): GiornoStorico {
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [creaAlimento(kcal)] }] };
}

describe("obiettivoEffettivo", () => {
  it("obiettivoEffettivo_nessunPuntoNelloStorico_ritornaNull", () => {
    const obiettivo = obiettivoEffettivo([], "2024-01-01");

    expect(obiettivo).toBeNull();
  });

  it("obiettivoEffettivo_soloUnGruppoImpostato_lasciaGliAltriGruppiNulli", () => {
    const storico = [creaPuntoStorico({ id: 1, gruppo: "kcal", kcal: 2000 })];

    const obiettivo = obiettivoEffettivo(storico, "2024-01-01") as Goal;

    expect(obiettivo.proteineG).toBeNull();
  });

  it("obiettivoEffettivo_duePuntiValidiStessoGruppo_vinceQuelloConIdPiuAlto", () => {
    const storico = [
      creaPuntoStorico({ id: 1, gruppo: "kcal", kcal: 1800, ambito: "sempre" }),
      creaPuntoStorico({ id: 2, gruppo: "kcal", kcal: 2200, ambito: "sempre" }),
    ];

    const obiettivo = obiettivoEffettivo(storico, "2024-01-01") as Goal;

    expect(obiettivo.kcal).toBe(2200);
  });

  it("obiettivoEffettivo_puntoConValidoAlPrimaDellaData_vieneIgnorato", () => {
    const storico = [
      creaPuntoStorico({ id: 1, gruppo: "kcal", kcal: 2000, validoDal: "2024-01-01", validoAl: "2024-01-31" }),
    ];

    const obiettivo = obiettivoEffettivo(storico, "2024-02-01");

    expect(obiettivo).toBeNull();
  });

  it("obiettivoEffettivo_gruppiDiversi_vengonoRisoltiIndipendentementeECombinati", () => {
    const storico = [
      creaPuntoStorico({ id: 1, gruppo: "kcal", kcal: 2000 }),
      creaPuntoStorico({ id: 2, gruppo: "macro", proteineG: 120 }),
    ];

    const obiettivo = obiettivoEffettivo(storico, "2024-01-01") as Goal;

    expect(obiettivo).toEqual(
      expect.objectContaining({ kcal: 2000, proteineG: 120 }),
    );
  });
});

describe("calcolaSforamenti", () => {
  it("calcolaSforamenti_obiettivoNull_ritornaArrayVuoto", () => {
    const sforamenti = calcolaSforamenti(creaTotali({ kcal: 3000 }), null);

    expect(sforamenti).toEqual([]);
  });

  it("calcolaSforamenti_valoreSottoLimite_nonSegnalaSforamento", () => {
    const obiettivo: Goal = {
      kcal: 2000,
      kcalMin: null,
      proteineG: null,
      carboidratiG: null,
      grassiG: null,
      fibreG: null,
      saleG: null,
    };

    const sforamenti = calcolaSforamenti(creaTotali({ kcal: 1800 }), obiettivo);

    expect(sforamenti).toEqual([]);
  });

  it("calcolaSforamenti_valoreSopraLimite_segnalaLoSforamentoConIlLimiteConfrontato", () => {
    const obiettivo: Goal = {
      kcal: 2000,
      kcalMin: null,
      proteineG: null,
      carboidratiG: null,
      grassiG: null,
      fibreG: null,
      saleG: null,
    };

    const sforamenti = calcolaSforamenti(creaTotali({ kcal: 2200 }), obiettivo);

    expect(sforamenti).toEqual([{ etichetta: "Kcal (limite)", valore: 2200, limite: 2000 }]);
  });

  it("calcolaSforamenti_limiteNonImpostatoPerUnaMetrica_nonLaControlla", () => {
    const obiettivo: Goal = {
      kcal: null,
      kcalMin: null,
      proteineG: null,
      carboidratiG: null,
      grassiG: null,
      fibreG: null,
      saleG: null,
    };

    const sforamenti = calcolaSforamenti(creaTotali({ kcal: 5000 }), obiettivo);

    expect(sforamenti).toEqual([]);
  });
});

describe("limiteMinimoEffettivo", () => {
  const storicoProfilo: PuntoStoricoProfilo[] = [
    { etaAnni: 30, altezzaCm: 180, sesso: "M", registratoIl: "2024-01-01" },
  ];
  const storicoFitness: PuntoStoricoFitness[] = [
    { livello: "moderate", moltiplicatore: 1.55, impostatoIl: "2024-01-01" },
  ];
  const peso: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];

  it("limiteMinimoEffettivo_minimoManualeImpostato_ritornaIlValoreManuale", () => {
    const obiettivo: Goal = {
      kcal: null,
      kcalMin: 1500,
      proteineG: null,
      carboidratiG: null,
      grassiG: null,
      fibreG: null,
      saleG: null,
    };

    const minimo = limiteMinimoEffettivo("2024-02-01", obiettivo, storicoProfilo, storicoFitness, peso);

    expect(minimo).toBe(1500);
  });

  it("limiteMinimoEffettivo_minimoManualeAssenteConStoricoCompleto_ricadeSulBmrCalcolato", () => {
    const minimo = limiteMinimoEffettivo("2024-02-01", null, storicoProfilo, storicoFitness, peso);

    expect(minimo).toBe(1780);
  });

  it("limiteMinimoEffettivo_nessunProfiloRegistrato_ritornaNull", () => {
    const minimo = limiteMinimoEffettivo("2024-02-01", null, [], storicoFitness, peso);

    expect(minimo).toBeNull();
  });
});

describe("carenzaGrave", () => {
  it("carenzaGrave_minimoNonImpostato_ritornaFalse", () => {
    expect(carenzaGrave(100, null)).toBe(false);
  });

  it("carenzaGrave_kcalSottoIl25PercentoDelMinimo_ritornaTrue", () => {
    expect(carenzaGrave(200, 1000)).toBe(true);
  });

  it("carenzaGrave_kcalSottoIlMinimoMaSopraLaSogliaGrave_ritornaFalse", () => {
    expect(carenzaGrave(900, 1000)).toBe(false);
  });
});

describe("calcolaStatoSforamenti", () => {
  it("calcolaStatoSforamenti_giorniSforatiConsecutiviFinoAdOggi_contaLaSerie", () => {
    const storico = [creaPuntoStorico({ id: 1, gruppo: "kcal", kcal: 2000 })];
    const giorni = [creaGiorno("2024-01-08", 2500), creaGiorno("2024-01-09", 2500)];

    const stato = calcolaStatoSforamenti(giorni, storico, "2024-01-09");

    expect(stato.serieConsecutiva).toBe(2);
  });

  it("calcolaStatoSforamenti_giornoSenzaDatiRegistrati_interrompeLaSerie", () => {
    const storico = [creaPuntoStorico({ id: 1, gruppo: "kcal", kcal: 2000 })];
    const giorni = [creaGiorno("2024-01-09", 2500)];

    const stato = calcolaStatoSforamenti(giorni, storico, "2024-01-10");

    expect(stato.serieConsecutiva).toBe(0);
  });

  it("calcolaStatoSforamenti_giorniSforatiNonConsecutiviNelMese_liContaTuttiComunque", () => {
    const storico = [creaPuntoStorico({ id: 1, gruppo: "kcal", kcal: 2000 })];
    const giorni = [creaGiorno("2024-01-03", 2500), creaGiorno("2024-01-20", 2500)];

    const stato = calcolaStatoSforamenti(giorni, storico, "2024-01-25");

    expect(stato.giorniSforatiNelMese).toBe(2);
  });
});

describe("calcolaStatoCarenza", () => {
  const storicoProfilo: PuntoStoricoProfilo[] = [
    { etaAnni: 30, altezzaCm: 180, sesso: "M", registratoIl: "2024-01-01" },
  ];
  const storicoFitness: PuntoStoricoFitness[] = [
    { livello: "moderate", moltiplicatore: 1.55, impostatoIl: "2024-01-01" },
  ];
  const peso: VocePeso[] = [{ data: "2024-01-01", pesoKg: 80 }];

  it("calcolaStatoCarenza_kcalSottoIlMinimoManuale_contaComeGiornoCarente", () => {
    const storico = [creaPuntoStorico({ id: 1, gruppo: "kcal", kcalMin: 1500 })];
    const giorni = [creaGiorno("2024-02-01", 1000)];

    const stato = calcolaStatoCarenza(giorni, storico, storicoProfilo, storicoFitness, peso, "2024-02-01");

    expect(stato.giorniCarentiNelMese).toBe(1);
  });

  it("calcolaStatoCarenza_kcalSottoLaSogliaGrave_contaAncheComeGiornoGrave", () => {
    const storico = [creaPuntoStorico({ id: 1, gruppo: "kcal", kcalMin: 1500 })];
    const giorni = [creaGiorno("2024-02-01", 200)];

    const stato = calcolaStatoCarenza(giorni, storico, storicoProfilo, storicoFitness, peso, "2024-02-01");

    expect(stato.giorniCarentiGraviNelMese).toBe(1);
  });

  it("calcolaStatoCarenza_nessunRiferimentoDisponibile_nonContaComeCarente", () => {
    const storico = [creaPuntoStorico({ id: 1, gruppo: "kcal" })];
    const giorni = [creaGiorno("2024-02-01", 0)];

    const stato = calcolaStatoCarenza(giorni, storico, [], [], [], "2024-02-01");

    expect(stato.giorniCarentiNelMese).toBe(0);
  });
});

describe("calcolaStatoPositivo", () => {
  const storicoProfilo: PuntoStoricoProfilo[] = [];
  const storicoFitness: PuntoStoricoFitness[] = [];
  const peso: VocePeso[] = [];

  it("calcolaStatoPositivo_giornoSenzaObiettivoImpostato_nonContaComePulito", () => {
    const giorni = [creaGiorno("2024-01-08", 1800)];

    const stato = calcolaStatoPositivo(giorni, [], storicoProfilo, storicoFitness, peso, "2024-01-08");

    expect(stato.giorniPulitiNelMese).toBe(0);
  });

  it("calcolaStatoPositivo_giornoEntroIlLimiteConObiettivoImpostato_contaComePulito", () => {
    const storico = [creaPuntoStorico({ id: 1, gruppo: "kcal", kcal: 2000 })];
    const giorni = [creaGiorno("2024-01-08", 1800)];

    const stato = calcolaStatoPositivo(giorni, storico, storicoProfilo, storicoFitness, peso, "2024-01-08");

    expect(stato.giorniPulitiNelMese).toBe(1);
  });

  it("calcolaStatoPositivo_giornoConSforamento_nonContaComePulito", () => {
    const storico = [creaPuntoStorico({ id: 1, gruppo: "kcal", kcal: 2000 })];
    const giorni = [creaGiorno("2024-01-08", 2500)];

    const stato = calcolaStatoPositivo(giorni, storico, storicoProfilo, storicoFitness, peso, "2024-01-08");

    expect(stato.giorniPulitiNelMese).toBe(0);
  });
});
