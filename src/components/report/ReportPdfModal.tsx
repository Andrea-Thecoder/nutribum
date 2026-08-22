import { useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { generaReportPdf, type DatiFonteReport } from "./generaReportPdf";
import { TourAnteprimaPannello } from "../TourAnteprimaPannello";
import { stepsReportPdf } from "../../lib/tourImpostazioni";
import { useFocusTrap } from "../../lib/useFocusTrap";

interface ReportPdfModalProps {
  fonte: DatiFonteReport;
  onClose: () => void;
}

const CAMPO =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function meseCorrente(): string {
  return new Date().toISOString().slice(0, 7);
}

export function ReportPdfModal({ fonte, onClose }: ReportPdfModalProps) {
  const [modo, setModo] = useState<"range" | "tutto">("range");
  const [meseDa, setMeseDa] = useState(meseCorrente());
  const [meseA, setMeseA] = useState(meseCorrente());
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [tourAperto, setTourAperto] = useState(false);
  const idTitolo = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useFocusTrap(boxRef, onClose);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (modo === "range" && meseDa > meseA) {
      setError("Il mese di inizio deve essere prima (o uguale a) quello di fine");
      return;
    }

    const periodo =
      modo === "tutto"
        ? { dataDa: null, dataA: null }
        : { dataDa: `${meseDa}-01`, dataA: fineDelMese(meseA) };

    setGenerando(true);
    try {
      const salvato = await generaReportPdf(fonte, periodo);
      if (salvato) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante la generazione del PDF");
    } finally {
      setGenerando(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 text-slate-900 dark:text-slate-100" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="min-h-0 p-[3vmin]">
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitolo}
        tabIndex={-1}
        id="anteprima-tour-root"
        onClick={(e) => e.stopPropagation()}
        className="w-96 min-h-85 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        {tourAperto && <TourAnteprimaPannello steps={stepsReportPdf} onCompletato={() => setTourAperto(false)} />}
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={idTitolo} className="text-sm font-semibold text-slate-800 dark:text-slate-100">Esporta report PDF</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTourAperto(true)}
              title="Cosa sono questi campi"
              className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              ?
            </button>
            <button
              onClick={onClose}
              className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-sm">
          <div className="flex gap-2" data-tour="report-modo">
            <button
              type="button"
              onClick={() => setModo("range")}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
                modo === "range"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              Da mese a mese
            </button>
            <button
              type="button"
              onClick={() => setModo("tutto")}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
                modo === "tutto"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              Tutto il periodo
            </button>
          </div>

          {modo === "range" && (
            <div className="flex gap-2" data-tour="report-periodo">
              <label className="flex flex-1 flex-col gap-0.5">
                Da
                <input
                  className={CAMPO}
                  type="month"
                  value={meseDa}
                  onChange={(e) => setMeseDa(e.target.value)}
                  max={meseA}
                />
              </label>
              <label className="flex flex-1 flex-col gap-0.5">
                A
                <input
                  className={CAMPO}
                  type="month"
                  value={meseA}
                  onChange={(e) => setMeseA(e.target.value)}
                  min={meseDa}
                />
              </label>
            </div>
          )}

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Il report include tabelle riassuntive (kcal/macro, peso, TDEE) e i grafici corrispondenti, solo per le
            dimensioni con dati nel periodo scelto.
          </p>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={generando}
              data-tour="report-genera"
              className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {generando ? "Generazione…" : "Genera PDF"}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>,
    document.body,
  );
}

function fineDelMese(meseYYYYMM: string): string {
  const [anno, mese] = meseYYYYMM.split("-").map(Number);
  const ultimoGiorno = new Date(anno!, mese!, 0).getDate();
  return `${meseYYYYMM}-${String(ultimoGiorno).padStart(2, "0")}`;
}
