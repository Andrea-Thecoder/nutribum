import { describe, expect, it } from "vitest";
import { accettaDueDecimali } from "./inputNumerico";

describe("accettaDueDecimali", () => {
  it("accettaDueDecimali_numeroIntero_ritornaTrue", () => {
    expect(accettaDueDecimali("42")).toBe(true);
  });

  it("accettaDueDecimali_dueDecimali_ritornaTrue", () => {
    expect(accettaDueDecimali("1.23")).toBe(true);
  });

  it("accettaDueDecimali_treDecimali_ritornaFalse", () => {
    expect(accettaDueDecimali("1.234")).toBe(false);
  });

  it("accettaDueDecimali_stringaVuota_ritornaTrue", () => {
    expect(accettaDueDecimali("")).toBe(true);
  });

  it("accettaDueDecimali_soloPuntoSenzaDecimali_ritornaTrue", () => {
    expect(accettaDueDecimali("1.")).toBe(true);
  });

  it("accettaDueDecimali_carattereNonNumerico_ritornaFalse", () => {
    expect(accettaDueDecimali("1,5")).toBe(false);
  });
});
