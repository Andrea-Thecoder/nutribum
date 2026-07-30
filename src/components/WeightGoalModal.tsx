import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { salvaObiettivoPeso } from "../lib/weight";
import { useConfermaChiusura } from "./ConfermaModal";

interface WeightGoalModalProps {
  goalKg: number | null;
  margineKg: number;
  onClose: () => void;
  onSaved: () => void;
  onSalvaMargine: (margineKg: number) => Promise<void>;
}

const CAMPO =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

// Stesso range di WeightEntryModal: un obiettivo di peso è pur sempre un peso.
const PESO_MIN_KG = 0;
const PESO_MAX_KG = 500;

// Il margine non ha lo stesso significato di un peso (è una tolleranza, non una misura assoluta):
// range più permissivo, ma comunque limitato per scartare refusi (es. "500" invece di "5").
const MARGINE_MIN_KG = 0;
const MARGINE_MAX_KG = 50;

export function WeightGoalModal({ goalKg, margineKg, onClose, onSaved, onSalvaMargine }: WeightGoalModalProps) {
  const [value, setValue] = useState(goalKg !== null ? String(goalKg) : "");
  const [margine, setMargine] = useState(String(margineKg));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modificato, setModificato] = useState(false);
  const { richiediChiusura, elementoConferma } = useConfermaChiusura(modificato, onClose);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = value.trim();
    const kg = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && (!kg || kg <= PESO_MIN_KG || kg >= PESO_MAX_KG)) {
      setError(`Il valore deve essere un numero tra ${PESO_MIN_KG} e ${PESO_MAX_KG} kg`);
      return;
    }

    const margineNum = Number(margine);
    if (!Number.isFinite(margineNum) || margineNum < MARGINE_MIN_KG || margineNum > MARGINE_MAX_KG) {
      setError(`Il margine deve essere un numero tra ${MARGINE_MIN_KG} e ${MARGINE_MAX_KG} kg`);
      return;
    }

    setSaving(true);
    try {
      await Promise.all([salvaObiettivoPeso(kg), onSalvaMargine(margineNum)]);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
    } finally {
      setSaving(false);
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
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Obiettivo peso</h2>
          <button
            onClick={richiediChiusura}
            className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} onChange={() => setModificato(true)} className="flex flex-col gap-2 text-sm">
          <label className="flex flex-col gap-0.5">
            Peso obiettivo (kg)
            <input
              className={CAMPO}
              type="number"
              min={PESO_MIN_KG}
              max={PESO_MAX_KG}
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              placeholder="Lascia vuoto per rimuovere l'obiettivo"
            />
          </label>

          <label className="flex flex-col gap-0.5">
            Margine di tolleranza (kg)
            <input
              className={CAMPO}
              type="number"
              min={MARGINE_MIN_KG}
              max={MARGINE_MAX_KG}
              step="0.5"
              value={margine}
              onChange={(e) => setMargine(e.target.value)}
            />
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Un peso entro l'obiettivo + questo margine conta come "raggiunto" (oscillazioni normali di
              acqua/cibo non ti fanno sembrare fuori obiettivo).
            </span>
          </label>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

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
              disabled={saving}
              className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Salvataggio…" : "Salva"}
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
