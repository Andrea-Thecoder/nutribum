import { useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  creaAlimento,
  aggiornaAlimento,
  type AlimentoCatalogo,
  type NuovoAlimento,
  type UnitaAlimento,
} from "../lib/food";
import { useConfermaChiusura } from "./ConfermaModal";
import { accettaDueDecimali } from "../lib/inputNumerico";
import { TourAnteprimaPannello } from "./TourAnteprimaPannello";
import { stepsAggiungiAlimento } from "../lib/tourImpostazioni";
import { useFocusTrap } from "../lib/useFocusTrap";

interface AlimentoFormModalProps {
  alimento?: AlimentoCatalogo;
  onChiudi: () => void;
  onSalvato: () => void;
  // Anteprima "?" della scheda Libro Alimenti (vedi anteprimaPannelli.tsx): niente scrittura reale
  // sul catalogo, il submit mostra solo un avviso di cosa succederebbe.
  anteprima?: boolean;
}

const CAMPO =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

// Arrotonda a 2 decimali (coerente col limite imposto ai campi in input, vedi accettaDueDecimali);
// null se il campo è vuoto, undefined se il valore non è un numero valido (≥ 0).
function parseNumeroPositivo(v: string): number | null | undefined {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100) / 100;
}

function valoreIniziale(v: number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v);
}

export function AlimentoFormModal({ alimento, onChiudi, onSalvato, anteprima }: AlimentoFormModalProps) {
  const inModifica = alimento !== undefined;

  const [nome, setNome] = useState(alimento?.nome ?? "");
  const [unita, setUnita] = useState<UnitaAlimento>(alimento?.unita ?? "g");
  const [kcal, setKcal] = useState(valoreIniziale(alimento?.kcal_100));
  const [proteine, setProteine] = useState(valoreIniziale(alimento?.proteine_100));
  const [carboidrati, setCarboidrati] = useState(valoreIniziale(alimento?.carboidrati_100));
  const [grassi, setGrassi] = useState(valoreIniziale(alimento?.grassi_100));
  const [zuccheri, setZuccheri] = useState(valoreIniziale(alimento?.zuccheri_100));
  const [grassiSaturi, setGrassiSaturi] = useState(valoreIniziale(alimento?.grassi_saturi_100));
  const [fibre, setFibre] = useState(valoreIniziale(alimento?.fibre_100));
  const [sale, setSale] = useState(valoreIniziale(alimento?.sale_100));
  const [daEtichetta, setDaEtichetta] = useState(alimento?.da_etichetta ?? false);
  const [errore, setErrore] = useState<string | null>(null);
  const [avvisoAnteprima, setAvvisoAnteprima] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);
  const [modificato, setModificato] = useState(false);
  const [tourAperto, setTourAperto] = useState(false);
  const { richiediChiusura, elementoConferma } = useConfermaChiusura(modificato, onChiudi);
  const idTitolo = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useFocusTrap(boxRef, richiediChiusura);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrore(null);

    if (!nome.trim()) {
      setErrore("Il nome è obbligatorio");
      return;
    }

    const kcalN = parseNumeroPositivo(kcal);
    const proteineN = parseNumeroPositivo(proteine);
    const carboidratiN = parseNumeroPositivo(carboidrati);
    const grassiN = parseNumeroPositivo(grassi);
    const zuccheriN = parseNumeroPositivo(zuccheri);
    const grassiSaturiN = parseNumeroPositivo(grassiSaturi);
    const fibreN = parseNumeroPositivo(fibre);
    const saleN = parseNumeroPositivo(sale);

    const tuttiValidi = [kcalN, proteineN, carboidratiN, grassiN, zuccheriN, grassiSaturiN, fibreN, saleN].every(
      (n) => n !== undefined,
    );
    if (!tuttiValidi) {
      setErrore("I valori devono essere numeri ≥ 0, con al massimo un decimale");
      return;
    }
    if (kcalN == null || proteineN == null || carboidratiN == null || grassiN == null) {
      setErrore(`Kcal, proteine, carboidrati e grassi sono obbligatori (per 100${unita})`);
      return;
    }

    const input: NuovoAlimento = {
      nome: nome.trim(),
      unita,
      kcal_100: kcalN,
      proteine_100: proteineN,
      carboidrati_100: carboidratiN,
      grassi_100: grassiN,
      zuccheri_100: zuccheriN ?? null,
      grassi_saturi_100: grassiSaturiN ?? null,
      fibre_100: fibreN ?? null,
      sale_100: saleN ?? null,
      da_etichetta: daEtichetta,
    };

    if (anteprima) {
      setAvvisoAnteprima(
        `Anteprima: qui "${input.nome}" verrebbe ${inModifica ? "aggiornato nel" : "aggiunto al"} catalogo.`,
      );
      return;
    }

    setSalvataggio(true);
    try {
      if (inModifica) {
        await aggiornaAlimento(alimento.id, input);
      } else {
        await creaAlimento(input);
      }
      onSalvato();
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
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitolo}
        tabIndex={-1}
        id={anteprima ? undefined : "anteprima-tour-root"}
        onClick={(e) => e.stopPropagation()}
        className="w-96 min-h-85 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        {tourAperto && (
          <TourAnteprimaPannello steps={stepsAggiungiAlimento} onCompletato={() => setTourAperto(false)} />
        )}
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={idTitolo} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {inModifica ? `Modifica alimento (valori per 100${unita})` : `Nuovo alimento (valori per 100${unita})`}
          </h2>
          <div className="flex items-center gap-1">
            {!anteprima && (
              <button
                type="button"
                onClick={() => setTourAperto(true)}
                title="Cosa sono questi campi"
                className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              >
                ?
              </button>
            )}
            <button
              onClick={richiediChiusura}
              className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} onChange={() => setModificato(true)} className="flex flex-col gap-2 text-sm">
          <label className="flex flex-col gap-0.5" data-tour="alimento-nome">
            Nome *
            <input className={CAMPO} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </label>

          <div className="flex flex-col gap-0.5" data-tour="alimento-unita">
            Unità di riferimento
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setUnita("g");
                  setModificato(true);
                }}
                className={
                  unita === "g"
                    ? "rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
                }
              >
                Grammi (g)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnita("ml");
                  setModificato(true);
                }}
                className={
                  unita === "ml"
                    ? "rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
                }
              >
                Millilitri (ml)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-0.5" data-tour="alimento-kcal">
              Kcal *
              <input className={CAMPO} type="number" min={0} step="0.01" value={kcal} onChange={(e) => { if (accettaDueDecimali(e.target.value)) setKcal(e.target.value); }} />
            </label>
            <label className="flex flex-col gap-0.5">
              Proteine (g) *
              <input className={CAMPO} type="number" min={0} step="0.01" value={proteine} onChange={(e) => { if (accettaDueDecimali(e.target.value)) setProteine(e.target.value); }} />
            </label>
            <label className="flex flex-col gap-0.5">
              Carboidrati (g) *
              <input className={CAMPO} type="number" min={0} step="0.01" value={carboidrati} onChange={(e) => { if (accettaDueDecimali(e.target.value)) setCarboidrati(e.target.value); }} />
            </label>
            <label className="flex flex-col gap-0.5">
              di cui zuccheri (g)
              <input className={CAMPO} type="number" min={0} step="0.01" value={zuccheri} onChange={(e) => { if (accettaDueDecimali(e.target.value)) setZuccheri(e.target.value); }} />
            </label>
            <label className="flex flex-col gap-0.5">
              Grassi (g) *
              <input className={CAMPO} type="number" min={0} step="0.01" value={grassi} onChange={(e) => { if (accettaDueDecimali(e.target.value)) setGrassi(e.target.value); }} />
            </label>
            <label className="flex flex-col gap-0.5">
              di cui saturi (g)
              <input className={CAMPO} type="number" min={0} step="0.01" value={grassiSaturi} onChange={(e) => { if (accettaDueDecimali(e.target.value)) setGrassiSaturi(e.target.value); }} />
            </label>
            <label className="flex flex-col gap-0.5">
              Fibre (g)
              <input className={CAMPO} type="number" min={0} step="0.01" value={fibre} onChange={(e) => { if (accettaDueDecimali(e.target.value)) setFibre(e.target.value); }} />
            </label>
            <label className="flex flex-col gap-0.5">
              Sale (g)
              <input className={CAMPO} type="number" min={0} step="0.01" value={sale} onChange={(e) => { if (accettaDueDecimali(e.target.value)) setSale(e.target.value); }} />
            </label>
          </div>

          <label className="flex items-center gap-2 py-1" data-tour="alimento-etichetta">
            <input
              type="checkbox"
              checked={daEtichetta}
              onChange={(e) => setDaEtichetta(e.target.checked)}
              className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
            />
            Valori presi dall'etichetta nutrizionale
          </label>

          {errore && <p className="text-xs text-red-600 dark:text-red-400">{errore}</p>}
          {avvisoAnteprima && <p className="text-xs text-amber-600 dark:text-amber-400">{avvisoAnteprima}</p>}

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
              {salvataggio ? "Salvataggio…" : inModifica ? "Salva modifiche" : "Crea alimento"}
            </button>
          </div>
        </form>
      </div>
      </div>
        </div>,
        document.body,
      )}
    </>
  );
}
