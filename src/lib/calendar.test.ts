import { describe, expect, it } from "vitest";
import { costruisciMese } from "./calendar";
import type { Alimento, GiornoStorico } from "./schema";

function creaAlimento(kcal: number): Alimento {
  return { nome: "Cibo", quantita: 100, unita: "g", kcal, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 };
}

function creaGiorno(data: string, kcal: number): GiornoStorico {
  return { schemaVersion: "1.0", data, pasti: [{ tipo: "pranzo", alimenti: [creaAlimento(kcal)] }] };
}

describe("costruisciMese", () => {
  it("costruisciMese_meseDiMarzo2024_includeLeCelleDelLunedìPrimaEDelDomenicaDopo", () => {
    const celle = costruisciMese(new Date("2024-03-01T00:00:00"), []);

    expect(celle[0].chiave).toBe("2024-02-26");
    expect(celle[celle.length - 1].chiave).toBe("2024-03-31");
  });

  it("costruisciMese_giornoFuoriDalMeseDiRiferimento_vieneMarcatoComeFuoriMese", () => {
    const celle = costruisciMese(new Date("2024-03-01T00:00:00"), []);

    expect(celle[0].fuoriMese).toBe(true);
  });

  it("costruisciMese_giornoConDatiRegistrati_riportaIlTotaleKcalDiQuelGiorno", () => {
    const celle = costruisciMese(new Date("2024-03-01T00:00:00"), [creaGiorno("2024-03-10", 1800)]);

    const cella = celle.find((c) => c.chiave === "2024-03-10");

    expect(cella?.kcal).toBe(1800);
  });

  it("costruisciMese_giornoSenzaDatiRegistrati_riportaKcalNull", () => {
    const celle = costruisciMese(new Date("2024-03-01T00:00:00"), []);

    const cella = celle.find((c) => c.chiave === "2024-03-10");

    expect(cella?.kcal).toBeNull();
  });
});
