import { describe, expect, it } from "vitest";
import { historyToCsv } from "./exportDiary";
import type { Storico } from "./schema";

describe("historyToCsv", () => {
  it("historyToCsv_storicoConUnAlimento_produceUnaRigaConTuttiICampi", () => {
    const storico: Storico = {
      schemaVersion: "1.0",
      giorni: [
        {
          schemaVersion: "1.0",
          data: "2024-01-01",
          pasti: [
            {
              tipo: "pranzo",
              orario: "13:00",
              alimenti: [
                { nome: "Pasta", quantita: 100, unita: "g", kcal: 350, proteine_g: 12, carboidrati_g: 70, grassi_g: 2 },
              ],
            },
          ],
        },
      ],
    };

    const csv = historyToCsv(storico);

    expect(csv).toBe(
      "data,orario,tipo_pasto,alimento,quantita,unita,kcal,proteine_g,carboidrati_g,grassi_g,zuccheri_g,grassi_saturi_g,fibre_g,sale_g\n" +
        "2024-01-01,13:00,pranzo,Pasta,100,g,350,12,70,2,,,,\n",
    );
  });

  it("historyToCsv_piuGiorniEPasti_produceUnaRigaPerOgniAlimento", () => {
    const storico: Storico = {
      schemaVersion: "1.0",
      giorni: [
        {
          schemaVersion: "1.0",
          data: "2024-01-01",
          pasti: [
            { alimenti: [{ nome: "Pasta", quantita: 100, unita: "g", kcal: 350, proteine_g: 12, carboidrati_g: 70, grassi_g: 2 }] },
          ],
        },
        {
          schemaVersion: "1.0",
          data: "2024-01-02",
          pasti: [
            { alimenti: [{ nome: "Riso", quantita: 100, unita: "g", kcal: 330, proteine_g: 7, carboidrati_g: 80, grassi_g: 1 }] },
          ],
        },
      ],
    };

    const righe = historyToCsv(storico).trim().split("\n");

    expect(righe).toHaveLength(3); // intestazione + 2 alimenti
  });

  it("historyToCsv_storicoSenzaGiorni_produceSoloLIntestazione", () => {
    const storico: Storico = { schemaVersion: "1.0", giorni: [] };

    const csv = historyToCsv(storico);

    expect(csv.trim().split("\n")).toHaveLength(1);
  });
});
