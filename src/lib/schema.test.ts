import { describe, expect, it } from "vitest";
import { AlimentoSchema, GiornoStoricoSchema, PastoSchema, StoricoSchema } from "./schema";

function alimentoValido(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    nome: "Pasta",
    quantita: 100,
    unita: "g",
    kcal: 350,
    proteine_g: 12,
    carboidrati_g: 70,
    grassi_g: 2,
    ...overrides,
  };
}

describe("AlimentoSchema", () => {
  it("AlimentoSchema_alimentoConSoloICampiObbligatori_eValido", () => {
    expect(AlimentoSchema.safeParse(alimentoValido()).success).toBe(true);
  });

  it("AlimentoSchema_nomeVuoto_eInvalido", () => {
    expect(AlimentoSchema.safeParse(alimentoValido({ nome: "" })).success).toBe(false);
  });

  it("AlimentoSchema_quantitaNonPositiva_eInvalido", () => {
    expect(AlimentoSchema.safeParse(alimentoValido({ quantita: 0 })).success).toBe(false);
  });

  it("AlimentoSchema_kcalNegative_eInvalido", () => {
    expect(AlimentoSchema.safeParse(alimentoValido({ kcal: -1 })).success).toBe(false);
  });

  it("AlimentoSchema_campiOpzionaliAssenti_eComunqueValido", () => {
    const risultato = AlimentoSchema.safeParse(alimentoValido());

    expect(risultato.success && risultato.data.fibre_g).toBeUndefined();
  });
});

describe("PastoSchema", () => {
  it("PastoSchema_senzaAlimenti_eInvalido", () => {
    expect(PastoSchema.safeParse({ tipo: "pranzo", alimenti: [] }).success).toBe(false);
  });

  it("PastoSchema_conAlmenoUnAlimento_eValido", () => {
    expect(PastoSchema.safeParse({ tipo: "pranzo", alimenti: [alimentoValido()] }).success).toBe(true);
  });
});

describe("GiornoStoricoSchema", () => {
  function giornoValido(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      schemaVersion: "1.0",
      data: "2024-01-01",
      pasti: [{ alimenti: [alimentoValido()] }],
      ...overrides,
    };
  }

  it("GiornoStoricoSchema_dataInFormatoCorretto_eValido", () => {
    expect(GiornoStoricoSchema.safeParse(giornoValido()).success).toBe(true);
  });

  it("GiornoStoricoSchema_dataInFormatoErrato_eInvalido", () => {
    expect(GiornoStoricoSchema.safeParse(giornoValido({ data: "01/01/2024" })).success).toBe(false);
  });

  it("GiornoStoricoSchema_senzaPasti_eInvalido", () => {
    expect(GiornoStoricoSchema.safeParse(giornoValido({ pasti: [] })).success).toBe(false);
  });
});

describe("StoricoSchema", () => {
  it("StoricoSchema_conGiorniValidi_eValido", () => {
    const storico = {
      schemaVersion: "1.0",
      giorni: [{ schemaVersion: "1.0", data: "2024-01-01", pasti: [{ alimenti: [alimentoValido()] }] }],
    };

    expect(StoricoSchema.safeParse(storico).success).toBe(true);
  });

  it("StoricoSchema_conUnGiornoInvalido_propagaLInvaliditaAllInteroStorico", () => {
    const storico = {
      schemaVersion: "1.0",
      giorni: [{ schemaVersion: "1.0", data: "data-sbagliata", pasti: [{ alimenti: [alimentoValido()] }] }],
    };

    expect(StoricoSchema.safeParse(storico).success).toBe(false);
  });
});
