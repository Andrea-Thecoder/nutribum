import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  leggiObiettivo,
  salvaObiettivoKcal,
  salvaObiettivoMacro,
  salvaObiettivoAltro,
  type Ambito,
} from "../lib/dailyGoal";
import { leggiProfilo, leggiLivelloFitnessAttivo, type Profilo, type LivelloFitness } from "../lib/profile";
import { calcolaTDEE } from "../lib/tdee";
import { registraErroreNonBloccante } from "../lib/errorLog";
import type { VocePeso } from "../lib/weight";
import { SelettorePersonalizzato } from "./SelettorePersonalizzato";
import { useConfermaChiusura } from "./ConfermaModal";

export type TipoObiettivo = "kcal" | "macro" | "altro";

interface ObiettivoGiornalieroModalProps {
  tipo: TipoObiettivo;
  peso: VocePeso[];
  onChiudi: () => void;
  onSalvato?: () => void;
}

const CAMPO =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

const TITOLI: Record<TipoObiettivo, string> = {
  kcal: "Limite giornaliero — Kcal",
  macro: "Limite giornaliero — Macronutrienti",
  altro: "Limite giornaliero — Altro",
};

const ETICHETTE_AMBITO: Record<Ambito, string> = {
  daOra: "Da ora in poi",
  sempre: "Sempre (tutta la cronologia)",
  settimana: "Questa settimana",
  mese: "Questo mese",
};

const DESCRIZIONI_AMBITO: Record<Ambito, string> = {
  daOra: "Vale da adesso in poi, non tocca i giorni passati.",
  sempre: "Vale per tutta la cronologia di questo limite, passata e futura.",
  settimana: "Vale solo dal lunedì alla domenica di questa settimana.",
  mese: "Vale solo dal primo all'ultimo giorno di questo mese.",
};

// Arrotonda a 1 decimale; null se il campo è vuoto (nessun limite impostato), undefined se non valido.
function parseNumeroPositivoOVuoto(v: string): number | null | undefined {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 10) / 10;
}

// Ricorda l'ultimo ambito effettivamente usato in un salvataggio riuscito, per tipo di obiettivo:
// dimenticarsi di riselezionarlo (il campo riparte sempre da qui) è proprio ciò che ha causato più
// volte una portata "persa" in precedenza, quindi si preseleziona invece di ripartire da "Da ora in poi".
function chiaveAmbito(tipo: TipoObiettivo): string {
  return `nutribum:ambito:${tipo}`;
}

function leggiUltimoAmbito(tipo: TipoObiettivo): Ambito {
  const valore = localStorage.getItem(chiaveAmbito(tipo));
  return valore === "sempre" || valore === "settimana" || valore === "mese" ? valore : "daOra";
}

function scriviUltimoAmbito(tipo: TipoObiettivo, valore: Ambito): void {
  localStorage.setItem(chiaveAmbito(tipo), valore);
}

export function ObiettivoGiornalieroModal({ tipo, peso, onChiudi, onSalvato }: ObiettivoGiornalieroModalProps) {
  const [caricamento, setCaricamento] = useState(true);
  const [kcal, setKcal] = useState("");
  const [kcalMin, setKcalMin] = useState("");
  const [grassi, setGrassi] = useState("");
  const [proteine, setProteine] = useState("");
  const [carboidrati, setCarboidrati] = useState("");
  const [sale, setSale] = useState("");
  const [fibre, setFibre] = useState("");
  const [ambito, setAmbito] = useState<Ambito>(() => leggiUltimoAmbito(tipo));
  const [errore, setErrore] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);
  const [modificato, setModificato] = useState(false);
  const { richiediChiusura, elementoConferma } = useConfermaChiusura(modificato, onChiudi);

  // Solo per il tab kcal: profilo/livello attività per calcolare il TDEE live se l'utente spunta
  // "Usa TDEE calcolato" — vedi risultatoTDEE più sotto. Convivono con il valore manuale, non lo
  // sostituiscono di default: la checkbox parte sempre deselezionata.
  const [usaTDEE, setUsaTDEE] = useState(false);
  // Speculare a usaTDEE ma per il limite minimo: il BMR (già dentro risultatoTDEE, nessun calcolo
  // nuovo) come fabbisogno energetico di base sotto cui scendere è un rischio (denutrizione).
  const [usaBMR, setUsaBMR] = useState(false);
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [livelloAttivo, setLivelloAttivo] = useState<LivelloFitness | null>(null);

  useEffect(() => {
    leggiObiettivo()
      .then((obiettivo) => {
        if (obiettivo) {
          if (obiettivo.kcal !== null) setKcal(String(obiettivo.kcal));
          if (obiettivo.kcalMin !== null) setKcalMin(String(obiettivo.kcalMin));
          if (obiettivo.grassiG !== null) setGrassi(String(obiettivo.grassiG));
          if (obiettivo.proteineG !== null) setProteine(String(obiettivo.proteineG));
          if (obiettivo.carboidratiG !== null) setCarboidrati(String(obiettivo.carboidratiG));
          if (obiettivo.saleG !== null) setSale(String(obiettivo.saleG));
          if (obiettivo.fibreG !== null) setFibre(String(obiettivo.fibreG));
        }
      })
      .catch((err) => {
        setErrore(err instanceof Error ? err.message : "Errore nel caricamento dell'obiettivo attuale");
        registraErroreNonBloccante(err, "Caricamento obiettivo attuale (modale) fallito");
      })
      .finally(() => setCaricamento(false));

    if (tipo === "kcal") {
      Promise.all([leggiProfilo(), leggiLivelloFitnessAttivo()])
        .then(([p, l]) => {
          setProfilo(p);
          setLivelloAttivo(l);
        })
        .catch((err) => registraErroreNonBloccante(err, "Caricamento profilo/TDEE (modale limite kcal) fallito"));
    }
  }, [tipo]);

  const ultimoPeso = peso.length > 0 ? peso[peso.length - 1] : null;
  const risultatoTDEE =
    profilo && livelloAttivo && ultimoPeso
      ? calcolaTDEE(profilo, ultimoPeso.pesoKg, livelloAttivo.moltiplicatore)
      : null;

  // Messaggi distinti: "completa il profilo" solo se manca davvero il profilo (età/altezza/sesso/
  // livello attività, sempre salvati insieme da ProfileModal — l'uno implica l'altro in questo
  // schema), un messaggio diverso se il profilo c'è ma manca ancora un peso registrato.
  const motivoTDEENonDisponibile =
    !profilo || !livelloAttivo
      ? "Completa il profilo per sbloccare questa funzionalità (NavBar → Diario Alimentare → Profilo (per il TDEE)…)."
      : !ultimoPeso
        ? "Registra almeno un peso (pannello Peso Corporeo) per calcolare il TDEE."
        : null;

  // Il campo mostra il TDEE calcolato (disabilitato) mentre la checkbox è spuntata, così è chiaro
  // cosa verrà davvero salvato — niente stato separato "valore effettivo": è lo stesso "kcal" usato
  // anche per il salvataggio manuale, la checkbox decide solo se l'utente può modificarlo o no.
  useEffect(() => {
    if (usaTDEE && risultatoTDEE) setKcal(String(risultatoTDEE.tdee));
  }, [usaTDEE, risultatoTDEE]);

  useEffect(() => {
    if (usaBMR && risultatoTDEE) setKcalMin(String(risultatoTDEE.bmr));
  }, [usaBMR, risultatoTDEE]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrore(null);

    if (tipo === "kcal") {
      const kcalN = parseNumeroPositivoOVuoto(kcal);
      const kcalMinN = parseNumeroPositivoOVuoto(kcalMin);
      if (kcalN === undefined || kcalMinN === undefined) {
        setErrore("I valori devono essere numeri ≥ 0");
        return;
      }
      if (kcalN !== null && kcalMinN !== null && kcalMinN >= kcalN) {
        setErrore("Il limite minimo deve essere inferiore al limite massimo");
        return;
      }
      setSalvataggio(true);
      try {
        await salvaObiettivoKcal(kcalN, kcalMinN, ambito);
        scriviUltimoAmbito(tipo, ambito);
        onSalvato?.();
        onChiudi();
      } catch (err) {
        setErrore(err instanceof Error ? err.message : "Errore durante il salvataggio");
      } finally {
        setSalvataggio(false);
      }
      return;
    }

    if (tipo === "macro") {
      const grassiN = parseNumeroPositivoOVuoto(grassi);
      const proteineN = parseNumeroPositivoOVuoto(proteine);
      const carboidratiN = parseNumeroPositivoOVuoto(carboidrati);
      if (grassiN === undefined || proteineN === undefined || carboidratiN === undefined) {
        setErrore("I valori devono essere numeri ≥ 0");
        return;
      }
      setSalvataggio(true);
      try {
        await salvaObiettivoMacro(
          { grassiG: grassiN, proteineG: proteineN, carboidratiG: carboidratiN },
          ambito,
        );
        scriviUltimoAmbito(tipo, ambito);
        onSalvato?.();
        onChiudi();
      } catch (err) {
        setErrore(err instanceof Error ? err.message : "Errore durante il salvataggio");
      } finally {
        setSalvataggio(false);
      }
      return;
    }

    const saleN = parseNumeroPositivoOVuoto(sale);
    const fibreN = parseNumeroPositivoOVuoto(fibre);
    if (saleN === undefined || fibreN === undefined) {
      setErrore("I valori devono essere numeri ≥ 0");
      return;
    }
    setSalvataggio(true);
    try {
      await salvaObiettivoAltro({ saleG: saleN, fibreG: fibreN }, ambito);
      scriviUltimoAmbito(tipo, ambito);
      onSalvato?.();
      onChiudi();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante il salvataggio");
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <>
      {elementoConferma}
      {createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 text-slate-900 dark:text-slate-100" onClick={richiediChiusura}>
      <div onClick={(e) => e.stopPropagation()} className="min-h-0 p-[3vmin]">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{TITOLI[tipo]}</h2>
          <button
            onClick={richiediChiusura}
            className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            ✕
          </button>
        </div>

        {caricamento ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Caricamento…</p>
        ) : (
          <form onSubmit={handleSubmit} onChange={() => setModificato(true)} className="flex flex-col gap-2 text-sm">
            {tipo === "kcal" && (
              <>
                <label className="flex flex-col gap-0.5">
                  Kcal al giorno
                  <input
                    className={CAMPO}
                    type="number"
                    min={0}
                    step="0.1"
                    value={kcal}
                    onChange={(e) => setKcal(e.target.value)}
                    disabled={usaTDEE}
                    autoFocus
                  />
                </label>

                <label
                  className="flex items-center gap-2 py-1"
                  title={motivoTDEENonDisponibile ?? undefined}
                >
                  <input
                    type="checkbox"
                    checked={usaTDEE}
                    onChange={(e) => setUsaTDEE(e.target.checked)}
                    disabled={!risultatoTDEE}
                    title={motivoTDEENonDisponibile ?? undefined}
                  />
                  Usa TDEE calcolato
                </label>

                {usaTDEE && risultatoTDEE && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    BMR {risultatoTDEE.bmr} kcal × attività {livelloAttivo?.etichetta.toLowerCase()} = {risultatoTDEE.tdee}{" "}
                    kcal. Basato sul profilo e sull'ultima misurazione di peso — aggiornali se cambiano.
                  </p>
                )}

                {motivoTDEENonDisponibile && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">{motivoTDEENonDisponibile}</p>
                )}

                <label className="mt-2 flex flex-col gap-0.5">
                  Kcal minimo al giorno
                  <input
                    className={CAMPO}
                    type="number"
                    min={0}
                    step="0.1"
                    value={kcalMin}
                    onChange={(e) => setKcalMin(e.target.value)}
                    disabled={usaBMR}
                  />
                </label>

                <label
                  className="flex items-center gap-2 py-1"
                  title={motivoTDEENonDisponibile ?? undefined}
                >
                  <input
                    type="checkbox"
                    checked={usaBMR}
                    onChange={(e) => setUsaBMR(e.target.checked)}
                    disabled={!risultatoTDEE}
                    title={motivoTDEENonDisponibile ?? undefined}
                  />
                  Usa BMR calcolato
                </label>

                {usaBMR && risultatoTDEE && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    BMR {risultatoTDEE.bmr} kcal: il fabbisogno energetico a riposo, sotto il quale
                    si rischia la denutrizione. Basato sul profilo e sull'ultima misurazione di
                    peso — aggiornali se cambiano.
                  </p>
                )}
              </>
            )}

            {tipo === "macro" && (
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-0.5">
                  Grassi (g)
                  <input
                    className={CAMPO}
                    type="number"
                    min={0}
                    step="0.1"
                    value={grassi}
                    onChange={(e) => setGrassi(e.target.value)}
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  Proteine (g)
                  <input
                    className={CAMPO}
                    type="number"
                    min={0}
                    step="0.1"
                    value={proteine}
                    onChange={(e) => setProteine(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  Carboidrati (g)
                  <input
                    className={CAMPO}
                    type="number"
                    min={0}
                    step="0.1"
                    value={carboidrati}
                    onChange={(e) => setCarboidrati(e.target.value)}
                  />
                </label>
              </div>
            )}

            {tipo === "altro" && (
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-0.5">
                  Sale (g)
                  <input
                    className={CAMPO}
                    type="number"
                    min={0}
                    step="0.1"
                    value={sale}
                    onChange={(e) => setSale(e.target.value)}
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  Fibre (g)
                  <input
                    className={CAMPO}
                    type="number"
                    min={0}
                    step="0.1"
                    value={fibre}
                    onChange={(e) => setFibre(e.target.value)}
                  />
                </label>
              </div>
            )}

            <label className="flex flex-col gap-0.5 py-1">
              Ambito di validità
              <SelettorePersonalizzato
                valore={ambito}
                opzioni={(Object.keys(ETICHETTE_AMBITO) as Ambito[]).map((a) => ({
                  valore: a,
                  etichetta: ETICHETTE_AMBITO[a],
                }))}
                onChange={(a) => {
                  setAmbito(a);
                  setModificato(true);
                }}
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {DESCRIZIONI_AMBITO[ambito]}
              </span>
            </label>

            {errore && <p className="text-xs text-red-600 dark:text-red-400">{errore}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={richiediChiusura}
                className="rounded px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={salvataggio}
                className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {salvataggio ? "Salvataggio…" : "Salva"}
              </button>
            </div>
          </form>
        )}
      </div>
      </div>
        </div>,
        document.body,
      )}
    </>
  );
}
