// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creaDbDiTest, type TestDb } from "../test/sqliteTestDb";

let db: TestDb;

vi.mock("./db", () => ({
  getDb: () => Promise.resolve(db),
}));

const {
  leggiProfilo,
  salvaProfilo,
  elencaStoricoProfilo,
  elencaLivelliFitness,
  impostaLivelloFitness,
  leggiLivelloFitnessAttivo,
  elencaStoricoFitness,
} = await import("./profile");

function attendiUnMillisecondo(): Promise<void> {
  return new Promise((risolvi) => setTimeout(risolvi, 5));
}

beforeEach(() => {
  db = creaDbDiTest();
});

afterEach(() => {
  db.close();
});

describe("salvaProfilo + leggiProfilo", () => {
  it("leggiProfilo_nessunProfiloSalvato_ritornaNull", async () => {
    expect(await leggiProfilo()).toBeNull();
  });

  it("salvaProfilo_primoSalvataggio_diventaRecuperabileConLeggiProfilo", async () => {
    await salvaProfilo({ etaAnni: 30, altezzaCm: 180, sesso: "M" });

    const profilo = await leggiProfilo();

    expect(profilo).toEqual({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
  });

  it("salvaProfilo_secondoSalvataggio_sovrascriveLAnagraficaAttuale", async () => {
    await salvaProfilo({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
    await salvaProfilo({ etaAnni: 31, altezzaCm: 180, sesso: "M" });

    const profilo = await leggiProfilo();

    expect(profilo?.etaAnni).toBe(31);
  });
});

describe("salvaProfilo + elencaStoricoProfilo", () => {
  it("salvaProfilo_ogniSalvataggio_accodaUnoSnapshotAlloStoricoAppendOnly", async () => {
    await salvaProfilo({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
    await salvaProfilo({ etaAnni: 31, altezzaCm: 180, sesso: "M" });

    const storico = await elencaStoricoProfilo();

    expect(storico.map((p) => p.etaAnni)).toEqual([30, 31]);
  });
});

describe("elencaLivelliFitness", () => {
  it("elencaLivelliFitness_tabellaDiLookupSeminataDallaMigration_ritornaICinqueLivelliOrdinatiPerMoltiplicatore", async () => {
    const livelli = await elencaLivelliFitness();

    expect(livelli.map((l) => l.livello)).toEqual(["sedentary", "light", "moderate", "active", "very_active"]);
  });
});

describe("impostaLivelloFitness + leggiLivelloFitnessAttivo + elencaStoricoFitness", () => {
  beforeEach(async () => {
    // profile_fitness.profile_id referenzia profile(id): il profilo anagrafico deve esistere prima
    // di poter impostare un livello di attività, stessa precondizione della UI reale (ProfileModal).
    await salvaProfilo({ etaAnni: 30, altezzaCm: 180, sesso: "M" });
  });

  it("leggiLivelloFitnessAttivo_nessunLivelloImpostato_ritornaNull", async () => {
    expect(await leggiLivelloFitnessAttivo()).toBeNull();
  });

  it("impostaLivelloFitness_livelloImpostato_diventaQuelloAttivo", async () => {
    const [moderato] = (await elencaLivelliFitness()).filter((l) => l.livello === "moderate");

    await impostaLivelloFitness(moderato.id);

    const attivo = await leggiLivelloFitnessAttivo();
    expect(attivo?.livello).toBe("moderate");
  });

  it("impostaLivelloFitness_cambioDiLivello_lUltimoImpostatoDiventaQuelloAttivo", async () => {
    const livelli = await elencaLivelliFitness();
    const sedentario = livelli.find((l) => l.livello === "sedentary")!;
    const attivoLivello = livelli.find((l) => l.livello === "active")!;
    await impostaLivelloFitness(sedentario.id);
    await attendiUnMillisecondo();

    await impostaLivelloFitness(attivoLivello.id);

    const attivo = await leggiLivelloFitnessAttivo();
    expect(attivo?.livello).toBe("active");
  });

  it("impostaLivelloFitness_ogniCambio_vieneRegistratoNelloStoricoAppendOnly", async () => {
    const livelli = await elencaLivelliFitness();
    const sedentario = livelli.find((l) => l.livello === "sedentary")!;
    const attivoLivello = livelli.find((l) => l.livello === "active")!;
    await impostaLivelloFitness(sedentario.id);
    await attendiUnMillisecondo();
    await impostaLivelloFitness(attivoLivello.id);

    const storico = await elencaStoricoFitness();

    expect(storico.map((p) => p.livello)).toEqual(["sedentary", "active"]);
  });
});
