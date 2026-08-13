import { describe, expect, it } from "vitest";
import { paletteGrafici, stileTooltip } from "./chartColors";

describe("paletteGrafici", () => {
  it("paletteGrafici_chiara_eScura_ritornanoColoriDiversiPerLoStessoRuolo", () => {
    const chiara = paletteGrafici(false);
    const scura = paletteGrafici(true);

    expect(chiara.kcal).not.toBe(scura.kcal);
  });

  it("paletteGrafici_limiteETdee_nonCondividonoMaiLoStessoColoreNellaStessaModalita", () => {
    const chiara = paletteGrafici(false);
    const scura = paletteGrafici(true);

    expect(chiara.limite).not.toBe(chiara.tdee);
    expect(scura.limite).not.toBe(scura.tdee);
  });

  it("paletteGrafici_limiteMinEBmr_nonCondividonoMaiLoStessoColoreNellaStessaModalita", () => {
    const chiara = paletteGrafici(false);
    const scura = paletteGrafici(true);

    expect(chiara.limiteMin).not.toBe(chiara.bmr);
    expect(scura.limiteMin).not.toBe(scura.bmr);
  });
});

describe("stileTooltip", () => {
  it("stileTooltip_chiaro_usaSfondoBianco", () => {
    expect(stileTooltip(false).contentStyle.backgroundColor).toBe("#ffffff");
  });

  it("stileTooltip_scuro_usaSfondoScuro", () => {
    expect(stileTooltip(true).contentStyle.backgroundColor).not.toBe("#ffffff");
  });
});
