import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { registraPeso } from "../lib/weight";
import { CalendarioPopover } from "./CalendarioPopover";
import { useConfermaChiusura } from "./ConfermaModal";
import { accettaDueDecimali } from "../lib/inputNumerico";

interface WeightEntryModalProps {
  // Peso già registrato per la data di default (oggi), se presente: precompila il campo così
  // "Aggiorna" mostra davvero il valore che stai per sovrascrivere, non un campo vuoto.
  valoreOggi: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const CAMPO =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

// Range plausibile per un peso corporeo umano: scarta refusi grossolani (es. "0" o "5000" per un
// dito scivolato sulla tastiera) senza essere così stretto da rifiutare casi reali.
const PESO_MIN_KG = 0;
const PESO_MAX_KG = 500;

function oggi(): string {
  return new Date().toISOString().slice(0, 10);
}

export function WeightEntryModal({ valoreOggi, onClose, onSaved }: WeightEntryModalProps) {
  const [data, setData] = useState(oggi());
  const [valore, setValore] = useState(valoreOggi !== null ? String(valoreOggi) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modificato, setModificato] = useState(false);
  const { richiediChiusura, elementoConferma } = useConfermaChiusura(modificato, onClose);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (data > oggi()) {
      setError("Non puoi registrare un peso per una data futura");
      return;
    }

    const kg = Number(valore);
    if (!kg || kg <= PESO_MIN_KG || kg >= PESO_MAX_KG) {
      setError(`Il valore deve essere un numero tra ${PESO_MIN_KG} e ${PESO_MAX_KG} kg`);
      return;
    }

    setSaving(true);
    try {
      await registraPeso(data, kg);
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
        className="w-96 min-h-85 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Registra peso</h2>
          <button
            onClick={richiediChiusura}
            className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} onChange={() => setModificato(true)} className="flex flex-col gap-2 text-sm">
          <label className="flex flex-col gap-0.5">
            Data
            <CalendarioPopover
              value={data}
              onChange={(d) => {
                setData(d);
                setModificato(true);
              }}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            Peso (kg)
            <input
              className={CAMPO}
              type="number"
              min={PESO_MIN_KG}
              max={PESO_MAX_KG}
              step="0.01"
              value={valore}
              onChange={(e) => {
                if (accettaDueDecimali(e.target.value)) setValore(e.target.value);
              }}
              autoFocus
            />
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
