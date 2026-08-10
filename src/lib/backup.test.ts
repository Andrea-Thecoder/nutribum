import { describe, expect, it } from "vitest";
import { validaBackupJson } from "./backup";

function backupMinimoValido() {
  return {
    schemaVersion: "1.0",
    esportatoIl: "2024-01-01T00:00:00.000Z",
    food: [],
    food_log: [],
    goal: [],
    goal_history: [],
    weight_log: [],
    weight_goal: [],
    weight_goal_history: [],
    profile: [],
    profile_history: [],
    profile_fitness: [],
    recipes: [],
    recipe_ingredients: [],
  };
}

describe("validaBackupJson", () => {
  it("validaBackupJson_jsonNonValido_lanciaUnErroreParlante", () => {
    expect(() => validaBackupJson("{non json")).toThrow("JSON non valido");
  });

  it("validaBackupJson_backupCompletoValido_ritornaIDatiTipizzati", () => {
    const backup = validaBackupJson(JSON.stringify(backupMinimoValido()));

    expect(backup.schemaVersion).toBe("1.0");
  });

  it("validaBackupJson_tabellaMancante_lanciaUnErroreConIDettagli", () => {
    const { food, ...senzaFood } = backupMinimoValido();

    expect(() => validaBackupJson(JSON.stringify(senzaFood))).toThrow("non è un backup completo valido");
  });

  it("validaBackupJson_schemaVersionDiversaDaUnoPuntoZero_vieneRifiutata", () => {
    const backup = { ...backupMinimoValido(), schemaVersion: "2.0" };

    expect(() => validaBackupJson(JSON.stringify(backup))).toThrow();
  });
});
