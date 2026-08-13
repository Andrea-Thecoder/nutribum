import { describe, expect, it } from "vitest";
import { weightToCsv, weightToJson } from "./exportWeight";
import type { VocePeso } from "./weight";

const VOCE: VocePeso = { data: "2024-01-01", pesoKg: 80 };

describe("weightToJson", () => {
  it("weightToJson_pesata_usaLaChiavePesoKgNonPesoKgInterno", () => {
    const json = weightToJson([VOCE]);

    expect(JSON.parse(json)).toEqual([{ data: "2024-01-01", peso_kg: 80 }]);
  });
});

describe("weightToCsv", () => {
  it("weightToCsv_piuPesate_produceUnaRigaPerMisurazione", () => {
    const csv = weightToCsv([VOCE, { data: "2024-01-08", pesoKg: 79.5 }]);

    expect(csv).toBe("data,peso_kg\n2024-01-01,80\n2024-01-08,79.5\n");
  });
});
