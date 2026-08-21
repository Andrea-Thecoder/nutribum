import { useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { AlimentoCatalogo } from "../lib/food";
import { creaRicetta, aggiornaRicetta, type RicettaConIngredienti } from "../lib/recipes";
import { SelettorePersonalizzato } from "./SelettorePersonalizzato";
import { useConfermaChiusura } from "./ConfermaModal";
import { accettaDueDecimali } from "../lib/inputNumerico";
import { TourAnteprimaPannello } from "./TourAnteprimaPannello";
import { stepsNuovaRicetta } from "../lib/tourImpostazioni";
import { useFocusTrap } from "../lib/useFocusTrap";

interface RicettaFormModalProps {
  ricetta?: RicettaConIngredienti;
  alimenti: AlimentoCatalogo[];
  onChiudi: () => void;
  onSalvato: () => void;
  // Anteprima "?" della scheda Gestione Ricette (vedi anteprimaPannelli.tsx): niente scrittura
  // reale, il submit mostra solo un avviso di cosa succederebbe.
  anteprima?: boolean;
}

const CAMPO =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

interface RigaBozza {
  idBozza: string;
  alimentoId: number | "";
  quantita: string;
}

function righeIniziali(ricetta: RicettaConIngredienti | undefined, alimenti: AlimentoCatalogo[]): RigaBozza[] {
  if (ricetta) {
    return ricetta.ingredienti.map((i) => ({
      idBozza: crypto.randomUUID(),
      alimentoId: i.alimentoId,
      quantita: String(i.quantita),
    }));
  }
  return [{ idBozza: crypto.randomUUID(), alimentoId: alimenti[0]?.id ?? "", quantita: "100" }];
}

export function RicettaFormModal({ ricetta, alimenti, onChiudi, onSalvato, anteprima }: RicettaFormModalProps) {
  const inModifica = ricetta !== undefined;

  const [nome, setNome] = useState(ricetta?.nome ?? "");
  const [righe, setRighe] = useState<RigaBozza[]>(righeIniziali(ricetta, alimenti));
  const [errore, setErrore] = useState<string | null>(null);
  const [avvisoAnteprima, setAvvisoAnteprima] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);
  const [modificato, setModificato] = useState(false);
  const [tourAperto, setTourAperto] = useState(false);
  const { richiediChiusura, elementoConferma } = useConfermaChiusura(modificato, onChiudi);
  const idTitolo = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useFocusTrap(boxRef);

  function aggiungiRiga() {
    setModificato(true);
    setRighe((prev) => [...prev, { idBozza: crypto.randomUUID(), alimentoId: alimenti[0]?.id ?? "", quantita: "100" }]);
  }

  function rimuoviRiga(idBozza: string) {
    setModificato(true);
    setRighe((prev) => prev.filter((r) => r.idBozza !== idBozza));
  }

  function aggiornaRiga(idBozza: string, campo: "alimentoId" | "quantita", valore: string) {
    setModificato(true);
    setRighe((prev) =>
      prev.map((r) =>
        r.idBozza === idBozza ? { ...r, [campo]: campo === "alimentoId" ? Number(valore) : valore } : r,
      ),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrore(null);

    if (!nome.trim()) {
      setErrore("Il nome è obbligatorio");
      return;
    }
    if (righe.length === 0) {
      setErrore("Aggiungi almeno un ingrediente");
      return;
    }

    const ingredienti: { alimentoId: number; quantita: number }[] = [];
    for (const r of righe) {
      if (r.alimentoId === "") {
        setErrore("Seleziona un alimento per ogni riga");
        return;
      }
      const quantita = Number(r.quantita);
      if (!Number.isFinite(quantita) || quantita <= 0) {
        setErrore("Ogni quantità deve essere un numero maggiore di zero");
        return;
      }
      ingredienti.push({ alimentoId: r.alimentoId, quantita: Math.round(quantita * 100) / 100 });
    }

    if (anteprima) {
      setAvvisoAnteprima(`Anteprima: qui la ricetta "${nome.trim()}" verrebbe ${inModifica ? "aggiornata" : "creata"}.`);
      return;
    }

    setSalvataggio(true);
    try {
      if (inModifica) {
        await aggiornaRicetta(ricetta.id, nome.trim(), ingredienti);
      } else {
        await creaRicetta(nome.trim(), ingredienti);
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
        className="flex max-h-[85vh] min-h-85 w-96 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        {tourAperto && (
          <TourAnteprimaPannello steps={stepsNuovaRicetta} onCompletato={() => setTourAperto(false)} />
        )}
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <h2 id={idTitolo} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {inModifica ? "Modifica ricetta" : "Nuova ricetta"}
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

        <form onSubmit={handleSubmit} onChange={() => setModificato(true)} className="flex min-h-0 flex-1 flex-col gap-2 text-sm">
          <label className="flex shrink-0 flex-col gap-0.5" data-tour="ricetta-nome">
            Nome ricetta *
            <input className={CAMPO} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </label>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5" data-tour="ricetta-ingredienti">
            <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">Ingredienti *</span>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
              {righe.map((r) => (
              <div key={r.idBozza} className="flex items-center gap-1.5">
                <div className="min-w-40 flex-1">
                  <SelettorePersonalizzato
                    valore={r.alimentoId}
                    opzioni={alimenti.map((a) => ({ valore: a.id, etichetta: a.nome }))}
                    onChange={(id) => aggiornaRiga(r.idBozza, "alimentoId", String(id))}
                    placeholder="Nessun alimento in catalogo"
                  />
                </div>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={r.quantita}
                  onChange={(e) => {
                    if (accettaDueDecimali(e.target.value)) aggiornaRiga(r.idBozza, "quantita", e.target.value);
                  }}
                  className={`w-20 ${CAMPO}`}
                  placeholder={alimenti.find((a) => a.id === r.alimentoId)?.unita ?? "g"}
                />
                <button
                  type="button"
                  onClick={() => rimuoviRiga(r.idBozza)}
                  disabled={righe.length === 1}
                  className="shrink-0 rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950 dark:hover:text-red-400"
                  title="Rimuovi ingrediente"
                >
                  ✕
                </button>
              </div>
              ))}
            </div>
            <button
              type="button"
              onClick={aggiungiRiga}
              disabled={alimenti.length === 0}
              className="shrink-0 self-start rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              + Aggiungi ingrediente
            </button>
          </div>

          {errore && <p className="shrink-0 text-xs text-red-600 dark:text-red-400">{errore}</p>}
          {avvisoAnteprima && (
            <p className="shrink-0 text-xs text-amber-600 dark:text-amber-400">{avvisoAnteprima}</p>
          )}

          <div className="mt-2 flex shrink-0 justify-end gap-2">
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
              {salvataggio ? "Salvataggio…" : inModifica ? "Salva modifiche" : "Crea ricetta"}
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
